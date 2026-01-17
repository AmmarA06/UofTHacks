"""
CV-Based Movement Detector

Tracks object movement using 2D camera bounding box center coordinates.
Determines if an object has been moved from its "home" position using a
configurable displacement threshold.

Movement Logic:
- Stores the initial (home) position when an object first appears
- Calculates displacement from home as a percentage of frame dimensions
- Sets isMoved=True if displacement exceeds threshold
- Resets isMoved=False if object returns within threshold of home position (with tolerance)

Person Proximity Logic:
- Tracks when a 'person' class is detected near an object
- Sets person_triggered=True when person is within proximity threshold
- Sets person_triggered=False when person leaves proximity

Behavioral State Triggers:
- WINDOW_SHOPPED: ENTRY -> person_triggered=True -> person_triggered=False
                 (person interacted with object but didn't move it, fires immediately when person leaves)
- CART_ABANDONED: isMoved(True) -> isMoved(False)
                 (object picked up then returned to shelf, easier threshold with tolerance)
- PRODUCT_PURCHASED: isMoved(True) -> EXIT
                    (object picked up and taken away)
"""

import time
from typing import Dict, Tuple, Optional, List
from enum import Enum
from dataclasses import dataclass, field


class BehavioralState(str, Enum):
    """Behavioral states for retail analytics"""
    NONE = "NONE"                           # Initial state, no behavior detected
    PRESENT = "PRESENT"                     # Object is present, no movement yet
    MOVED = "MOVED"                         # Object has been moved from home
    WINDOW_SHOPPED = "WINDOW_SHOPPED"       # ENTRY -> EXIT without movement
    CART_ABANDONED = "CART_ABANDONED"       # Moved then returned to shelf
    PRODUCT_PURCHASED = "PRODUCT_PURCHASED" # Moved then exited (taken)


@dataclass
class ObjectMovementState:
    """Tracks movement state for a single object"""
    object_id: int
    class_name: str

    # Home position (first seen position)
    home_x: float = 0.0
    home_y: float = 0.0
    home_bbox: Tuple[int, int, int, int] = (0, 0, 0, 0)  # x, y, w, h

    # Current position
    current_x: float = 0.0
    current_y: float = 0.0

    # Movement state
    is_moved: bool = False
    was_ever_moved: bool = False  # Track if object was ever moved (for CART_ABANDONED)

    # Behavioral state
    behavioral_state: BehavioralState = BehavioralState.NONE

    # Timestamps
    first_seen_time: float = 0.0
    last_seen_time: float = 0.0
    moved_time: Optional[float] = None      # When isMoved became True
    returned_time: Optional[float] = None   # When object returned to home

    # Frame dimensions (for threshold calculation)
    frame_width: int = 1920
    frame_height: int = 1080


class MovementDetector:
    """
    CV-based movement detector using 2D bounding box center coordinates.

    Determines if an object has moved from its initial "home" position
    by comparing center point displacement against a configurable threshold.
    """

    def __init__(self,
                 movement_threshold_percent: float = 10.0,
                 return_tolerance_factor: float = 1.5,
                 frame_width: int = 1920,
                 frame_height: int = 1080):
        """
        Initialize the movement detector.

        Args:
            movement_threshold_percent: Percentage of frame width/height that
                                       constitutes "movement". Default 10%.
                                       Easily configurable.
            return_tolerance_factor: Multiplier for return threshold (default 1.5x).
                                    Makes it easier to trigger CART_ABANDONED.
            frame_width: Default frame width for threshold calculation
            frame_height: Default frame height for threshold calculation
        """
        self.movement_threshold_percent = movement_threshold_percent
        self.return_tolerance_factor = return_tolerance_factor
        self.frame_width = frame_width
        self.frame_height = frame_height

        # Object states: {(view_angle, class_name): ObjectMovementState}
        self.object_states: Dict[Tuple[int, str], ObjectMovementState] = {}

        # Pending behavioral events (to be consumed by event system)
        self.pending_events: List[Dict] = []

        # Person proximity tracking for WINDOW_SHOPPED
        # {(view_angle, class_name): {'person_triggered': bool, 'last_person_time': float}}
        self.person_proximity: Dict[Tuple[int, str], Dict] = {}

        print(f"[MovementDetector] Initialized with {movement_threshold_percent}% threshold")
        print(f"[MovementDetector] Return tolerance: {return_tolerance_factor}x (easier CART_ABANDONED)")
        print(f"[MovementDetector] Frame dimensions: {frame_width}x{frame_height}")
        print(f"[MovementDetector] Threshold pixels: X={self._get_threshold_x():.0f}px, Y={self._get_threshold_y():.0f}px")

    def _get_threshold_x(self) -> float:
        """Get X-axis threshold in pixels"""
        return self.frame_width * (self.movement_threshold_percent / 100.0)

    def _get_threshold_y(self) -> float:
        """Get Y-axis threshold in pixels"""
        return self.frame_height * (self.movement_threshold_percent / 100.0)

    def set_threshold(self, percent: float):
        """
        Update the movement threshold percentage.

        Args:
            percent: New threshold percentage (0-100)
        """
        self.movement_threshold_percent = max(0.0, min(100.0, percent))
        print(f"[MovementDetector] Threshold updated to {self.movement_threshold_percent}%")
        print(f"[MovementDetector] New threshold pixels: X={self._get_threshold_x():.0f}px, Y={self._get_threshold_y():.0f}px")

    def set_frame_dimensions(self, width: int, height: int):
        """Update frame dimensions for threshold calculation"""
        self.frame_width = width
        self.frame_height = height

    def _calculate_displacement(self, state: ObjectMovementState) -> Tuple[float, float]:
        """
        Calculate displacement from home position.

        Returns:
            (dx, dy): Displacement in pixels
        """
        dx = abs(state.current_x - state.home_x)
        dy = abs(state.current_y - state.home_y)
        return dx, dy

    def _is_beyond_threshold(self, dx: float, dy: float) -> bool:
        """
        Check if displacement exceeds movement threshold.

        Uses OR logic: moved if EITHER x OR y displacement exceeds threshold.
        """
        threshold_x = self._get_threshold_x()
        threshold_y = self._get_threshold_y()
        return dx > threshold_x or dy > threshold_y

    def _is_within_threshold(self, dx: float, dy: float, use_tolerance: bool = True) -> bool:
        """
        Check if object is within threshold of home position.

        Uses AND logic: home if BOTH x AND y are within threshold.

        Args:
            dx: X displacement in pixels
            dy: Y displacement in pixels
            use_tolerance: If True, apply return_tolerance_factor for easier CART_ABANDONED
        """
        threshold_x = self._get_threshold_x()
        threshold_y = self._get_threshold_y()

        if use_tolerance:
            # More lenient threshold for returning (makes CART_ABANDONED easier to trigger)
            threshold_x *= self.return_tolerance_factor
            threshold_y *= self.return_tolerance_factor

        return dx <= threshold_x and dy <= threshold_y

    def _get_bbox_center(self, bbox: Tuple[int, int, int, int]) -> Tuple[float, float]:
        """
        Calculate center point from bounding box.

        Args:
            bbox: (x, y, width, height)

        Returns:
            (center_x, center_y)
        """
        x, y, w, h = bbox
        center_x = x + w / 2.0
        center_y = y + h / 2.0
        return center_x, center_y

    def register_object(self, view_angle: int, class_name: str, object_id: int,
                       bbox: Tuple[int, int, int, int]) -> ObjectMovementState:
        """
        Register a new object and set its home position.
        Called on ENTRY event.

        Args:
            view_angle: Camera view angle
            class_name: Object class name
            object_id: Database object ID
            bbox: Initial bounding box (x, y, w, h)

        Returns:
            ObjectMovementState for the registered object
        """
        key = (view_angle, class_name)
        center_x, center_y = self._get_bbox_center(bbox)
        current_time = time.time()

        state = ObjectMovementState(
            object_id=object_id,
            class_name=class_name,
            home_x=center_x,
            home_y=center_y,
            home_bbox=bbox,
            current_x=center_x,
            current_y=center_y,
            is_moved=False,
            was_ever_moved=False,
            behavioral_state=BehavioralState.PRESENT,
            first_seen_time=current_time,
            last_seen_time=current_time,
            frame_width=self.frame_width,
            frame_height=self.frame_height
        )

        self.object_states[key] = state
        print(f"  [Movement] Registered {class_name} at home ({center_x:.0f}, {center_y:.0f})")

        return state

    def update_position(self, view_angle: int, class_name: str,
                       bbox: Tuple[int, int, int, int]) -> Optional[ObjectMovementState]:
        """
        Update object position and check for movement.

        Args:
            view_angle: Camera view angle
            class_name: Object class name
            bbox: Current bounding box (x, y, w, h)

        Returns:
            Updated ObjectMovementState, or None if object not registered
        """
        key = (view_angle, class_name)

        if key not in self.object_states:
            return None

        state = self.object_states[key]
        center_x, center_y = self._get_bbox_center(bbox)
        current_time = time.time()

        # Update current position
        state.current_x = center_x
        state.current_y = center_y
        state.last_seen_time = current_time

        # Calculate displacement from home
        dx, dy = self._calculate_displacement(state)

        # Check movement state transitions
        was_moved = state.is_moved

        if not state.is_moved:
            # Check if object has moved beyond threshold
            if self._is_beyond_threshold(dx, dy):
                state.is_moved = True
                state.was_ever_moved = True
                state.moved_time = current_time
                state.behavioral_state = BehavioralState.MOVED

                print(f"  [Movement] {class_name} MOVED! Displacement: ({dx:.0f}, {dy:.0f})px")

                # Queue event
                self.pending_events.append({
                    'type': 'MOVED',
                    'object_id': state.object_id,
                    'class_name': class_name,
                    'view_angle': view_angle,
                    'displacement': (dx, dy),
                    'timestamp': current_time
                })
        else:
            # Check if object has returned to home
            if self._is_within_threshold(dx, dy):
                state.is_moved = False
                state.returned_time = current_time
                state.behavioral_state = BehavioralState.CART_ABANDONED

                print(f"  [Movement] {class_name} RETURNED to home! -> CART_ABANDONED")

                # Queue CART_ABANDONED event
                self.pending_events.append({
                    'type': 'CART_ABANDONED',
                    'object_id': state.object_id,
                    'class_name': class_name,
                    'view_angle': view_angle,
                    'time_moved_seconds': current_time - state.moved_time if state.moved_time else 0,
                    'timestamp': current_time
                })

        return state

    def handle_exit(self, view_angle: int, class_name: str) -> Optional[Dict]:
        """
        Handle object EXIT event and determine behavioral outcome.

        Args:
            view_angle: Camera view angle
            class_name: Object class name

        Returns:
            Behavioral event dict, or None if object not registered
        """
        key = (view_angle, class_name)

        if key not in self.object_states:
            return None

        state = self.object_states[key]
        current_time = time.time()

        event = None

        if state.is_moved:
            # Object was moved and then exited -> PRODUCT_PURCHASED
            state.behavioral_state = BehavioralState.PRODUCT_PURCHASED
            event = {
                'type': 'PRODUCT_PURCHASED',
                'object_id': state.object_id,
                'class_name': class_name,
                'view_angle': view_angle,
                'time_moved_seconds': current_time - state.moved_time if state.moved_time else 0,
                'timestamp': current_time
            }
            print(f"  [Movement] {class_name} EXIT while moved -> PRODUCT_PURCHASED")

        elif not state.was_ever_moved:
            # Object was never moved and exited -> WINDOW_SHOPPED
            state.behavioral_state = BehavioralState.WINDOW_SHOPPED
            event = {
                'type': 'WINDOW_SHOPPED',
                'object_id': state.object_id,
                'class_name': class_name,
                'view_angle': view_angle,
                'time_present_seconds': current_time - state.first_seen_time,
                'timestamp': current_time
            }
            print(f"  [Movement] {class_name} EXIT without movement -> WINDOW_SHOPPED")

        else:
            # Object was moved then returned, then exited
            # This is still WINDOW_SHOPPED (browsed, put back, then removed from view)
            state.behavioral_state = BehavioralState.WINDOW_SHOPPED
            event = {
                'type': 'WINDOW_SHOPPED',
                'object_id': state.object_id,
                'class_name': class_name,
                'view_angle': view_angle,
                'time_present_seconds': current_time - state.first_seen_time,
                'was_previously_moved': True,
                'timestamp': current_time
            }
            print(f"  [Movement] {class_name} EXIT (was returned) -> WINDOW_SHOPPED")

        # NOTE: We return the event but do NOT add to pending_events here
        # The caller (ViewObjectTracker) will add it to its pending list
        # This prevents duplicate events

        # Remove object from tracking (will be re-registered on ENTRY)
        del self.object_states[key]

        return event

    def get_pending_events(self) -> List[Dict]:
        """
        Get and clear pending behavioral events.

        Returns:
            List of behavioral event dictionaries
        """
        events = self.pending_events.copy()
        self.pending_events.clear()
        return events

    def get_object_state(self, view_angle: int, class_name: str) -> Optional[ObjectMovementState]:
        """Get current state for an object"""
        key = (view_angle, class_name)
        return self.object_states.get(key)

    def get_all_states(self) -> Dict[Tuple[int, str], ObjectMovementState]:
        """Get all tracked object states"""
        return self.object_states.copy()

    def reset_object(self, view_angle: int, class_name: str):
        """Reset tracking for a specific object"""
        key = (view_angle, class_name)
        if key in self.object_states:
            del self.object_states[key]

    def reset_all(self):
        """Reset all tracking state"""
        self.object_states.clear()
        self.pending_events.clear()
        self.person_proximity.clear()
        print("[MovementDetector] Reset all tracking state")

    # ==================== Person Proximity Tracking ====================
    # For WINDOW_SHOPPED: tracks when a 'person' is detected near an object

    def update_person_proximity(self, view_angle: int, object_class: str,
                                object_bbox: Tuple[int, int, int, int],
                                person_bbox: Optional[Tuple[int, int, int, int]],
                                proximity_threshold_percent: float = 20.0) -> bool:
        """
        Update person proximity state for an object.

        WINDOW_SHOPPED is triggered when:
        - person_triggered goes True (person near object)
        - person_triggered goes False (person leaves)
        - Object then exits

        Args:
            view_angle: Camera view angle
            object_class: The object class name (not 'person')
            object_bbox: Object bounding box
            person_bbox: Person bounding box (None if no person detected)
            proximity_threshold_percent: Distance threshold as % of frame

        Returns:
            True if person_triggered state changed
        """
        key = (view_angle, object_class)
        current_time = time.time()

        # Initialize tracking if needed
        if key not in self.person_proximity:
            self.person_proximity[key] = {
                'person_triggered': False,
                'last_person_time': None,
                'trigger_count': 0
            }

        prox_state = self.person_proximity[key]
        was_triggered = prox_state['person_triggered']

        if person_bbox is not None:
            # Check if person is close to object
            is_near = self._is_person_near_object(
                object_bbox, person_bbox, proximity_threshold_percent
            )

            if is_near and not was_triggered:
                # Person just arrived near object
                prox_state['person_triggered'] = True
                prox_state['last_person_time'] = current_time
                prox_state['trigger_count'] += 1
                print(f"  [Person] Person NEAR {object_class} -> person_triggered=True")
                return True

            # Person near but already triggered - no change
            elif is_near and was_triggered:
                pass  # Still near, no state change

        else:
            # No person detected
            if was_triggered:
                # Person was near, now gone -> WINDOW_SHOPPED
                prox_state['person_triggered'] = False
                print(f"  [Person] Person LEFT {object_class} -> WINDOW_SHOPPED")

                # Get object state to build event
                obj_key = (view_angle, object_class)
                state = self.object_states.get(obj_key)

                if state and not state.is_moved:
                    # Only trigger WINDOW_SHOPPED if object wasn't moved
                    current_time = time.time()
                    event = {
                        'type': 'WINDOW_SHOPPED',
                        'object_id': state.object_id,
                        'class_name': object_class,
                        'view_angle': view_angle,
                        'time_present_seconds': current_time - state.first_seen_time,
                        'person_interaction_count': prox_state.get('trigger_count', 1),
                        'timestamp': current_time
                    }
                    self.pending_events.append(event)
                    state.behavioral_state = BehavioralState.WINDOW_SHOPPED

                return True

        return False

    def _is_person_near_object(self, object_bbox: Tuple[int, int, int, int],
                               person_bbox: Tuple[int, int, int, int],
                               threshold_percent: float) -> bool:
        """
        Check if person bounding box is near object bounding box.

        Uses center-to-center distance.
        """
        obj_x, obj_y = self._get_bbox_center(object_bbox)
        person_x, person_y = self._get_bbox_center(person_bbox)

        dx = abs(obj_x - person_x)
        dy = abs(obj_y - person_y)

        threshold_x = self.frame_width * (threshold_percent / 100.0)
        threshold_y = self.frame_height * (threshold_percent / 100.0)

        return dx <= threshold_x and dy <= threshold_y

    def get_person_proximity_state(self, view_angle: int, class_name: str) -> Optional[Dict]:
        """Get person proximity state for an object"""
        key = (view_angle, class_name)
        return self.person_proximity.get(key)

    def handle_exit_with_person(self, view_angle: int, class_name: str) -> Optional[Dict]:
        """
        Handle EXIT with person proximity tracking for WINDOW_SHOPPED.

        New logic for WINDOW_SHOPPED:
        - ENTRY -> person_triggered=True -> person_triggered=False -> EXIT = WINDOW_SHOPPED

        Args:
            view_angle: Camera view angle
            class_name: Object class name

        Returns:
            Behavioral event dict, or None
        """
        key = (view_angle, class_name)

        if key not in self.object_states:
            return None

        state = self.object_states[key]
        current_time = time.time()
        prox_state = self.person_proximity.get(key, {})

        event = None

        if state.is_moved:
            # Object was moved and then exited -> PRODUCT_PURCHASED
            state.behavioral_state = BehavioralState.PRODUCT_PURCHASED
            event = {
                'type': 'PRODUCT_PURCHASED',
                'object_id': state.object_id,
                'class_name': class_name,
                'view_angle': view_angle,
                'time_moved_seconds': current_time - state.moved_time if state.moved_time else 0,
                'timestamp': current_time
            }
            print(f"  [Movement] {class_name} EXIT while moved -> PRODUCT_PURCHASED")

        elif prox_state.get('trigger_count', 0) > 0 and not prox_state.get('person_triggered', False):
            # Person was near (trigger_count > 0) but is now gone -> WINDOW_SHOPPED
            state.behavioral_state = BehavioralState.WINDOW_SHOPPED
            event = {
                'type': 'WINDOW_SHOPPED',
                'object_id': state.object_id,
                'class_name': class_name,
                'view_angle': view_angle,
                'time_present_seconds': current_time - state.first_seen_time,
                'person_interaction_count': prox_state.get('trigger_count', 0),
                'timestamp': current_time
            }
            print(f"  [Movement] {class_name} EXIT after person interaction -> WINDOW_SHOPPED")

        elif state.was_ever_moved:
            # Object was moved then returned, then exited - still WINDOW_SHOPPED
            state.behavioral_state = BehavioralState.WINDOW_SHOPPED
            event = {
                'type': 'WINDOW_SHOPPED',
                'object_id': state.object_id,
                'class_name': class_name,
                'view_angle': view_angle,
                'time_present_seconds': current_time - state.first_seen_time,
                'was_previously_moved': True,
                'timestamp': current_time
            }
            print(f"  [Movement] {class_name} EXIT (was returned) -> WINDOW_SHOPPED")

        # Clean up person proximity tracking
        if key in self.person_proximity:
            del self.person_proximity[key]

        # Remove object from tracking
        del self.object_states[key]

        return event


def calculate_displacement_percent(bbox: Tuple[int, int, int, int],
                                   home_bbox: Tuple[int, int, int, int],
                                   frame_width: int = 1920,
                                   frame_height: int = 1080) -> Tuple[float, float]:
    """
    Calculate displacement percentage from home position.

    Standalone utility function for external use.

    Args:
        bbox: Current bounding box (x, y, w, h)
        home_bbox: Home bounding box (x, y, w, h)
        frame_width: Frame width for percentage calculation
        frame_height: Frame height for percentage calculation

    Returns:
        (dx_percent, dy_percent): Displacement as percentage of frame dimensions
    """
    # Calculate centers
    current_x = bbox[0] + bbox[2] / 2.0
    current_y = bbox[1] + bbox[3] / 2.0
    home_x = home_bbox[0] + home_bbox[2] / 2.0
    home_y = home_bbox[1] + home_bbox[3] / 2.0

    # Calculate displacement
    dx = abs(current_x - home_x)
    dy = abs(current_y - home_y)

    # Convert to percentage
    dx_percent = (dx / frame_width) * 100.0
    dy_percent = (dy / frame_height) * 100.0

    return dx_percent, dy_percent


def is_object_moved(bbox: Tuple[int, int, int, int],
                   home_bbox: Tuple[int, int, int, int],
                   threshold_percent: float = 10.0,
                   frame_width: int = 1920,
                   frame_height: int = 1080) -> bool:
    """
    Check if object has moved beyond threshold.

    Standalone utility function for external use.

    Args:
        bbox: Current bounding box (x, y, w, h)
        home_bbox: Home bounding box (x, y, w, h)
        threshold_percent: Movement threshold percentage (default 10%)
        frame_width: Frame width for percentage calculation
        frame_height: Frame height for percentage calculation

    Returns:
        True if object has moved beyond threshold
    """
    dx_percent, dy_percent = calculate_displacement_percent(
        bbox, home_bbox, frame_width, frame_height
    )
    return dx_percent > threshold_percent or dy_percent > threshold_percent


# Test code
if __name__ == "__main__":
    print("=" * 70)
    print("Movement Detector - Test Mode")
    print("=" * 70)

    detector = MovementDetector(
        movement_threshold_percent=10.0,  # 10% threshold
        frame_width=1920,
        frame_height=1080
    )

    # Test 1: Register object
    print("\n--- Test 1: Register Object ---")
    state = detector.register_object(
        view_angle=90,
        class_name="water_bottle",
        object_id=1,
        bbox=(500, 300, 100, 200)  # Center at (550, 400)
    )
    print(f"  Home position: ({state.home_x}, {state.home_y})")
    print(f"  is_moved: {state.is_moved}")
    print(f"  behavioral_state: {state.behavioral_state}")

    # Test 2: Small movement (within threshold)
    print("\n--- Test 2: Small Movement (within 10% threshold) ---")
    state = detector.update_position(
        view_angle=90,
        class_name="water_bottle",
        bbox=(520, 320, 100, 200)  # Center at (570, 420) - moved 20px, 20px
    )
    print(f"  Current position: ({state.current_x}, {state.current_y})")
    print(f"  is_moved: {state.is_moved}")
    print(f"  Threshold: {detector._get_threshold_x()}px x, {detector._get_threshold_y()}px y")

    # Test 3: Large movement (beyond threshold)
    print("\n--- Test 3: Large Movement (beyond 10% threshold) ---")
    state = detector.update_position(
        view_angle=90,
        class_name="water_bottle",
        bbox=(800, 300, 100, 200)  # Center at (850, 400) - moved 300px x
    )
    print(f"  Current position: ({state.current_x}, {state.current_y})")
    print(f"  is_moved: {state.is_moved}")
    print(f"  behavioral_state: {state.behavioral_state}")

    # Test 4: Return to home
    print("\n--- Test 4: Return to Home ---")
    state = detector.update_position(
        view_angle=90,
        class_name="water_bottle",
        bbox=(510, 310, 100, 200)  # Center at (560, 410) - back near home
    )
    print(f"  Current position: ({state.current_x}, {state.current_y})")
    print(f"  is_moved: {state.is_moved}")
    print(f"  was_ever_moved: {state.was_ever_moved}")
    print(f"  behavioral_state: {state.behavioral_state}")

    # Test 5: Exit without movement
    print("\n--- Test 5: Exit After Return -> WINDOW_SHOPPED ---")
    event = detector.handle_exit(view_angle=90, class_name="water_bottle")
    print(f"  Event: {event}")

    # Test 6: New object - window shopping scenario
    print("\n--- Test 6: Window Shopping Scenario ---")
    detector.register_object(90, "coffee_mug", 2, (100, 100, 80, 120))
    # Small movements only
    detector.update_position(90, "coffee_mug", (105, 105, 80, 120))
    detector.update_position(90, "coffee_mug", (110, 100, 80, 120))
    event = detector.handle_exit(90, "coffee_mug")
    print(f"  Event: {event}")

    # Test 7: Product purchased scenario
    print("\n--- Test 7: Product Purchased Scenario ---")
    detector.register_object(90, "laptop", 3, (400, 200, 300, 200))
    # Large movement
    detector.update_position(90, "laptop", (800, 200, 300, 200))
    # Exit while moved
    event = detector.handle_exit(90, "laptop")
    print(f"  Event: {event}")

    # Test 8: Get pending events
    print("\n--- Test 8: Pending Events ---")
    events = detector.get_pending_events()
    print(f"  Total events: {len(events)}")
    for e in events:
        print(f"    - {e['type']}: {e['class_name']}")

    # Test 9: Change threshold
    print("\n--- Test 9: Change Threshold ---")
    detector.set_threshold(5.0)

    # Test standalone functions
    print("\n--- Test 10: Standalone Functions ---")
    home = (500, 300, 100, 200)
    current = (700, 300, 100, 200)
    dx, dy = calculate_displacement_percent(current, home)
    print(f"  Displacement: {dx:.1f}% x, {dy:.1f}% y")
    moved = is_object_moved(current, home, threshold_percent=10.0)
    print(f"  is_moved (10% threshold): {moved}")

    print("\n[OK] All tests complete!")
