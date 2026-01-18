import { Plus, Minus } from 'lucide-react';
import ProductTypeSelector from './ProductTypeSelector';

/**
 * Controls panel for managing shelf stock
 * @param {Array} shelves - Array of shelf data
 * @param {Function} onUpdateStock - Callback to update stock count
 * @param {Function} onUpdateProductType - Callback to update product type
 */
function StockControls({ shelves, onUpdateStock, onUpdateProductType }) {
  if (shelves.length === 0) return null;

  const handleIncrement = (shelfId) => {
    onUpdateStock(shelfId, 1);
  };

  const handleDecrement = (shelfId) => {
    onUpdateStock(shelfId, -1);
  };

  const handleTypeChange = (shelfId, newType) => {
    onUpdateProductType(shelfId, newType);
  };

  return (
    <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur rounded-lg shadow-xl p-4 max-h-[60vh] overflow-y-auto">
      <h3 className="font-bold text-gray-800 mb-3 sticky top-0 bg-white pb-2">
        📦 Stock Management
      </h3>
      
      <div className="space-y-2">
        {shelves.map((shelf) => (
          <div
            key={shelf.id}
            className="flex flex-col gap-2 p-2 bg-gray-50 rounded border border-gray-200"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-800 truncate">
                  {shelf.id}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {shelf.metadata.item}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDecrement(shelf.id)}
                  disabled={shelf.metadata.count === 0}
                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  title="Decrease stock"
                >
                  <Minus size={16} />
                </button>
                
                <div className="w-12 text-center font-mono text-sm font-semibold">
                  {shelf.metadata.count}
                </div>
                
                <button
                  onClick={() => handleIncrement(shelf.id)}
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  title="Increase stock"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Product Type:</span>
              <ProductTypeSelector
                currentType={shelf.metadata.productType || 'cell_phone'}
                onTypeChange={(newType) => handleTypeChange(shelf.id, newType)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StockControls;
