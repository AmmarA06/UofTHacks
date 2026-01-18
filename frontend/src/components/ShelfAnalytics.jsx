import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Activity, Package, ArrowUp, ArrowDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchShelfAnalytics, fetchShelfDailyTrends, getMockShelfIds } from '../services/amplitudeService';

/**
 * Shelf-specific Analytics - Micro view for individual shelf
 * Shows detailed user interactions and performance metrics
 * Events: PRODUCT_PURCHASED, WINDOW_SHOPPED, CART_ABANDONED
 */
function ShelfAnalytics({ shelfId }) {
  const [analytics, setAnalytics] = useState(null);
  const [dailyTrends, setDailyTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useMock, setUseMock] = useState(false);
  const [selectedMockShelf, setSelectedMockShelf] = useState(shelfId || 'A1');

  // Get mock shelf options
  const mockShelves = getMockShelfIds();
  const mockShelfIds = mockShelves.map(s => s.id);

  // Sync selectedMockShelf when shelfId changes and it exists in mock data
  // This ensures clicking a shelf updates the dropdown selection
  useEffect(() => {
    if (shelfId && mockShelfIds.includes(shelfId)) {
      setSelectedMockShelf(shelfId);
    }
  }, [shelfId]);

  // Determine which shelf ID to use:
  // - In mock mode: use selectedMockShelf (which auto-syncs with shelfId when applicable)
  // - In real mode: use the actual shelfId from the clicked shelf
  const effectiveShelfId = useMock ? selectedMockShelf : shelfId;

  useEffect(() => {
    const loadShelfAnalytics = async () => {
      try {
        setLoading(true);
        const [analyticsData, trendsData] = await Promise.all([
          fetchShelfAnalytics(effectiveShelfId, useMock),
          fetchShelfDailyTrends(effectiveShelfId, useMock)
        ]);
        setAnalytics(analyticsData);
        setDailyTrends(trendsData);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (effectiveShelfId) {
      loadShelfAnalytics();

      // Refresh every 15 seconds
      const interval = setInterval(loadShelfAnalytics, 15000);
      return () => clearInterval(interval);
    }
  }, [effectiveShelfId, useMock]);

  if (loading && !analytics) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
        <div className="flex items-center gap-2 text-gray-500">
          <Activity className="animate-spin" size={20} />
          <span className="text-[14px]">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !analytics) return null;

  const { stats, products } = analytics;

  return (
    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      {/* Data Source Toggle */}
      <div className="bg-white rounded-2xl p-3 border border-gray-300 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setUseMock(!useMock)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              useMock
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
            title={useMock ? 'Switch to real data' : 'Switch to mock data'}
          >
            {useMock ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {useMock ? 'Mock' : 'Real'}
          </button>
          {useMock ? (
            <select
              value={selectedMockShelf}
              onChange={(e) => setSelectedMockShelf(e.target.value)}
              className="text-[11px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {mockShelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.id} - {shelf.displayName}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] text-gray-500">Shelf {shelfId}</span>
          )}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Package size={16} />}
          label="Pickups"
          value={stats.totalPickups || 0}
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Conversion"
          value={`${stats.conversionRate || 0}%`}
        />
        <StatCard
          icon={<Activity size={16} />}
          label="Avg Dwell"
          value={`${stats.averageDwellTime || 0}s`}
        />
      </div>

      {/* Recent Trends Chart */}
      {dailyTrends && (
        <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
          <h4 className="font-medium text-[#1a1a1a] mb-3 text-[14px]">Recent Trends</h4>

          {/* Metrics Summary Row */}
          <div className="flex flex-col gap-3 mb-4 pb-3 border-b border-gray-100">
            {/* Window Shopped / Pickups */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">WINDOW_SHOPPED</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[16px] font-medium text-[#1a1a1a]">{dailyTrends.metrics.pickups.value}</span>
                <span className={`flex items-center text-[10px] ${dailyTrends.metrics.pickups.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dailyTrends.metrics.pickups.change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                  {Math.abs(dailyTrends.metrics.pickups.change)}%
                </span>
              </div>
              <span className="text-[10px] text-gray-400">yesterday</span>
              <span className="text-[10px] text-gray-400">from {dailyTrends.metrics.pickups.comparisonDate}</span>
            </div>

            {/* Purchased */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">PURCHASED</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[16px] font-medium text-[#1a1a1a]">{dailyTrends.metrics.purchases.value}</span>
                <span className={`flex items-center text-[10px] ${dailyTrends.metrics.purchases.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dailyTrends.metrics.purchases.change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                  {Math.abs(dailyTrends.metrics.purchases.change)}%
                </span>
              </div>
              <span className="text-[10px] text-gray-400">yesterday</span>
              <span className="text-[10px] text-gray-400">from {dailyTrends.metrics.purchases.comparisonDate}</span>
            </div>
          </div>

          {/* Line Chart */}
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyTrends.dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f3f3" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval={0}
                tickFormatter={(value) => value || ''}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                label={{ value: 'Uniques', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9ca3af', fontSize: 10 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '11px'
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
                dataKey="pickups"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 2, fill: '#3b82f6' }}
                name="Window Shopped"
              />
              <Line
                type="linear"
                dataKey="purchases"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 2, fill: '#10b981' }}
                name="Purchases"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Class Performance */}
      {products && products.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
          <h4 className="font-medium text-[#1a1a1a] mb-3 text-[14px]">Class Performance</h4>
          <div className="space-y-2">
            {products.map((product, index) => (
              <div key={index} className="flex items-center justify-between text-[12px] border-b border-gray-100 pb-2 last:border-0">
                <div>
                  <div className="font-medium text-[#1a1a1a]">{product.name}</div>
                  <div className="text-gray-500">{product.sku}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-green-600">{product.purchases || 0} purchases</div>
                  <div className="text-gray-500">{product.conversionRate || 0}% conversion</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
          <div className="text-[12px] text-gray-500 mb-1">Window Shopped</div>
          <div className="text-[20px] font-medium text-blue-600">{stats.totalWindowShopped || 0}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
          <div className="text-[12px] text-gray-500 mb-1">Abandon Rate</div>
          <div className="text-[20px] font-medium text-red-500">
            {(() => {
              const total = (stats.totalWindowShopped || 0) + (stats.totalReturns || 0) + (stats.totalPurchases || 0);
              return total > 0 ? ((stats.totalReturns / total) * 100).toFixed(1) : '0.0';
            })()}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl p-3 border border-gray-300 shadow-lg">
      <div className="w-7 h-7 bg-[#f3f3f3] rounded-lg flex items-center justify-center text-[#1a1a1a] mb-2">
        {icon}
      </div>
      <div className="text-[18px] font-medium text-[#1a1a1a]">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

export default ShelfAnalytics;
