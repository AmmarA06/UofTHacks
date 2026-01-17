/*
 * Kinect Camera Pan-Tilt Control System with Velocity Control
 *
 * This sketch controls a two-axis pan-tilt mount for the Kinect V2 camera.
 * Supports both position-based and velocity-based control for smooth movement.
 *
 * Hardware Connections:
 * - Pan Servo (Horizontal) Signal -> Pin 9
 * - Tilt Servo (Vertical) Signal -> Pin 10
 * - Servo VCC (Red) -> External 5-6V power supply
 * - Servo GND (Brown/Black) -> GND (connect to Arduino GND)
 *
 * Features:
 * - Two-axis pan-tilt control (0-180 degrees each)
 * - Velocity-based control for smooth continuous movement
 * - Position-based control for direct positioning
 * - Non-blocking servo updates
 *
 * Serial Commands:
 * Position-based:
 * - p:<angle> - Move pan servo (horizontal) to angle (e.g., "p:90")
 * - t:<angle> - Move tilt servo (vertical) to angle (e.g., "t:110")
 * - b:<pan>,<tilt> - Move both servos (e.g., "b:90,110")
 * - c - Return to center position (90°, 110°)
 *
 * Velocity-based (NEW):
 * - vp:<speed> - Set pan velocity in deg/sec (e.g., "vp:30" or "vp:-30")
 * - vt:<speed> - Set tilt velocity in deg/sec (e.g., "vt:20" or "vt:-20")
 * - stop - Stop all movement
 * - sp - Stop pan only
 * - st - Stop tilt only
 */

#include <Servo.h>

Servo panServo;   // Horizontal rotation (pin 9)
Servo tiltServo;  // Vertical rotation (pin 10)

const int PAN_PIN = 9;
const int TILT_PIN = 10;

// Angle limits
const int PAN_MIN = 0;
const int PAN_MAX = 180;
const int TILT_MIN = 90;   // Tilt servo (pin 10) limited to 90-180
const int TILT_MAX = 180;

// Center positions
const int PAN_CENTER = 90;
const int TILT_CENTER = 110;

// Current positions (in degrees)
float panCurrentPos = PAN_CENTER;
float tiltCurrentPos = TILT_CENTER;

// Target positions for smooth movement
float panTargetPos = PAN_CENTER;
float tiltTargetPos = TILT_CENTER;

// Maximum movement speed for position-based control (degrees per second)
// Lower = slower/smoother, Higher = faster
// Recommended: 45-90 for smooth but responsive movement
const float MAX_MOVEMENT_SPEED = 60.0;

// Velocity control (in degrees per second)
float panVelocity = 0.0;  // Current velocity for pan
float tiltVelocity = 0.0; // Current velocity for tilt

// Update timing
unsigned long lastUpdateTime = 0;
const int UPDATE_INTERVAL = 10; // Update servos every 10ms (100Hz) for smoother motion

void setup() {
  Serial.begin(115200);

  // Attach servos
  panServo.attach(PAN_PIN);
  tiltServo.attach(TILT_PIN);

  // Set initial center positions
  panServo.write((int)panCurrentPos);
  tiltServo.write((int)tiltCurrentPos);

  Serial.println("Kinect Pan-Tilt Control System Ready!");
  Serial.println("");
  Serial.println("Position Commands:");
  Serial.println("  p:<angle>       - Move pan (0-180)");
  Serial.println("  t:<angle>       - Move tilt (90-180)");
  Serial.println("  b:<pan>,<tilt>  - Move both");
  Serial.println("  c               - Center (90, 110)");
  Serial.println("");
  Serial.println("Velocity Commands:");
  Serial.println("  vp:<speed>      - Set pan velocity (deg/sec, +/- for direction)");
  Serial.println("  vt:<speed>      - Set tilt velocity (deg/sec, +/- for direction)");
  Serial.println("  stop            - Stop all movement");
  Serial.println("  sp              - Stop pan");
  Serial.println("  st              - Stop tilt");
  Serial.println("");

  lastUpdateTime = millis();
}

void loop() {
  // Handle serial commands
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    processCommand(input);
  }

  // Update servo positions based on velocity (non-blocking)
  unsigned long currentTime = millis();
  if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
    float deltaTime = (currentTime - lastUpdateTime) / 1000.0; // Convert to seconds
    updateServos(deltaTime);
    lastUpdateTime = currentTime;
  }
}

void processCommand(String input) {
  if (input == "c" || input == "C") {
    centerServos();
  }
  else if (input == "stop" || input == "STOP") {
    stopAll();
  }
  else if (input == "sp" || input == "SP") {
    stopPan();
  }
  else if (input == "st" || input == "ST") {
    stopTilt();
  }
  else if (input.startsWith("p:") || input.startsWith("P:")) {
    int angle = input.substring(2).toInt();
    movePan(angle);
  }
  else if (input.startsWith("t:") || input.startsWith("T:")) {
    int angle = input.substring(2).toInt();
    moveTilt(angle);
  }
  else if (input.startsWith("vp:") || input.startsWith("VP:")) {
    float velocity = input.substring(3).toFloat();
    setPanVelocity(velocity);
  }
  else if (input.startsWith("vt:") || input.startsWith("VT:")) {
    float velocity = input.substring(3).toFloat();
    setTiltVelocity(velocity);
  }
  else if (input.startsWith("b:") || input.startsWith("B:")) {
    // Parse "b:90,110" format
    int commaPos = input.indexOf(',');
    if (commaPos > 0) {
      int panAngle = input.substring(2, commaPos).toInt();
      int tiltAngle = input.substring(commaPos + 1).toInt();
      movePan(panAngle);
      moveTilt(tiltAngle);
    } else {
      Serial.println("Error: Use format b:<pan>,<tilt>");
    }
  }
  else {
    Serial.println("Error: Invalid command");
  }
}

void updateServos(float deltaTime) {
  bool positionUpdated = false;

  // Update pan position - either velocity-based or target-based
  if (panVelocity != 0) {
    // Velocity-based control (manual continuous movement)
    panCurrentPos += panVelocity * deltaTime;
    panCurrentPos = constrain(panCurrentPos, PAN_MIN, PAN_MAX);
    panTargetPos = panCurrentPos; // Keep target in sync

    // Stop if we hit a limit
    if (panCurrentPos == PAN_MIN || panCurrentPos == PAN_MAX) {
      panVelocity = 0;
    }
    positionUpdated = true;
  }
  else if (abs(panCurrentPos - panTargetPos) > 0.5) {
    // Target-based control (smooth position movement)
    float distance = panTargetPos - panCurrentPos;
    float maxMove = MAX_MOVEMENT_SPEED * deltaTime;

    if (abs(distance) <= maxMove) {
      // Close enough - snap to target
      panCurrentPos = panTargetPos;
    } else {
      // Move toward target at max speed
      panCurrentPos += (distance > 0 ? maxMove : -maxMove);
    }
    positionUpdated = true;
  }

  // Update tilt position - either velocity-based or target-based
  if (tiltVelocity != 0) {
    // Velocity-based control (manual continuous movement)
    tiltCurrentPos += tiltVelocity * deltaTime;
    tiltCurrentPos = constrain(tiltCurrentPos, TILT_MIN, TILT_MAX);
    tiltTargetPos = tiltCurrentPos; // Keep target in sync

    // Stop if we hit a limit
    if (tiltCurrentPos == TILT_MIN || tiltCurrentPos == TILT_MAX) {
      tiltVelocity = 0;
    }
    positionUpdated = true;
  }
  else if (abs(tiltCurrentPos - tiltTargetPos) > 0.5) {
    // Target-based control (smooth position movement)
    float distance = tiltTargetPos - tiltCurrentPos;
    float maxMove = MAX_MOVEMENT_SPEED * deltaTime;

    if (abs(distance) <= maxMove) {
      // Close enough - snap to target
      tiltCurrentPos = tiltTargetPos;
    } else {
      // Move toward target at max speed
      tiltCurrentPos += (distance > 0 ? maxMove : -maxMove);
    }
    positionUpdated = true;
  }

  // Write to servos if position changed
  if (positionUpdated) {
    panServo.write((int)panCurrentPos);
    tiltServo.write((int)tiltCurrentPos);
  }
}

// Velocity control functions
void setPanVelocity(float velocity) {
  panVelocity = velocity;
  Serial.print("Pan velocity: ");
  Serial.print(velocity);
  Serial.println(" deg/sec");
}
