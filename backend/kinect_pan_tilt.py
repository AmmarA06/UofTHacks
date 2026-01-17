"""
Kinect Camera Pan-Tilt Control Module

This module provides a Python interface to control the two-axis pan-tilt mount
that holds the Kinect V2 camera.

Features:
    - Two-axis servo control (pan and tilt)
    - Automatic startup calibration
    - Smooth servo movement (30ms per degree)
    - Point camera at detected objects using 3D coordinates

Hardware:
    - Pan servo (horizontal) on Arduino pin 9
    - Tilt servo (vertical) on Arduino pin 10
    - MG996R servos with external 5-6V power supply

Usage:
    # Basic usage
    pan_tilt = KinectPanTilt(port='COM3')
    pan_tilt.calibrate()  # Runs automatically on startup
    pan_tilt.center()
    pan_tilt.move_pan(45)
    pan_tilt.move_tilt(120)
    pan_tilt.close()

Requirements:
    pip install pyserial
"""

import serial
import time
import sys
import serial.tools.list_ports


class KinectPanTilt:
    """Controls the pan-tilt mount for the Kinect camera"""

    def __init__(self, port=None, baudrate=115200, auto_calibrate=False):
        """
        Initialize the pan-tilt controller

        Args:
            port: Serial port (e.g., 'COM3' on Windows, '/dev/ttyUSB0' on Linux)
                  If None, will attempt to auto-detect Arduino
            baudrate: Communication speed (default: 115200)
            auto_calibrate: Run calibration routine on startup (default: False)
        """
        self.baudrate = baudrate
        self.ser = None

        # Find port if not specified
        if port is None:
            port = self._find_arduino_port()
            if port is None:
                raise RuntimeError("Could not find Arduino. Please specify port manually.")

        # Connect to Arduino
        try:
            self.ser = serial.Serial(port, baudrate, timeout=1)
            time.sleep(2.5)  # Wait for Arduino to reset

            print(f"Connected to Kinect pan-tilt system on {port}")

            # Read initial startup messages
            time.sleep(0.5)
            self._read_responses()

        except serial.SerialException as e:
            raise RuntimeError(f"Could not open serial port {port}: {e}")

    def _find_arduino_port(self):
        """Auto-detect Arduino port"""
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if 'Arduino' in port.description or 'CH340' in port.description or 'USB Serial' in port.description:
                return port.device
        return None

    def _send_command(self, command):
        """Send command to Arduino"""
        if not self.ser or not self.ser.is_open:
            raise RuntimeError("Serial connection not open")

        self.ser.write(f"{command}\n".encode())
        time.sleep(0.1)

    def _read_responses(self, timeout=0.5):
        """Read and print responses from Arduino"""
        start_time = time.time()
        responses = []

        while time.time() - start_time < timeout:
            if self.ser.in_waiting:
                try:
                    response = self.ser.readline().decode('utf-8').strip()
                    if response:
                        print(f"[Pan-Tilt] {response}")
                        responses.append(response)
                except UnicodeDecodeError:
                    pass
            time.sleep(0.05)

        return responses

    def calibrate(self):
        """
        Run calibration routine
        Moves pan servo: 90° -> 0° -> 180° -> 90°
        """
        print("Running pan-tilt calibration...")
        self._send_command('cal')
        # Calibration takes ~13 seconds (90->0: 2.7s, 0->180: 5.4s, 180->90: 2.7s + delays)
        time.sleep(14)
        self._read_responses()
        print("Calibration complete")

    def center(self):
        """Move both servos to center position (Pan: 90°, Tilt: 110°)"""
        self._send_command('c')
        time.sleep(0.2)
        self._read_responses()

    def move_pan(self, angle):
        """
        Move pan servo (horizontal rotation)

        Args:
            angle: Target angle (0-180 degrees)
                   0 = far left, 90 = center, 180 = far right
        """
        if not 0 <= angle <= 180:
            raise ValueError("Pan angle must be between 0 and 180")

        self._send_command(f'p:{int(angle)}')
        # Calculate approximate movement time (30ms per degree)
        time.sleep(0.1)
        self._read_responses(timeout=0.2)

    def move_tilt(self, angle):
        """
        Move tilt servo (vertical rotation)

        Args:
            angle: Target angle (90-180 degrees)
                   90 = down, 110 = center, 180 = up
        """
        if not 90 <= angle <= 180:
            raise ValueError("Tilt angle must be between 90 and 180")

        self._send_command(f't:{int(angle)}')
        time.sleep(0.1)
        self._read_responses(timeout=0.2)

    def move_both(self, pan_angle, tilt_angle):
        """
        Move both servos simultaneously

        Args:
            pan_angle: Pan angle (0-180 degrees)
            tilt_angle: Tilt angle (90-180 degrees)
        """
        if not 0 <= pan_angle <= 180:
            raise ValueError("Pan angle must be between 0 and 180")
        if not 90 <= tilt_angle <= 180:
            raise ValueError("Tilt angle must be between 90 and 180")

        self._send_command(f'b:{int(pan_angle)},{int(tilt_angle)}')
        time.sleep(0.1)
        self._read_responses(timeout=0.2)

    def set_pan_velocity(self, velocity):
        """
        Set pan servo velocity for continuous movement

        Args:
            velocity: Velocity in degrees per second
                      Positive = move right, Negative = move left
                      0 = stop
        """
        self._send_command(f'vp:{velocity}')

    def set_tilt_velocity(self, velocity):
        """
        Set tilt servo velocity for continuous movement

        Args:
            velocity: Velocity in degrees per second
                      Positive = move up, Negative = move down
                      0 = stop
        """
        self._send_command(f'vt:{velocity}')

    def stop_all(self):
        """Stop all servo movement"""
        self._send_command('stop')

    def stop_pan(self):
        """Stop pan servo movement only"""
        self._send_command('sp')

    def stop_tilt(self):
        """Stop tilt servo movement only"""
        self._send_command('st')

    def point_at_object(self, x, y, z):
        """
        Point camera at object at 3D coordinates (future implementation)

        This will calculate the required pan/tilt angles to point the camera
        at an object detected at position (x, y, z) in millimeters.

        Args:
            x: X coordinate in mm (horizontal)
            y: Y coordinate in mm (vertical)
            z: Z coordinate in mm (depth)

        Note: This requires camera mount geometry calibration
        """
        # TODO: Implement coordinate-to-angle conversion
        # This will depend on:
        # - Camera height and position relative to servo mount
        # - Servo orientation and mounting angles
        # - Kinematic model of the pan-tilt mechanism

        raise NotImplementedError("Object pointing requires mount geometry calibration")

    def close(self):
        """Close serial connection"""
        if self.ser and self.ser.is_open:
            self.ser.close()
            print("Pan-tilt connection closed")

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


def main():
    """Interactive test mode"""
    print("="*60)
    print("Kinect Pan-Tilt Interactive Control")
    print("="*60)

    # Find Arduino
    print("\nSearching for Arduino...")
    ports = serial.tools.list_ports.comports()
    arduino_ports = [p.device for p in ports if 'Arduino' in p.description or 'CH340' in p.description]

    if arduino_ports:
        print(f"Found Arduino on: {arduino_ports[0]}")
        port = arduino_ports[0]
    else:
        print("\nAvailable ports:")
        for p in ports:
            print(f"  {p.device} - {p.description}")
        port = input("\nEnter port (e.g., COM3): ").strip()

    # Initialize controller
    print("\nInitializing pan-tilt controller...")
    print("(Calibration will run automatically)")
    pan_tilt = KinectPanTilt(port=port, auto_calibrate=True)

    print("\n" + "="*60)
    print("Commands:")
    print("  p <angle>       - Move pan (0-180)")
    print("  t <angle>       - Move tilt (0-180)")
    print("  b <pan> <tilt>  - Move both")
    print("  c               - Center both servos")
    print("  cal             - Run calibration")
    print("  q               - Quit")
    print("="*60 + "\n")

    try:
        while True:
            try:
                cmd = input("Command: ").strip().lower()

                if cmd == 'q':
                    break
                elif cmd == 'c':
                    pan_tilt.center()
                elif cmd == 'cal':
                    pan_tilt.calibrate()
                elif cmd.startswith('p '):
                    angle = int(cmd.split()[1])
                    pan_tilt.move_pan(angle)
                elif cmd.startswith('t '):
                    angle = int(cmd.split()[1])
                    pan_tilt.move_tilt(angle)
                elif cmd.startswith('b '):
                    parts = cmd.split()
                    if len(parts) == 3:
                        pan_angle = int(parts[1])
                        tilt_angle = int(parts[2])
                        pan_tilt.move_both(pan_angle, tilt_angle)
                    else:
                        print("Usage: b <pan> <tilt>")
                else:
                    print("Invalid command")

            except ValueError as e:
                print(f"Error: {e}")
            except KeyboardInterrupt:
                print("\nExiting...")
                break

    finally:
        pan_tilt.close()


if __name__ == "__main__":
    main()
