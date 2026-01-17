import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, ShoppingCart, Package, DollarSign, Users, Activity, X } from 'lucide-react';
import { fetchOverallAnalytics, fetchSankeyData } from '../services/amplitudeService';

/**
 * Overall Analytics Dashboard - Shows aggregate data for all shelves
 * Displayed when no specific shelf is selected
 */
function AnalyticsDashboard({ onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [sankeyData, setSankeyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const [analyticsData, sankeyChartData] = await Promise.all([
          fetchOverallAnalytics(),
          fetchSankeyData()
        ]);
        setAnalytics(analyticsData);
        setSankeyData(sankeyChartData);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      loadAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshKey]);

  if (loading && !analytics) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
        <div className="bg-white rounded-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Activity className="animate-spin" size={24} />
            <span className="text-lg font-semibold">Loading Analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl">
          {error}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { overallStats, shelfData, hourlyTrend, categoryData } = analytics;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="container mx-auto px-6 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 mb-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Store Analytics Overview</h1>
              <p className="text-blue-100">Real-time insights across all shelves (A1-A6, B1-B6)</p>
            </div>
            <div className="flex items-center gap-4">
              <Activity size={48} className="opacity-80" />
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
                title="Close Analytics"
              >
                <X size={32} />
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <MetricCard
            icon={<Package size={24} />}
            label="Total Pickups"
            value={overallStats.totalPickups.toLocaleString()}
            color="bg-blue-500"
          />
          <MetricCard
            icon={<ShoppingCart size={24} />}
            label="Purchases"
            value={overallStats.totalPurchases.toLocaleString()}
            color="bg-green-500"
          />
          <MetricCard
            icon={<TrendingUp size={24} />}
            label="Conversion"
            value={`${overallStats.conversionRate}%`}
            color="bg-purple-500"
          />
          <MetricCard
            icon={<DollarSign size={24} />}
            label="Revenue"
            value={`$${parseFloat(overallStats.totalRevenue).toLocaleString()}`}
            color="bg-yellow-500"
          />
          <MetricCard
            icon={<Package size={24} />}
            label="Abandoned"
            value={overallStats.totalReturns.toLocaleString()}
            color="bg-red-500"
          />
          <MetricCard
            icon={<Users size={24} />}
            label="Active Users"
            value={overallStats.activeUsers.toLocaleString()}
            color="bg-indigo-500"
          />
        </div>

        {/* Event Flow Sankey Chart with Apache ECharts */}
        {sankeyData && (
          <div className="mb-6">
            <ChartCard title="📊 Event Flow Analysis - Sankey Diagram">
              <p className="text-sm text-gray-600 mb-4">
                Flow visualization: Total Views → Products (Phone & Bottle) → Event Types (Window Shopped, Cart Abandoned, Purchased)
              </p>
              <div style={{ height: '600px' }}>
                <ReactECharts
                  option={{
                    title: {
                      text: 'Customer Journey Flow by Product',
                      left: 'center',
                      textStyle: {
                        fontSize: 16,
                        fontWeight: 'bold'
                      }
                    },
                    tooltip: {
                      trigger: 'item',
                      triggerOn: 'mousemove',
                      formatter: function (params) {
                        if (params.dataType === 'edge') {
                          return `${params.data.source} → ${params.data.target}<br/>Events: ${params.data.value}`;
                        } else {
                          return `${params.name}<br/>Total: ${params.value}`;
                        }
                      }
                    },
                    series: [
                      {
                        type: 'sankey',
                        layout: 'none',
                        emphasis: {
                          focus: 'adjacency'
                        },
                        data: (() => {
                          const nodes = [];
                          const products = ['Phone', 'Bottle'];
                          
                          // Add Total Views node (depth 0)
                          nodes.push({
                            name: 'Total Views',
                            itemStyle: { color: '#6366f1' },
                            depth: 0
                          });
                          
                          // Add product nodes (depth 1)
                          products.forEach(product => {
                            nodes.push({
                              name: product,
                              itemStyle: { color: '#8b5cf6' },
                              depth: 1
                            });
                          });
                          
                          // Add event type nodes for each product (depth 2)
                          products.forEach(product => {
                            nodes.push({
                              name: `${product} - Window Shopped`,
                              itemStyle: { color: '#3b82f6' },
                              depth: 2
                            });
                            nodes.push({
                              name: `${product} - Cart Abandoned`,
                              itemStyle: { color: '#ef4444' },
                              depth: 2
                            });
                            nodes.push({
                              name: `${product} - Purchased`,
                              itemStyle: { color: '#10b981' },
                              depth: 2
                            });
                          });
                          
                          return nodes;
                        })(),
                        links: sankeyData.links.map(link => ({
                          source: sankeyData.nodes[link.source].name,
                          target: sankeyData.nodes[link.target].name,
                          value: link.value,
                          lineStyle: {
                            color: (() => {
                              const targetName = sankeyData.nodes[link.target].name;
                              if (targetName.includes('Window Shopped')) return 'rgba(59, 130, 246, 0.3)';
                              if (targetName.includes('Cart Abandoned')) return 'rgba(239, 68, 68, 0.3)';
                              if (targetName.includes('Purchased')) return 'rgba(16, 185, 129, 0.3)';
                              return 'rgba(139, 92, 246, 0.3)';
                            })()
                          }
                        })),
                        lineStyle: {
                          curveness: 0.5
                        },
                        label: {
                          show: true,
                          position: 'right',
                          formatter: '{b}'
                        },
                        left: '10%',
                        right: '20%',
                        top: '10%',
                        bottom: '10%'
                      }
                    ]
                  }}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </div>
              
              {/* Summary Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {sankeyData.links
                      .filter(l => sankeyData.nodes[l.target].name.includes('Window Shopped'))
                      .reduce((sum, link) => sum + (link.value || 0), 0)
                    }
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Window Shopped</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {sankeyData.links
                      .filter(l => sankeyData.nodes[l.target].name.includes('Cart Abandoned'))
                      .reduce((sum, link) => sum + (link.value || 0), 0)
                    }
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Cart Abandoned</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {sankeyData.links
                      .filter(l => sankeyData.nodes[l.target].name.includes('Purchased'))
                      .reduce((sum, link) => sum + (link.value || 0), 0)
                    }
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Purchased</div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6366f1' }}></div>
                  <span className="text-gray-700">Total Views</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                  <span className="text-gray-700">Products</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-700">Window Shopped</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-gray-700">Cart Abandoned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-700">Purchased</span>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Hourly Activity Trend */}
          <ChartCard title="24-Hour Activity Trend">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={hourlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pickups" stroke="#3b82f6" strokeWidth={2} name="Window Shopped" />
                <Line type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} name="Purchases" />
                <Line type="monotone" dataKey="returns" stroke="#ef4444" strokeWidth={2} name="Abandoned" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Category Distribution */}
          <ChartCard title="Category Distribution">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Shelf Performance Table */}
        <ChartCard title="Shelf Performance">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Shelf ID</th>
                  <th className="px-4 py-3 text-right font-semibold">Pickups</th>
                  <th className="px-4 py-3 text-right font-semibold">Purchases</th>
                  <th className="px-4 py-3 text-right font-semibold">Abandoned</th>
                  <th className="px-4 py-3 text-right font-semibold">Conversion</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {shelfData.map((shelf, index) => (
                  <tr 
                    key={shelf.shelfId}
                    className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 font-semibold text-blue-600">{shelf.shelfId}</td>
                    <td className="px-4 py-3 text-right">{shelf.pickups}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{shelf.purchases}</td>
                    <td className="px-4 py-3 text-right text-red-600">{shelf.returns}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded ${
                        parseFloat(shelf.conversionRate) > 60 ? 'bg-green-100 text-green-700' :
                        parseFloat(shelf.conversionRate) > 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {shelf.conversionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">${shelf.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <ChartCard title="🏆 Top Revenue Shelf">
            <TopPerformer
              data={shelfData.sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))[0]}
              metric="revenue"
              prefix="$"
            />
          </ChartCard>
          
          <ChartCard title="🔥 Most Active Shelf">
            <TopPerformer
              data={shelfData.sort((a, b) => b.pickups - a.pickups)[0]}
              metric="pickups"
              prefix=""
            />
          </ChartCard>
          
          <ChartCard title="✨ Best Conversion">
            <TopPerformer
              data={shelfData.sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))[0]}
              metric="conversionRate"
              suffix="%"
            />
          </ChartCard>
        </div>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(analytics.timestamp).toLocaleString()}
          <span className="ml-2 text-green-600">● Live</span>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`${color} text-white p-2 rounded-lg`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Top Performer Component
function TopPerformer({ data, metric, prefix = '', suffix = '' }) {
  return (
    <div className="text-center py-4">
      <div className="text-4xl font-bold text-blue-600 mb-2">
        {data.shelfId}
      </div>
      <div className="text-3xl font-bold text-gray-800">
        {prefix}{data[metric]}{suffix}
      </div>
      <div className="text-sm text-gray-600 mt-2">
        {metric === 'revenue' && `${data.purchases} purchases`}
        {metric === 'pickups' && `${data.conversionRate}% conversion`}
        {metric === 'conversionRate' && `${data.purchases}/${data.pickups} purchases`}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
