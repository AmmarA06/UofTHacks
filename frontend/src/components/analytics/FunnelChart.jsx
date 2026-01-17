import { TrendingDown } from 'lucide-react';

export function FunnelChart({ data, title = "Conversion Funnel" }) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TrendingDown size={16} />
          <span>Overall Conversion: {data[data.length - 1]?.percentage}%</span>
        </div>
      </div>
      
      {/* Visual Funnel */}
      <div className="mb-6 space-y-2">
        {data.map((stage, idx) => {
          const width = parseFloat(stage.percentage);
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-32 text-sm font-medium text-gray-700 text-right">
                {stage.stage}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-between px-4 text-white font-semibold text-sm transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    backgroundColor: colors[idx % colors.length]
                  }}
                >
                  <span>{stage.count.toLocaleString()}</span>
                  <span>{stage.percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Drop-off Analysis */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Drop-off Rates</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.slice(1).map((stage, idx) => {
            const prevStage = data[idx];
            const dropoff = ((prevStage.count - stage.count) / prevStage.count * 100).toFixed(1);
            return (
              <div key={idx} className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600">{prevStage.stage} → {stage.stage}</div>
                <div className="text-lg font-bold text-red-600">{dropoff}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
