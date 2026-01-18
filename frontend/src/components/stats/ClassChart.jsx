import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getClassColor } from '@/utils/colors';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

export function ClassChart({ classDistribution }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const navigate = useNavigate();

  const handleClick = (data) => {
    if (data && data.name) {
      navigate(`/objects?class=${encodeURIComponent(data.name)}`);
    }
  };

  if (!classDistribution || Object.keys(classDistribution).length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const data = Object.entries(classDistribution)
    .map(([name, value]) => ({
      name,
      value,
      color: getClassColor(name),
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map(d => d.value));

  // Modern horizontal bar chart with rankings
  const renderHorizontalBars = () => (
    <div className="space-y-3 p-6">
      {data.map((item, index) => {
        const percentage = ((item.value / total) * 100).toFixed(1);
        const isHovered = hoveredBar === index;
        
        return (
          <div
            key={item.name}
            className="group cursor-pointer"
            onMouseEnter={() => setHoveredBar(index)}
            onMouseLeave={() => setHoveredBar(null)}
            onClick={() => handleClick(item)}
          >
            <div className="flex items-center gap-4 mb-1.5">
              {/* Rank Badge */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                index === 0 ? 'bg-[#1a1a1a] text-white' :
                index === 1 ? 'bg-gray-200 text-gray-700' :
                index === 2 ? 'bg-gray-100 text-gray-600' :
                'bg-gray-50 text-gray-500'
              }`}>
                {index + 1}
              </div>

              {/* Class Name and Count */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-semibold text-[#1a1a1a] capitalize truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-lg font-bold text-[#1a1a1a] tabular-nums">
                      {item.value}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full tabular-nums min-w-[3.5rem] text-center">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      backgroundColor: item.color,
                      width: `${(item.value / maxValue) * 100}%`,
                      opacity: isHovered ? 1 : 0.9,
                      boxShadow: isHovered ? `0 0 12px ${item.color}40` : 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative">
      {/* Header */}
      <div className="px-6 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1a1a1a]" />
            <h3 className="text-sm font-semibold text-[#1a1a1a] uppercase tracking-wide">
              Class Distribution
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {data.length} Classes
          </span>
        </div>
      </div>

      {/* Content Area */}
      {renderHorizontalBars()}

      {/* Summary Stats Footer */}
      <div className="border-t border-gray-100 p-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="group cursor-default">
            <div className="text-3xl font-bold text-[#1a1a1a] tracking-tight group-hover:scale-105 transition-transform">
              {total}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
              Total Objects
            </div>
          </div>
          <div className="group cursor-default border-l border-r border-gray-200">
            <div className="text-3xl font-bold text-[#1a1a1a] tracking-tight group-hover:scale-105 transition-transform">
              {data.length}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
              Unique Classes
            </div>
          </div>
          <div className="group cursor-default">
            <div className="text-3xl font-bold text-[#1a1a1a] tracking-tight group-hover:scale-105 transition-transform">
              {(total / data.length).toFixed(1)}
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
              Avg per Class
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
