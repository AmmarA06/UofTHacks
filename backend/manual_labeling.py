"""Manual Labeling System - Capture & Commit Workflow"""

import cv2
import numpy as np
import tkinter as tk
from tkinter import ttk
from typing import List, Dict, Tuple, Optional
from datetime import datetime


class ManualLabelingGUI:
    """Separate Tkinter GUI for manual labeling interface."""

    def __init__(self, parent, on_add_annotation_callback, on_commit_callback, on_clear_callback):
        """
        Initialize the GUI window.

        Args:
            parent: Parent Tkinter window (Tk instance)
            on_add_annotation_callback: Function to call when adding an annotation
            on_commit_callback: Function to call when committing all annotations
            on_clear_callback: Function to call when clearing annotations
        """
        self.on_add_annotation = on_add_annotation_callback
        self.on_commit = on_commit_callback
        self.on_clear = on_clear_callback

        self.root = tk.Toplevel(parent)
        self.root.title("Manual Labeling")
        self.root.geometry("450x500")
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        # Current bbox label input
        input_frame = ttk.LabelFrame(self.root, text="Current Bounding Box", padding=10)
        input_frame.pack(fill=tk.X, padx=10, pady=5)

        ttk.Label(input_frame, text="Label:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.label_entry = ttk.Entry(input_frame, width=30)
        self.label_entry.grid(row=0, column=1, sticky=tk.EW, pady=5)
        self.label_entry.bind('<Return>', lambda e: self._on_add())

        ttk.Button(input_frame, text="Add Annotation", command=self._on_add).grid(row=1, column=0, columnspan=2, pady=5)

        input_frame.columnconfigure(1, weight=1)

        # Annotations list
        list_frame = ttk.LabelFrame(self.root, text="Annotations", padding=10)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        scroll = ttk.Scrollbar(list_frame)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.annotations_listbox = tk.Listbox(list_frame, yscrollcommand=scroll.set,
                                              font=("Courier", 9), height=12)
        self.annotations_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll.config(command=self.annotations_listbox.yview)

        # Buttons
        button_frame = ttk.Frame(self.root)
        button_frame.pack(fill=tk.X, padx=10, pady=10)

        self.commit_btn = ttk.Button(button_frame, text="Commit All to Database", command=self._on_commit)
        self.commit_btn.pack(side=tk.LEFT, padx=5)

        ttk.Button(button_frame, text="Clear All", command=self._on_clear).pack(side=tk.LEFT, padx=5)

        self.status_label = ttk.Label(self.root, text="Draw a box on the camera feed", foreground="blue")
        self.status_label.pack(fill=tk.X, padx=10, pady=5)

        self.root.withdraw()  # Hide initially

    def show(self):
        """Show the GUI window."""
        self.root.deiconify()
        self.root.lift()
        self.label_entry.focus()

    def hide(self):
        """Hide the GUI window."""
        self.root.withdraw()

    def get_label(self) -> str:
        """Get the current label entry value."""
        return self.label_entry.get().strip()

    def clear_label(self):
        """Clear the label entry field."""
        self.label_entry.delete(0, tk.END)
        self.label_entry.focus()

    def add_to_list(self, annotation_text: str):
        """Add an annotation to the listbox."""
        self.annotations_listbox.insert(tk.END, annotation_text)

    def clear_list(self):
        """Clear the annotations listbox."""
        self.annotations_listbox.delete(0, tk.END)

    def show_message(self, message: str, success: bool = True):
        """Show a status message."""
        color = "green" if success else "red"
        self.status_label.config(text=message, foreground=color)

    def enable_commit(self, enabled: bool):
        """Enable or disable the commit button."""
        self.commit_btn.config(state=tk.NORMAL if enabled else tk.DISABLED)

    def _on_add(self):
        """Handle Add Annotation button."""
        self.on_add_annotation()

    def _on_commit(self):
        """Handle Commit button."""
        self.on_commit()

    def _on_clear(self):
        """Handle Clear button."""
        self.on_clear()

    def _on_close(self):
        """Handle window close."""
        self.hide()

    def destroy(self):
        """Destroy the GUI window."""
        try:
            self.root.destroy()
        except:
            pass


class ManualLabelingSystem:
    """
    Implements a 'Capture & Commit' workflow for manual labeling.

    Uses a separate Tkinter GUI for label input instead of drawing on the camera feed.
    """

    def __init__(self, kinect_camera, database, tk_root):
        """
        Initialize the manual labeling system.

        Args:
            kinect_camera: KinectCamera instance for 3D coordinate conversion
            database: VisualDatabase instance for storing labels
            tk_root: Tkinter root window (Tk instance)
        """
        self.kinect = kinect_camera
        self.db = database
        self.tk_root = tk_root

        # Capture state
        self.captured_rgb = None
        self.captured_depth = None
        self.captured_detections = []
        self.is_frozen = False

        # Annotation state
        self.annotations = []  # List of {bbox, label, center_3d}
        self.current_bbox = None
        self.drawing = False
        self.start_point = None

        # Frame counter for database
        self.manual_frame_id = 0

        # Display scaling (window is 1280x720, frame is 1920x1080)
        self.display_width = 1280
        self.display_height = 720
        self.frame_width = 1920
        self.frame_height = 1080

        # GUI
        self.gui = ManualLabelingGUI(
            parent=self.tk_root,
            on_add_annotation_callback=self._on_gui_add_annotation,
            on_commit_callback=self._on_gui_commit,
            on_clear_callback=self._on_gui_clear
        )

    def capture_frame(self, rgb_frame: np.ndarray, depth_frame: np.ndarray, detections=None):
        """
        Capture and freeze the current frame for annotation.

        Args:
            rgb_frame: Current RGB frame from Kinect (in BGR format)
            depth_frame: Current depth frame from Kinect
            detections: Optional list of current detections to show on frozen frame
        """
        self.captured_rgb = rgb_frame.copy()
        self.captured_depth = depth_frame.copy()
        self.captured_detections = detections if detections else []
        self.is_frozen = True
        self.annotations = []
        self.gui.clear_list()
        self.gui.show()
        print("\n[CAPTURE] Frame frozen. Draw bounding boxes on the image.")
        print("  - Click and drag to draw a box")
        print("  - Enter label in GUI and click Add")
        print("  - Click 'Commit All' to save to database")
        print("  - Press 'R' to resume live feed")

    def mouse_callback(self, event, x, y, flags, param):
        """
        Handle mouse events for bounding box drawing.

        Args:
            event: OpenCV mouse event type
            x, y: Mouse coordinates (in display space: 1280x720)
            flags: Additional flags
            param: Additional parameters
        """
        if not self.is_frozen:
            return

        # Scale mouse coordinates from display (1280x720) to frame (1920x1080)
        scale_x = self.frame_width / self.display_width
        scale_y = self.frame_height / self.display_height
        frame_x = int(x * scale_x)
        frame_y = int(y * scale_y)

        if event == cv2.EVENT_LBUTTONDOWN:
            self.drawing = True
            self.start_point = (frame_x, frame_y)
            self.current_bbox = None

        elif event == cv2.EVENT_MOUSEMOVE:
            if self.drawing:
                self.current_bbox = (self.start_point[0], self.start_point[1], frame_x, frame_y)

        elif event == cv2.EVENT_LBUTTONUP:
            self.drawing = False
            if self.start_point is not None:
                x1, y1 = self.start_point
                x2, y2 = frame_x, frame_y

                # Ensure proper ordering (x1 < x2, y1 < y2)
                x1, x2 = min(x1, x2), max(x1, x2)
                y1, y2 = min(y1, y2), max(y1, y2)

                # Minimum box size (30x30 pixels in frame space)
                if (x2 - x1) > 30 and (y2 - y1) > 30:
                    self.current_bbox = (x1, y1, x2, y2)
                    print(f"\n[BBOX] Box drawn: ({x1}, {y1}) to ({x2}, {y2}) - Enter label in GUI")
                    self.gui.show_message("Enter label for the bounding box", success=True)
                else:
                    print("\n[WARNING] Box too small. Draw a larger bounding box.")
                    self.current_bbox = None
                    self.gui.show_message("Box too small, draw a larger one", success=False)

    def _on_gui_add_annotation(self):
        """Handle Add Annotation from GUI."""
        label = self.gui.get_label()
        if label and self.current_bbox:
            self.add_annotation(label)
            self.gui.clear_label()
        else:
            if not self.current_bbox:
                self.gui.show_message("Draw a bounding box first", success=False)
            else:
                self.gui.show_message("Label cannot be empty", success=False)

    def _on_gui_commit(self):
        """Handle Commit from GUI."""
        if self.annotations:
            count = self.commit_to_ledger(self.manual_frame_id)
            self.gui.show_message(f"Committed {count} annotations to database!", success=True)
            self.gui.clear_list()
            self.annotations = []
            self.gui.enable_commit(False)
        else:
            self.gui.show_message("No annotations to commit", success=False)

    def _on_gui_clear(self):
        """Handle Clear from GUI."""
        self.clear_annotations()
        self.gui.clear_list()
        self.gui.enable_commit(False)
        self.gui.show_message("All annotations cleared", success=True)

    def add_annotation(self, label: str):
        """
        Add a labeled annotation with 3D coordinates.

        Args:
            label: The class label for this annotation
        """
        if not self.current_bbox or not label.strip():
            return

        x1, y1, x2, y2 = self.current_bbox

        # Calculate center pixel
        center_u = (x1 + x2) // 2
        center_v = (y1 + y2) // 2

        # Get 3D coordinates from depth frame
        center_3d = self._calculate_3d_position(center_u, center_v)

        if center_3d is None:
            print(f"\n[WARNING] No valid depth data at ({center_u}, {center_v})")
            self.gui.show_message("No valid depth data at bbox center", success=False)
            return

        # Store annotation
        annotation = {
            'bbox': self.current_bbox,
            'label': label.strip(),
            'center_2d': (center_u, center_v),
            'center_3d': center_3d,
            'timestamp': datetime.now().isoformat()
        }

        self.annotations.append(annotation)

        x, y, z = center_3d
        print(f"\n[OK] Added: '{label}' at 3D position ({x:.0f}, {y:.0f}, {z:.0f}) mm")
        print(f"     Total annotations: {len(self.annotations)}")

        # Update GUI
        annotation_text = f"{label:15s} | ({x:4.0f}, {y:4.0f}, {z:4.0f}) mm"
        self.gui.add_to_list(annotation_text)
        self.gui.enable_commit(True)
        self.gui.show_message(f"Added '{label}' - Total: {len(self.annotations)}", success=True)

        # Reset for next annotation
        self.current_bbox = None

    def _calculate_3d_position(self, u: int, v: int) -> Optional[Tuple[float, float, float]]:
        """
        Calculate 3D camera space coordinates from 2D pixel + depth.

        Args:
            u, v: Pixel coordinates in RGB frame

        Returns:
            (x, y, z) in millimeters, or None if depth is invalid
        """
        try:
            # Map color coordinates to depth coordinates
            depth_x, depth_y = self.kinect.map_color_to_depth(u, v)

            # Ensure coordinates are within depth frame bounds
            if not (0 <= depth_x < self.captured_depth.shape[1] and
                    0 <= depth_y < self.captured_depth.shape[0]):
                return None

            # Get depth value (in millimeters)
            z = float(self.captured_depth[depth_y, depth_x])

            # Check if depth is valid (Kinect returns 0 for invalid depth)
            if z <= 0 or z > 8000:  # Valid range: 0.5m to 8m
                return None

            # Convert to 3D camera space using Kinect intrinsics
            x, y, z_meters = self.kinect.pixel_to_3d(u, v, z)

            # Convert back to millimeters for consistency
            return (x * 1000.0, y * 1000.0, z_meters * 1000.0)

        except Exception as e:
            print(f"\n[ERROR] 3D calculation failed: {e}")
            return None

    def commit_to_ledger(self, frame_id: int) -> int:
        """
        Commit all temporary annotations to the database.

        Args:
            frame_id: Current frame ID for logging

        Returns:
            Number of annotations successfully committed
        """
        if not self.annotations:
            return 0

        committed_count = 0
        print(f"\n[SYNC] Committing {len(self.annotations)} annotations to ledger...")

        for i, annotation in enumerate(self.annotations, 1):
            try:
                label = annotation['label']
                bbox = annotation['bbox']
                center_3d = annotation['center_3d']

                x_mm, y_mm, z_mm = center_3d

                committed_count += 1
                print(f"  [{i}/{len(self.annotations)}] OK {label} at ({x_mm:.0f}, {y_mm:.0f}, {z_mm:.0f}) mm")

            except Exception as e:
                print(f"  [{i}/{len(self.annotations)}] X Failed: {e}")

        print(f"\n[OK] Committed {committed_count}/{len(self.annotations)} annotations")

        # Increment frame ID
        self.manual_frame_id += 1

        return committed_count

    def clear_annotations(self):
        """Clear all temporary annotations."""
        self.annotations = []
        self.current_bbox = None
        print("\n[CLEAR] All annotations cleared.")

    def resume_live_feed(self):
        """Resume the live feed (unfreeze)."""
        self.is_frozen = False
        self.captured_rgb = None
        self.captured_depth = None
        self.annotations = []
        self.current_bbox = None
        self.gui.hide()
        print("\n[RESUME] Returning to live feed...")

    def get_visualization(self) -> np.ndarray:
        """
        Get the current visualization showing bounding boxes only.

        Returns:
            Annotated frame (or None if not frozen)
        """
        if not self.is_frozen or self.captured_rgb is None:
            return None

        vis = self.captured_rgb.copy()

        # Draw original YOLO detections (light gray boxes)
        for det in self.captured_detections:
            if 'bbox' in det:
                x1, y1, x2, y2 = det['bbox']
                class_name = det.get('class_name', 'unknown')
                conf = det.get('confidence', 0.0)

                cv2.rectangle(vis, (x1, y1), (x2, y2), (180, 180, 180), 2)

                label_text = f"{class_name} {conf:.2f}"
                (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(vis, (x1, y1 - th - 6), (x1 + tw + 6, y1), (180, 180, 180), -1)
                cv2.putText(vis, label_text, (x1 + 3, y1 - 3),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        # Draw completed manual annotations (green boxes)
        for annotation in self.annotations:
            x1, y1, x2, y2 = annotation['bbox']
            label = annotation['label']

            cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 255, 0), 2)

            label_text = label
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(vis, (x1, y1 - th - 8), (x1 + tw + 8, y1), (0, 255, 0), -1)
            cv2.putText(vis, label_text, (x1 + 4, y1 - 4),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

            cx, cy = annotation['center_2d']
            cv2.circle(vis, (cx, cy), 5, (0, 255, 0), -1)

        # Draw current box being drawn (yellow)
        if self.current_bbox is not None:
            x1, y1, x2, y2 = self.current_bbox
            cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 255, 255), 2)

        return vis
