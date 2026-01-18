import { useState } from 'react';
import { Plus, Minus, ArrowLeft, Package, BarChart3, X } from 'lucide-react';
import ProductTypeSelector from './ProductTypeSelector';
import ShelfAnalytics from './ShelfAnalytics';

/**
 * Shelf management overlay that appears when a shelf is selected
 * @param {Object} shelf - Selected shelf data
 * @param {Function} onUpdateStock - Callback to update stock
 * @param {Function} onUpdateProductType - Callback to update product type
 * @param {Function} onClose - Callback to close and return to overview
 */
function ShelfManagementUI({ shelf, onUpdateStock, onUpdateProductType, onClose }) {
  const [showAnalytics, setShowAnalytics] = useState(false);

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
        <div className="bg-white rounded-2xl shadow-xl p-5 w-[350px] border border-gray-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-[18px] font-medium text-[#1a1a1a]">{shelf.label}</h2>
                <p className="text-[12px] text-gray-400">ID: {shelf.id}</p>
              </div>
            </div>

            {/* Analytics Toggle */}
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-2 rounded-full transition-colors ${showAnalytics
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-[#f3f3f3] text-gray-600 hover:bg-gray-200'
                }`}
              title="Toggle Analytics"
            >
              <BarChart3 size={18} />
            </button>
          </div>

          {/* Product Info */}
          <div className="bg-[#f3f3f3] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Product</p>
                <p className="text-[15px] font-medium text-[#1a1a1a] capitalize">
                  {shelf.metadata.item || 'Unknown'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Stock</p>
                <p className={`text-[24px] font-medium ${shelf.metadata.count === 0 ? 'text-yellow-500' : 'text-green-600'
                  }`}>
                  {shelf.metadata.count}
                </p>
              </div>
            </div>

            {/* Product Type Selector */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-[12px] text-gray-500">Type:</span>
              <ProductTypeSelector
                currentType={shelf.metadata.productType || 'cell_phone'}
                onTypeChange={handleTypeChange}
              />
            </div>
          </div>

          {/* Stock Controls */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleDecrement}
              disabled={shelf.metadata.count === 0}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-3 rounded-full transition-colors flex items-center justify-center gap-1.5 text-[13px]"
            >
              <Minus size={16} />
              <span>Remove</span>
            </button>

            <button
              onClick={handleIncrement}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-3 rounded-full transition-colors flex items-center justify-center gap-1.5 text-[13px]"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>

          {/* Back Button */}
          <button
            onClick={onClose}
            className="w-full bg-[#f3f3f3] hover:bg-gray-200 text-[#1a1a1a] font-medium py-2.5 px-3 rounded-full transition-colors flex items-center justify-center gap-1.5 text-[13px]"
          >
            <ArrowLeft size={16} />
            Back to Overview
          </button>
        </div>
      </div>

      {/* Analytics Panel - Right Side */}
      {showAnalytics && (
        <div className="fixed top-6 right-6 z-50 w-[450px]">
          <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-medium text-[#1a1a1a] flex items-center gap-2">
                <BarChart3 size={18} className="text-gray-400" />
                Analytics - {shelf.id}
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <ShelfAnalytics shelfId={shelf.id} />
          </div>
        </div>
      )}
    </>
  );
}

export default ShelfManagementUI;
