"""Object Re-labeling System - Edit existing detected objects"""

import cv2
import numpy as np
import tkinter as tk
from tkinter import ttk, messagebox
import threading
from typing import List, Dict, Tuple, Optional


class RelabelingGUI:
    """Separate Tkinter GUI for object relabeling interface."""

    def __init__(self, parent, on_save_callback, on_cancel_callback):
        """
        Initialize the GUI window.

        Args:
            parent: Parent Tkinter window (Tk instance)
            on_save_callback: Function to call when Save is clicked
            on_cancel_callback: Function to call when Cancel is clicked
        """
        self.on_save = on_save_callback
        self.on_cancel = on_cancel_callback

        self.root = tk.Toplevel(parent)
        self.root.title("Object Relabeling")
        self.root.geometry("500x600")
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        # Mode selection
        mode_frame = ttk.LabelFrame(self.root, text="Mode", padding=10)
        mode_frame.pack(fill=tk.X, padx=10, pady=5)

        self.mode_var = tk.StringVar(value="table")
        ttk.Radiobutton(mode_frame, text="Table (Assign to tables)", variable=self.mode_var,
                       value="table", command=self._on_mode_change).pack(anchor=tk.W)
        ttk.Radiobutton(mode_frame, text="Re-label (Edit class names)", variable=self.mode_var,
                       value="relabel", command=self._on_mode_change).pack(anchor=tk.W)

        # Selected objects list
        list_frame = ttk.LabelFrame(self.root, text="Selected Objects", padding=10)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # Scrollable listbox
        scroll = ttk.Scrollbar(list_frame)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.objects_listbox = tk.Listbox(list_frame, yscrollcommand=scroll.set,
                                          font=("Courier", 9), height=10)
        self.objects_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll.config(command=self.objects_listbox.yview)

        # Edit frame (visible for relabel/table modes)
        self.edit_frame = ttk.LabelFrame(self.root, text="Edit", padding=10)
        self.edit_frame.pack(fill=tk.X, padx=10, pady=5)

        # Table mode controls
        self.table_frame = ttk.Frame(self.edit_frame)
        self.table_frame.grid(row=0, column=0, columnspan=2, sticky=tk.EW)

        ttk.Label(self.table_frame, text="Assign to:").pack(anchor=tk.W, pady=2)

        self.table_choice_var = tk.StringVar(value="new")
        ttk.Radiobutton(self.table_frame, text="Create new table",
                       variable=self.table_choice_var, value="new").pack(anchor=tk.W)

        existing_frame = ttk.Frame(self.table_frame)
        existing_frame.pack(fill=tk.X, pady=2)
        ttk.Radiobutton(existing_frame, text="Existing table:",
                       variable=self.table_choice_var, value="existing").pack(side=tk.LEFT)
        self.table_dropdown = ttk.Combobox(existing_frame, state="readonly", width=30)
        self.table_dropdown.pack(side=tk.LEFT, padx=5)

        # Label entries container (for relabel mode)
        self.label_entries_frame = ttk.Frame(self.edit_frame)
        self.label_entries_frame.grid(row=1, column=0, columnspan=2, sticky=tk.EW)

        self.edit_frame.columnconfigure(1, weight=1)

        # Label entry widgets (dynamically created)
        self.label_entries = []

        # Buttons
        button_frame = ttk.Frame(self.root)
        button_frame.pack(fill=tk.X, padx=10, pady=10)

        self.save_btn = ttk.Button(button_frame, text="Save Changes", command=self._on_save_clicked)
        self.save_btn.pack(side=tk.LEFT, padx=5)

        ttk.Button(button_frame, text="Cancel", command=self._on_cancel_clicked).pack(side=tk.LEFT, padx=5)

        self.status_label = ttk.Label(self.root, text="", foreground="blue")
        self.status_label.pack(fill=tk.X, padx=10, pady=5)

        self.root.withdraw()  # Hide initially

    def show(self, mode: str, selected_objects: List[Dict]):
        """
        Show the GUI with selected objects.

        Args:
            mode: Current mode ("table", "relabel", "group")
            selected_objects: List of selected object dictionaries
        """
        self.mode_var.set(mode)
        self._populate_objects(selected_objects)
        self._on_mode_change()
        self.root.deiconify()
        self.root.lift()

    def hide(self):
        """Hide the GUI window."""
        self.root.withdraw()

    def _populate_objects(self, selected_objects: List[Dict]):
        """Populate the listbox and create label entries."""
        self.objects_listbox.delete(0, tk.END)

        # Clear previous label entries
        for widget in self.label_entries_frame.winfo_children():
            widget.destroy()
        self.label_entries = []

        for i, obj in enumerate(selected_objects):
            # Add to listbox
            list_text = f"ID {obj['object_id']:3d} | {obj['class_name']:15s} | conf={obj['confidence']:.2f}"
            self.objects_listbox.insert(tk.END, list_text)

            # Create label entry for relabel mode
            entry_frame = ttk.Frame(self.label_entries_frame)
            entry_frame.pack(fill=tk.X, pady=2)

            ttk.Label(entry_frame, text=f"ID {obj['object_id']}:", width=10).pack(side=tk.LEFT)
            entry = ttk.Entry(entry_frame)
            entry.insert(0, obj['class_name'])
            entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

            self.label_entries.append({
                'object_id': obj['object_id'],
                'entry': entry
            })

    def _on_mode_change(self):
        """Update UI based on selected mode."""
        mode = self.mode_var.get()

        if mode == "table":
            self.table_frame.grid()
            self.label_entries_frame.grid_remove()
            self.save_btn.config(text="Assign to Table")
            self.status_label.config(text="Select a table or create a new one")
        elif mode == "relabel":
            self.table_frame.grid_remove()
            self.label_entries_frame.grid()
            self.save_btn.config(text="Save Labels")
            self.status_label.config(text="Edit the labels below and click Save")

    def get_mode(self) -> str:
        """Get the current mode."""
        return self.mode_var.get()

    def get_updated_labels(self) -> Dict[int, str]:
        """Get updated labels for all objects (relabel mode)."""
        return {item['object_id']: item['entry'].get().strip()
                for item in self.label_entries}

    def set_existing_tables(self, tables: List[Dict]):
        """Populate the table dropdown with existing tables."""
        table_names = [f"{t['group_name']} (ID: {t['group_id']})" for t in tables]
        self.table_dropdown['values'] = table_names
        if table_names:
            self.table_dropdown.current(0)
        self.existing_tables = tables  # Store for later lookup

    def get_table_choice(self) -> Tuple[str, Optional[int]]:
        """Get table selection (mode, table_id).
        Returns: ('new', None) or ('existing', table_id)
        """
        if self.table_choice_var.get() == "new":
            return ("new", None)
        else:
            # Parse table_id from dropdown selection
            selection = self.table_dropdown.get()
            if selection and hasattr(self, 'existing_tables'):
                # Extract ID from format "Table X (ID: Y)"
                for table in self.existing_tables:
                    if f"{table['group_name']} (ID: {table['group_id']})" == selection:
                        return ("existing", table['group_id'])
            return ("new", None)

    def show_message(self, message: str, success: bool = True):
        """Show a status message."""
        color = "green" if success else "red"
        self.status_label.config(text=message, foreground=color)

    def _on_save_clicked(self):
        """Handle Save button click."""
        self.on_save()

    def _on_cancel_clicked(self):
        """Handle Cancel button click."""
        self.on_cancel()

    def _on_close(self):
        """Handle window close button."""
        self._on_cancel_clicked()

    def destroy(self):
        """Destroy the GUI window."""
        try:
            self.root.destroy()
        except:
            pass


class ObjectRelabelingSystem:
    """
    Re-label existing detected objects or create groups by selecting them with a bounding box.

    Uses a separate Tkinter GUI for editing instead of drawing on the camera feed.
    """

    def __init__(self, database, tk_root):
        """
        Initialize the re-labeling system.

        Args:
            database: VisualDatabase instance
            tk_root: Tkinter root window (Tk instance)
        """
        self.db = database
        self.tk_root = tk_root

        # Capture state
        self.captured_frame = None
        self.captured_detections = []  # YOLO detections with object_ids
        self.is_frozen = False

        # Selection state
        self.selection_bbox = None
        self.drawing = False
        self.start_point = None
        self.selected_objects = []  # Objects within selection box

        # Mode state (controlled by GUI radio buttons)
        self.mode = "relabel"  # "relabel", "group", or "table"

        # Display scaling (window is 1280x720, frame is 1920x1080)
        self.display_width = 1280
        self.display_height = 720
        self.frame_width = 1920
        self.frame_height = 1080

        # GUI
        self.gui = RelabelingGUI(
            parent=self.tk_root,
            on_save_callback=self._on_gui_save,
            on_cancel_callback=self._on_gui_cancel
        )

    def capture_frame(self, rgb_frame: np.ndarray, detections: List[Dict], object_ids: List[int]):
        """
        Capture and freeze the current frame with detections.

        Args:
            rgb_frame: Current RGB frame from Kinect
            detections: List of current detections
            object_ids: List of object IDs corresponding to detections
        """
        self.captured_frame = rgb_frame.copy()
        self.is_frozen = True
        self.selection_bbox = None
        self.selected_objects = []

        # Combine detections with their object IDs
        self.captured_detections = []
        for det, obj_id in zip(detections, object_ids):
            det_with_id = det.copy()
            det_with_id['object_id'] = obj_id
            self.captured_detections.append(det_with_id)

        print(f"\n[CAPTURE] Frame frozen. Draw a box to select objects. Press 'R' to resume.")

    def mouse_callback(self, event, x, y, flags, param):
        """Handle mouse events for selection box drawing."""
        if not self.is_frozen:
            return

        # Scale mouse coordinates
        scale_x = self.frame_width / self.display_width
        scale_y = self.frame_height / self.display_height
        frame_x = int(x * scale_x)
        frame_y = int(y * scale_y)

        if event == cv2.EVENT_LBUTTONDOWN:
            self.drawing = True
            self.start_point = (frame_x, frame_y)
            self.selection_bbox = None
            self.selected_objects = []

        elif event == cv2.EVENT_MOUSEMOVE:
            if self.drawing:
                self.selection_bbox = (self.start_point[0], self.start_point[1], frame_x, frame_y)

        elif event == cv2.EVENT_LBUTTONUP:
            self.drawing = False
            if self.start_point is not None:
                x1, y1 = self.start_point
                x2, y2 = frame_x, frame_y

                # Ensure proper ordering
                x1, x2 = min(x1, x2), max(x1, x2)
                y1, y2 = min(y1, y2), max(y1, y2)

                # Minimum box size
                if (x2 - x1) > 30 and (y2 - y1) > 30:
                    self.selection_bbox = (x1, y1, x2, y2)
                    self._select_objects_in_box()
                else:
                    print("\n[WARNING] Box too small.")
                    self.selection_bbox = None

    def _select_objects_in_box(self):
        """Find all detected objects whose centers are within the selection box."""
        if not self.selection_bbox:
            return

        sx1, sy1, sx2, sy2 = self.selection_bbox
        self.selected_objects = []
        seen_object_ids = set()  # Prevent duplicates

        for det in self.captured_detections:
            if 'center_2d' in det and det['center_2d'] is not None:
                cx, cy = det['center_2d']
                # Check if center is within selection box
                if sx1 <= cx <= sx2 and sy1 <= cy <= sy2:
                    # Skip if we've already added this object_id
                    if det['object_id'] in seen_object_ids:
                        continue

                    # Get full object info from database
                    obj = self.db.get_object(det['object_id'])
                    if obj:
                        seen_object_ids.add(det['object_id'])
                        self.selected_objects.append({
                            'object_id': det['object_id'],
                            'class_name': obj['class_name'],
                            'confidence': obj['avg_confidence'],
                            'detection_count': obj['detection_count'],
                            'bbox': det.get('bbox'),
                            'center_2d': det['center_2d']
                        })

        if self.selected_objects:
            print(f"\n[SELECTED] {len(self.selected_objects)} object(s)")
            for i, obj in enumerate(self.selected_objects, 1):
                print(f"  {i}. ID={obj['object_id']} | {obj['class_name']} (conf={obj['confidence']:.2f})")

            # Populate table dropdown with existing tables
            all_groups = self.db.get_all_groups()
            table_groups = [g for g in all_groups if g['group_name'].startswith('Table ')]
            self.gui.set_existing_tables(table_groups)

            # Show GUI for editing
            self.gui.show(self.mode, self.selected_objects)
        else:
            print("\n[INFO] No objects found in selection box")

    def _on_gui_save(self):
        """Handle Save button from GUI."""
        mode = self.gui.get_mode()

        if mode == "relabel":
            self._save_relabel_from_gui()
        elif mode == "table":
            self._save_table_changes()

    def _on_gui_cancel(self):
        """Handle Cancel button from GUI."""
        print("\n[CANCELLED] Editing cancelled")
        self.gui.hide()
        self.selected_objects = []
        self.selection_bbox = None

    def _save_relabel_from_gui(self):
        """Save label changes from GUI."""
        updated_labels = self.gui.get_updated_labels()
        print(f"\n[SAVING] Updating {len(updated_labels)} object(s)...")

        updated_count = 0
        for object_id, new_label in updated_labels.items():
            if not new_label:
                continue
            try:
                self.db.conn.execute("""
                    UPDATE objects
                    SET class_name = ?
                    WHERE object_id = ?
                """, (new_label, object_id))
                print(f"  [OK] Object ID {object_id} -> '{new_label}'")
                updated_count += 1
            except Exception as e:
                print(f"  [ERROR] Failed to update object {object_id}: {e}")

        self.db.conn.commit()
        print(f"\n[SUCCESS] {updated_count} object(s) updated")

        self.gui.show_message(f"Updated {updated_count} object(s)!", success=True)
        self.gui.hide()
        self.selected_objects = []
        self.selection_bbox = None

    def _save_table_changes(self):
        """Save table assignment for table mode."""
        choice, table_id = self.gui.get_table_choice()

        try:
            if choice == "new":
                # Create new table
                print(f"\n[SAVING] Creating new table with {len(self.selected_objects)} object(s)...")

                all_groups = self.db.get_all_groups()
                table_numbers = []
                for group in all_groups:
                    if group['group_name'].startswith('Table '):
                        try:
                            num = int(group['group_name'].replace('Table ', ''))
                            table_numbers.append(num)
                        except ValueError:
                            pass

                next_table_num = max(table_numbers) + 1 if table_numbers else 1
                table_name = f"Table {next_table_num}"

                group_id = self.db.create_group(table_name, description=f"Table {next_table_num}")
                print(f"  [OK] Created {table_name} (ID {group_id})")

                object_ids = [obj['object_id'] for obj in self.selected_objects]
                added_count = self.db.add_objects_to_group(group_id, object_ids)

                print(f"  [OK] Added {added_count} object(s) to {table_name}")
                print(f"\n[SUCCESS] {table_name} created successfully")

                self.gui.show_message(f"Created {table_name} with {added_count} object(s)!", success=True)
            else:
                # Add to existing table
                print(f"\n[SAVING] Adding {len(self.selected_objects)} object(s) to existing table...")

                table = self.db.get_group(table_id)
                if not table:
                    self.gui.show_message("Selected table not found", success=False)
                    return

                object_ids = [obj['object_id'] for obj in self.selected_objects]
                added_count = self.db.add_objects_to_group(table_id, object_ids)

                print(f"  [OK] Added {added_count} object(s) to {table['group_name']}")
                print(f"\n[SUCCESS] Objects added to {table['group_name']}")

                self.gui.show_message(f"Added {added_count} object(s) to {table['group_name']}!", success=True)

            self.gui.hide()
            self.selected_objects = []
            self.selection_bbox = None

        except Exception as e:
            print(f"\n[ERROR] Failed to assign to table: {e}")
            self.gui.show_message(f"Error: {e}", success=False)

    def resume_live_feed(self):
        """Resume the live feed."""
        self.is_frozen = False
        self.captured_frame = None
        self.captured_detections = []
        self.selection_bbox = None
        self.selected_objects = []
        self.gui.hide()
        print("\n[RESUME] Returning to live feed...")

    def get_visualization(self) -> Optional[np.ndarray]:
        """
        Get the current visualization showing bounding boxes only.

        Returns:
            Annotated frame or None if not frozen
        """
        if not self.is_frozen or self.captured_frame is None:
            return None

        vis = self.captured_frame.copy()

        # Draw all detected objects (gray boxes)
        for det in self.captured_detections:
            if 'bbox' in det:
                # bbox is (x, y, w, h) format
                x, y, w, h = det['bbox']
                x1, y1 = x, y
                x2, y2 = x + w, y + h
                cv2.rectangle(vis, (x1, y1), (x2, y2), (180, 180, 180), 2)

                # Label
                label = det.get('class_name', 'unknown')
                conf = det.get('confidence', 0.0)
                label_text = f"{label} {conf:.2f}"
                (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(vis, (x1, y1 - th - 6), (x1 + tw + 6, y1), (180, 180, 180), -1)
                cv2.putText(vis, label_text, (x1 + 3, y1 - 3),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        # Draw selection box (yellow)
        if self.selection_bbox:
            x1, y1, x2, y2 = self.selection_bbox
            cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 255, 255), 3)

        # Highlight selected objects (green)
        if self.selected_objects:
            for obj in self.selected_objects:
                if 'bbox' in obj and obj['bbox']:
                    # bbox is (x, y, w, h) format
                    x, y, w, h = obj['bbox']
                    x1, y1 = x, y
                    x2, y2 = x + w, y + h
                    cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 255, 0), 3)

        return vis
