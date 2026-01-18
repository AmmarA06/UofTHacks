import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, Clock, Activity, Package, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { fetchShelfAnalytics, fetchRealtimeEvents, fetchShelfDailyTrends } from '../services/amplitudeService';

/**
 * Shelf-specific Analytics - Micro view for individual shelf
 * Shows detailed user interactions and performance metrics
 * Events: PRODUCT_PURCHASED, WINDOW_SHOPPED, CART_ABANDONED
 */
function ShelfAnalytics({ shelfId }) {
  const [analytics, setAnalytics] = useState(null);
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [dailyTrends, setDailyTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadShelfAnalytics = async () => {
      try {
        setLoading(true);
        const [analyticsData, eventsData, trendsData] = await Promise.all([
          fetchShelfAnalytics(shelfId),
          fetchRealtimeEvents(shelfId),
          fetchShelfDailyTrends(shelfId)
        ]);
        setAnalytics(analyticsData);
        setRealtimeEvents(eventsData);
        setDailyTrends(trendsData);
        setError(null);
      } catch (err) {
        setError('Failed to load shelf analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (shelfId) {
      loadShelfAnalytics();

      // Refresh every 15 seconds
      const interval = setInterval(loadShelfAnalytics, 15000);
      return () => clearInterval(interval);
    }
  }, [shelfId]);

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

  const { stats, hourlyData, users, peakHour, products } = analytics;

  return (
    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Package size={16} />}
          label="Pickups"
          value={stats.totalPickups}
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Conversion"
          value={`${stats.conversionRate}%`}
        />
        <StatCard
          icon={<DollarSign size={16} />}
          label="Revenue"
          value={`$${stats.totalRevenue}`}
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

      {/* Product Performance */}
      <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
        <h4 className="font-medium text-[#1a1a1a] mb-3 text-[14px]">Product Performance</h4>
        <div className="space-y-2">
          {products.map((product, index) => (
            <div key={index} className="flex items-center justify-between text-[12px] border-b border-gray-100 pb-2 last:border-0">
              <div>
                <div className="font-medium text-[#1a1a1a]">{product.name}</div>
                <div className="text-gray-500">{product.sku}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">{product.purchases} purchases</div>
                <div className="text-gray-500">{product.conversionRate}% conversion</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Interactions */}
      <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-[#1a1a1a] text-[14px]">Recent Users</h4>
          <span className="text-[12px] bg-[#f3f3f3] text-[#1a1a1a] px-2.5 py-1 rounded-full">
            {stats.uniqueUsers} unique users
          </span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {users.slice(0, 10).map((user, index) => (
            <UserCard key={index} user={user} />
          ))}
        </div>
      </div>

      {/* Real-time Event Stream */}
      <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-[#f3f3f3] rounded-lg flex items-center justify-center">
            <Activity size={14} className="text-[#1a1a1a]" />
          </div>
          <h4 className="font-medium text-[#1a1a1a] text-[14px]">Recent Events</h4>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {realtimeEvents.map((event, index) => (
            <EventItem key={index} event={event} />
          ))}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
          <div className="text-[12px] text-gray-500 mb-1">Avg. Dwell Time</div>
          <div className="text-[20px] font-medium text-[#1a1a1a]">{stats.averageDwellTime}s</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-300 shadow-lg">
          <div className="text-[12px] text-gray-500 mb-1">Abandon Rate</div>
          <div className="text-[20px] font-medium text-red-500">
            {((stats.totalReturns / stats.totalPickups) * 100).toFixed(1)}%
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

// User Card Component
function UserCard({ user }) {
  const getActionIcon = (action) => {
    switch (action) {
      case 'WINDOW_SHOPPED': return '👀';
      case 'PRODUCT_PURCHASED': return '✅';
      case 'CART_ABANDONED': return '🛒';
      default: return '📦';
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-2 hover:bg-[#f3f3f3] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Users size={12} className="text-gray-400" />
          <span className="text-[12px] font-mono font-medium text-[#1a1a1a]">{user.userId}</span>
        </div>
        <span className="text-[11px] text-gray-500">
          {new Date(user.lastSeen).toLocaleTimeString()}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-gray-500">{user.totalActions} actions</span>
        <span className="text-gray-300">|</span>
        <div className="flex gap-1">
          {user.actions.slice(0, 3).map((action, i) => (
            <span key={i} title={action.event}>
              {getActionIcon(action.event)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Event Item Component
function EventItem({ event }) {
  const getEventStyle = (eventType) => {
    switch (eventType) {
      case 'WINDOW_SHOPPED': return 'text-gray-700 bg-gray-50';
      case 'PRODUCT_PURCHASED': return 'text-green-600 bg-green-50';
      case 'CART_ABANDONED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventLabel = (eventType) => {
    switch (eventType) {
      case 'WINDOW_SHOPPED': return 'Viewed';
      case 'PRODUCT_PURCHASED': return 'Purchased';
      case 'CART_ABANDONED': return 'Abandoned';
      default: return eventType;
    }
  };

  return (
    <div className="flex items-center justify-between text-[11px] py-1.5 px-2 hover:bg-[#f3f3f3] rounded-lg transition-colors">
      <div className="flex items-center gap-2 flex-1">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getEventStyle(event.eventType)}`}>
          {getEventLabel(event.eventType)}
        </span>
        <span className="text-gray-600">{event.properties.product}</span>
      </div>
      <span className="text-gray-400">
        {event.minutesAgo === 0 ? 'Just now' : `${event.minutesAgo}m ago`}
      </span>
    </div>
  );
}

export default ShelfAnalytics;
