import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { AlertTriangle, TrendingUp } from 'lucide-react';

export function ChurnAnalysis({ data, title = "Churn Analysis" }) {
  const latestChurnRate = data[data.length - 1]?.churnRate || 0;
  const avgChurnRate = (data.reduce((sum, d) => sum + d.churnRate, 0) / data.length).toFixed(1);
  const trend = latestChurnRate < avgChurnRate ? 'improving' : 'worsening';
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
          trend === 'improving' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {trend === 'improving' ? <TrendingUp size={16} /> : <AlertTriangle size={16} />}
          {trend === 'improving' ? 'Improving' : 'Attention Needed'}
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
          <div className="text-sm text-red-700 font-medium mb-1">Current Churn Rate</div>
          <div className="text-3xl font-bold text-red-600">{latestChurnRate.toFixed(1)}%</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="text-sm text-blue-700 font-medium mb-1">Avg Churn Rate</div>
          <div className="text-3xl font-bold text-blue-600">{avgChurnRate}%</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="text-sm text-green-700 font-medium mb-1">Retention Rate</div>
          <div className="text-3xl font-bold text-green-600">{(100 - latestChurnRate).toFixed(1)}%</div>
        </div>
      </div>
      
      {/* Churn Rate Over Time */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Churn Rate Trend</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="churnRate" 
              stroke="#ef4444" 
              strokeWidth={3} 
              dot={{ r: 4 }} 
              name="Churn Rate (%)" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Customer Flow */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Customer Acquisition vs Retention</h4>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }} />
            <Legend />
            <Bar dataKey="newCustomers" fill="#10b981" name="New Customers" />
            <Bar dataKey="returningCustomers" fill="#3b82f6" name="Returning Customers" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Insights */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <AlertTriangle size={16} />
          Actionable Insights
        </h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Focus on retention: {((data[data.length - 1].returningCustomers / (data[data.length - 1].newCustomers + data[data.length - 1].returningCustomers)) * 100).toFixed(0)}% of customers are returning</li>
          <li>• Implement loyalty program to reduce churn by 2-3%</li>
          <li>• {trend === 'worsening' ? 'Churn increasing - review customer feedback and support tickets' : 'Positive trend - maintain current customer success initiatives'}</li>
        </ul>
      </div>
    </div>
  );
}
