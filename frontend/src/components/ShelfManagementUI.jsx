import { Plus, Minus, ArrowLeft, Package } from 'lucide-react';
import ProductTypeSelector from './ProductTypeSelector';

/**
 * Shelf management overlay that appears when a shelf is selected
 * @param {Object} shelf - Selected shelf data
 * @param {Function} onUpdateStock - Callback to update stock
 * @param {Function} onUpdateProductType - Callback to update product type
 * @param {Function} onClose - Callback to close and return to overview
 */
function ShelfManagementUI({ shelf, onUpdateStock, onUpdateProductType, onClose }) {
  if (!shelf) return null;

  const handleIncrement = () => {
    onUpdateStock(shelf.id, 1);
  };

  const handleDecrement = () => {
    if (shelf.metadata.count > 0) {
      onUpdateStock(shelf.id, -1);
    }
  };

  const handleTypeChange = (newType) => {
    onUpdateProductType(shelf.id, newType);
  };

  return (
    <>
      {/* Main Control Panel */}
      <div className="fixed top-6 left-6 z-50">
        <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl p-4 w-[350px] border-2 border-blue-500">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{shelf.label}</h2>
              <p className="text-xs text-gray-600">ID: {shelf.id}</p>
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-gray-600">Product</p>
                <p className="text-base font-semibold text-gray-800 capitalize">
                  {shelf.metadata.item || 'Unknown'}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-gray-600">Stock</p>
                <p className={`text-2xl font-bold ${
                  shelf.metadata.count === 0 ? 'text-yellow-500' : 'text-green-600'
                }`}>
                  {shelf.metadata.count}
                </p>
              </div>
            </div>
            
            {/* Product Type Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-600">Type:</span>
              <ProductTypeSelector
                currentType={shelf.metadata.productType || 'cell_phone'}
                onTypeChange={handleTypeChange}
              />
            </div>
          </div>

          {/* Stock Controls */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleDecrement}
              disabled={shelf.metadata.count === 0}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-3 rounded-lg transition-all transform active:scale-95 flex items-center justify-center gap-1.5 shadow-md text-sm"
            >
              <Minus size={16} />
              <span>Remove</span>
            </button>
            
            <button
              onClick={handleIncrement}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-3 rounded-lg transition-all transform active:scale-95 flex items-center justify-center gap-1.5 shadow-md text-sm"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>

          {/* Back Button */}
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Overview
          </button>
        </div>
      </div>
    </>
  );
}

export default ShelfManagementUI;
