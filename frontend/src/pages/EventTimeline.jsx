import { useState } from 'react';
import { motion } from 'framer-motion';
import { useEvents } from '@/hooks/useEvents';
import { PageTransition, fadeInUp } from '@/components/common/PageTransition';
import { MetricCard } from '@/components/common/MetricCard';
import {
  ShoppingCart,
  Eye,
  Package,
  Move,
  Trash2,
  RefreshCw,
  Filter,
  Clock,
  TrendingUp
} from 'lucide-react';

// Event type configurations
const EVENT_CONFIG = {
  WINDOW_SHOPPED: {
    icon: Eye,
    label: 'Window Shopped',
    description: 'Viewed but not picked up',
    color: 'text-[#1a1a1a]',
    bgColor: 'bg-[#f3f3f3]',
    borderColor: 'border-gray-200',
    dotColor: 'bg-[#1a1a1a]'
  },
  CART_ABANDONED: {
    icon: ShoppingCart,
    label: 'Cart Abandoned',
    description: 'Picked up then returned',
    color: 'text-[#1a1a1a]',
    bgColor: 'bg-[#f3f3f3]',
    borderColor: 'border-gray-200',
    dotColor: 'bg-[#1a1a1a]'
  },
  PRODUCT_PURCHASED: {
    icon: Package,
    label: 'Product Purchased',
    description: 'Picked up and taken',
    color: 'text-[#1a1a1a]',
    bgColor: 'bg-[#f3f3f3]',
    borderColor: 'border-gray-200',
    dotColor: 'bg-[#1a1a1a]'
  },
  MOVED: {
    icon: Move,
    label: 'Object Moved',
    description: 'Displaced from home position',
    color: 'text-[#1a1a1a]',
    bgColor: 'bg-[#f3f3f3]',
    borderColor: 'border-gray-200',
    dotColor: 'bg-[#1a1a1a]'
  }
};

// Format timestamp to relative time
function formatRelativeTime(timestamp) {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now - eventTime;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Format timestamp to time string
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Single event card component
function EventCard({ event, index }) {
  const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.MOVED;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative pl-8 pb-6 ${index !== 0 ? 'pt-0' : ''}`}
    >
      {/* Timeline line */}
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[#1a1a1a]" />
      </div>

      {/* Event content */}
      <div className="ml-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[#f3f3f3] rounded-xl flex items-center justify-center text-[#1a1a1a]">
              <Icon size={18} />
            </div>
            <div>
              <h4 className="font-medium text-[#1a1a1a] text-[14px]">{config.label}</h4>
              <p className="text-[13px] text-[#1a1a1a] font-medium mt-0.5">
                {event.class_name}
              </p>
              <p className="text-[12px] text-gray-500 mt-1">
                {config.description}
              </p>
            </div>
          </div>
          <div className="text-right text-[12px] text-gray-500 whitespace-nowrap">
            <div className="font-medium">{formatRelativeTime(event.timestamp)}</div>
            <div className="mt-0.5">{formatTime(event.timestamp)}</div>
            {event.view_angle !== null && (
              <div className="mt-1 text-gray-400">View: {event.view_angle}°</div>
            )}
          </div>
        </div>

        {/* Metadata if present */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
            {event.metadata.time_present_seconds && (
              <span className="mr-4">Duration: {event.metadata.time_present_seconds.toFixed(1)}s</span>
            )}
            {event.metadata.time_moved_seconds && (
              <span>Moved for: {event.metadata.time_moved_seconds.toFixed(1)}s</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Filter button component
function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${active
          ? 'bg-[#1a1a1a] text-white'
          : 'bg-[#f3f3f3] text-gray-600 hover:bg-gray-200'
        }`}
    >
      {children}
    </button>
  );
}

export function EventTimeline() {
  const [filter, setFilter] = useState(null);
  const { events, stats, loading, error, refetch, clearEvents } = useEvents({
    autoRefresh: true,
    refreshInterval: 2000,
    limit: 100,
    eventType: filter
  });

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all events? This cannot be undone.')) {
      try {
        await clearEvents();
      } catch (err) {
        alert('Failed to clear events');
      }
    }
  };

  const filteredEvents = filter
    ? events.filter(e => e.event_type === filter)
    : events;

  return (
    <PageTransition>
      <div className="space-y-8 py-8">
        {/* Header */}
        <motion.div variants={fadeInUp} className="flex items-start justify-between">
          <div>
            <h1 className="text-[32px] font-medium tracking-[-0.02em] text-[#1a1a1a]">
              Event Timeline
            </h1>
            <p className="mt-2 text-[15px] text-gray-500">
              Real-time behavioral events from product tracking.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              className="p-2.5 rounded-full bg-[#f3f3f3] hover:bg-gray-200 text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleClear}
              className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
              title="Clear all events"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Events"
            value={stats?.total_events || 0}
            subtext="All time"
            trend="up"
          />
          <MetricCard
            title="Window Shopped"
            value={stats?.by_type?.WINDOW_SHOPPED || 0}
            subtext="Low engagement"
            trend="neutral"
          />
          <MetricCard
            title="Cart Abandoned"
            value={stats?.by_type?.CART_ABANDONED || 0}
            subtext="High intent, returned"
            trend="down"
          />
          <MetricCard
            title="Purchased"
            value={stats?.by_type?.PRODUCT_PURCHASED || 0}
            subtext="Conversions"
            trend="up"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          <span className="text-[13px] text-gray-500 mr-2">Filter:</span>
          <FilterButton active={filter === null} onClick={() => setFilter(null)}>
            All
          </FilterButton>
          <FilterButton active={filter === 'WINDOW_SHOPPED'} onClick={() => setFilter('WINDOW_SHOPPED')}>
            Window Shopped
          </FilterButton>
          <FilterButton active={filter === 'CART_ABANDONED'} onClick={() => setFilter('CART_ABANDONED')}>
            Cart Abandoned
          </FilterButton>
          <FilterButton active={filter === 'PRODUCT_PURCHASED'} onClick={() => setFilter('PRODUCT_PURCHASED')}>
            Purchased
          </FilterButton>
          <FilterButton active={filter === 'MOVED'} onClick={() => setFilter('MOVED')}>
            Moved
          </FilterButton>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#f3f3f3] rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-[#1a1a1a]" />
              </div>
              <h3 className="text-[16px] font-medium text-[#1a1a1a]">Event Feed</h3>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Auto-refreshing</span>
            </div>
          </div>

          <div className="p-6">
            {loading && events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw size={32} className="mx-auto mb-4 animate-spin text-gray-400" />
                <p className="text-[14px]">Loading events...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                <p className="text-[14px]">Error loading events: {error}</p>
                <button
                  onClick={refetch}
                  className="mt-4 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-full text-[13px] hover:bg-black"
                >
                  Retry
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-[16px] font-medium text-[#1a1a1a]">No events yet</p>
                <p className="text-[13px] mt-1 text-gray-500">
                  Behavioral events will appear here as products are tracked.
                </p>
                <p className="text-[12px] mt-4 text-gray-400">
                  Events: WINDOW_SHOPPED, CART_ABANDONED, PRODUCT_PURCHASED
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto pr-2">
                {filteredEvents.map((event, index) => (
                  <EventCard key={event.event_id} event={event} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Legend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-[16px] font-medium text-[#1a1a1a] mb-4">Event Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(EVENT_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <div
                  key={type}
                  className="p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-[#f3f3f3] rounded-lg flex items-center justify-center">
                      <Icon size={14} className="text-[#1a1a1a]" />
                    </div>
                    <span className="font-medium text-[#1a1a1a] text-[13px]">{config.label}</span>
                  </div>
                  <p className="text-[12px] text-gray-500">{config.description}</p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {type === 'WINDOW_SHOPPED' && 'ENTRY → EXIT (no movement)'}
                    {type === 'CART_ABANDONED' && 'isMoved(True) → isMoved(False)'}
                    {type === 'PRODUCT_PURCHASED' && 'isMoved(True) → EXIT'}
                    {type === 'MOVED' && 'Displacement > threshold'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default EventTimeline;
