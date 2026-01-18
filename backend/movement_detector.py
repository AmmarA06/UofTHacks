"""
CV-Based Movement Detector

Tracks object movement using 2D camera bounding box center coordinates.
Determines if an object has been moved from its "home" position using a
configurable displacement threshold.

Movement Logic:
- Stores the initial (home) position when an object first appears
- Calculates displacement from home as a percentage of frame dimensions
- Sets isMoved=True if displacement exceeds threshold

Person Presence Logic:
- Tracks when a 'person' is detected in frame while objects are present
- Sets person_triggered=True when person enters frame
- Sets person_triggered=False when person leaves frame
- Requires minimum 4 seconds of person presence for WINDOW_SHOPPED event

Behavioral State Triggers:
- PRODUCT_PURCHASED: Default - any EXIT fires PURCHASED unless WINDOW_SHOPPED already fired
                     (object left the scene = purchased)
- WINDOW_SHOPPED: Person in frame >= 4 seconds -> person leaves -> WINDOW_SHOPPED
                  (person looked at object but didn't move it, fires when person leaves)
                  Prevents PRODUCT_PURCHASED on EXIT (already counted)
- CART_ABANDONED: ENTRY -> isMoved=True, then 4 seconds without EXIT -> CART_ABANDONED
                  (object was picked up but held for too long without leaving)
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

    # Smoothed position (EMA filtered to reduce bbox jitter)
    smoothed_x: float = 0.0
    smoothed_y: float = 0.0

    # Movement state
    is_moved: bool = False
    was_ever_moved: bool = False  # Track if object was ever moved (for CART_ABANDONED)

    # Behavioral state
    behavioral_state: BehavioralState = BehavioralState.NONE

    # Timestamps
    first_seen_time: float = 0.0
    last_seen_time: float = 0.0
    moved_time: Optional[float] = None      # When isMoved became True
    last_cart_abandoned_time: Optional[float] = None  # Cooldown after CART_ABANDONED

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
                 frame_width: int = 1920,
                 frame_height: int = 1080,
                 cart_abandoned_timeout: float = 4.0,
                 stabilization_time: float = 2.0,
                 cart_abandoned_cooldown: float = 1.0):
        """
        Initialize the movement detector.

        Args:
            movement_threshold_percent: Percentage of frame width/height that
                                       constitutes "movement". Default 10%.
                                       Easily configurable.
            frame_width: Default frame width for threshold calculation
            frame_height: Default frame height for threshold calculation
            cart_abandoned_timeout: Seconds after isMoved=True without EXIT to trigger
                                   CART_ABANDONED. Default 4 seconds.
            stabilization_time: Seconds to wait after registration before movement
                               detection is active. Prevents false positives from
                               detector bbox variance. Default 2 seconds.
            cart_abandoned_cooldown: Seconds to wait after CART_ABANDONED before allowing
                                    new MOVED detection. Prevents infinite loop. Default 1 second.
        """
        self.movement_threshold_percent = movement_threshold_percent
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.cart_abandoned_timeout = cart_abandoned_timeout
        self.stabilization_time = stabilization_time
        self.cart_abandoned_cooldown = cart_abandoned_cooldown

        # Object states: {(view_angle, class_name): ObjectMovementState}
        self.object_states: Dict[Tuple[int, str], ObjectMovementState] = {}

        # Pending behavioral events (to be consumed by event system)
        self.pending_events: List[Dict] = []

        # Person presence tracking for WINDOW_SHOPPED
        # {(view_angle, class_name): {'person_triggered': bool, 'person_first_seen': float, 'trigger_count': int}}
        self.person_proximity: Dict[Tuple[int, str], Dict] = {}

        print(f"[MovementDetector] Initialized with {movement_threshold_percent}% threshold")
        print(f"[MovementDetector] Stabilization time: {stabilization_time}s (no movement detection during this period)")
        print(f"[MovementDetector] CART_ABANDONED timeout: {cart_abandoned_timeout}s after isMoved")
        print(f"[MovementDetector] CART_ABANDONED cooldown: {cart_abandoned_cooldown}s (prevents re-trigger loop)")
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

    def _is_within_threshold(self, dx: float, dy: float, use_tolerance: bool = False) -> bool:
        """
        Check if displacement is within movement threshold (i.e., back at home).

        Uses AND logic: within threshold if BOTH x AND y are within bounds.
        
        Args:
            dx: X displacement in pixels
            dy: Y displacement in pixels
            use_tolerance: If True, use a SMALLER threshold (0.5x) to ensure object
                         is truly close to home before triggering return. This prevents
                         the overlap zone where an object can be both "moved" and "returned".
        
        Returns:
            True if object is within threshold (close to home position)
        """
        threshold_x = self._get_threshold_x()
        threshold_y = self._get_threshold_y()
        
        if use_tolerance:
            # Use 50% of threshold - object must be genuinely close to home
            # This creates hysteresis: MOVED triggers at 100% threshold,
            # RETURNED triggers at 50% threshold (must be closer to home)
            threshold_x *= 0.5
            threshold_y *= 0.5
        
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

        # Apply EMA smoothing to bbox center to reduce jitter
        if state.smoothed_x == 0.0:
            # First time - initialize smoothed position
            state.smoothed_x = center_x
            state.smoothed_y = center_y
        else:
            # Smooth the position (alpha=0.3 means 30% new, 70% old)
            alpha = 0.3
            state.smoothed_x = alpha * center_x + (1 - alpha) * state.smoothed_x
            state.smoothed_y = alpha * center_y + (1 - alpha) * state.smoothed_y

        # Update current position to smoothed values
        state.current_x = state.smoothed_x
        state.current_y = state.smoothed_y
        state.last_seen_time = current_time

        # Calculate displacement from home
        dx, dy = self._calculate_displacement(state)

        # Check if still in stabilization period
        time_since_registered = current_time - state.first_seen_time
        in_stabilization = time_since_registered < self.stabilization_time

        # Check movement state transitions (only transition to moved, never back)
        if not state.is_moved:
            # Skip movement detection during stabilization period
            if in_stabilization:
                # Don't update home - just skip movement detection during stabilization
                # Home position stays locked at registration value
                return state

            # Skip if already had CART_ABANDONED from timeout (object still in moved position)
            # This prevents: MOVED -> timeout CART_ABANDONED -> MOVED -> timeout CART_ABANDONED loop
            # The only valid next event after timeout CART_ABANDONED is EXIT
            if state.behavioral_state == BehavioralState.CART_ABANDONED:
                return state

            # Check if we're in cooldown period after return-to-home CART_ABANDONED
            # This allows: MOVED -> return home -> CART_ABANDONED -> [cooldown] -> MOVED again
            if state.last_cart_abandoned_time is not None:
                time_since_cart_abandoned = current_time - state.last_cart_abandoned_time
                if time_since_cart_abandoned < self.cart_abandoned_cooldown:
                    # Still in cooldown - skip movement detection to prevent loop
                    return state
                else:
                    # Cooldown expired - clear the timestamp and allow detection
                    state.last_cart_abandoned_time = None

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
            # Object was already moved - check if it returned to home
            if self._is_within_threshold(dx, dy, use_tolerance=True):
                # Object returned to home position!
                print(f"  [Movement] {class_name} RETURNED to home! -> CART_ABANDONED")

                # Queue CART_ABANDONED event
                self.pending_events.append({
                    'type': 'CART_ABANDONED',
                    'object_id': state.object_id,
                    'class_name': class_name,
                    'view_angle': view_angle,
                    'return_type': 'immediate',
                    'time_moved_seconds': current_time - state.moved_time if state.moved_time else 0,
                    'timestamp': current_time
                })
                
                # Reset movement tracking to allow new movement detection after cooldown
                # The cooldown prevents the infinite loop: MOVED -> CART_ABANDONED -> MOVED -> CART_ABANDONED
                # But allows: MOVED -> CART_ABANDONED -> [cooldown] -> [user moves again] -> MOVED -> EXIT -> PURCHASED
                state.is_moved = False
                state.was_ever_moved = False
                state.moved_time = None
                state.last_cart_abandoned_time = current_time  # Start cooldown
                state.behavioral_state = BehavioralState.PRESENT  # Reset to allow new events

        return state

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

    # ==================== CART_ABANDONED Timeout Logic ====================

    def check_cart_abandoned_timeouts(self) -> List[Dict]:
        """
        Check for objects that should trigger CART_ABANDONED.

        CART_ABANDONED triggers when:
        - Object has isMoved=True (was picked up/moved)
        - 4 seconds have passed since moved_time
        - Object has NOT exited (still being tracked)

        This method should be called periodically (e.g., every frame).

        Returns:
            List of CART_ABANDONED events for objects that timed out
        """
        current_time = time.time()
        events = []
        keys_to_clear = []

        for key, state in self.object_states.items():
            view_angle, class_name = key

            # Skip if not moved or already has a behavioral event
            if not state.is_moved:
                continue

            # Skip if already triggered a main event (WINDOW_SHOPPED, CART_ABANDONED, PURCHASED)
            if state.behavioral_state in (BehavioralState.WINDOW_SHOPPED,
                                          BehavioralState.CART_ABANDONED,
                                          BehavioralState.PRODUCT_PURCHASED):
                continue

            # Check if timeout has elapsed since moved
            if state.moved_time is not None:
                elapsed = current_time - state.moved_time
                if elapsed >= self.cart_abandoned_timeout:
                    # CART_ABANDONED triggered!
                    state.behavioral_state = BehavioralState.CART_ABANDONED

                    event = {
                        'type': 'CART_ABANDONED',
                        'object_id': state.object_id,
                        'class_name': class_name,
                        'view_angle': view_angle,
                        'time_moved_seconds': elapsed,
                        'timestamp': current_time
                    }
                    events.append(event)
                    keys_to_clear.append(key)

                    print(f"  [Movement] {class_name} CART_ABANDONED (moved for {elapsed:.1f}s without exit)")

        # Clear atomic state for objects that triggered CART_ABANDONED
        for key in keys_to_clear:
            self._clear_atomic_state(key)

        return events

    def _clear_atomic_state(self, key: Tuple[int, str], event_type: str = 'CART_ABANDONED'):
        """
        Clear atomic state for an object after a main event fires.

        This prevents the atomic events (isMoved, person_triggered, etc.)
        from being reused for subsequent main events.

        Args:
            key: (view_angle, class_name) tuple
            event_type: The event type that triggered this clear (for logging)
        """
        if key in self.object_states:
            state = self.object_states[key]
            current_time = time.time()
            
            # Reset movement flags but KEEP was_ever_moved=True
            # This allows PRODUCT_PURCHASED to fire if object exits after timeout CART_ABANDONED
            state.is_moved = False
            # Note: was_ever_moved stays True so EXIT → PRODUCT_PURCHASED works
            state.moved_time = None
            
            # Set cooldown to prevent immediate re-triggering (fixes the loop!)
            state.last_cart_abandoned_time = current_time
            
            # Keep behavioral_state as CART_ABANDONED to prevent re-triggering MOVED
            # The only valid next event should be EXIT (which checks was_ever_moved)
            state.behavioral_state = BehavioralState.CART_ABANDONED
            
            print(f"  [Movement] Cleared atomic state for {key[1]} after {event_type} (cooldown started, was_ever_moved={state.was_ever_moved})")

        # Also clear person proximity state
        if key in self.person_proximity:
            self.person_proximity[key] = {
                'person_triggered': False,
                'last_person_time': None,
                'trigger_count': 0
            }

    # ==================== Person Proximity Tracking ====================
    # For WINDOW_SHOPPED: tracks when a 'person' is detected near an object

    def update_person_proximity(self, view_angle: int, object_class: str,
                                object_bbox: Tuple[int, int, int, int],
                                person_bbox: Optional[Tuple[int, int, int, int]],
                                proximity_threshold_percent: float = 20.0) -> bool:
        """
        Update person presence state for an object.

        WINDOW_SHOPPED is triggered when:
        - Person is in frame while object is tracked
        - Person leaves frame
        - Person was in frame for >= 4 seconds
        - Object wasn't moved

        Args:
            view_angle: Camera view angle
            object_class: The object class name (not 'person')
            object_bbox: Object bounding box (unused - kept for compatibility)
            person_bbox: Person bounding box (None if no person detected)
            proximity_threshold_percent: Unused - kept for compatibility

        Returns:
            True if person_triggered state changed
        """
        key = (view_angle, object_class)
        current_time = time.time()

        # Initialize tracking if needed
        if key not in self.person_proximity:
            self.person_proximity[key] = {
                'person_triggered': False,
                'person_first_seen': None,
                'trigger_count': 0
            }

        prox_state = self.person_proximity[key]
        was_triggered = prox_state['person_triggered']

        if person_bbox is not None:
            # Person is in frame
            if not was_triggered:
                # Person just entered frame
                prox_state['person_triggered'] = True
                prox_state['person_first_seen'] = current_time
                prox_state['trigger_count'] += 1
                print(f"  [Person] Person IN FRAME with {object_class} -> person_triggered=True")
                return True

        else:
            # No person in frame
            if was_triggered:
                # Person was in frame, now left
                person_duration = current_time - prox_state['person_first_seen']

                if person_duration >= 4.0:
                    # Person was in frame for >= 4 seconds -> WINDOW_SHOPPED
                    prox_state['person_triggered'] = False
                    print(f"  [Person] Person LEFT FRAME (duration: {person_duration:.1f}s) -> WINDOW_SHOPPED")

                    # Get object state to build event
                    obj_key = (view_angle, object_class)
                    state = self.object_states.get(obj_key)

                    if state and not state.is_moved:
                        # Only trigger WINDOW_SHOPPED if object wasn't moved
                        event = {
                            'type': 'WINDOW_SHOPPED',
                            'object_id': state.object_id,
                            'class_name': object_class,
                            'view_angle': view_angle,
                            'time_present_seconds': current_time - state.first_seen_time,
                            'person_duration_seconds': person_duration,
                            'person_interaction_count': prox_state.get('trigger_count', 1),
                            'timestamp': current_time
                        }
                        self.pending_events.append(event)
                        state.behavioral_state = BehavioralState.WINDOW_SHOPPED

                        # Clear atomic state to prevent reuse
                        self._clear_atomic_state(obj_key, event_type='WINDOW_SHOPPED')

                        return True
                else:
                    # Person left but was only there for < 4 seconds - no event
                    prox_state['person_triggered'] = False
                    print(f"  [Person] Person LEFT FRAME (duration: {person_duration:.1f}s) - too short, no event")
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
        Handle EXIT event - simplified logic.

        Logic:
        - If WINDOW_SHOPPED already fired: No event on EXIT (already counted)
        - If object was moved OR no prior event: PRODUCT_PURCHASED (default - object left scene)
        - WINDOW_SHOPPED fires separately when person leaves (not on EXIT)

        Args:
            view_angle: Camera view angle
            class_name: Object class name

        Returns:
            Behavioral event dict, or None if WINDOW_SHOPPED already fired
        """
        key = (view_angle, class_name)

        if key not in self.object_states:
            return None

        state = self.object_states[key]
        current_time = time.time()

        event = None

        # Check if WINDOW_SHOPPED already fired
        if state.behavioral_state == BehavioralState.WINDOW_SHOPPED:
            # WINDOW_SHOPPED already counted this interaction - don't fire PURCHASED
            print(f"  [Movement] {class_name} EXIT (WINDOW_SHOPPED already fired, no additional event)")
        else:
            # Default case: object left the scene -> PRODUCT_PURCHASED
            state.behavioral_state = BehavioralState.PRODUCT_PURCHASED
            event = {
                'type': 'PRODUCT_PURCHASED',
                'object_id': state.object_id,
                'class_name': class_name,
                'view_angle': view_angle,
                'time_present_seconds': current_time - state.first_seen_time,
                'was_moved': state.is_moved or state.was_ever_moved,
                'timestamp': current_time
            }

            if state.is_moved or state.was_ever_moved:
                print(f"  [Movement] {class_name} EXIT while moved -> PRODUCT_PURCHASED")
            else:
                print(f"  [Movement] {class_name} EXIT (no person interaction) -> PRODUCT_PURCHASED")

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

    # Test 4: Exit while moved -> PRODUCT_PURCHASED
    print("\n--- Test 4: Exit While Moved -> PRODUCT_PURCHASED ---")
    event = detector.handle_exit_with_person(view_angle=90, class_name="water_bottle")
    print(f"  Event: {event}")

    # Test 5: New object - exit without movement -> PRODUCT_PURCHASED
    print("\n--- Test 5: Exit Without Movement -> PRODUCT_PURCHASED ---")
    detector.register_object(90, "coffee_mug", 2, (100, 100, 80, 120))
    # Small movements only (within threshold)
    detector.update_position(90, "coffee_mug", (105, 105, 80, 120))
    detector.update_position(90, "coffee_mug", (110, 100, 80, 120))
    event = detector.handle_exit_with_person(90, "coffee_mug")
    print(f"  Event: {event}")

    # Test 6: CART_ABANDONED timeout scenario
    print("\n--- Test 6: CART_ABANDONED Timeout ---")
    detector.register_object(90, "laptop", 3, (400, 200, 300, 200))
    # Large movement (triggers isMoved=True)
    detector.update_position(90, "laptop", (800, 200, 300, 200))
    print("  Object moved, waiting 5 seconds for timeout...")
    import time as t
    t.sleep(5)  # Wait for timeout
    # Check for CART_ABANDONED
    events = detector.check_cart_abandoned_timeouts()
    print(f"  Timeout events: {events}")

    # Test 7: Get pending events
    print("\n--- Test 7: Pending Events ---")
    events = detector.get_pending_events()
    print(f"  Total events: {len(events)}")
    for e in events:
        print(f"    - {e['type']}: {e['class_name']}")

    # Test 8: Change threshold
    print("\n--- Test 8: Change Threshold ---")
    detector.set_threshold(5.0)

    # Test standalone functions
    print("\n--- Test 9: Standalone Functions ---")
    home = (500, 300, 100, 200)
    current = (700, 300, 100, 200)
    dx, dy = calculate_displacement_percent(current, home)
    print(f"  Displacement: {dx:.1f}% x, {dy:.1f}% y")
    moved = is_object_moved(current, home, threshold_percent=10.0)
    print(f"  is_moved (10% threshold): {moved}")

    print("\n[OK] All tests complete!")
