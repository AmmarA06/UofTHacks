import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, ShoppingCart, Package, Activity, X, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { fetchOverallAnalytics, fetchSankeyData, fetchDailyTrends, categorizeShelvesForOptimization, generateOptimizedLayout } from '../services/amplitudeService';
import { generateOptimizationInsights } from '../services/geminiService';
import OptimizationInsightsModal from './OptimizationInsightsModal';

/**
 * Overall Analytics Dashboard - Shows aggregate data for all shelves
 * Displayed when no specific shelf is selected
 */
function AnalyticsDashboard({ onClose, shelves, onOptimizeShelves }) {
  const [analytics, setAnalytics] = useState(null);
  const [sankeyData, setSankeyData] = useState(null);
  const [dailyTrends, setDailyTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [useMock, setUseMock] = useState(false);

  // Optimization state
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationInsights, setOptimizationInsights] = useState(null);
  const [categorizedData, setCategorizedData] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const [analyticsData, sankeyChartData, trendsData] = await Promise.all([
          fetchOverallAnalytics(useMock),
          fetchSankeyData(useMock),
          fetchDailyTrends(useMock)
        ]);
        setAnalytics(analyticsData);
        setSankeyData(sankeyChartData);
        setDailyTrends(trendsData);
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
  }, [refreshKey, useMock]);

  // Handle optimization button click
  const handleOptimizeClick = async () => {
    if (!analytics?.shelfData) return;

    setIsGeneratingInsights(true);
    setShowOptimizationModal(true);

    try {
      // Categorize shelves based on analytics
      const categorized = categorizeShelvesForOptimization(analytics.shelfData);
      setCategorizedData(categorized);

      // Generate AI insights
      const insights = await generateOptimizationInsights(categorized, analytics.overallStats);
      setOptimizationInsights(insights);
    } catch (err) {
      console.error('Failed to generate optimization insights:', err);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Apply the optimization
  const handleApplyOptimization = async () => {
    if (!shelves || !categorizedData || !onOptimizeShelves) {
      console.warn('Cannot apply optimization - missing data:', { shelves: !!shelves, categorizedData: !!categorizedData, onOptimizeShelves: !!onOptimizeShelves });
      return;
    }

    try {
      console.log('Applying optimization to', shelves.length, 'shelves');
      const optimizedShelves = generateOptimizedLayout(shelves, categorizedData);
      console.log('Optimized shelves:', optimizedShelves.length);

      // Validate optimized shelves before applying
      const validShelves = optimizedShelves.every(s =>
        s && s.id && s.normalizedPos && typeof s.normalizedPos.x === 'number' && typeof s.normalizedPos.y === 'number'
      );

      if (!validShelves) {
        console.error('Some optimized shelves have invalid data');
        // Try to fix any issues
        const fixedShelves = optimizedShelves.map(s => ({
          ...s,
          normalizedPos: s.normalizedPos || { x: 0.5, y: 0.5 }
        }));
        onOptimizeShelves(fixedShelves);
      } else {
        onOptimizeShelves(optimizedShelves);
      }

      setShowOptimizationModal(false);
      onClose();
    } catch (err) {
      console.error('Error applying optimization:', err);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-300 p-8">
          <div className="flex items-center gap-3">
            <Activity className="animate-spin text-[#1a1a1a]" size={24} />
            <span className="text-[16px] font-medium text-[#1a1a1a]">Loading Analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-red-50 text-red-600 px-6 py-3 rounded-full shadow-xl border border-red-100 text-[14px]">
          {error}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { overallStats, shelfData, hourlyTrend, categoryData } = analytics;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 overflow-y-auto pt-20"
      onClick={onClose}
    >
      <div
        className="container mx-auto px-6 py-8 pb-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-300 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-medium text-[#1a1a1a] tracking-[-0.02em] mb-1">Store Analytics Overview</h1>
              <p className="text-[14px] text-gray-500">
                {useMock ? 'Viewing mock data (A1-A6, B1-B6 with unique patterns)' : 'Real-time insights from events API'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Optimize Store Button */}
              <button
                onClick={handleOptimizeClick}
                disabled={!analytics?.shelfData || analytics.shelfData.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI-powered store optimization"
              >
                <Sparkles size={18} />
                Optimize Store
              </button>
              {/* Real/Mock Toggle */}
              <button
                onClick={() => setUseMock(!useMock)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  useMock
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}
                title={useMock ? 'Switch to real data' : 'Switch to mock data'}
              >
                {useMock ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {useMock ? 'Mock Data' : 'Real Data'}
              </button>
              <div className="w-12 h-12 bg-[#f3f3f3] rounded-xl flex items-center justify-center">
                <Activity size={24} className="text-[#1a1a1a]" />
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-[#f3f3f3] hover:bg-gray-200 text-gray-600 transition-colors"
                title="Close Analytics"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            icon={<Package size={18} />}
            label="Total Pickups"
            value={(overallStats.totalPickups || 0).toLocaleString()}
          />
          <MetricCard
            icon={<ShoppingCart size={18} />}
            label="Purchases"
            value={(overallStats.totalPurchases || 0).toLocaleString()}
          />
          <MetricCard
            icon={<TrendingUp size={18} />}
            label="Conversion"
            value={`${overallStats.conversionRate || 0}%`}
          />
          <MetricCard
            icon={<Package size={18} />}
            label="Abandoned"
            value={(overallStats.totalReturns || 0).toLocaleString()}
          />
          <MetricCard
            icon={<Activity size={18} />}
            label="Window Shopped"
            value={(overallStats.totalWindowShopped || 0).toLocaleString()}
          />
        </div>

        {/* Event Flow Sankey Chart with Apache ECharts */}
        {sankeyData && sankeyData.links && sankeyData.links.length > 0 && (
          <div className="mb-6">
            <ChartCard title="Event Flow Analysis">
              <p className="text-[13px] text-gray-500 mb-4">
                Flow visualization: Total Events → Object Classes → Event Types (Window Shopped, Cart Abandoned, Purchased, Moved)
              </p>
              <div style={{ height: '600px' }}>
                <ReactECharts
                  option={{
                    title: {
                      text: 'Event Flow by Object Class',
                      left: 'center',
                      textStyle: {
                        fontSize: 16,
                        fontWeight: '500',
                        color: '#1a1a1a'
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
                        data: sankeyData.nodes.map((node, index) => ({
                          name: node.name,
                          itemStyle: { color: node.fill },
                          depth: index === 0 ? 0 : (sankeyData.classNames?.includes(node.name.toLowerCase().replace(' ', '_')) || index <= (sankeyData.classNames?.length || 0)) ? 1 : 2
                        })),
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
                              if (targetName.includes('Moved')) return 'rgba(139, 92, 246, 0.3)';
                              return 'rgba(107, 114, 128, 0.3)';
                            })()
                          }
                        })),
                        lineStyle: {
                          curveness: 0.5
                        },
                        label: {
                          show: true,
                          position: 'right',
                          formatter: '{b}',
                          color: '#1a1a1a'
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
              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                  <div className="text-[24px] font-medium text-blue-600">
                    {sankeyData.links
                      .filter(l => sankeyData.nodes[l.target]?.name?.includes('Window Shopped'))
                      .reduce((sum, link) => sum + (link.value || 0), 0)
                    }
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1">Window Shopped</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                  <div className="text-[24px] font-medium text-red-600">
                    {sankeyData.links
                      .filter(l => sankeyData.nodes[l.target]?.name?.includes('Cart Abandoned'))
                      .reduce((sum, link) => sum + (link.value || 0), 0)
                    }
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1">Cart Abandoned</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <div className="text-[24px] font-medium text-green-600">
                    {sankeyData.links
                      .filter(l => sankeyData.nodes[l.target]?.name?.includes('Purchased'))
                      .reduce((sum, link) => sum + (link.value || 0), 0)
                    }
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1">Purchased</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                  <div className="text-[24px] font-medium text-purple-600">
                    {sankeyData.links
                      .filter(l => sankeyData.nodes[l.target]?.name?.includes('Moved'))
                      .reduce((sum, link) => sum + (link.value || 0), 0)
                    }
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1">Moved</div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 justify-center text-[13px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a1a1a' }}></div>
                  <span className="text-gray-600">Total Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                  <span className="text-gray-600">Object Classes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Window Shopped</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Cart Abandoned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Purchased</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-600">Moved</span>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {/* Recent Trends Chart - Full Width */}
        {dailyTrends && (
          <div className="mb-6">
            <ChartCard title="Recent Trends">
              {/* Line Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrends.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f3f3" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    interval={0}
                    tickFormatter={(value) => value || ''}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    label={{ value: 'Uniques', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9ca3af', fontSize: 12 } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return data.date || data.time;
                      }
                      return value;
                    }}
                  />
                  <Line
                    type="linear"
                    dataKey="windowShopped"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3b82f6' }}
                    name="Window Shopped"
                  />
                  <Line
                    type="linear"
                    dataKey="cartAbandoned"
                    stroke="#ca8a04"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#ca8a04' }}
                    name="Cart Abandoned"
                  />
                  <Line
                    type="linear"
                    dataKey="purchased"
                    stroke="#9333ea"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#9333ea' }}
                    name="Purchased"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* Category Distribution & Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Category Distribution */}
          <ChartCard title="Category Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
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

          <ChartCard title="Most Active Object">
            {shelfData && shelfData.length > 0 ? (
              <TopPerformer
                data={[...shelfData].sort((a, b) => b.pickups - a.pickups)[0]}
                metric="pickups"
                prefix=""
              />
            ) : (
              <div className="text-center py-4 text-gray-500">No data available</div>
            )}
          </ChartCard>

          <ChartCard title="Best Conversion">
            {shelfData && shelfData.length > 0 ? (
              <TopPerformer
                data={[...shelfData].sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))[0]}
                metric="conversionRate"
                suffix="%"
              />
            ) : (
              <div className="text-center py-4 text-gray-500">No data available</div>
            )}
          </ChartCard>
        </div>

        {/* Object Performance Table */}
        <ChartCard title="Object Performance">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#f3f3f3] border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#1a1a1a]">Object ID</th>
                  <th className="px-4 py-3 text-left font-medium text-[#1a1a1a]">Class</th>
                  <th className="px-4 py-3 text-right font-medium text-[#1a1a1a]">Pickups</th>
                  <th className="px-4 py-3 text-right font-medium text-[#1a1a1a]">Purchases</th>
                  <th className="px-4 py-3 text-right font-medium text-[#1a1a1a]">Abandoned</th>
                  <th className="px-4 py-3 text-right font-medium text-[#1a1a1a]">Window Shopped</th>
                  <th className="px-4 py-3 text-right font-medium text-[#1a1a1a]">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {shelfData && shelfData.length > 0 ? (
                  shelfData.map((shelf, index) => (
                    <tr
                      key={shelf.shelfId}
                      className={`border-b border-gray-100 hover:bg-[#f3f3f3] transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
                    >
                      <td className="px-4 py-3 font-medium text-[#1a1a1a]">{shelf.shelfId}</td>
                      <td className="px-4 py-3 text-gray-600">{shelf.className?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{shelf.pickups || 0}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{shelf.purchases || 0}</td>
                      <td className="px-4 py-3 text-right text-red-500">{shelf.returns || 0}</td>
                      <td className="px-4 py-3 text-right text-blue-500">{shelf.windowShopped || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-[12px] ${parseFloat(shelf.conversionRate) > 60 ? 'bg-green-50 text-green-700' :
                            parseFloat(shelf.conversionRate) > 40 ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                          }`}>
                          {shelf.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No event data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Optimization Insights Modal */}
      {showOptimizationModal && (
        <OptimizationInsightsModal
          insights={optimizationInsights}
          categorizedData={categorizedData}
          isLoading={isGeneratingInsights}
          onClose={() => setShowOptimizationModal(false)}
          onApply={handleApplyOptimization}
        />
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-300 p-4 hover:border-gray-400 shadow-md hover:shadow-lg transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-[#f3f3f3] rounded-lg flex items-center justify-center text-[#1a1a1a]">
          {icon}
        </div>
        <span className="text-[12px] text-gray-500">{label}</span>
      </div>
      <div className="text-[24px] font-medium text-[#1a1a1a] tracking-[-0.02em]">{value}</div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-300 p-6">
      <h3 className="text-[16px] font-medium text-[#1a1a1a] mb-4">{title}</h3>
      {children}
    </div>
  );
}

// Top Performer Component
function TopPerformer({ data, metric, prefix = '', suffix = '' }) {
  if (!data) return <div className="text-center py-4 text-gray-500">No data</div>;

  // Display class name instead of object ID
  const displayName = data.className
    ? data.className.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    : data.shelfId;

  return (
    <div className="text-center py-8">
      <div className="text-[36px] font-medium text-[#1a1a1a]">
        {displayName}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
