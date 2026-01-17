"""Remote Grounding DINO Detector - Compatible with backend.py"""

import cv2
import base64
import requests
import time
import numpy as np
from threading import Thread, Lock


class RemoteGroundingDinoDetector:
    """
    Detector that uses remote Grounding DINO GPU (RunPod 5090)
    Compatible with backend.py's detector interface
    """

    def __init__(self, classes, confidence=0.60, endpoint=None, model='grounding-dino-tiny',
                 resize_width=1920, jpeg_quality=100):
        """
        Initialize remote Grounding DINO detector

        Args:wai
            classes: List of class names to detect (converted to text prompt)
            confidence: Detection confidence threshold
            endpoint: RunPod endpoint URL
            model: Model name (for display only)
            resize_width: Resize frames to this width for faster upload
            jpeg_quality: JPEG quality for compression (1-100)
        """
        self.classes = classes
        self.confidence = confidence
        self.model_name = model
        self.resize_width = resize_width
        self.jpeg_quality = jpeg_quality

        # Default endpoint - can be overridden
        if endpoint is None:
            self.endpoint = "https://flgftoueeze5a7-8000.proxy.runpod.net/run"
        else:
            self.endpoint = endpoint

        # Convert classes to text prompt (Grounding DINO open vocabulary format)
        self.text_prompt = ". ".join(classes)

        # Async detection
        self.lock = Lock()
        self.latest_detections = []
        self.latest_error = None
        self.pending = False
        self.thread = None
        self.new_results_ready = False  # Flag for new GPU results

        print(f"[OK] Remote Grounding DINO initialized")
        print(f"  Endpoint: {self.endpoint}")
        print(f"  Classes: {len(self.classes)}")
        print(f"  Text prompt: {self.text_prompt}")
        print(f"  Confidence: {self.confidence:.2f}")
        print(f"  Resolution: {self.resize_width}px")

    def update_classes(self, new_classes):
        """
        Update detection classes (for dynamic class management).
        Thread-safe: can be called while detection is running.
        """
        with self.lock:
            self.classes = new_classes
            self.text_prompt = ". ".join(new_classes)
        print(f"✓ Updated classes: {self.text_prompt}")

    def detect_with_depth(self, rgb_frame, depth_frame, kinect, pan_angle=None):
        """
        Main detection method - compatible with backend.py
        Non-blocking: sends frame to GPU async, returns cached results immediately.
        ALWAYS-TRACK MODE: Estimates depth when unavailable, never skips objects.

        Args:
            rgb_frame: RGB frame from Kinect (H, W, 3)
            depth_frame: Depth frame from Kinect (H, W) in mm
            kinect: KinectCamera instance for 3D calculations
            pan_angle: Optional pan servo angle (0, 90, 180) for world coordinate transformation
                       If None, returns camera-relative coordinates
                       If provided, returns world coordinates (with 90° as forward)

        Returns:
            Tuple of (detections, is_new) where:
            - detections: List of detection dicts
            - is_new: True if these are fresh GPU results, False if cached
        """
        # Send to remote GPU (async, non-blocking - skips if GPU busy)
        self._process_frame_async(rgb_frame)

        # Check if new results are ready
        with self.lock:
            is_new = self.new_results_ready
            self.new_results_ready = False  # Consume the flag

        # Get latest results (may be cached)
        detections, error = self._get_latest_detections()

        if error:
            print(f"⚠ Detection error: {error}")
            return [], is_new

        # Add 3D information using depth frame (with estimation fallback)
        for det in detections:
            cx, cy = det['center']
            det['center_2d'] = (cx, cy)

            # Map color coordinates to depth coordinates
            depth_x, depth_y = kinect.map_color_to_depth(cx, cy)

            # Try to get real depth value
            depth_mm = None
            depth_source = 'unknown'
            
            if 0 <= depth_y < depth_frame.shape[0] and 0 <= depth_x < depth_frame.shape[1]:
                depth_mm = depth_frame[depth_y, depth_x]

            if depth_mm and depth_mm > 0:
                # Real depth available - use it
                center_3d = kinect.pixel_to_3d(depth_x, depth_y, depth_mm, pan_angle=pan_angle)
                det['center_3d'] = center_3d
                det['depth_source'] = 'real'
            else:
                # No depth available - ESTIMATE IT (never skip!)
                # Use bbox and class name for intelligent estimation
                bbox = det.get('bbox')
                class_name = det.get('class_name')
                
                if bbox:
                    # Estimate depth using kinect's estimation method
                    estimated_depth = kinect.estimate_depth(
                        bbox=bbox,
                        class_name=class_name,
                        last_known_depth=None  # Tracker will provide this via state
                    )
                    
                    # Convert 2D center to 3D using estimated depth
                    center_3d = kinect.pixel_to_3d(depth_x, depth_y, estimated_depth, pan_angle=pan_angle)
                    det['center_3d'] = center_3d
                    det['depth_source'] = 'estimated'
                else:
                    # No bbox (shouldn't happen) - set to None
                    det['center_3d'] = None
                    det['depth_source'] = 'unknown'

        return detections, is_new

    def _process_frame_async(self, frame):
        """Start async detection - non-blocking, skips if GPU is busy"""
        with self.lock:
            if self.pending:
                return  # GPU busy, skip this frame (video keeps running smooth)
            self.pending = True

        # Start thread (non-blocking)
        self.thread = Thread(target=self._detection_thread, args=(frame.copy(),))
        self.thread.daemon = True
        self.thread.start()

    def _detection_thread(self, frame):
        """Background thread for remote detection"""
        try:
            # Resize frame for faster upload
            if self.resize_width is not None:
                h, w = frame.shape[:2]
                new_h = int(h * (self.resize_width / w))
                frame_resized = cv2.resize(frame, (self.resize_width, new_h))
            else:
                frame_resized = frame

            # Encode to JPEG
            _, buffer = cv2.imencode('.jpg', frame_resized,
                                    [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality])
            img_b64 = base64.b64encode(buffer).decode('utf-8')

            # Convert text prompt to classes list
            classes = [c.strip() for c in self.text_prompt.replace(',', '.').split('.') if c.strip()]

            # Send request
            response = requests.post(self.endpoint, json={
                "input": {
                    "image": img_b64,
                    "classes": classes,
                    "confidence": self.confidence
                }
            }, timeout=10)

            # Check response status before parsing JSON
            if response.status_code != 200:
                with self.lock:
                    self.latest_detections = []
                    self.latest_error = f"HTTP {response.status_code}: {response.text[:100]}"
                return

            # Check for empty response
            if not response.text or len(response.text.strip()) == 0:
                with self.lock:
                    self.latest_detections = []
                    self.latest_error = "Empty response from server (is the endpoint running?)"
                return

            # Try to parse JSON
            try:
                result = response.json()
            except Exception as json_err:
                with self.lock:
                    self.latest_detections = []
                    self.latest_error = f"Invalid JSON: {response.text[:100]}"
                return

            if "detections" in result:
                detections = result["detections"]

                # Scale detections back to original frame size if resized
                if self.resize_width is not None:
                    scale_x = frame.shape[1] / frame_resized.shape[1]
                    scale_y = frame.shape[0] / frame_resized.shape[0]

                    for det in detections:
                        x, y, w, h = det["bbox"]
                        det["bbox"] = (
                            int(x * scale_x),
                            int(y * scale_y),
                            int(w * scale_x),
                            int(h * scale_y)
                        )
                        cx, cy = det["center"]
                        det["center"] = (int(cx * scale_x), int(cy * scale_y))

                with self.lock:
                    self.latest_detections = detections
                    self.latest_error = None
                    self.new_results_ready = True
            else:
                with self.lock:
                    self.latest_detections = []
                    self.latest_error = result.get("error", "Unknown error")
                    self.new_results_ready = True

        except requests.exceptions.Timeout:
            with self.lock:
                self.latest_detections = []
                self.latest_error = "Request timeout"
        except Exception as e:
            with self.lock:
                self.latest_detections = []
                self.latest_error = str(e)
        finally:
            with self.lock:
                self.pending = False

    def _get_latest_detections(self):
        """Get the most recent detection results"""
        with self.lock:
            return self.latest_detections.copy(), self.latest_error

    def visualize(self, frame, detections, show_3d=True):
        """
        Visualize detections on frame (compatible with backend.py)

        Args:
            frame: RGB frame
            detections: List of detections
            show_3d: Whether to show 3D coordinates

        Returns:
            Annotated frame
        """
        vis = frame.copy()

        for det in detections:
            x, y, w, h = det["bbox"]
            class_name = det["class_name"]
            confidence = det["confidence"]

            # Generate consistent color
            color = self._get_color(class_name)

            # Draw bounding box
            cv2.rectangle(vis, (x, y), (x + w, y + h), color, 2)

            # Prepare label
            if show_3d and det.get('center_3d') is not None:
                x3d, y3d, z3d = det['center_3d']
                label = f"{class_name} {confidence:.2f} | {z3d:.0f}mm"
            else:
                label = f"{class_name} {confidence:.2f}"

            # Draw label with background
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(vis, (x, y - label_h - 10), (x + label_w, y), color, -1)
            cv2.putText(vis, label, (x, y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

            # Draw center point
            if show_3d and det.get('center_3d') is not None:
                cx, cy = det['center']
                cv2.circle(vis, (cx, cy), 5, color, -1)

        return vis

    def _get_color(self, class_name):
        """Generate consistent color for class name"""
        np.random.seed(hash(class_name) % (2**32))
        color = tuple(map(int, np.random.randint(50, 255, 3)))
        return color

    def __del__(self):
        """Cleanup"""
        # Wait for any pending detection to finish
        if hasattr(self, 'thread') and self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)
