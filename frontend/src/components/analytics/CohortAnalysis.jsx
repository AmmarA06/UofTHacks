import { Users } from 'lucide-react';

export function CohortAnalysis({ data, title = "Cohort Retention Analysis" }) {
  const getColorForValue = (value) => {
    if (value === null) return 'bg-gray-100';
    if (value >= 70) return 'bg-green-500';
    if (value >= 50) return 'bg-green-400';
    if (value >= 30) return 'bg-yellow-400';
    if (value >= 15) return 'bg-orange-400';
    return 'bg-red-400';
  };
  
  const getTextColor = (value) => {
    if (value === null) return 'text-gray-400';
    return 'text-white';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <Users size={20} className="text-gray-600" />
      </div>
      
      {/* Cohort Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Cohort</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-700">Size</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-700">Month 0</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-700">Month 1</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-700">Month 2</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-700">Month 3</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cohort, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 font-medium text-gray-800">{cohort.cohort}</td>
                <td className="py-3 px-2 text-center text-gray-600">{cohort.size}</td>
                <td className="py-3 px-2">
                  <div className={`${getColorForValue(cohort.month0)} ${getTextColor(cohort.month0)} rounded py-2 px-3 text-center font-semibold`}>
                    {cohort.month0 !== null ? `${cohort.month0.toFixed(0)}%` : '-'}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className={`${getColorForValue(cohort.month1)} ${getTextColor(cohort.month1)} rounded py-2 px-3 text-center font-semibold`}>
                    {cohort.month1 !== null ? `${cohort.month1.toFixed(0)}%` : '-'}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className={`${getColorForValue(cohort.month2)} ${getTextColor(cohort.month2)} rounded py-2 px-3 text-center font-semibold`}>
                    {cohort.month2 !== null ? `${cohort.month2.toFixed(0)}%` : '-'}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className={`${getColorForValue(cohort.month3)} ${getTextColor(cohort.month3)} rounded py-2 px-3 text-center font-semibold`}>
                    {cohort.month3 !== null ? `${cohort.month3.toFixed(0)}%` : '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs flex-wrap">
        <span className="text-gray-600 font-semibold">Retention Rate:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>70%+</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>30-69%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400 rounded"></div>
          <span>15-29%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded"></div>
          <span>&lt;15%</span>
        </div>
      </div>
      
      {/* Insights */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Key Insights</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Average Month 1 retention: {(data.reduce((sum, c) => sum + (c.month1 || 0), 0) / data.filter(c => c.month1 !== null).length).toFixed(0)}%</li>
          <li>• Newest cohort showing {data[data.length - 1].month0.toFixed(0)}% engagement</li>
          <li>• {data.filter(c => c.month1 && c.month1 > 50).length} cohorts with strong retention</li>
        </ul>
      </div>
    </div>
  );
}
