import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Users, Clock, Activity, Package, DollarSign } from 'lucide-react';
import { fetchShelfAnalytics, fetchRealtimeEvents } from '../services/amplitudeService';

/**
 * Shelf-specific Analytics - Micro view for individual shelf
 * Shows detailed user interactions and performance metrics
 * Events: PRODUCT_PURCHASED, WINDOW_SHOPPED, CART_ABANDONED
 */
function ShelfAnalytics({ shelfId }) {
  const [analytics, setAnalytics] = useState(null);
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadShelfAnalytics = async () => {
      try {
        setLoading(true);
        const [analyticsData, eventsData] = await Promise.all([
          fetchShelfAnalytics(shelfId),
          fetchRealtimeEvents(shelfId)
        ]);
        setAnalytics(analyticsData);
        setRealtimeEvents(eventsData);
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
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <Activity className="animate-spin" size={20} />
          <span>Loading analytics...</span>
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
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard 
          icon={<TrendingUp size={16} />}
          label="Conversion"
          value={`${stats.conversionRate}%`}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard 
          icon={<DollarSign size={16} />}
          label="Revenue"
          value={`$${stats.totalRevenue}`}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
      </div>

      {/* 24-Hour Activity Chart */}
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <h4 className="font-semibold text-gray-800 mb-3 text-sm">24-Hour Activity</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="pickups" stroke="#3b82f6" strokeWidth={2} name="Window Shopped" />
            <Line type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} name="Purchases" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
          <Clock size={12} />
          Peak hour: {peakHour.hour}:00 ({peakHour.pickups} interactions)
        </div>
      </div>

      {/* Product Performance */}
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <h4 className="font-semibold text-gray-800 mb-3 text-sm">Product Performance</h4>
        <div className="space-y-2">
          {products.map((product, index) => (
            <div key={index} className="flex items-center justify-between text-xs border-b pb-2">
              <div>
                <div className="font-medium text-gray-800">{product.name}</div>
                <div className="text-gray-500">{product.sku}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">{product.purchases} purchases</div>
                <div className="text-gray-600">{product.conversionRate}% conversion</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Interactions */}
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 text-sm">Recent Users</h4>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
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
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-green-600" />
          <h4 className="font-semibold text-gray-800 text-sm">Live Event Stream</h4>
          <span className="text-xs text-green-600">● Live</span>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {realtimeEvents.map((event, index) => (
            <EventItem key={index} event={event} />
          ))}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 shadow">
          <div className="text-xs text-gray-600 mb-1">Avg. Dwell Time</div>
          <div className="text-xl font-bold text-gray-800">{stats.averageDwellTime}s</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow">
          <div className="text-xs text-gray-600 mb-1">Abandon Rate</div>
          <div className="text-xl font-bold text-red-600">
            {((stats.totalReturns / stats.totalPickups) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color, bgColor }) {
  return (
    <div className={`${bgColor} rounded-lg p-3 shadow`}>
      <div className={`${color} mb-1`}>{icon}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

// User Card Component
function UserCard({ user }) {
  const getActionIcon = (action) => {
    switch (action) {
      case 'WINDOW_SHOPPED': return '👀';
      case 'PRODUCT_PURCHASED': return '✅';
      case 'CART_ABANDONED': return '🛒❌';
      default: return '📦';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Users size={12} className="text-blue-500" />
          <span className="text-xs font-mono font-medium text-gray-700">{user.userId}</span>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(user.lastSeen).toLocaleTimeString()}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-600">{user.totalActions} actions</span>
        <span className="text-gray-400">|</span>
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
  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'WINDOW_SHOPPED': return 'text-blue-600 bg-blue-50';
      case 'PRODUCT_PURCHASED': return 'text-green-600 bg-green-50';
      case 'CART_ABANDONED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventLabel = (eventType) => {
    switch (eventType) {
      case 'WINDOW_SHOPPED': return '👀 Window Shopped';
      case 'PRODUCT_PURCHASED': return '✅ Purchased';
      case 'CART_ABANDONED': return '🛒❌ Cart Abandoned';
      default: return eventType;
    }
  };

  return (
    <div className="flex items-center justify-between text-xs py-1 px-2 hover:bg-gray-50 rounded">
      <div className="flex items-center gap-2 flex-1">
        <span className={`px-2 py-0.5 rounded ${getEventColor(event.eventType)}`}>
          {getEventLabel(event.eventType)}
        </span>
        <span className="text-gray-600">{event.properties.product}</span>
      </div>
      <span className="text-gray-500">
        {event.minutesAgo === 0 ? 'Just now' : `${event.minutesAgo}m ago`}
      </span>
    </div>
  );
}

export default ShelfAnalytics;
