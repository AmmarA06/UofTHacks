import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function SalesChart({ data, title = "Sales Performance" }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          />
          <Legend />
          <Area type="monotone" dataKey="views" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Views" />
          <Area type="monotone" dataKey="addToCart" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Add to Cart" />
          <Area type="monotone" dataKey="purchases" stackId="3" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Purchases" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data, title = "Revenue Trend" }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
          />
          <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} name="Revenue" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
