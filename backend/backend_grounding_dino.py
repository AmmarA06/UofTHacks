"""Visual Database - Detection System with Remote Grounding DINO"""

import cv2
import time
import threading
import os
import tkinter as tk
from datetime import datetime
from pynput import keyboard
from kinect_camera import KinectCamera
from remote_grounding_dino_detector import RemoteGroundingDinoDetector
from api_server import app, start_server_background, db as shared_db, set_detector
from kinect_pan_tilt import KinectPanTilt
from object_relabeling import ObjectRelabelingSystem
from view_object_tracker import ViewObjectTracker
import numpy as np

# Database path - store in root directory
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, "database", "visual_database.db")


class GroundingDinoSystem:

    def __init__(self, detection_classes, endpoint=None, api_host="127.0.0.1", api_port=8000,
                 pan_tilt_port=None, ema_alpha=0.25,
                 confidence=0.40, resize_width=1920, jpeg_quality=100):
        print("=" * 70)
        print("VISUAL DATABASE - GROUNDING DINO + DATABASE + API SERVER")
        print("=" * 70)

        # Detection state (cached results for when GPU is busy)
        self.last_detections = []
        self.last_object_ids = []

        print("\n[1/5] Using shared database connection...")
        # Use the database instance from api_server to avoid redundant connections
        self.db = shared_db
        # Update database parameters if needed
        self.db.ema_alpha = ema_alpha

        # Initialize Tkinter root window for GUI systems
        print("\n[2/5] Initializing GUI system...")
        self.tk_root = tk.Tk()
        self.tk_root.withdraw()  # Hide the root window

        # Initialize re-labeling system
        self.relabeling_system = ObjectRelabelingSystem(self.db, self.tk_root)

        print("\n[3/5] Initializing pan-tilt mount...")
        try:
            self.pan_tilt = KinectPanTilt(port=pan_tilt_port, auto_calibrate=False)
        except Exception as e:
            print(f"\n⚠ WARNING: Failed to initialize pan-tilt system")
            print(f"  {e}")
            print("  Continuing without pan-tilt control...")
            self.pan_tilt = None

        print("\n[4/5] Initializing Kinect camera...")
        try:
            self.kinect = KinectCamera()
        except Exception as e:
            print(f"\n✗ ERROR: Failed to initialize Kinect")
            print(f"  {e}")
            if self.pan_tilt:
                self.pan_tilt.close()
            raise

        print("\n[5/5] Initializing Remote Grounding DINO detector (RTX 5090)...")

        try:
            self.detector = RemoteGroundingDinoDetector(
                classes=detection_classes,
                confidence=confidence,
                endpoint=endpoint,
                model='grounding-dino-tiny',
                resize_width=resize_width,
                jpeg_quality=jpeg_quality
            )
        except Exception as e:
            print(f"\n✗ ERROR: Failed to initialize detector")
            print(f"  {e}")
            self.kinect.close()
            if self.pan_tilt:
                self.pan_tilt.close()
            raise

        # Register detector with API server for dynamic class updates
        set_detector(self.detector)

        print(f"\nStarting API server at http://{api_host}:{api_port}...")
        self.api_thread = start_server_background(api_host, api_port)
        time.sleep(2)

        print("\n" + "=" * 70)
        print("SYSTEM READY!")
        print("=" * 70)
        print(f"\nAPI Server: http://{api_host}:{api_port}")
        print(f"  - API Docs:  http://{api_host}:{api_port}/docs")
        print(f"  - Objects:   http://{api_host}:{api_port}/api/objects")
        print(f"  - Classes:   http://{api_host}:{api_port}/api/classes")
        print(f"  - Stats:     http://{api_host}:{api_port}/api/stats/summary")
        print(f"\nDynamic Class Updates: Add/remove detection classes without restart!")
        print(f"  POST {api_host}:{api_port}/api/detector/sync-classes")
        print(f"\nPER-VIEW TRACKING MODE:")
        print(f"  - Each view (0°, 90°, 180°) is tracked independently")
        print(f"  - Max 1 object per class per view")
        print(f"  - Objects added to DB once per view (no duplicates)")
        print(f"  - Objects timeout after 7 seconds if not seen")
        print(f"  - Thumbnail updates: 10s interval OR +0.15 confidence boost")
        print(f"  - Use 'v' key to see tracking status")
        print(f"\nWORLD COORDINATE SYSTEM:")
        print(f"  - 90° pan = forward (+Z), 0° = left (-X), 180° = right (+X)")
        print(f"  - All coordinates transformed to world space (same object = same coords)")
        print("\nCONTROLS:")
        print("  'q' or ESC  - Quit")
        print("  's'         - Save screenshot")
        print("  'S' (Shift+S) - Capture frame for manual labeling")
        print("  'i'         - Print detection info")
        print("  'd'         - Toggle depth view")
        print("  'p'         - Print database statistics")
        print("  'v'         - View tracker status (per-view objects)")
        print("  'c'         - Show current detections")
        print("  'C' (Shift+C) - Change detection prompt (OPEN VOCABULARY!)")
        print("  ' ' (space) - Pause/Resume")
        print("\nTABLE/RE-LABELING/GROUP MODE (after pressing 'S'):")
        print("  Click & drag - Select objects in box")
        print("  'M'          - Toggle mode (Table/Re-label/Group)")
        print("  TABLE MODE:")
        print("    - Auto-assigns selected objects to a new table")
        print("  RE-LABEL MODE:")
        print("    - Type to edit label, Tab to cycle objects")
        print("  GROUP MODE:")
        print("    - Type to enter custom group name")
        print("  Enter        - Save changes to database")
        print("  Esc          - Cancel editing")
        print("  'R'          - Resume live feed")
        if self.pan_tilt:
            print("\nPAN-TILT CONTROLS:")
            print("  'h'         - Center camera (home position)")
            print("  Arrow keys  - Pan left/right, tilt up/down (hold for smooth movement)")
        print("=" * 70)

        self.total_detections = 0
        self.objects_created = 0
        self.objects_updated = 0

        # Pan-tilt positions (if available)
        self.current_pan = 90
        self.current_tilt = 110  # Tilt servo home position
        self.pan_velocity = 20  # degrees per second for smooth movement
        self.tilt_velocity = 20  # degrees per second for smooth movement
        
        # Discrete pan positions for Pin 9
        self.pan_positions = [0, 90, 180]
        self.current_pan_index = 1  # Start at 90 (index 1)
        self.is_panning = False  # Lock for smooth panning thread

        # Detection cooldown after servo movement
        self.last_servo_move_time = 0  # Timestamp of last servo movement
        self.servo_cooldown = 2.0  # Seconds to wait after servo movement

        # Per-view object tracking (one object per class per view, DB insertion once)
        print("\nInitializing per-view object tracker...")
        self.view_tracker = ViewObjectTracker(
            views=self.pan_positions,
            disappear_timeout=7.0,      # 7s timeout for object disappearance (accounts for servo movement + detection lag)
            update_interval=10.0,       # Update thumbnail/data every 10s
            quality_threshold=0.15      # Update if confidence improves by +0.15
        )

        # Track which keys are currently pressed
        self.pressed_keys = set()
        self.keyboard_listener = None

        # Start keyboard listener
        self._start_keyboard_listener()


    def process_frame(self, rgb_frame, depth_frame):
        # Get detections from remote Grounding DINO (async, non-blocking)
        # Returns (detections, is_new) - is_new is True only when fresh GPU results arrive
        # Pass current pan angle for world coordinate transformation
        detections, is_new_gpu_result = self.detector.detect_with_depth(
            rgb_frame, depth_frame, self.kinect, pan_angle=self.current_pan
        )

        # Only process database when we have fresh GPU results
        if not is_new_gpu_result:
            # Return cached detections without processing (keeps video smooth)
            return self.last_detections, self.last_object_ids

        # Process ALL detections (including those without 3D position)
        # The tracker and database will handle missing depth gracefully
        self.total_detections += len(detections)
        processed_object_ids = []

        # ===== PER-VIEW TRACKING =====
        # Get current servo view angle
        current_view = self.current_pan

        # Update view tracker - returns actions for each detection
        # Tracker will use last known position for detections without depth
        tracker_actions = self.view_tracker.update(current_view, detections)

        # Process actions from tracker
        for det, action, object_id in tracker_actions:
            if action == 'add_to_db':
                # Add to database (first time at this view) - create directly, no matching
                new_object_id = self.db.create_object(det, rgb_frame)

                if new_object_id is None:
                    continue

                processed_object_ids.append(new_object_id)

                # Mark as added in view tracker
                self.view_tracker.mark_added_to_db(current_view, det['class_name'], new_object_id)
                self.objects_created += 1

            elif action == 'update_present':
                # Object was absent, now present again - update existing entry
                success = self.db.mark_object_present(object_id, det, rgb_frame)
                if success:
                    processed_object_ids.append(object_id)
                    self.objects_updated += 1

            elif action == 'update_data':
                # Periodic refresh: update thumbnail, position, confidence
                self.db.update_object(object_id, det, rgb_frame)
                processed_object_ids.append(object_id)
                self.objects_updated += 1

            elif action == 'skip':
                # Already present and tracked - add to processed list
                if object_id is not None:
                    processed_object_ids.append(object_id)

        # Process pending absent marks (objects that timed out)
        pending_absent = self.view_tracker.get_pending_absent_marks()
        for view_angle, class_name, object_id in pending_absent:
            self.db.mark_object_absent(object_id)

        # Cache results for when GPU is busy
        self.last_detections = detections
        self.last_object_ids = processed_object_ids

        return detections, processed_object_ids

    def _smooth_pan_to(self, target_angle):
        """Move pan servo smoothly to target angle in a background thread"""
        if self.is_panning:
            return

        def pan_worker():
            self.is_panning = True
            start_angle = self.current_pan

            # Mark servo movement timestamp (detection will pause)
            self.last_servo_move_time = time.time()

            # Use Arduino's built-in smooth movement (no threading needed)
            # Just send the target position and let Arduino interpolate
            self.pan_tilt.move_pan(int(target_angle))
            self.current_pan = target_angle

            # Brief delay to prevent command flooding
            time.sleep(0.1)
            self.is_panning = False

        thread = threading.Thread(target=pan_worker)
        thread.daemon = True
        thread.start()

    def _on_press(self, key):
        """Callback for key press events"""
        try:
            # Handle 'h' key for centering (if pan_tilt available)
            if hasattr(key, 'char') and key.char == 'h' and self.pan_tilt:
                self.current_pan = 90
                self.current_tilt = 110
                self.current_pan_index = 1  # Reset index to center

                # Mark servo movement timestamp (detection will pause)
                self.last_servo_move_time = time.time()

                self.pan_tilt.center()
                print(f"\n→ Camera centered (Pan: 90°, Tilt: 110°)")
                return

            if not self.pan_tilt:
                return

            # Handle arrow keys
            if key == keyboard.Key.left:
                if 'left' not in self.pressed_keys:
                    self.pressed_keys.add('left')
                    # Discrete Pan Left: Move to previous position
                    if self.current_pan_index > 0 and not self.is_panning:
                        self.current_pan_index -= 1
                        angle = self.pan_positions[self.current_pan_index]
                        print(f"\n→ Panning Left to {angle}°...")
                        self._smooth_pan_to(angle)
                    
            elif key == keyboard.Key.right:
                if 'right' not in self.pressed_keys:
                    self.pressed_keys.add('right')
                    # Discrete Pan Right: Move to next position
                    if self.current_pan_index < len(self.pan_positions) - 1 and not self.is_panning:
                        self.current_pan_index += 1
                        angle = self.pan_positions[self.current_pan_index]
                        print(f"\n→ Panning Right to {angle}°...")
                        self._smooth_pan_to(angle)

            elif key == keyboard.Key.up:
                if 'up' not in self.pressed_keys:
                    self.pressed_keys.add('up')
                    # Mark servo movement timestamp
                    self.last_servo_move_time = time.time()
                    self.pan_tilt.set_tilt_velocity(-self.tilt_velocity)
            elif key == keyboard.Key.down:
                if 'down' not in self.pressed_keys:
                    self.pressed_keys.add('down')
                    # Mark servo movement timestamp
                    self.last_servo_move_time = time.time()
                    self.pan_tilt.set_tilt_velocity(self.tilt_velocity)
        except AttributeError:
            pass

    def _on_release(self, key):
        """Callback for key release events"""
        if not self.pan_tilt:
            return

        try:
            # Handle arrow keys - send stop commands
            if key == keyboard.Key.left:
                self.pressed_keys.discard('left')
                # No stop_pan needed for discrete moves
            elif key == keyboard.Key.right:
                self.pressed_keys.discard('right')
                # No stop_pan needed for discrete moves
            elif key == keyboard.Key.up:
                self.pressed_keys.discard('up')
                self.pan_tilt.stop_tilt()
                # Mark servo movement timestamp (servo settling)
                self.last_servo_move_time = time.time()
            elif key == keyboard.Key.down:
                self.pressed_keys.discard('down')
                self.pan_tilt.stop_tilt()
                # Mark servo movement timestamp (servo settling)
                self.last_servo_move_time = time.time()
        except AttributeError:
            pass

    def _start_keyboard_listener(self):
        """Start the keyboard listener in a background thread"""
        self.keyboard_listener = keyboard.Listener(
            on_press=self._on_press,
            on_release=self._on_release
        )
        self.keyboard_listener.start()

    def run(self):
        show_depth = False
        paused = False
        frame_count = 0
        fps = 0.0
        fps_time = time.time()

        # Set up mouse callback for re-labeling
        cv2.namedWindow('Grounding DINO: Detection + Database + API')
        cv2.setMouseCallback('Grounding DINO: Detection + Database + API', self.relabeling_system.mouse_callback)

        print("\nRunning... Point Kinect at objects\n")

        try:
            while True:
                # Check if in re-labeling mode
                if self.relabeling_system.is_frozen:
                    # Show re-labeling UI (updates continuously)
                    vis = self.relabeling_system.get_visualization()
                    if vis is None:
                        if 'bgr_frame' in locals() and bgr_frame is not None:
                            vis = bgr_frame.copy()
                        elif 'rgb_frame' in locals() and rgb_frame is not None:
                            vis = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)
                        else:
                            vis = np.zeros((1080, 1920, 3), dtype=np.uint8)

                    vis_display = cv2.resize(vis, (1280, 720))
                    cv2.imshow('Grounding DINO: Detection + Database + API', vis_display)

                elif not paused:
                    rgb_frame, depth_frame = self.kinect.get_frames()

                    if rgb_frame is not None and depth_frame is not None:
                        # Convert RGB to BGR for OpenCV visualization
                        bgr_frame = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)

                        # Check if we're in servo cooldown period
                        time_since_servo_move = time.time() - self.last_servo_move_time
                        in_cooldown = time_since_servo_move < self.servo_cooldown

                        # Process frame only if not in cooldown
                        if not in_cooldown:
                            # Process frame - non-blocking, returns cached results when GPU is busy
                            # This keeps video smooth at full FPS while GPU processes async
                            detections, object_ids = self.process_frame(rgb_frame, depth_frame)
                        else:
                            # In cooldown - skip detection, use empty results
                            detections, object_ids = [], []

                        # Normal detection visualization (use BGR frame)
                        vis = self.detector.visualize(bgr_frame, detections, show_3d=True)

                        frame_count += 1
                        if frame_count % 30 == 0:
                            current_time = time.time()
                            fps = 30 / (current_time - fps_time)
                            fps_time = current_time

                        cv2.putText(vis, f"FPS: {fps:.1f}", (10, 30),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                        cv2.putText(vis, f"Detections: {len(detections)} | DB: {self.objects_created} created, {self.objects_updated} updated",
                                   (10, 60),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                        cv2.putText(vis, "GROUNDING DINO + Database + API (RTX 5090)",
                                   (10, 90),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

                        # Show current prompt
                        prompt_display = self.detector.text_prompt[:80] + "..." if len(self.detector.text_prompt) > 80 else self.detector.text_prompt
                        cv2.putText(vis, f"Prompt: {prompt_display}",
                                   (10, 120),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)

                        # Show current view and tracking info
                        view_summary = self.view_tracker.get_view_summary(self.current_pan)
                        tracked_count = view_summary.get('total_objects', 0)
                        cv2.putText(vis, f"View: {self.current_pan}° | Tracked: {tracked_count} objects",
                                   (10, 150),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

                        # Show servo cooldown status
                        if in_cooldown:
                            cooldown_remaining = self.servo_cooldown - time_since_servo_move
                            cv2.putText(vis, f"SERVO COOLDOWN: {cooldown_remaining:.1f}s",
                                       (10, 180),
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)

                        vis_display = cv2.resize(vis, (1280, 720))
                        cv2.imshow('Grounding DINO: Detection + Database + API', vis_display)

                        # Show depth view if enabled
                        if show_depth and depth_frame is not None:
                            depth_vis = self.kinect.visualize_depth(depth_frame)

                            for det in detections:
                                if det['center_3d'] is not None:
                                    cx, cy = det['center_2d']
                                    depth_x, depth_y = self.kinect.map_color_to_depth(cx, cy)
                                    cv2.circle(depth_vis, (depth_x, depth_y), 5, (0, 255, 0), -1)

                            depth_display = cv2.resize(depth_vis, (640, 530))
                            cv2.imshow('Depth View', depth_display)

                        # Periodic table assignment (tracker handles marking objects absent)
                        if frame_count % 300 == 0:
                            # Auto-assign unclassified objects to Unclassified table
                            unclassified_count = self.db.assign_unclassified_objects_to_table()
                            if unclassified_count > 0:
                                print(f"→ Auto-assigned {unclassified_count} object(s) to Unclassified table")

                else:
                    # Paused but not in labeling mode - show last frame with PAUSED text
                    if 'vis' in locals() and vis is not None:
                        paused_vis = vis.copy()
                        cv2.putText(paused_vis, "PAUSED", (paused_vis.shape[1]//2 - 100, 50),
                                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
                        vis_display = cv2.resize(paused_vis, (1280, 720))
                        cv2.imshow('Grounding DINO: Detection + Database + API', vis_display)

                # Use waitKey for OpenCV window handling and non-arrow keys
                key = cv2.waitKey(1) & 0xFF

                # Update Tkinter GUI event loop
                try:
                    self.tk_root.update_idletasks()
                    self.tk_root.update()
                except:
                    pass

                if key == ord('q') or key == 27:
                    print("\nShutting down...")
                    break

                elif key == ord('s'):
                    # Lowercase 's' - save screenshot
                    if 'vis' in locals() and vis is not None:
                        filename = f"grounding_dino_screenshot_{int(time.time())}.png"
                        cv2.imwrite(filename, vis)
                        print(f"\n[OK] Saved {filename}")

                elif key == ord('S'):
                    # Uppercase 'S' - enter re-labeling mode
                    if 'bgr_frame' in locals() and 'detections' in locals() and 'object_ids' in locals():
                        self.relabeling_system.capture_frame(bgr_frame, detections, object_ids)
                        paused = True

                elif key == ord('C'):
                    # Uppercase 'C' - Change detection prompt (OPEN VOCABULARY)
                    print("\n" + "=" * 70)
                    print("OPEN VOCABULARY MODE - Change Detection Prompt")
                    print("=" * 70)
                    print("Enter your detection prompt (separate items with periods or commas)")
                    print("Examples:")
                    print("  - person. face. hand. laptop. phone")
                    print("  - red car. blue truck. motorcycle")
                    print("  - coffee mug. water bottle. notebook")
                    print("  - anything you want to detect!")
                    print(f"\nCurrent prompt: {self.detector.text_prompt}")
                    print()
                    new_prompt = input("Enter new prompt: ").strip()
                    if new_prompt:
                        new_classes = [c.strip() for c in new_prompt.replace(',', '.').split('.') if c.strip()]
                        self.detector.update_classes(new_classes)
                        print(f"✓ Updated detection classes")
                    else:
                        print("✗ Prompt unchanged")
                    print("=" * 70 + "\n")

                elif key == ord('d'):
                    show_depth = not show_depth
                    if not show_depth:
                        cv2.destroyWindow('Depth View')
                    print(f"\n→ Depth view: {'ON' if show_depth else 'OFF'}")

                elif key == ord('i'):
                    if 'detections' in locals() and detections:
                        print("\n" + "=" * 70)
                        print(f"CURRENT DETECTIONS ({len(detections)}):")
                        print("=" * 70)
                        for i, det in enumerate(detections, 1):
                            print(f"\n[{i}] {det['class_name'].upper()}")
                            print(f"    Confidence: {det['confidence']:.2%}")
                            if det['center_3d'] is not None:
                                x, y, z = det['center_3d']
                                print(f"    Position: ({x:.0f}, {y:.0f}, {z:.0f}) mm")
                        print("=" * 70 + "\n")

                elif key == ord('p'):
                    stats = self.db.get_statistics()
                    print("\n" + "=" * 70)
                    print("DATABASE STATISTICS")
                    print("=" * 70)
                    print(f"Total objects:        {stats['total_objects']}")
                    print(f"Present objects:      {stats['present_objects']}")
                    print(f"Total detections:     {stats['total_detections']}")
                    print(f"\nClass distribution:")
                    for cls, count in stats['class_distribution'].items():
                        print(f"  {cls:25s}: {count}")
                    print("=" * 70 + "\n")

                elif key == ord('v'):
                    # Show view tracker status
                    print("\n" + "=" * 70)
                    print("PER-VIEW OBJECT TRACKER STATUS")
                    print("=" * 70)
                    summaries = self.view_tracker.get_all_views_summary()
                    for summary in summaries:
                        view_angle = summary['view_angle']
                        current_marker = " [CURRENT]" if view_angle == self.current_pan else ""
                        print(f"\nView {view_angle}°{current_marker}: {summary['total_objects']} object(s) tracked")
                        if summary['objects']:
                            for obj in summary['objects']:
                                if obj['in_db']:
                                    presence = "PRESENT" if obj.get('is_present', False) else "ABSENT"
                                    status = f"[DB:{obj['object_id']}] {presence}"
                                else:
                                    status = "PENDING"
                                print(f"  - {obj['class_name']:20s} {status:20s} | detections: {obj['detection_count']:3d} | last seen: {obj['time_since_seen']:.1f}s ago")
                        else:
                            print("  (no objects)")
                    print("=" * 70 + "\n")

                elif key == ord('c'):
                    # Show current detections
                    print(f"\n→ Current detections: {len(self.last_detections)}")
                    for i, det in enumerate(self.last_detections):
                        obj_id = self.last_object_ids[i] if i < len(self.last_object_ids) else None
                        print(f"    {det['class_name']} → DB object {obj_id}")

                elif key == ord(' '):
                    paused = not paused
                    print(f"\n→ {'PAUSED' if paused else 'RESUMED'}")

                # Re-labeling mode controls
                if self.relabeling_system.is_frozen:
                    # Resume command (R key)
                    if key == ord('R'):
                        self.relabeling_system.resume_live_feed()
                        paused = False

                # Arrow keys and 'h' (home) are now handled by the pynput keyboard listener

        except KeyboardInterrupt:
            print("\n\nInterrupted by user (Ctrl+C)")

        except Exception as e:
            print(f"\n\n✗ ERROR during execution:")
            print(f"  {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

        finally:
            print("\nCleaning up...")

            # Stop keyboard listener
            if self.keyboard_listener:
                self.keyboard_listener.stop()

            # Stop any pan-tilt movement
            if self.pan_tilt:
                self.pan_tilt.stop_all()

            self.kinect.close()
            self.db.close()
            if self.pan_tilt:
                self.pan_tilt.close()
            cv2.destroyAllWindows()
            print("[OK] Done\n")


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Visual Database - Grounding DINO System (RTX 5090)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python backend_grounding_dino.py
  python backend_grounding_dino.py --confidence 0.20
  python backend_grounding_dino.py --classes calculator mouse keyboard
  python backend_grounding_dino.py --endpoint https://your-pod.proxy.runpod.net/run
        """
    )

    # Detection classes
    parser.add_argument('--classes', nargs='+', default=None,
                        help='Classes to detect (default: load from database)')
    parser.add_argument('--confidence', type=float, default=0.40,
                        help='Detection confidence threshold (default: 0.40)')
    parser.add_argument('--endpoint', default=None,
                        help='RunPod endpoint URL (default: from detector)')

    # System settings
    parser.add_argument('--api-host', default='127.0.0.1',
                        help='API server host (default: 127.0.0.1)')
    parser.add_argument('--api-port', type=int, default=8000,
                        help='API server port (default: 8000)')
    parser.add_argument('--ema-alpha', type=float, default=0.25,
                        help='EMA smoothing factor for position tracking (0.0-1.0, default: 0.25)')

    # Grounding DINO specific
    parser.add_argument('--resize-width', type=int, default=1920,
                        help='Resize frames to this width for GPU upload (default: 1920 - full resolution)')
    parser.add_argument('--jpeg-quality', type=int, default=100,
                        help='JPEG quality for compression (1-100, default: 100 - maximum quality)')

    args = parser.parse_args()

    print("=" * 70)
    print("DETECTION CONFIGURATION")
    print("=" * 70)

    # Load classes from database if not specified via CLI
    detection_classes = args.classes
    if detection_classes is None:
        print("Loading classes from database...")
        # Use the shared database instance from api_server (no redundant connection)
        # Ensure shadow fallback class exists (hidden from UI)
        shared_db.ensure_shadow_class()

        # Get user-defined active classes (shadow class is filtered out)
        active_classes = shared_db.get_all_classes(active_only=True, include_shadow=False)

        if not active_classes:
            print("⚠ No user-defined classes found!")
            print("Using shadow fallback class to allow system startup.")
            print("\nAdd classes via:")
            print("  1. Frontend Class Manager (http://localhost:5173/classes)")
            print("  2. Or use: python backend_grounding_dino.py --classes laptop mouse keyboard")
            # Include shadow class when no user classes exist
            active_classes = shared_db.get_all_classes(active_only=True, include_shadow=True)

        if active_classes:
            detection_classes = [cls['name'] for cls in active_classes]
            print(f"✓ Loaded {len(detection_classes)} active classes from database")
        else:
            print("✗ ERROR: Failed to load classes!")
            return

    print(f"Classes to detect: {detection_classes}")
    print(f"Confidence threshold: {args.confidence:.2f} ({args.confidence*100:.0f}%)")
    print(f"Video: Full FPS (GPU detection runs async)")
    print(f"EMA alpha (position smoothing): {args.ema_alpha:.2f}")
    print(f"GPU upload resolution: {args.resize_width}px")
    print(f"JPEG quality: {args.jpeg_quality}%")
    print("=" * 70)

    try:
        system = GroundingDinoSystem(
            detection_classes=detection_classes,
            endpoint=args.endpoint,
            api_host=args.api_host,
            api_port=args.api_port,
            ema_alpha=args.ema_alpha,
            confidence=args.confidence,
            resize_width=args.resize_width,
            jpeg_quality=args.jpeg_quality
        )
        system.run()

    except Exception as e:
        print(f"\n✗ Failed to start system: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
