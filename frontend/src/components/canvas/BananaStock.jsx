import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * Renders cell phone models on a shelf based on stock count
 * @param {Number} count - Number of items in stock
 * @param {Number} shelfWidth - Width of the shelf
 * @param {Number} shelfDepth - Depth of the shelf
 * @param {Number} shelfHeight - Height of the shelf
 */
function ProductStock({ count, shelfWidth, shelfDepth, shelfHeight }) {
  const [productModel, setProductModel] = useState(null);

  // Load the cell phone GLTF model
  useEffect(() => {
    const loader = new GLTFLoader();
    
    loader.load(
      '/models/cell_phone/scene.gltf',
      (gltf) => {
        setProductModel(gltf.scene);
      },
      undefined,
      (error) => {
        console.warn('Could not load cell phone model:', error);
      }
    );
  }, []);

  if (!productModel || count === 0) return null;

  // Define 5 positions on the shelf surface
  // Positions are relative to shelf center, on top surface (y = shelfHeight/2)
  const positions = [
    // Center
    { x: 0, y: shelfHeight / 2 + 0.1, z: 0 },
    // Front left
    { x: -shelfWidth * 0.25, y: shelfHeight / 2 + 0.1, z: shelfDepth * 0.3 },
    // Front right
    { x: shelfWidth * 0.25, y: shelfHeight / 2 + 0.1, z: shelfDepth * 0.3 },
    // Back left
    { x: -shelfWidth * 0.25, y: shelfHeight / 2 + 0.1, z: -shelfDepth * 0.3 },
    // Back right
    { x: shelfWidth * 0.25, y: shelfHeight / 2 + 0.1, z: -shelfDepth * 0.3 },
  ];

  // Limit to maximum 5 items
  const numProducts = Math.min(count, 5);
  
  // Calculate appropriate scale based on shelf size
  // Make cell phones small enough to fit on shelf
  const productScale = Math.min(shelfWidth, shelfDepth) * 0.1; // 10% of smallest dimension

  return (
    <group>
      {Array.from({ length: numProducts }).map((_, index) => {
        const pos = positions[index];
        return (
          <primitive
            key={index}
            object={productModel.clone()}
            position={[pos.x, pos.y, pos.z]}
            scale={[productScale, productScale, productScale]}
            rotation={[0, Math.random() * Math.PI * 2, 0]} // Random rotation for variety
          />
        );
      })}
    </group>
  );
}

export default ProductStock;
