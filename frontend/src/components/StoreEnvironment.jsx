import { useTexture, Environment, useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';

// Export START and END coordinates for pathfinding/analysis
export const STORE_MARKERS = {
  START: { x: -15, z: 15 },  // Bottom left, inside building
  END: { x: 15, z: -15 }      // Top right, inside building
};

/**
 * Store environment with floor and walls
 * @param {Number} platformSize - Size of the platform/scene
 */
function StoreEnvironment({ platformSize = 60 }) {
  // Load floor textures
  const floorTextures = useTexture({
    map: '/floor_texture/WhiteTiles02_1K_BaseColor.png',
    roughnessMap: '/floor_texture/WhiteTiles02_1K_Roughness.png',
    normalMap: '/floor_texture/WhiteTiles02_1K_Normal.png',
    displacementMap: '/floor_texture/WhiteTiles02_1K_Height.png',
    aoMap: '/floor_texture/WhiteTiles02_1K_AO.png',
  });

  // Load wall textures
  const wallTextures = useTexture({
    map: '/textures_wall/beige_wall_001_diff_4k.jpg',
    roughnessMap: '/textures_wall/beige_wall_001_rough_4k.jpg',
    displacementMap: '/textures_wall/beige_wall_001_disp_4k.png',
  });

  // Load Amplitude logo
  const amplitudeLogo = useTexture('/src/assets/amplitude_logo_icon_168655.png');

  // Load models
  const slidingDoor = useGLTF('/models/sliding_door/scene.gltf');
  const cashierStand = useGLTF('/models/psx_cashier_stand/scene.gltf');
  const shoppingCart = useGLTF('/models/low_poly_shopping_cart/scene.gltf');

  // Cashier stand model loaded - clones will be created individually

  // Configure texture repeat for realistic tiling
  const textureRepeat = platformSize / 2; // Adjust this value for tile size
  Object.values(floorTextures).forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(textureRepeat, textureRepeat);
  });

  // Configure wall texture repeat
  const wallTextureRepeat = platformSize / 4; // Adjust for wall tile size
  Object.values(wallTextures).forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(wallTextureRepeat, wallTextureRepeat / 4); // Horizontal repeat, less vertical repeat
  });

  // Wall dimensions
  const wallHeight = 6; // 6 meters tall
  const wallThickness = 0.3;
  
  // Calculate wall positions based on platform size
  const wallDistance = platformSize / 2;

  return (
    <group>
      {/* Environment Lighting */}
      <Environment preset="city" />
      
      {/* Directional Light for Shadows */}
      <directionalLight
        position={[platformSize / 2, platformSize, platformSize / 2]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={platformSize * 2}
        shadow-camera-left={-platformSize / 2}
        shadow-camera-right={platformSize / 2}
        shadow-camera-top={platformSize / 2}
        shadow-camera-bottom={-platformSize / 2}
      />

      {/* Floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[platformSize, platformSize]} />
        <meshStandardMaterial 
          map={floorTextures.map}
          roughnessMap={floorTextures.roughnessMap}
          normalMap={floorTextures.normalMap}
          displacementMap={floorTextures.displacementMap}
          aoMap={floorTextures.aoMap}
          displacementScale={0.1}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Back Wall */}
      <mesh 
        position={[0, wallHeight / 2, -wallDistance]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[platformSize, wallHeight, wallThickness]} />
        <meshStandardMaterial 
          map={wallTextures.map}
          roughnessMap={wallTextures.roughnessMap}
          displacementMap={wallTextures.displacementMap}
          displacementScale={0.05}
          color="#588fe8"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Left Wall */}
      <mesh 
        position={[-wallDistance, wallHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wallHeight, platformSize]} />
        <meshStandardMaterial 
          map={wallTextures.map}
          roughnessMap={wallTextures.roughnessMap}
          displacementMap={wallTextures.displacementMap}
          displacementScale={0.05}
          color="#588fe8"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Right Wall */}
      <mesh 
        position={[wallDistance, wallHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wallHeight, platformSize]} />
        <meshStandardMaterial 
          map={wallTextures.map}
          roughnessMap={wallTextures.roughnessMap}
          displacementMap={wallTextures.displacementMap}
          displacementScale={0.05}
          color="#588fe8"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Amplitude Logo on Back Wall */}
      <mesh 
        position={[0, wallHeight * 0.7, -wallDistance + 0.2]}
        castShadow
      >
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial 
          map={amplitudeLogo}
          transparent={true}
          side={THREE.DoubleSide}
          color="#ffffff"
          emissive="#000000"
          emissiveIntensity={0}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Sliding Door - Bottom Left (parallel to front wall) */}
      <group position={[-wallDistance + 2, 0, wallDistance - 2]}>
        <primitive 
          object={slidingDoor.scene.clone()} 
          scale={1.5}
          rotation={[0, 0, 0]} // Parallel to front/back walls
          position={[1, 0, 2]} 
          castShadow
          receiveShadow
        />
        
      </group>

      {/* Shopping Cart - Left side near entrance */}
      <group position={[-wallDistance + 6, 0, wallDistance - 5]}>
        <primitive 
          object={shoppingCart.scene.clone()} 
          scale={1.2}
          rotation={[0, Math.PI / 4 + Math.PI, 0]} // Flipped 180 degrees
          castShadow
          receiveShadow
        />
      </group>

      {/* Simple Metal Fences - Back fence (closer to store) */}
      {[-9, -3, 3, 9].map((xPos, index) => (
        <group key={index} position={[xPos, 0, wallDistance - 6]}>
          {/* Fence Post */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Horizontal Rails (if not the last post) */}
          {index < 3 && (
            <>
              {/* Top Rail */}
              <mesh 
                position={[3, 1.0, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[6, 0.04, 0.04]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Middle Rail */}
              <mesh 
                position={[3, 0.6, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[6, 0.04, 0.04]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Bottom Rail */}
              <mesh 
                position={[3, 0.2, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[6, 0.04, 0.04]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Simple Metal Fences - Front fence (closer to entrance) */}
      {[-9, -3, 3, 9].map((xPos, index) => (
        <group key={`front-${index}`} position={[xPos, 0, wallDistance - 3]}>
          {/* Fence Post */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Horizontal Rails (if not the last post) */}
          {index < 3 && (
            <>
              {/* Top Rail */}
              <mesh 
                position={[3, 1.0, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[6, 0.04, 0.04]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Middle Rail */}
              <mesh 
                position={[3, 0.6, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[6, 0.04, 0.04]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Bottom Rail */}
              <mesh 
                position={[3, 0.2, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[6, 0.04, 0.04]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Right Wall Fences - Outer fence (closer to wall) */}
      {[wallDistance - 3, wallDistance - 9, wallDistance - 15, 8, 2, -4, -10].map((zPos, index) => (
        <group key={`right-outer-${index}`} position={[16, 0, zPos]}>
          {/* Fence Post */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Horizontal Rails (if not the last post) */}
          {index < 6 && (
            <>
              {/* Top Rail */}
              <mesh 
                position={[0, 1.0, -3]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.04, 0.04, 6]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Middle Rail */}
              <mesh 
                position={[0, 0.6, -3]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.04, 0.04, 6]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Bottom Rail */}
              <mesh 
                position={[0, 0.2, -3]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.04, 0.04, 6]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Right Wall Fences - Inner fence (queue path) */}
      {[wallDistance - 9, wallDistance - 15, 8, 2, -4, -10].map((zPos, index) => (
        <group key={`right-inner-${index}`} position={[13, 0, zPos]}>
          {/* Fence Post */}
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Horizontal Rails (if not the last post) */}
          {index < 5 && (
            <>
              {/* Top Rail */}
              <mesh 
                position={[0, 1.0, -3]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.04, 0.04, 6]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Middle Rail */}
              <mesh 
                position={[0, 0.6, -3]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.04, 0.04, 6]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Bottom Rail */}
              <mesh 
                position={[0, 0.2, -3]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.04, 0.04, 6]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Cashier Stands - Multiple stands lined up across back wall */}
      {[-12, -4, 4, 12].map((xOffset, index) => {
        const standClone = cashierStand.scene.clone();
        standClone.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        return (
          <group key={index} position={[xOffset, 0, -wallDistance + 6]}>
            <primitive 
              object={standClone} 
              scale={2.2}
              rotation={[0, Math.PI, 0]} // Face towards center
            />
          </group>
        );
      })}
    </group>
  );
}

// Preload models
useGLTF.preload('/models/sliding_door/scene.gltf');
useGLTF.preload('/models/psx_cashier_stand/scene.gltf');
useGLTF.preload('/models/low_poly_shopping_cart/scene.gltf');

export default StoreEnvironment;
