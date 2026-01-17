import { useState } from 'react';
import { Text } from '@react-three/drei';
import { getClassColorRgb } from '@/utils/colors';

export function ObjectMarker({ object }) {
  const [hovered, setHovered] = useState(false);

  // Convert position from mm to meters, then scale down further for better spacing
  const scaleFactor = 2000; // Increased from 1000 to spread objects out more
  const x = (object.avg_position_x || 0) / scaleFactor;
  const y = (object.avg_position_y || 0) / scaleFactor;
  const z = (object.avg_position_z || 0) / scaleFactor;

  // Get color
  const [r, g, b] = getClassColorRgb(object.class_name);
  const color = `rgb(${r}, ${g}, ${b})`;

  // Size based on confidence and detection count - increased for better visibility
  const baseSize = 0.15;
  const sizeMultiplier = Math.min(1 + (object.detection_count / 20), 2);
  const size = baseSize * sizeMultiplier;

  return (
    <group position={[x, y, z]}>
      {/* Sphere marker */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.3 : 1}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.2}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Label */}
      {hovered && (
        <Text
          position={[0, size + 0.1, 0]}
          fontSize={0.08}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
        >
          {object.class_name}
          {'\n'}
          #{object.object_id}
        </Text>
      )}

      {/* Vertical line to ground */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, -y, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#666666" opacity={0.3} transparent />
      </line>
    </group>
  );
}
