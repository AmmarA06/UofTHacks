import { useRef, useState, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import ProductStock from './ProductStock';

/**
 * Individual shelf component in 3D space using GLTF model
 * @param {Object} shelfData - Shelf data from Gemini API
 * @param {Number} platformSize - Size of the platform for scaling
 * @param {Function} onSelect - Callback when shelf is clicked
 * @param {Boolean} isSelected - Whether this shelf is currently selected
 * @param {Object} cameraControlsRef - Reference to camera controls
 */
function Shelf({ shelfData, platformSize = 50, onSelect, isSelected, cameraControlsRef }) {
  const groupRef = useRef();
  const [model, setModel] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Convert normalized position (0-1) to 3D coordinates
  // Scale based on dynamic platform size
  // Add null checks to prevent crashes during optimization
  const normalizedX = shelfData.normalizedPos?.x ?? 0.5;
  const normalizedY = shelfData.normalizedPos?.y ?? 0.5;
  const x = (normalizedX - 0.5) * 60;
  const z = (normalizedY - 0.5) * (50 * 0.5); // 26% of platform size for depth
  
  // Convert normalized scale to actual size (scaled with platform)
  const scaleW = shelfData.scale?.w ?? 0.05;
  const scaleH = shelfData.scale?.h ?? 0.05;
  const scaleWidth = Math.max(scaleW * platformSize * 1, 1.5); // Min 1.5m wide
  const scaleDepth = Math.max(scaleH * platformSize * 1.4, 1.5); // Min 1.5m deep
  const height = 2.5; // Height for label positioning
  
  // Model scale - adjust this based on your actual model size
  const modelScale = [scaleWidth / 2, 1, scaleDepth / 2];

  // Color based on inventory count and selection state
  const itemCount = shelfData.metadata?.count ?? 0;
  let color = itemCount === 0 ? '#fbbf24' : '#3b82f6'; // yellow if empty, blue if stocked
  
  // Highlight color when hovered or selected
  if (isSelected) {
    color = '#00ff00'; // Green when selected
  } else if (isHovered) {
    color = '#ffffff'; // White when hovered
  }

  // Handle shelf click - transition camera
  const handleClick = (e) => {
    e.stopPropagation();
    
    if (onSelect && cameraControlsRef?.current) {
      onSelect(shelfData);
      
      // Calculate camera position in front of shelf
      const shelfX = x;
      const shelfZ = z;
      const cameraDistance = 5;
      
      // Position camera in front of shelf (along Z axis)
      const cameraX = shelfX;
      const cameraY = 2; // Eye level
      const cameraZ = shelfZ + cameraDistance;
      
      // Smoothly transition camera
      cameraControlsRef.current.setLookAt(
        cameraX, cameraY, cameraZ, // Camera position
        shelfX, 1.5, shelfZ, // Look at shelf center
        true // Enable smooth transition
      );
    }
  };

  // Load GLTF model
  useEffect(() => {
    const loader = new GLTFLoader();
    
    loader.load(
      '/models/store_shelves/scene.gltf',
      (gltf) => {
        // Success - model loaded
        const clonedScene = gltf.scene.clone();
        
        // Traverse and apply color to all meshes
        clonedScene.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({ 
              color: color,
              roughness: 0.7,
              metalness: 0.3
            });
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        setModel(clonedScene);
        setLoadError(false);
      },
      (progress) => {
        // Optional: handle loading progress
        console.log('Loading model:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        // Error - fall back to box geometry
        console.warn('Could not load shelf model, using fallback box:', error);
        setLoadError(true);
      }
    );
  }, [color]);

  return (
    <group 
      ref={groupRef} 
      position={[x, 0, z]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setIsHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Render GLTF Model or Fallback Box */}
      {model && !loadError ? (
        <primitive 
          object={model} 
          scale={modelScale}
        />
      ) : (
        // Fallback: Simple box if model doesn't load
        <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
          <boxGeometry args={[scaleWidth, height, scaleDepth]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.7} 
            metalness={0.3}
            emissive={isHovered || isSelected ? color : '#000000'}
            emissiveIntensity={isHovered || isSelected ? 0.3 : 0}
          />
        </mesh>
      )}
      
      {/* Product Stock on Shelf */}
      <ProductStock
        count={shelfData.metadata?.count || 0}
        shelfWidth={scaleWidth}
        shelfDepth={scaleDepth}
        shelfHeight={height}
        productType={shelfData.metadata?.productType || 'cell_phone'}
      />

      {/* Label above the shelf */}
      <Text
        position={[0, height + 0.5, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {shelfData.label || 'Shelf'}
      </Text>

      {/* ID label */}
      <Text
        position={[0, height + 1.2, 0]}
        fontSize={0.3}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {shelfData.id || 'Unknown'}
      </Text>

      {/* Item count display */}
      {shelfData.metadata?.count !== undefined && (
        <Text
          position={[0, height + 1.8, 0]}
          fontSize={0.4}
          color={itemCount === 0 ? '#ef4444' : '#10b981'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {`${shelfData.metadata?.item || 'Items'}: ${itemCount}`}
        </Text>
      )}
    </group>
  );
}

export default Shelf;
