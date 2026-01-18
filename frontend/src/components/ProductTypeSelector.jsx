import { Smartphone, Droplet } from 'lucide-react';

/**
 * Selector component for changing product type on a shelf
 * @param {String} currentType - Current product type
 * @param {Function} onTypeChange - Callback when type changes
 */
function ProductTypeSelector({ currentType, onTypeChange }) {
  const productTypes = [
    { id: 'cell_phone', name: 'Cell Phone', icon: Smartphone },
    { id: 'water_bottle', name: 'Water Bottle', icon: Droplet },
  ];

  return (
    <div className="flex gap-1">
      {productTypes.map((type) => {
        const Icon = type.icon;
        const isActive = currentType === type.id;
        
        return (
          <button
            key={type.id}
            onClick={() => onTypeChange(type.id)}
            className={`
              p-1 rounded transition-colors
              ${isActive 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }
            `}
            title={type.name}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

export default ProductTypeSelector;
