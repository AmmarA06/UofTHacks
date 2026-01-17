import { AlertTriangle, AlertCircle, Info, TrendingDown, ArrowRight } from 'lucide-react';

export function CustomerFlowChart({ data, title = "Customer Journey Flow" }) {
  const { nodes, links, insights } = data;
  
  // Calculate percentages for visualization
  const windowShopNode = nodes.find(n => n.id === 'window_shop');
  const totalStart = windowShopNode.value;
  
  const getIconForType = (type) => {
    switch (type) {
      case 'critical': return <AlertTriangle size={16} />;
      case 'warning': return <AlertCircle size={16} />;
      default: return <Info size={16} />;
    }
  };
  
  const getColorForType = (type) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-900';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-900';
      default: return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      
      {/* Flow Visualization */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
          {/* Stage 1: Window Shopped */}
          <div className="mb-6">
            <div className="bg-blue-500 text-white rounded-lg p-4 shadow-lg">
              <div className="text-sm opacity-90 mb-1">PRODUCT_WINDOW_SHOPPED</div>
              <div className="text-3xl font-bold">{windowShopNode.value.toLocaleString()}</div>
              <div className="text-sm opacity-90 mt-1">Customers browsed this product</div>
            </div>
          </div>
          
          {/* Split Arrows */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Left: Abandoned Early */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center text-red-500 mb-2">
                <TrendingDown size={24} />
                <ArrowRight size={24} className="ml-1" />
              </div>
              <div className="w-full">
                <div className="bg-red-500 text-white rounded-lg p-4 shadow-lg">
                  <div className="text-xs opacity-90 mb-1">PRODUCT_ABANDONED (Early)</div>
                  <div className="text-2xl font-bold">
                    {nodes.find(n => n.id === 'abandoned_early').value.toLocaleString()}
                  </div>
                  <div className="text-sm opacity-90 mt-1">
                    {((nodes.find(n => n.id === 'abandoned_early').value / totalStart) * 100).toFixed(1)}% left immediately
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Continued */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center text-green-500 mb-2">
                <ArrowRight size={24} />
              </div>
              <div className="w-full">
                <div className="bg-green-500 text-white rounded-lg p-4 shadow-lg">
                  <div className="text-xs opacity-90 mb-1">Continued Browsing</div>
                  <div className="text-2xl font-bold">
                    {nodes.find(n => n.id === 'continued').value.toLocaleString()}
                  </div>
                  <div className="text-sm opacity-90 mt-1">
                    {((nodes.find(n => n.id === 'continued').value / totalStart) * 100).toFixed(1)}% kept browsing
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Final Split from Continued */}
          <div className="flex justify-end mb-4">
            <div className="w-1/2">
              <div className="grid grid-cols-2 gap-2">
                {/* Purchased */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center text-purple-500 mb-2">
                    <ArrowRight size={20} />
                  </div>
                  <div className="bg-purple-500 text-white rounded-lg p-3 shadow-lg text-center">
                    <div className="text-xs opacity-90 mb-1">PRODUCT_PURCHASED</div>
                    <div className="text-xl font-bold">
                      {nodes.find(n => n.id === 'purchased').value.toLocaleString()}
                    </div>
                    <div className="text-xs opacity-90 mt-1">
                      {((nodes.find(n => n.id === 'purchased').value / totalStart) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* Abandoned Late */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center text-orange-500 mb-2">
                    <TrendingDown size={20} />
                  </div>
                  <div className="bg-orange-500 text-white rounded-lg p-3 shadow-lg text-center">
                    <div className="text-xs opacity-90 mb-1">PRODUCT_ABANDONED (Late)</div>
                    <div className="text-xl font-bold">
                      {nodes.find(n => n.id === 'abandoned_late').value.toLocaleString()}
                    </div>
                    <div className="text-xs opacity-90 mt-1">
                      {((nodes.find(n => n.id === 'abandoned_late').value / totalStart) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="mt-6 pt-4 border-t-2 border-gray-300">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Total Abandoned</div>
                <div className="text-2xl font-bold text-red-600">
                  {(nodes.find(n => n.id === 'abandoned_early').value + nodes.find(n => n.id === 'abandoned_late').value).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {(((nodes.find(n => n.id === 'abandoned_early').value + nodes.find(n => n.id === 'abandoned_late').value) / totalStart) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Conversion Rate</div>
                <div className="text-2xl font-bold text-purple-600">
                  {((nodes.find(n => n.id === 'purchased').value / totalStart) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Window shop to purchase</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Engaged</div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalStart.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Window shopped</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actionable Insights */}
      <div className="space-y-4">
        <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
          <AlertCircle size={20} />
          Actionable Insights
        </h4>
        
        {insights.map((insight, idx) => (
          <div key={idx} className={`border rounded-lg p-4 ${getColorForType(insight.type)}`}>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getIconForType(insight.type)}
              </div>
              <div className="flex-1">
                <h5 className="font-bold mb-1">{insight.title}</h5>
                <p className="text-sm mb-3">{insight.message}</p>
                
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Recommendations:</div>
                  <ul className="text-sm space-y-1">
                    {insight.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Event Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h5 className="font-semibold text-gray-800 mb-3">Event Tracking Summary</h5>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div>
              <div className="font-medium">PRODUCT_WINDOW_SHOPPED</div>
              <div className="text-xs text-gray-600">{totalStart.toLocaleString()} events</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div>
              <div className="font-medium">PRODUCT_ABANDONED</div>
              <div className="text-xs text-gray-600">
                {(nodes.find(n => n.id === 'abandoned_early').value + nodes.find(n => n.id === 'abandoned_late').value).toLocaleString()} events
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <div>
              <div className="font-medium">PRODUCT_PURCHASED</div>
              <div className="text-xs text-gray-600">{nodes.find(n => n.id === 'purchased').value.toLocaleString()} events</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
