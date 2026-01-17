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
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500'
  },
  CART_ABANDONED: {
    icon: ShoppingCart,
    label: 'Cart Abandoned',
    description: 'Picked up then returned',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500'
  },
  PRODUCT_PURCHASED: {
    icon: Package,
    label: 'Product Purchased',
    description: 'Picked up and taken',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500'
  },
  MOVED: {
    icon: Move,
    label: 'Object Moved',
    description: 'Displaced from home position',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    dotColor: 'bg-purple-500'
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
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border-light" />

      {/* Timeline dot */}
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${config.bgColor} ${config.borderColor} border-2 flex items-center justify-center`}>
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      </div>

      {/* Event content */}
      <div className={`ml-4 p-4 rounded-lg border ${config.borderColor} ${config.bgColor} hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-white/80 ${config.color}`}>
              <Icon size={20} />
            </div>
            <div>
              <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
              <p className="text-sm text-foreground font-medium mt-0.5">
                {event.class_name}
              </p>
              <p className="text-xs text-foreground-muted mt-1">
                {config.description}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-foreground-muted whitespace-nowrap">
            <div className="font-medium">{formatRelativeTime(event.timestamp)}</div>
            <div className="mt-0.5">{formatTime(event.timestamp)}</div>
            {event.view_angle !== null && (
              <div className="mt-1 text-foreground-subtle">View: {event.view_angle}°</div>
            )}
          </div>
        </div>

        {/* Metadata if present */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/50 text-xs text-foreground-muted">
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
function FilterButton({ active, onClick, children, color = 'accent' }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? `bg-${color} text-white shadow-sm`
          : 'bg-background-subtle text-foreground-muted hover:bg-background-hover'
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
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Event Timeline
            </h1>
            <p className="mt-2 text-lg text-foreground-muted">
              Real-time behavioral events from product tracking.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              className="p-2 rounded-lg bg-background-subtle hover:bg-background-hover text-foreground-muted hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error transition-colors"
              title="Clear all events"
            >
              <Trash2 size={20} />
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
          <Filter size={16} className="text-foreground-muted" />
          <span className="text-sm text-foreground-muted mr-2">Filter:</span>
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
        <div className="bg-gradient-to-br from-background-elevated to-background-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-gradient-to-r from-background-subtle to-background-accent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-accent" />
              <h3 className="text-lg font-semibold text-foreground">Live Event Feed</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Auto-refreshing</span>
            </div>
          </div>

          <div className="p-6">
            {loading && events.length === 0 ? (
              <div className="text-center py-12 text-foreground-muted">
                <RefreshCw size={32} className="mx-auto mb-4 animate-spin" />
                <p>Loading events...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-error">
                <p>Error loading events: {error}</p>
                <button
                  onClick={refetch}
                  className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
                >
                  Retry
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-foreground-muted">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No events yet</p>
                <p className="text-sm mt-1">
                  Behavioral events will appear here as products are tracked.
                </p>
                <p className="text-xs mt-4 text-foreground-subtle">
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
        <div className="bg-background-elevated rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Event Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(EVENT_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <div
                  key={type}
                  className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={18} className={config.color} />
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <p className="text-xs text-foreground-muted">{config.description}</p>
                  <p className="text-xs text-foreground-subtle mt-2">
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
