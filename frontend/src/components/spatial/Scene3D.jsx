import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  PerspectiveCamera,
  Environment,
  Stars
} from '@react-three/drei';
import { ObjectMarker } from './ObjectMarker';
import { Camera, RotateCcw } from 'lucide-react';
import * as THREE from 'three';

// Camera preset positions
const CAMERA_PRESETS = {
  default: { position: [2, 2, 5], name: 'Perspective' },
  top: { position: [0, 8, 0], name: 'Top View' },
  front: { position: [0, 0, 5], name: 'Front View' },
  side: { position: [5, 0, 0], name: 'Side View' },
  isometric: { position: [3, 3, 3], name: 'Isometric' },
};

// Animated camera transition and WASD controls
function CameraController({ targetPosition, targetControls, onComplete, controlsRef, onCameraUpdate }) {
  const { camera } = useThree();
  const keysPressed = useRef({});

  useEffect(() => {
    if (!targetPosition) return;

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...targetPosition);
    const startTarget = controlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0);
    const endTarget = targetControls ? new THREE.Vector3(...targetControls) : startTarget;
    const duration = 1500; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, endPos, eased);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTarget, endTarget, eased);
        controlsRef.current.update();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    animate();
  }, [targetPosition, targetControls, camera, controlsRef, onComplete]);

  // WASD controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const speed = 0.1;
    const rotationSpeed = 0.02;
    const keys = keysPressed.current;

    if (!controlsRef?.current) return;

    // Get camera direction vectors
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Forward is the direction from camera to target (where camera is looking)
    forward.subVectors(controlsRef.current.target, camera.position).normalize();

    // Right is perpendicular to forward and up
    right.crossVectors(forward, camera.up).normalize();

    // Project forward onto XZ plane for horizontal movement
    const forwardFlat = new THREE.Vector3(forward.x, 0, forward.z).normalize();
    const rightFlat = new THREE.Vector3(right.x, 0, right.z).normalize();

    // WASD movement - move camera and target together
    if (keys['w']) {
      camera.position.addScaledVector(forwardFlat, speed);
      controlsRef.current.target.addScaledVector(forwardFlat, speed);
    }
    if (keys['s']) {
      camera.position.addScaledVector(forwardFlat, -speed);
      controlsRef.current.target.addScaledVector(forwardFlat, -speed);
    }
    if (keys['a']) {
      camera.position.addScaledVector(rightFlat, -speed);
      controlsRef.current.target.addScaledVector(rightFlat, -speed);
    }
    if (keys['d']) {
      camera.position.addScaledVector(rightFlat, speed);
      controlsRef.current.target.addScaledVector(rightFlat, speed);
    }

    // Arrow key rotation - rotate target around camera
    if (keys['arrowleft'] || keys['arrowright'] || keys['arrowup'] || keys['arrowdown']) {
      // Get vector from camera to target
      const offset = new THREE.Vector3().subVectors(controlsRef.current.target, camera.position);
      const distance = offset.length();

      // Calculate current spherical angles
      const phi = Math.atan2(offset.x, offset.z); // Azimuthal angle (left/right)
      const theta = Math.acos(Math.max(-1, Math.min(1, offset.y / distance))); // Polar angle (up/down)

      let newPhi = phi;
      let newTheta = theta;

      // Left/Right rotation
      if (keys['arrowleft']) {
        newPhi += rotationSpeed;
      }
      if (keys['arrowright']) {
        newPhi -= rotationSpeed;
      }

      // Up/Down rotation
      if (keys['arrowup']) {
        newTheta = Math.max(0.1, theta - rotationSpeed); // Clamp to avoid flipping
      }
      if (keys['arrowdown']) {
        newTheta = Math.min(Math.PI - 0.1, theta + rotationSpeed); // Clamp to avoid flipping
      }

      // Convert back to Cartesian and update target
      controlsRef.current.target.set(
        camera.position.x + distance * Math.sin(newTheta) * Math.sin(newPhi),
        camera.position.y + distance * Math.cos(newTheta),
        camera.position.z + distance * Math.sin(newTheta) * Math.cos(newPhi)
      );
    }

    // Update controls
    controlsRef.current.update();

    // Report camera position for display
    if (onCameraUpdate) {
      onCameraUpdate(camera.position);
    }
  });

  return null;
}

export function Scene3D({ objects }) {
  const [cameraTarget, setCameraTarget] = useState(null);
  const [controlsTarget, setControlsTarget] = useState(null);
  const [currentPreset, setCurrentPreset] = useState('default');
  const [cameraInfo, setCameraInfo] = useState('');
  const controlsRef = useRef();

  const getCameraOrientation = (position) => {
    const x = position.x;
    const y = position.y;
    const z = position.z;

    // Calculate angles
    const distanceXZ = Math.sqrt(x * x + z * z);
    const elevationAngle = Math.atan2(y, distanceXZ) * (180 / Math.PI);
    const azimuthAngle = Math.atan2(x, z) * (180 / Math.PI);

    return `${elevationAngle.toFixed(0)}° elev • ${azimuthAngle.toFixed(0)}° azim`;
  };

  const switchCamera = (presetName) => {
    setCurrentPreset(presetName);
    setCameraTarget(CAMERA_PRESETS[presetName].position);
    setControlsTarget([0, 0, 0]); // Reset target to origin when switching cameras
  };

  const resetCamera = () => {
    setCurrentPreset('default');
    setCameraTarget(CAMERA_PRESETS.default.position);
    setControlsTarget([0, 0, 0]);
  };

  return (
    <div className="relative w-full h-[600px] bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 rounded-lg overflow-hidden transition-all duration-300">
      {/* Control Panel - Left Side */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* Camera Presets */}
        <div className="bg-white/95 backdrop-blur-md border border-border rounded-lg p-2 shadow-md">
          <div className="text-xs text-foreground-muted mb-2 px-2 font-semibold uppercase tracking-wide flex items-center gap-1">
            <Camera className="w-3 h-3 text-[#1a1a1a]" />
            Camera
          </div>
          <div className="flex flex-col gap-1">
            {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => switchCamera(key)}
                className={`px-3 py-1.5 text-xs rounded transition-all ${
                  currentPreset === key
                    ? 'bg-[#1a1a1a] text-white font-semibold shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:text-[#1a1a1a] hover:bg-gray-200'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetCamera}
          className="bg-white/95 backdrop-blur-md border border-border rounded-lg p-2.5 shadow-md hover:border-gray-400 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          title="Reset Camera (R)"
        >
          <RotateCcw className="w-4 h-4 text-[#1a1a1a]" />
          <span className="text-xs font-semibold text-foreground">Reset</span>
        </button>
      </div>

      {/* Controls Hint - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-md">
        <div className="text-xs text-foreground-muted font-medium">
          <span className="font-bold text-[#1a1a1a]">WASD</span> to move • <span className="font-bold text-[#1a1a1a]">Arrows</span> to look • <span className="font-bold text-[#1a1a1a]">Mouse</span> to orbit
        </div>
      </div>

      {/* Camera Orientation - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-1.5 shadow-sm">
        <div className="text-xs text-foreground-subtle font-mono">
          {cameraInfo || 'Camera view'}
        </div>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={CAMERA_PRESETS.default.position} />
        <CameraController
          targetPosition={cameraTarget}
          targetControls={controlsTarget}
          controlsRef={controlsRef}
          onCameraUpdate={(pos) => setCameraInfo(getCameraOrientation(pos))}
        />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Enhanced Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#1a1a1a" />

        {/* Environment */}
        <Environment preset="night" />

        {/* Stars background */}
        <Stars
          radius={100}
          depth={50}
          count={1000}
          factor={2}
          saturation={0}
          fade
          speed={0.5}
        />

        {/* Ground Grid - Horizontal plane */}
        <Grid
          position={[0, 0, 0]}
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#333333"
          sectionSize={2}
          sectionThickness={1.2}
          sectionColor="#1a1a1a"
          fadeDistance={25}
          fadeStrength={2}
          infiniteGrid
        />

        {/* Enhanced Axes Helper - Larger and more visible */}
        <axesHelper args={[5]} />

        {/* Origin marker - small sphere at center */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#1a1a1a" emissiveIntensity={0.5} />
        </mesh>

        {/* Objects */}
        {objects.map((object) => (
          <ObjectMarker key={object.object_id} object={object} />
        ))}
      </Canvas>
    </div>
  );
}
