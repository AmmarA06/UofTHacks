"""
Per-View Object Tracker

Tracks object detections across multiple camera views (servo positions).
Ensures each object class is only added to the database once per view.

Features:
- Tracks up to 1 object per class per view
- Detects when objects appear/disappear from views
- Time-based disappearance detection (2 second timeout)
- Guards database insertion (one-time per object per view)
- Periodic thumbnail replacement (10s interval OR +0.15 confidence boost)
- Periodic position/confidence updates with EMA smoothing
- CV-based movement detection using 2D bounding box coordinates
- Behavioral state machine (WINDOW_SHOPPED, CART_ABANDONED, PRODUCT_PURCHASED)
"""

import time
from typing import List, Dict, Tuple, Optional
from movement_detector import MovementDetector, BehavioralState


class ViewObjectTracker:
    """
    Tracks object state across multiple camera views.

    Each view is independent - an object can exist at multiple views
    and will be tracked separately at each location.
    """

    def __init__(self, views=[0, 90, 180], disappear_timeout=5.0,
                 update_interval=10.0, quality_threshold=0.15,
                 movement_threshold_percent=10.0, frame_width=1920, frame_height=1080):
        """
        Initialize the view tracker.

        Args:
            views: List of servo angles representing discrete views
            disappear_timeout: Seconds before an object is considered "left" (default: 5.0s)
            update_interval: Seconds between periodic data updates (default: 10.0s)
            quality_threshold: Confidence boost needed for quality-based update (default: 0.15)
            movement_threshold_percent: Percentage of frame dimensions for movement detection (default: 10.0%)
            frame_width: Frame width for movement threshold calculation (default: 1920)
            frame_height: Frame height for movement threshold calculation (default: 1080)
        """
        self.views = views
        self.disappear_timeout = disappear_timeout
        self.update_interval = update_interval
        self.quality_threshold = quality_threshold

        # State structure:
        # {view_angle: {class_name: {
        #     'object_id': int or None,
        #     'last_seen_time': timestamp,
        #     'first_seen_time': timestamp,
        #     'in_db': bool,
        #     'is_present': bool,
        #     'detection_count': int,
        #     'last_update_time': timestamp,  # When we last updated DB
        #     'best_confidence': float,        # Best confidence seen
        #     'last_known_position_3d': tuple or None,  # For tracking when depth unavailable
        #     'last_real_depth': float or None,         # Last measured REAL depth (not estimated)
        #     'has_ever_had_real_depth': bool,          # Ever had real depth measurement
        #     'depth_history': list,                    # Recent real depth measurements
        #     'last_bbox': tuple or None                # For 2D matching fallback
        # }}}
        self.view_states = {view: {} for view in views}

        # Track objects that need to be marked as absent
        self.pending_absent_marks = []  # List of (view_angle, class_name, object_id)

        # Initialize movement detector for CV-based isMoved tracking
        self.movement_detector = MovementDetector(
            movement_threshold_percent=movement_threshold_percent,
            frame_width=frame_width,
            frame_height=frame_height
        )

        # Pending behavioral events (from movement detector)
        self.pending_behavioral_events = []

        print(f"[ViewTracker] Initialized with {len(views)} views: {views}")
        print(f"[ViewTracker] Disappear timeout: {disappear_timeout}s")
        print(f"[ViewTracker] Update interval: {update_interval}s, quality threshold: +{quality_threshold}")
        print(f"[ViewTracker] Movement threshold: {movement_threshold_percent}% of frame dimensions")
        print(f"[ViewTracker] ALWAYS-TRACK MODE: Objects tracked even without depth (estimation enabled)")

    def update(self, current_view: int, detections: List[Dict]) -> List[Tuple[Dict, str, Optional[int]]]:
        """
        Update tracking state for the current view.

        Args:
            current_view: Current servo angle (must be in self.views)
            detections: List of detection dicts from detector

        Returns:
            List of (detection, action, object_id) tuples where action is:
            - 'add_to_db': Create new database entry (object_id will be None)
            - 'update_present': Update existing object, mark as present (object_id provided)
            - 'update_data': Periodic refresh of thumbnail/position/confidence (object_id provided)
            - 'skip': Object already present and tracked, no update needed (object_id provided)
        """
        if current_view not in self.view_states:
            print(f"⚠ Warning: View {current_view}° not in configured views {self.views}")
            return []

        current_time = time.time()
        view_state = self.view_states[current_view]

        # Keep only best detection per class (highest confidence)
        class_detections = {}
        for det in detections:
            class_name = det['class_name']
            if class_name not in class_detections or det['confidence'] > class_detections[class_name]['confidence']:
                class_detections[class_name] = det

        detected_classes = set(class_detections.keys())
        actions = []

        # Process detected objects
        for class_name, det in class_detections.items():
            # Extract position info (may be None initially)
            center_3d = det.get('center_3d')
            bbox = det.get('bbox')
            depth_source = det.get('depth_source', 'real')  # Track if depth is real or estimated
            
            if class_name not in view_state:
                # First time seeing this class at this view - create new entry
                view_state[class_name] = {
                    'object_id': None,
                    'last_seen_time': current_time,
                    'first_seen_time': current_time,
                    'in_db': False,
                    'is_present': False,
                    'detection_count': 1,
                    'last_update_time': current_time,
                    'best_confidence': det.get('confidence', 0.0),
                    'last_known_position_3d': center_3d if center_3d else None,
                    'last_real_depth': None,  # No real depth yet
                    'has_ever_had_real_depth': False,
                    'depth_history': [],
                    'last_bbox': bbox
                }
                
                # Inject last known position for database (always available now)
                det['last_known_position_3d'] = center_3d
                
                # Mark depth source
                if center_3d:
                    det['depth_source'] = depth_source
                    print(f"  [View {current_view}°] NEW: {class_name} (first detection, depth={depth_source})")
                else:
                    det['depth_source'] = 'unknown'
                    print(f"  [View {current_view}°] NEW: {class_name} (no position available)")
                
                # ALWAYS add to database (even with estimated position)
                actions.append((det, 'add_to_db', None))
            else:
                # Seen before at this view
                state = view_state[class_name]
                state['last_seen_time'] = current_time
                state['detection_count'] += 1

                # Update depth tracking
                if center_3d is not None:
                    state['last_known_position_3d'] = center_3d
                    
                    # Track real depth measurements
                    if depth_source == 'real':
                        # Extract depth from z-coordinate
                        _, _, z = center_3d
                        state['last_real_depth'] = z
                        state['has_ever_had_real_depth'] = True
                        
                        # Keep history of last 5 real depths for averaging
                        if 'depth_history' not in state:
                            state['depth_history'] = []
                        state['depth_history'].append(z)
                        if len(state['depth_history']) > 5:
                            state['depth_history'].pop(0)

                # Update bbox
                if bbox is not None:
                    state['last_bbox'] = bbox

                # Inject last known position into detection (for database fallback)
                det['last_known_position_3d'] = state['last_known_position_3d']
                det['depth_source'] = depth_source

                if not state['in_db']:
                    # Hasn't been added to DB yet - ALWAYS try to add now
                    print(f"  [View {current_view}°] RETRY: {class_name} (not yet in DB, depth={depth_source})")
                    actions.append((det, 'add_to_db', None))
                elif not state['is_present']:
                    # Was absent, now present again - update existing DB entry
                    print(f"  [View {current_view}°] REAPPEAR: {class_name} (was absent, now present, depth={depth_source})")
                    state['is_present'] = True
                    state['last_update_time'] = current_time
                    state['best_confidence'] = det.get('confidence', 0.0)

                    # Re-register with movement detector (new "home" position)
                    if bbox is not None and state['object_id'] is not None:
                        self.movement_detector.register_object(
                            current_view, class_name, state['object_id'], bbox
                        )

                    actions.append((det, 'update_present', state['object_id']))
                else:
                    # Already present and tracked - update movement detection
                    # Only track movement with REAL depth to avoid false positives
                    if bbox is not None and state['object_id'] is not None and depth_source == 'real':
                        movement_state = self.movement_detector.update_position(
                            current_view, class_name, bbox
                        )
                        # Inject movement state into detection for database update
                        if movement_state:
                            det['is_moved'] = movement_state.is_moved
                            det['behavioral_state'] = movement_state.behavioral_state.value

                    # Check if we need periodic update
                    current_confidence = det.get('confidence', 0.0)
                    time_since_update = current_time - state['last_update_time']
                    confidence_boost = current_confidence - state['best_confidence']

                    # Check update conditions
                    needs_time_update = time_since_update >= self.update_interval
                    needs_quality_update = confidence_boost >= self.quality_threshold

                    if needs_time_update or needs_quality_update:
                        # Periodic update: refresh thumbnail and data
                        reason = []
                        if needs_time_update:
                            reason.append(f"{time_since_update:.1f}s elapsed")
                        if needs_quality_update:
                            reason.append(f"quality +{confidence_boost:.2f}")

                        print(f"  [View {current_view}°] UPDATE: {class_name} ({', '.join(reason)})")
                        state['last_update_time'] = current_time
                        state['best_confidence'] = max(state['best_confidence'], current_confidence)
                        actions.append((det, 'update_data', state['object_id']))
                    else:
                        # No update needed
                        actions.append((det, 'skip', state['object_id']))

        # Check for disappeared objects (classes seen before but not detected now)
        for class_name in list(view_state.keys()):
            if class_name not in detected_classes:
                state = view_state[class_name]
                time_since_seen = current_time - state['last_seen_time']

                # Check if timeout exceeded and object is currently marked as present
                if time_since_seen > self.disappear_timeout and state['is_present']:
                    # Mark as absent (don't delete from state - keep tracking in case it comes back)
                    state['is_present'] = False
                    if state['in_db'] and state['object_id'] is not None:
                        # Trigger EXIT behavioral event in movement detector
                        exit_event = self.movement_detector.handle_exit(current_view, class_name)
                        if exit_event:
                            self.pending_behavioral_events.append(exit_event)

                        self.pending_absent_marks.append((current_view, class_name, state['object_id']))
                        print(f"  [View {current_view}°] ABSENT: {class_name} (timeout: {time_since_seen:.1f}s, object_id: {state['object_id']})")

        return actions

    def mark_added_to_db(self, view_angle: int, class_name: str, object_id: int,
                        bbox: Tuple[int, int, int, int] = None):
        """
        Mark that an object has been successfully added to the database.
        Also registers the object with movement detector for isMoved tracking.

        Args:
            view_angle: Servo angle of the view
            class_name: Class name of the object
            object_id: Database object ID
            bbox: Initial bounding box (x, y, w, h) for home position
        """
        if view_angle in self.view_states:
            if class_name in self.view_states[view_angle]:
                state = self.view_states[view_angle][class_name]
                state['in_db'] = True
                state['object_id'] = object_id
                state['is_present'] = True
                # Initialize update time if not set (for newly created objects)
                if 'last_update_time' not in state:
                    state['last_update_time'] = time.time()
                if 'best_confidence' not in state:
                    state['best_confidence'] = 0.0

                # Register with movement detector for isMoved tracking (ENTRY event)
                # Use provided bbox or fall back to last known bbox
                home_bbox = bbox or state.get('last_bbox')
                if home_bbox is not None:
                    self.movement_detector.register_object(
                        view_angle, class_name, object_id, home_bbox
                    )

                print(f"  [View {view_angle}°] DB_ADD: {class_name} -> object_id {object_id}")

    def get_pending_absent_marks(self) -> List[Tuple[int, str, int]]:
        """
        Get and clear the list of objects that need to be marked as absent in DB.

        Returns:
            List of (view_angle, class_name, object_id) tuples
        """
        pending = self.pending_absent_marks.copy()
        self.pending_absent_marks.clear()
        return pending

    def get_pending_behavioral_events(self) -> List[Dict]:
        """
        Get and clear pending behavioral events (WINDOW_SHOPPED, CART_ABANDONED, PRODUCT_PURCHASED).

        Returns:
            List of behavioral event dictionaries
        """
        # Get events from movement detector
        movement_events = self.movement_detector.get_pending_events()
        # Combine with any pending behavioral events
        all_events = self.pending_behavioral_events + movement_events
        self.pending_behavioral_events.clear()
        return all_events

    def set_movement_threshold(self, percent: float):
        """
        Update the movement threshold percentage.

        Args:
            percent: New threshold percentage (0-100). Default is 10%.
        """
        self.movement_detector.set_threshold(percent)

    def get_movement_threshold(self) -> float:
        """Get current movement threshold percentage."""
        return self.movement_detector.movement_threshold_percent

    def get_object_movement_state(self, view_angle: int, class_name: str):
        """
        Get movement state for a specific object.

        Returns:
            ObjectMovementState or None if not tracked
        """
        return self.movement_detector.get_object_state(view_angle, class_name)

    def get_view_summary(self, view_angle: int) -> Dict:
        """
        Get summary of objects currently tracked at a view.

        Args:
            view_angle: Servo angle of the view

        Returns:
            Dict with view statistics
        """
        if view_angle not in self.view_states:
            return {}

        view_state = self.view_states[view_angle]
        current_time = time.time()

        summary = {
            'view_angle': view_angle,
            'total_objects': len(view_state),
            'objects': []
        }

        for class_name, state in view_state.items():
            time_since_seen = current_time - state['last_seen_time']

            # Get movement state if available
            movement_state = self.movement_detector.get_object_state(view_angle, class_name)
            is_moved = movement_state.is_moved if movement_state else False
            behavioral_state = movement_state.behavioral_state.value if movement_state else 'NONE'

            summary['objects'].append({
                'class_name': class_name,
                'object_id': state['object_id'],
                'in_db': state['in_db'],
                'is_present': state['is_present'],
                'detection_count': state['detection_count'],
                'time_since_seen': time_since_seen,
                'first_seen': state['first_seen_time'],
                'is_moved': is_moved,
                'behavioral_state': behavioral_state
            })

        return summary

    def get_all_views_summary(self) -> List[Dict]:
        """Get summary for all views."""
        return [self.get_view_summary(view) for view in self.views]

    def clear_view(self, view_angle: int):
        """Clear all tracked objects for a specific view."""
        if view_angle in self.view_states:
            self.view_states[view_angle] = {}
            print(f"[ViewTracker] Cleared view {view_angle}°")

    def reset_all(self):
        """Reset all view states."""
        for view in self.views:
            self.view_states[view] = {}
        print("[ViewTracker] Reset all views")


# Test code
if __name__ == "__main__":
    print("=" * 60)
    print("View Object Tracker - Test Mode")
    print("=" * 60)

    tracker = ViewObjectTracker(views=[0, 90, 180], disappear_timeout=3.0)

    # Simulate detections at view 0°
    print("\n--- Frame 1: View 0° ---")
    detections = [
        {'class_name': 'cup', 'confidence': 0.85, 'center_3d': (100, 50, 1200)},
        {'class_name': 'laptop', 'confidence': 0.92, 'center_3d': (200, 100, 1500)}
    ]
    actions = tracker.update(0, detections)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")

    # Mark as added to DB
    tracker.mark_added_to_db(0, 'cup', 1)
    tracker.mark_added_to_db(0, 'laptop', 2)

    # Same objects detected again (should skip)
    print("\n--- Frame 2: View 0° (same objects) ---")
    actions = tracker.update(0, detections)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")

    # Switch to view 90° - same classes but different view
    print("\n--- Frame 3: View 90° ---")
    detections_90 = [
        {'class_name': 'cup', 'confidence': 0.80, 'center_3d': (300, 150, 1100)}
    ]
    actions = tracker.update(90, detections_90)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")
    tracker.mark_added_to_db(90, 'cup', 3)

    # Wait and check disappearance
    print("\n--- Frame 4: View 0° (cup disappeared) ---")
    time.sleep(3.5)  # Exceed timeout
    detections_partial = [
        {'class_name': 'laptop', 'confidence': 0.91, 'center_3d': (200, 100, 1500)}
    ]
    actions = tracker.update(0, detections_partial)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")

    # Check for pending absent marks
    absent_marks = tracker.get_pending_absent_marks()
    print(f"\nPending absent marks: {len(absent_marks)}")
    for view, cls, obj_id in absent_marks:
        print(f"  - View {view}: {cls} (obj_id: {obj_id}) -> mark as ABSENT")

    # Cup reappears at view 0
    print("\n--- Frame 5: View 0° (cup reappears) ---")
    detections_reappear = [
        {'class_name': 'cup', 'confidence': 0.88, 'center_3d': (105, 52, 1195)},
        {'class_name': 'laptop', 'confidence': 0.93, 'center_3d': (200, 100, 1500)}
    ]
    actions = tracker.update(0, detections_reappear)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")

    # Test periodic updates
    print("\n--- Testing Periodic Updates ---")

    # Frame 6: Same objects, short time (should skip)
    print("\n--- Frame 6: View 0° (2s later) ---")
    time.sleep(2.0)
    detections_same = [
        {'class_name': 'cup', 'confidence': 0.88, 'center_3d': (105, 52, 1195)}
    ]
    actions = tracker.update(0, detections_same)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")

    # Frame 7: Quality boost (should update_data)
    print("\n--- Frame 7: View 0° (quality boost +0.16) ---")
    detections_quality = [
        {'class_name': 'cup', 'confidence': 1.04, 'center_3d': (105, 52, 1195)}  # 0.88 + 0.16
    ]
    actions = tracker.update(0, detections_quality)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")

    # Frame 8: Wait for time-based update
    print("\n--- Frame 8: View 0° (10s later) ---")
    time.sleep(3.5)  # Total 3.5s to simulate (using shorter time for test)
    # Manually adjust update time for test
    tracker.update_interval = 3.0  # Lower threshold for testing
    detections_time = [
        {'class_name': 'cup', 'confidence': 0.90, 'center_3d': (105, 52, 1195)}
    ]
    actions = tracker.update(0, detections_time)
    for det, action, obj_id in actions:
        print(f"  - {det['class_name']}: {action} (obj_id: {obj_id})")

    # Summary
    print("\n--- View Summaries ---")
    for summary in tracker.get_all_views_summary():
        print(f"\nView {summary['view_angle']}°: {summary['total_objects']} objects")
        for obj in summary['objects']:
            status = "PRESENT" if obj['is_present'] else "ABSENT"
            print(f"  - {obj['class_name']}: obj_id={obj['object_id']}, {status}, detections={obj['detection_count']}, in_db={obj['in_db']}")

    print("\n[OK] Test complete")
