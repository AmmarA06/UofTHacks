import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Center } from '@react-three/drei';

// Product type configurations
const PRODUCT_CONFIGS = {
  'cell_phone': {
    modelPath: '/models/cell_phone/scene.gltf',
    scale: 0.15,
    rotation: [-Math.PI / 2, 0, 0], // Lay flat
  },
  'water_bottle': {
    modelPath: '/models/tumbler/scene.gltf',
    scale: 0.04, // Same scale as cell phones
    rotation: [0, 0, 0], // Standing upright
  },
};

/**
 * Renders product models on a shelf based on stock count in a 3-column grid
 * @param {Number} count - Number of items in stock
 * @param {Number} shelfWidth - Width of the shelf
 * @param {Number} shelfDepth - Depth of the shelf
 * @param {Number} shelfHeight - Height of the shelf
 * @param {String} productType - Type of product (cell_phone, water_bottle, etc.)
 */
function ProductStock({ count, shelfWidth, shelfDepth, shelfHeight, productType = 'cell_phone' }) {
  const [productModel, setProductModel] = useState(null);

  // Get product configuration
  const config = PRODUCT_CONFIGS[productType] || PRODUCT_CONFIGS['cell_phone'];

  // Load the product GLTF model
  useEffect(() => {
    const loader = new GLTFLoader();
    
    loader.load(
      config.modelPath,
      (gltf) => {
        setProductModel(gltf.scene);
      },
      undefined,
      (error) => {
        console.warn(`Could not load ${productType} model:`, error);
      }
    );
  }, [productType, config.modelPath]);

  if (!productModel || count === 0) return null;

  // ===== CONFIGURATION =====
  const ITEMS_PER_ROW = 3; // 3 items per row (x-axis)
  const SHELF_MARGIN = 0.15; // 15% margin from shelf edges
  const PRODUCT_SCALE = config.scale; // Scale from product config
  
  // Product-specific spacing
  const VERTICAL_LAYER_SPACING = productType === 'water_bottle' ? 0.4 : 0.4; // Height spacing between each layer of 3 items
  const BASE_Y = productType === 'water_bottle' ? 0.35 : 0.2; // Starting height on shelf
  
  // Calculate usable shelf area (accounting for margins)
  const usableWidth = shelfWidth * (1 - SHELF_MARGIN * 2);
  const usableDepth = shelfDepth * (1 - SHELF_MARGIN * 2);
  
  // Calculate spacing between items in a row
  const xSpacing = usableWidth / ITEMS_PER_ROW;
  
  // Calculate starting positions
  const startX = -usableWidth / 2 + xSpacing / 2;
  const baseY = BASE_Y;
  const centerZ = 0; // Keep products centered on shelf depth

  return (
    <group>
      {Array.from({ length: count }).map((_, index) => {
        // Grid calculation: Left-to-Right (X), stacking vertically (Y) after each 3
        const col = index % ITEMS_PER_ROW; // X-axis: 0, 1, 2, 0, 1, 2, ...
        const layer = Math.floor(index / ITEMS_PER_ROW); // Y-axis layer: 0, 0, 0, 1, 1, 1, 2, 2, 2, ...
        
        // Calculate position in 3D space
        const x = startX + col * xSpacing;
        const y = baseY + layer * VERTICAL_LAYER_SPACING; // Stack vertically
        const z = centerZ; // Keep constant depth (centered on shelf)
        
        return (
          <group key={index} position={[x, y, z]}>
            <Center>
              <primitive
                object={productModel.clone()}
                scale={PRODUCT_SCALE}
                rotation={config.rotation}
              />
            </Center>
          </group>
        );
      })}
    </group>
  );
}

export default ProductStock;
