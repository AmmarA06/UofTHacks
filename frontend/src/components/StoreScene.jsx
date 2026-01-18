import { Canvas } from '@react-three/fiber';
import { CameraControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useRef, useImperativeHandle, forwardRef } from 'react';
import Shelf from './canvas/Shelf';
import StoreEnvironment from './StoreEnvironment';

/**
 * 3D Store Scene that renders shelves based on floor plan analysis
 * @param {Array} shelves - Array of shelf data from Gemini API
 * @param {Function} onShelfSelect - Callback when shelf is selected
 * @param {String} selectedShelfId - Currently selected shelf ID
 * @param {Boolean} isFreeCam - Whether freecam mode is enabled
 */
const StoreScene = forwardRef(({ shelves = [], onShelfSelect, selectedShelfId, isFreeCam }, ref) => {
  const cameraControlsRef = useRef();

  // Expose camera controls to parent component
  useImperativeHandle(ref, () => cameraControlsRef.current);
  // Calculate platform size based on number of shelves
  // Base size: 20m, add 3m for every 5 shelves, max 50m
  const shelfCount = shelves.length;
  const basePlatformSize = 30;
  const platformSize = Math.min(basePlatformSize + Math.floor(shelfCount / 5) * 3, 50);
  
  // Camera distance scales with platform
  const cameraDistance = platformSize * 0.8;
  
  // Shadow camera bounds
  const shadowBounds = platformSize / 2;
  
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ 
          position: [cameraDistance, cameraDistance, cameraDistance], 
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        shadows
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#87CEEB'); // Light blue background
        }}
      >
        {/* Store Environment (Floor, Walls, Lighting) */}
        <StoreEnvironment platformSize={platformSize} />
        
        {/* Grid Helper - Dynamic size */}
        <Grid
          args={[platformSize, platformSize]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#9ca3af"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#6b7280"
          fadeDistance={platformSize}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
          position={[0, 0.01, 0]}
        />
        
        {/* Render all shelves */}
        {shelves.map((shelf, index) => (
          <Shelf 
            key={shelf.id || index} 
            shelfData={shelf} 
            platformSize={platformSize}
            onSelect={onShelfSelect}
            isSelected={selectedShelfId === shelf.id}
            cameraControlsRef={cameraControlsRef}
          />
        ))}
        
        {/* Camera Controls - Locked unless in FreeCam mode */}
        <CameraControls
          ref={cameraControlsRef}
          minDistance={5}
          maxDistance={platformSize * 1}
          makeDefault
          enabled={isFreeCam || !!selectedShelfId}
        />
        
        {/* Axes Helper for debugging (optional) */}
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
});

StoreScene.displayName = 'StoreScene';

export default StoreScene;
