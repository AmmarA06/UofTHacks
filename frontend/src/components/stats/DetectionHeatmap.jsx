import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { statsAPI } from '@/api/endpoints';

export function DetectionHeatmap() {
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const response = await statsAPI.getHeatmap(7);
        const heatmap = response.data.heatmap;
        
        // Convert to map for easy lookup
        const dataMap = {};
        heatmap.forEach(item => {
          const key = `${item.day_of_week}-${item.hour}`;
          dataMap[key] = item.count;
        });
        
        setHeatmapData(dataMap);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch heatmap:', error);
        setLoading(false);
      }
    };

    fetchHeatmap();
    // Refresh every 10 minutes
    const interval = setInterval(fetchHeatmap, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">
        <div className="p-5 flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#1a1a1a] rounded-full"></div>
        </div>
      </div>
    );
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Find max value for scaling
  const maxValue = Math.max(...Object.values(heatmapData), 1);

  const getColor = (value) => {
    if (!value || value === 0) return 'bg-gray-200';
    const ratio = value / maxValue;
    if (ratio < 0.2) return 'bg-gray-400';
    if (ratio < 0.4) return 'bg-gray-500';
    if (ratio < 0.6) return 'bg-gray-600';
    if (ratio < 0.8) return 'bg-gray-700';
    return 'bg-[#1a1a1a]';
  };

  const getOpacity = (value) => {
    if (!value || value === 0) return 0.5;
    return Math.min(0.6 + (value / maxValue) * 0.4, 1);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#1a1a1a]" />
          <h3 className="text-[16px] font-semibold text-[#1a1a1a]">Activity Heatmap</h3>
        </div>
        <span className="text-[12px] text-gray-500 font-medium">Last 7 Days</span>
      </div>

      {/* Heatmap Grid */}
      <div className="p-5">
        <div className="space-y-2">
          {days.map((day, dayIndex) => (
            <div key={day} className="flex items-center gap-2">
              {/* Day Label */}
              <div className="w-8 text-xs font-medium text-gray-600 text-right">
                {day}
              </div>
              
              {/* Hour Cells */}
              <div className="flex-1 flex gap-1">
                {hours.map((hour) => {
                  const key = `${dayIndex}-${hour}`;
                  const value = heatmapData[key] || 0;
                  const colorClass = getColor(value);
                  
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`flex-1 aspect-square rounded-sm ${colorClass} hover:ring-2 hover:ring-[#1a1a1a] hover:ring-offset-1 cursor-pointer transition-all group relative`}
                      style={{ opacity: getOpacity(value) }}
                      title={`${day} ${hour}:00 - ${value} detections`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-[#1a1a1a] text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                          {day} {hour}:00<br />
                          <span className="font-semibold">{value}</span> detections
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Hour Labels */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-8"></div>
          <div className="flex-1 flex justify-between text-xs text-gray-500 font-medium px-1">
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between p-4 bg-gray-50/50 border-t border-gray-100">
        <span className="text-xs text-gray-600 font-medium">Activity Level:</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Less</span>
          <div className="flex gap-1">
            {[0.3, 0.4, 0.5, 0.7, 0.9, 1].map((opacity, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-sm bg-[#1a1a1a]"
                style={{ opacity }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>
    </div>
  );
}
