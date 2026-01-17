"""Kinect V2 camera interface"""

import numpy as np
import cv2
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

    def pixel_to_3d(self, pixel_x, pixel_y, depth_mm):
        if depth_mm == 0:
            return (0, 0, 0)

        z = float(depth_mm)
        x = (pixel_x - self.cx) * z / self.fx
        y = (pixel_y - self.cy) * z / self.fy

        return (x, y, z)

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
