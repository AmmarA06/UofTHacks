import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getClassColor } from '@/utils/colors';
import { BarChart3, Table2 } from 'lucide-react';

export function ClassChart({ classDistribution }) {
  const [viewMode, setViewMode] = useState('pie'); // 'pie' | 'table'
  const [hoveredSlice, setHoveredSlice] = useState(null);
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

  // Enhanced Recharts Pie with animations and click navigation
  const renderEnhancedPie = () => (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent, value }) =>
            percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
          }
          outerRadius={100}
          innerRadius={0}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
          animationEasing="ease-out"
          onMouseEnter={(_, index) => setHoveredSlice(index)}
          onMouseLeave={() => setHoveredSlice(null)}
          onClick={(data) => handleClick(data)}
          activeIndex={hoveredSlice}
          activeShape={{
            outerRadius: 110,
            stroke: '#ffffff',
            strokeWidth: 2,
            filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.1))',
          }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              style={{
                filter: hoveredSlice === index
                  ? 'brightness(1.1)'
                  : 'brightness(1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#1f2937',
            padding: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          itemStyle={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}
          labelStyle={{ color: '#111827', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}
          formatter={(value, name) => [
            <span key="value" className="text-gray-900">
              <strong>{value}</strong> objects ({((value / total) * 100).toFixed(1)}%)
            </span>,
            <span key="name" className="text-gray-500">{name}</span>
          ]}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value, entry) => (
            <span className="text-gray-600 font-medium ml-1">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  // Table view with sortable columns and click navigation
  const renderTable = () => (
    <div className="overflow-x-auto p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 text-gray-500 font-medium">Class Name</th>
            <th className="text-right py-3 px-4 text-gray-500 font-medium">Count</th>
            <th className="text-right py-3 px-4 text-gray-500 font-medium">Percentage</th>
            <th className="text-left py-3 px-4 text-gray-500 font-medium w-1/3">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <tr
                key={item.name}
                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleClick(item)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-900 font-medium capitalize">{item.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-gray-900 font-mono">{item.value}</td>
                <td className="py-3 px-4 text-right text-gray-500 font-mono">{percentage}%</td>
                <td className="py-3 px-4">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ backgroundColor: item.color, width: `${percentage}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="relative">
      {/* View Mode Toggle - Absolute positioned top right */}
      <div className="absolute top-4 right-4 z-10 flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setViewMode('pie')}
          className={`p-1.5 rounded-md transition-all ${viewMode === 'pie' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          title="Pie Chart"
        >
          <BarChart3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          title="Table View"
        >
          <Table2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="pt-2">
        {viewMode === 'table' ? renderTable() : (
          <div className="p-4">
            {renderEnhancedPie()}
          </div>
        )}
      </div>

      {/* Summary Stats Footer */}
      {viewMode !== 'table' && (
        <div className="border-t border-gray-100 p-6 bg-gray-50/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Total Objects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.length}</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Unique Classes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{(total / data.length).toFixed(1)}</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Avg per Class</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
