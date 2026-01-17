"""
Real-time Kinect detection using remote Grounding DINO GPU
Press 'q' to quit
"""

import cv2
import base64
import requests
import time
import numpy as np
from threading import Thread, Lock
from collections import deque
import sys
sys.path.append('python')
from kinect_camera import KinectCamera

# Your friend's pod endpoint
ENDPOINT = "https://nl8ln98n4atu87-8000.proxy.runpod.net/run"

# Default classes (can be changed at runtime with 'c' key)
DEFAULT_PROMPT = "person. face. hand. laptop. phone. cup. bottle"

# Settings - OPTIMIZED FOR RTX 5090
CONFIDENCE = 0.15
RESIZE_WIDTH = 1280  # High resolution for better accuracy (5090 can handle it)
FRAME_SKIP = 1  # Send every frame when GPU is ready
JPEG_QUALITY = 70  # Balanced quality for speed

def send_frame(frame, text_prompt, confidence):
    """Send frame to remote GPU and get detections"""
    # Optionally resize for faster upload
    if RESIZE_WIDTH is not None:
        h, w = frame.shape[:2]
        new_h = int(h * (RESIZE_WIDTH / w))
        frame_resized = cv2.resize(frame, (RESIZE_WIDTH, new_h))
    else:
        frame_resized = frame

    # Encode to JPEG with lower quality for speed
    _, buffer = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    img_b64 = base64.b64encode(buffer).decode('utf-8')

    # Convert text prompt to classes list (split by period or comma)
    classes = [c.strip() for c in text_prompt.replace(',', '.').split('.') if c.strip()]

    # Send request
    try:
        response = requests.post(ENDPOINT, json={
            "input": {
                "image": img_b64,
                "classes": classes,
                "confidence": confidence
            }
        }, timeout=10)  # Generous timeout for high-res images

        result = response.json()

        if "detections" in result:
            # Scale detections back to original frame size if we resized
            if RESIZE_WIDTH is not None:
                scale_x = frame.shape[1] / frame_resized.shape[1]
                scale_y = frame.shape[0] / frame_resized.shape[0]

                for det in result["detections"]:
                    x, y, w, h = det["bbox"]
                    det["bbox"] = (
                        int(x * scale_x),
                        int(y * scale_y),
                        int(w * scale_x),
                        int(h * scale_y)
                    )
                    cx, cy = det["center"]
                    det["center"] = (int(cx * scale_x), int(cy * scale_y))

            return result["detections"], None
        else:
            return [], result.get("error", "Unknown error")

    except requests.exceptions.Timeout:
        return [], "Request timeout"
    except Exception as e:
        return [], str(e)

def draw_detections(frame, detections):
    """Draw bounding boxes and labels on frame"""
    for det in detections:
        x, y, w, h = det["bbox"]
        class_name = det["class_name"]
        confidence = det["confidence"]

        # Generate color based on class
        color = get_color(class_name)

        # Draw box
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

        # Draw label with background
        label = f"{class_name} {confidence:.2f}"
        (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        cv2.rectangle(frame, (x, y - label_h - 10), (x + label_w, y), color, -1)
        cv2.putText(frame, label, (x, y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    return frame


def get_color(class_name):
    """Generate consistent color for class name"""
    np.random.seed(hash(class_name) % (2**32))
    color = tuple(map(int, np.random.randint(50, 255, 3)))
    return color


class DetectionSmoother:
    """Smooths bounding box positions between detection updates"""
    def __init__(self, smoothing_factor=0.3):
        self.smoothing_factor = smoothing_factor  # Lower = smoother but more lag
        self.tracked_objects = {}  # {id: {bbox, class_name, confidence}}
        self.next_id = 0

    def smooth_detections(self, new_detections):
        """Apply smoothing to new detections"""
        if not new_detections:
            return list(self.tracked_objects.values())

        # Match new detections with tracked objects
        matched_ids = set()
        unmatched_detections = []

        for det in new_detections:
            det_center = det['center']
            best_match_id = None
            best_distance = float('inf')

            # Find closest tracked object of same class
            for obj_id, tracked in self.tracked_objects.items():
                if tracked['class_name'] == det['class_name']:
                    tracked_center = tracked['center']
                    distance = ((det_center[0] - tracked_center[0]) ** 2 +
                               (det_center[1] - tracked_center[1]) ** 2) ** 0.5

                    if distance < best_distance and distance < 200:  # Max 200px movement
                        best_distance = distance
                        best_match_id = obj_id

            if best_match_id is not None:
                # Smooth the bbox
                tracked = self.tracked_objects[best_match_id]
                old_bbox = tracked['bbox']
                new_bbox = det['bbox']

                smoothed_bbox = tuple(
                    int(old * (1 - self.smoothing_factor) + new * self.smoothing_factor)
                    for old, new in zip(old_bbox, new_bbox)
                )

                # Update tracked object
                self.tracked_objects[best_match_id] = {
                    'bbox': smoothed_bbox,
                    'center': (smoothed_bbox[0] + smoothed_bbox[2] // 2,
                              smoothed_bbox[1] + smoothed_bbox[3] // 2),
                    'class_name': det['class_name'],
                    'confidence': det['confidence']
                }
                matched_ids.add(best_match_id)
            else:
                unmatched_detections.append(det)

        # Remove unmatched tracked objects
        self.tracked_objects = {k: v for k, v in self.tracked_objects.items()
                               if k in matched_ids}

        # Add new detections
        for det in unmatched_detections:
            self.tracked_objects[self.next_id] = det.copy()
            self.next_id += 1

        return list(self.tracked_objects.values())


class AsyncDetector:
    """Asynchronous detector that processes frames in background thread"""
    def __init__(self):
        self.lock = Lock()
        self.latest_detections = []
        self.latest_error = None
        self.latest_latency = 0
        self.pending = False
        self.thread = None

    def process_frame_async(self, frame, text_prompt, confidence):
        """Start processing frame in background if not already processing"""
        with self.lock:
            if self.pending:
                return  # Skip if already processing
            self.pending = True

        # Start thread
        self.thread = Thread(target=self._process_thread, args=(frame.copy(), text_prompt, confidence))
        self.thread.daemon = True
        self.thread.start()

    def _process_thread(self, frame, text_prompt, confidence):
        """Background thread that sends frame and updates results"""
        detections, error = send_frame(frame, text_prompt, confidence)

        with self.lock:
            self.latest_detections = detections
            self.latest_error = error
            self.pending = False

    def get_latest_detections(self):
        """Get the most recent detection results"""
        with self.lock:
            return self.latest_detections.copy(), self.latest_error, self.pending


def main():
    print("=" * 70)
    print("Remote Grounding DINO Kinect Test - OPEN VOCABULARY")
    print("=" * 70)
    print(f"Endpoint: {ENDPOINT}")
    print(f"Mode: Open Vocabulary (RTX 5090)")
    print(f"Default prompt: {DEFAULT_PROMPT}")
    print(f"Confidence: {CONFIDENCE:.2f}")
    if RESIZE_WIDTH:
        print(f"Resolution: {RESIZE_WIDTH}px width")
    print(f"JPEG Quality: {JPEG_QUALITY}% (Balanced for speed)")
    print("\nControls:")
    print("  'q' - Quit")
    print("  's' - Save screenshot")
    print("  'c' - Change detection prompt (open vocabulary!)")
    print("  '+' - Increase confidence")
    print("  '-' - Decrease confidence")
    print("=" * 70)

    # Initialize Kinect
    try:
        kinect = KinectCamera()
    except Exception as e:
        print(f"ERROR: Cannot initialize Kinect: {e}")
        return

    print("\n✓ Kinect initialized")
    print("Starting detection...\n")

    # Stats tracking
    frame_count = 0
    fps = 0.0
    fps_time = time.time()
    confidence = CONFIDENCE
    current_prompt = DEFAULT_PROMPT

    # Initialize async detector
    detector = AsyncDetector()
    detections = []
    error = None

    try:
        while True:
            # Get frames from Kinect
            rgb_frame, depth_frame = kinect.get_frames()

            # Skip if no RGB frame available
            if rgb_frame is None:
                continue

            # Convert RGB to BGR for OpenCV
            frame = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)

            frame_count += 1

            # Send every frame to GPU when ready (5090 can handle it!)
            if frame_count % FRAME_SKIP == 0:
                detector.process_frame_async(frame, current_prompt, confidence)

            # Get latest detection results (no smoothing - raw GPU output)
            detections, error, is_pending = detector.get_latest_detections()

            # Draw detections
            if error:
                cv2.putText(frame, f"ERROR: {error}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            else:
                frame = draw_detections(frame, detections)

            # Calculate FPS every 30 frames
            if frame_count % 30 == 0:
                current_time = time.time()
                fps = 30 / (current_time - fps_time)
                fps_time = current_time

            # Draw stats overlay
            cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            status = "Processing..." if is_pending else "Ready"
            status_color = (0, 165, 255) if is_pending else (0, 255, 0)
            cv2.putText(frame, f"Status: {status}", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

            cv2.putText(frame, f"Objects: {len(detections)}", (10, 90),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f"Confidence: {confidence:.2f}", (10, 120),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            # Display current prompt (truncate if too long)
            prompt_display = current_prompt[:60] + "..." if len(current_prompt) > 60 else current_prompt
            cv2.putText(frame, f"Prompt: {prompt_display}", (10, 150),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

            cv2.putText(frame, f"GPU: RTX 5090 | Press 'c' to change prompt", (10, 180),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            # Show frame
            cv2.imshow('Remote Grounding DINO - Kinect', frame)

            # Handle keys
            key = cv2.waitKey(1) & 0xFF

            if key == ord('q'):
                print("\nQuitting...")
                break
            elif key == ord('s'):
                filename = f"kinect_detection_{int(time.time())}.jpg"
                cv2.imwrite(filename, frame)
                print(f"✓ Saved {filename}")
            elif key == ord('c'):
                print("\n" + "=" * 70)
                print("OPEN VOCABULARY MODE")
                print("=" * 70)
                print("Enter your detection prompt (separate items with periods or commas)")
                print("Examples:")
                print("  - person. face. hand")
                print("  - red car. blue truck. motorcycle")
                print("  - dog. cat. bird. fish")
                print("  - anything you want to detect!")
                print()
                new_prompt = input("Enter prompt: ").strip()
                if new_prompt:
                    current_prompt = new_prompt
                    print(f"✓ Updated prompt to: {current_prompt}")
                else:
                    print("✗ Prompt unchanged")
                print("=" * 70 + "\n")
            elif key == ord('+') or key == ord('='):
                confidence = min(0.9, confidence + 0.05)
                print(f"✓ Confidence: {confidence:.2f}")
            elif key == ord('-') or key == ord('_'):
                confidence = max(0.05, confidence - 0.05)
                print(f"✓ Confidence: {confidence:.2f}")

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")

    finally:
        # Cleanup
        kinect.close()
        cv2.destroyAllWindows()

        # Print final stats
        print("\n" + "=" * 70)
        print("Session Stats (RTX 5090 - Open Vocabulary)")
        print("=" * 70)
        print(f"Total frames captured: {frame_count}")
        print(f"Display FPS: {fps:.1f}")
        print(f"Resolution: {RESIZE_WIDTH}px width")
        print(f"Quality: {JPEG_QUALITY}% JPEG")
        print(f"Final prompt: {current_prompt}")
        print("=" * 70)


if __name__ == "__main__":
    main()
