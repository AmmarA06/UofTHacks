"""Kinect V2 camera interface"""

import numpy as np
import cv2
import math
from pykinect2 import PyKinectV2
from pykinect2 import PyKinectRuntime


class KinectCamera:

    def __init__(self):
        print("Initializing Kinect V2...")

        self.kinect = PyKinectRuntime.PyKinectRuntime(
            PyKinectV2.FrameSourceTypes_Color |
            PyKinectV2.FrameSourceTypes_Depth
        )

        self.color_width = 1920
        self.color_height = 1080
        self.depth_width = 512
        self.depth_height = 424

        self.fx = 365.456
        self.fy = 365.456
        self.cx = 257.588
        self.cy = 209.131

        print(f"[OK] Kinect initialized")
        print(f"  Color: {self.color_width}x{self.color_height}")
        print(f"  Depth: {self.depth_width}x{self.depth_height}")

    def get_frames(self):
        rgb_frame = None
        depth_frame = None

        if self.kinect.has_new_color_frame():
            frame = self.kinect.get_last_color_frame()
            frame = frame.reshape((self.color_height, self.color_width, 4))
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2RGB)

        if self.kinect.has_new_depth_frame():
            frame = self.kinect.get_last_depth_frame()
            depth_frame = frame.reshape((self.depth_height, self.depth_width)).astype(np.uint16)

        return rgb_frame, depth_frame

    def pixel_to_3d(self, pixel_x, pixel_y, depth_mm, pan_angle=None):
        """
        Convert pixel coordinates + depth to 3D coordinates

        Args:
            pixel_x, pixel_y: Pixel coordinates in depth frame
            depth_mm: Depth value in millimeters
            pan_angle: Optional pan servo angle (0, 90, 180) for world coordinate transformation
                       If None, returns camera-relative coordinates
                       If provided, returns world coordinates (with 90° as forward)

        Returns:
            (x, y, z): 3D coordinates in mm
                       If pan_angle=None: camera-relative coords
                       If pan_angle provided: world coords with 90° = forward (+Z)
        """
        if depth_mm == 0:
            return (0, 0, 0)

        # Camera-relative coordinates (standard pinhole projection)
        z_cam = float(depth_mm)
        x_cam = (pixel_x - self.cx) * z_cam / self.fx
        y_cam = (pixel_y - self.cy) * z_cam / self.fy

        # If no pan angle, return camera-relative coords
        if pan_angle is None:
            return (x_cam, y_cam, z_cam)

        # Transform to world coordinates based on pan angle
        return self.camera_to_world_coords(x_cam, y_cam, z_cam, pan_angle)

    def estimate_depth(self, bbox, class_name=None, last_known_depth=None):
        """
        Estimate depth when real depth is unavailable.
        Uses hybrid strategy: last_known > bbox_size > class_default > global_default
        
        Args:
            bbox: Bounding box (x, y, w, h)
            class_name: Object class name (optional, for class-aware defaults)
            last_known_depth: Last measured real depth for this object (optional)
        
        Returns:
            Estimated depth in millimeters
        """
        # Class-specific typical depths (can be tuned based on your setup)
        CLASS_TYPICAL_DEPTHS = {
            'laptop': 1200,
            'laptop computer': 1200,
            'mouse': 1000,
            'wireless mouse': 1000,
            'keyboard': 1200,
            'mechanical keyboard': 1200,
            'phone': 1100,
            'smartphone': 1100,
            'water bottle': 1000,
            'coffee mug': 1000,
            'notebook': 1200,
            'book': 1200,
            'tablet': 1100,
            'headphones': 1100,
        }
        
        GLOBAL_DEFAULT_DEPTH = 1200  # 1.2m - typical desk distance
        
        # Priority 1: Use last known real depth if available and reasonable
        if last_known_depth and 500 <= last_known_depth <= 3000:
            return last_known_depth
        
        # Priority 2: Bbox size-based estimation
        x, y, w, h = bbox
        bbox_area = w * h
        
        # Reference: typical laptop at ~1200mm is about 150x200px = 30000px²
        reference_area = 30000
        reference_depth = 1200
        
        # Inverse square relationship (larger bbox = closer)
        if bbox_area > 0:
            estimated_depth = reference_depth * math.sqrt(reference_area / bbox_area)
        else:
            estimated_depth = GLOBAL_DEFAULT_DEPTH
        
        # Priority 3: Blend with class-specific default if available
        if class_name:
            class_name_lower = class_name.lower()
            if class_name_lower in CLASS_TYPICAL_DEPTHS:
                class_depth = CLASS_TYPICAL_DEPTHS[class_name_lower]
                # 70% bbox-based, 30% class default
                estimated_depth = 0.7 * estimated_depth + 0.3 * class_depth
        
        # Clamp to reasonable range (0.5m to 3m)
        estimated_depth = max(500, min(3000, estimated_depth))
        
        return estimated_depth

    def camera_to_world_coords(self, x_cam, y_cam, z_cam, pan_angle):
        """
        Transform camera-relative coordinates to world coordinates

        World coordinate system:
            - 90° pan angle = forward (+Z direction) [camera home position]
            - 0° pan angle = left (-X direction)
            - 180° pan angle = right (+X direction)
            - Y axis = vertical (unchanged)

        Args:
            x_cam, y_cam, z_cam: Camera-relative coordinates (mm)
            pan_angle: Current pan servo angle (0, 90, or 180 degrees)

        Returns:
            (x_world, y_world, z_world): World coordinates in mm
        """
        # Calculate rotation angle from reference (90° = 0 offset)
        theta = math.radians(pan_angle - 90)

        # Rotate in XZ plane (horizontal), Y unchanged (vertical)
        x_world = x_cam * math.cos(theta) - z_cam * math.sin(theta)
        y_world = y_cam  # Vertical axis stays the same
        z_world = x_cam * math.sin(theta) + z_cam * math.cos(theta)

        return (x_world, y_world, z_world)

    def map_color_to_depth(self, color_x, color_y):
        depth_x = int(color_x * self.depth_width / self.color_width)
        depth_y = int(color_y * self.depth_height / self.color_height)

        depth_x = max(0, min(depth_x, self.depth_width - 1))
        depth_y = max(0, min(depth_y, self.depth_height - 1))

        return (depth_x, depth_y)

    def visualize_depth(self, depth_frame, max_depth=4500):
        if depth_frame is None:
            return None

        depth_normalized = np.clip(depth_frame, 0, max_depth)
        depth_normalized = (depth_normalized / max_depth * 255).astype(np.uint8)

        depth_colored = cv2.applyColorMap(depth_normalized, cv2.COLORMAP_JET)

        depth_colored[depth_frame == 0] = [0, 0, 0]

        return depth_colored

    def close(self):
        if self.kinect:
            self.kinect.close()
        print("Kinect closed")


if __name__ == "__main__":
    print("Kinect Camera Test")
    print("=" * 50)
    print("Controls:")
    print("  'q' - Quit")
    print("  's' - Save frames")
    print("=" * 50)

    kinect = KinectCamera()

    try:
        while True:
            rgb, depth = kinect.get_frames()

            if rgb is not None:
                rgb_bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
                rgb_display = cv2.resize(rgb_bgr, (960, 540))
                cv2.imshow('Kinect RGB', rgb_display)

            if depth is not None:
                depth_vis = kinect.visualize_depth(depth)
                depth_display = cv2.resize(depth_vis, (512, 424))
                cv2.imshow('Kinect Depth', depth_display)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                if rgb is not None:
                    cv2.imwrite('test_rgb.png', cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
                    print("Saved test_rgb.png")
                if depth is not None:
                    cv2.imwrite('test_depth.png', kinect.visualize_depth(depth))
                    print("Saved test_depth.png")

    except KeyboardInterrupt:
        print("\nInterrupted")

    finally:
        kinect.close()
        cv2.destroyAllWindows()
