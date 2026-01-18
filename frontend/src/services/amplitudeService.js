/**
 * Analytics Service
 * Fetches real behavioral events from the events API or generates mock data
 * Events: PRODUCT_PURCHASED, WINDOW_SHOPPED, CART_ABANDONED, MOVED
 */

import { eventsAPI } from '@/api/endpoints';

// ============================================================================
// MOCK DATA CONFIGURATION
// ============================================================================

// Shelf configurations with unique characteristics
const MOCK_SHELVES = [
  { id: 'A1', className: 'water_bottle', baseActivity: 1.2, conversionBias: 0.35 },
  { id: 'A2', className: 'cell_phone', baseActivity: 0.8, conversionBias: 0.45 },
  { id: 'A3', className: 'coffee_mug', baseActivity: 1.5, conversionBias: 0.25 },
  { id: 'A4', className: 'water_bottle', baseActivity: 0.9, conversionBias: 0.40 },
  { id: 'A5', className: 'cell_phone', baseActivity: 1.1, conversionBias: 0.50 },
  { id: 'A6', className: 'book', baseActivity: 0.6, conversionBias: 0.30 },
  { id: 'B1', className: 'laptop', baseActivity: 0.4, conversionBias: 0.55 },
  { id: 'B2', className: 'water_bottle', baseActivity: 1.3, conversionBias: 0.28 },
  { id: 'B3', className: 'coffee_mug', baseActivity: 1.0, conversionBias: 0.32 },
  { id: 'B4', className: 'cell_phone', baseActivity: 0.7, conversionBias: 0.48 },
  { id: 'B5', className: 'book', baseActivity: 0.5, conversionBias: 0.22 },
  { id: 'B6', className: 'laptop', baseActivity: 0.3, conversionBias: 0.60 },
];

const categoryColors = {
  'water_bottle': '#10b981',
  'cell_phone': '#3b82f6',
  'coffee_mug': '#f59e0b',
  'book': '#8b5cf6',
  'laptop': '#ec4899',
  'duct_tape': '#6b7280',
  'unknown': '#9ca3af'
};

// Seeded random for consistent mock data per shelf
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate mock events for a specific shelf over time
function generateMockEventsForShelf(shelf, hoursBack = 72) {
  const events = [];
  const now = Date.now();
  const baseEventsPerHour = 15 * shelf.baseActivity;

  for (let h = 0; h < hoursBack; h++) {
    const hourTimestamp = now - (h * 3600000);
    const hourSeed = shelf.id.charCodeAt(0) * 1000 + shelf.id.charCodeAt(1) * 100 + h;

    // Vary activity by time of day (more during business hours)
    const hourOfDay = new Date(hourTimestamp).getHours();
    let hourMultiplier = 1;
    if (hourOfDay >= 10 && hourOfDay <= 14) hourMultiplier = 1.5; // Lunch rush
    if (hourOfDay >= 17 && hourOfDay <= 19) hourMultiplier = 1.3; // After work
    if (hourOfDay >= 0 && hourOfDay <= 6) hourMultiplier = 0.2; // Night

    const eventsThisHour = Math.floor(baseEventsPerHour * hourMultiplier * (0.7 + seededRandom(hourSeed) * 0.6));

    for (let e = 0; e < eventsThisHour; e++) {
      const eventSeed = hourSeed * 100 + e;
      const rand = seededRandom(eventSeed);
      const eventTimestamp = hourTimestamp - Math.floor(seededRandom(eventSeed + 1) * 3600000);

      // Determine event type based on shelf's conversion bias
      let eventType;
      if (rand < 0.35) {
        eventType = 'WINDOW_SHOPPED';
      } else if (rand < 0.35 + shelf.conversionBias * 0.4) {
        eventType = 'PRODUCT_PURCHASED';
      } else if (rand < 0.75) {
        eventType = 'CART_ABANDONED';
      } else {
        eventType = 'MOVED';
      }

      // Generate duration based on event type
      let duration;
      if (eventType === 'WINDOW_SHOPPED') {
        duration = 5 + seededRandom(eventSeed + 2) * 30; // 5-35 seconds
      } else if (eventType === 'MOVED' || eventType === 'CART_ABANDONED') {
        duration = 10 + seededRandom(eventSeed + 2) * 60; // 10-70 seconds
      } else {
        duration = 30 + seededRandom(eventSeed + 2) * 120; // 30-150 seconds for purchases
      }

      events.push({
        event_id: `mock-${shelf.id}-${h}-${e}`,
        object_id: shelf.id,
        class_name: shelf.className,
        event_type: eventType,
        timestamp: new Date(eventTimestamp).toISOString(),
        metadata: {
          time_moved_seconds: duration,
          time_present_seconds: duration,
          person_duration_seconds: duration + seededRandom(eventSeed + 3) * 20
        }
      });
    }
  }

  return events;
}

// Generate all mock events
function generateAllMockEvents() {
  let allEvents = [];
  MOCK_SHELVES.forEach(shelf => {
    allEvents = allEvents.concat(generateMockEventsForShelf(shelf, 72));
  });
  // Sort by timestamp descending
  allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return allEvents;
}

// Cache mock events
let cachedMockEvents = null;
function getMockEvents() {
  if (!cachedMockEvents) {
    cachedMockEvents = generateAllMockEvents();
  }
  return cachedMockEvents;
}

// ============================================================================
// ANALYTICS FUNCTIONS (support both real and mock)
// ============================================================================

/**
 * Fetch overall analytics for all shelves
 * @param {boolean} useMock - Use mock data instead of real API
 */
export const fetchOverallAnalytics = async (useMock = false) => {
  try {
    let events;

    if (useMock) {
      events = getMockEvents();
    } else {
      const eventsRes = await eventsAPI.getAll({ limit: 500 });
      events = eventsRes.data || [];
    }

    const now = Date.now();
    const last24h = now - 24 * 3600000;
    const recentEvents = events.filter(e => new Date(e.timestamp) > last24h);

    // Parse metadata for each event
    const parsedEvents = recentEvents.map(e => ({
      ...e,
      metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata || '{}') : (e.metadata || {})
    }));

    // Calculate overall stats
    const windowShoppedEvents = parsedEvents.filter(e => e.event_type === 'WINDOW_SHOPPED');
    const purchasedEvents = parsedEvents.filter(e => e.event_type === 'PRODUCT_PURCHASED');
    const abandonedEvents = parsedEvents.filter(e => e.event_type === 'CART_ABANDONED');
    const movedEvents = parsedEvents.filter(e => e.event_type === 'MOVED');

    const totalPickups = movedEvents.length;
    const totalInteractions = abandonedEvents.length + purchasedEvents.length + windowShoppedEvents.length;
    const conversionRate = totalInteractions > 0
      ? ((purchasedEvents.length / totalInteractions) * 100).toFixed(1)
      : '0.0';

    // Hourly trend data
    const hourlyTrend = Array.from({ length: 24 }, (_, i) => {
      const hourStart = now - (23 - i) * 3600000;
      const hourEnd = hourStart + 3600000;
      const hourEvents = parsedEvents.filter(e => {
        const time = new Date(e.timestamp).getTime();
        return time >= hourStart && time < hourEnd;
      });

      return {
        hour: new Date(hourStart).getHours(),
        pickups: hourEvents.filter(e => e.event_type === 'MOVED').length,
        purchases: hourEvents.filter(e => e.event_type === 'PRODUCT_PURCHASED').length,
        returns: hourEvents.filter(e => e.event_type === 'CART_ABANDONED').length,
        windowShopped: hourEvents.filter(e => e.event_type === 'WINDOW_SHOPPED').length
      };
    });

    // Category distribution by class_name
    const categories = parsedEvents.reduce((acc, event) => {
      const className = event.class_name || 'unknown';
      acc[className] = (acc[className] || 0) + 1;
      return acc;
    }, {});

    const categoryData = Object.entries(categories).map(([name, value]) => {
      const displayName = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return {
        name: displayName,
        value,
        color: categoryColors[name] || '#6b7280'
      };
    });

    // Group events by object_id (shelf)
    const objectMap = {};
    parsedEvents.forEach(event => {
      const objectId = event.object_id || 'unknown';
      if (!objectMap[objectId]) {
        objectMap[objectId] = {
          shelfId: useMock ? objectId : `Obj-${objectId}`,
          className: event.class_name,
          pickups: 0,
          purchases: 0,
          returns: 0,
          windowShopped: 0
        };
      }

      if (event.event_type === 'MOVED') objectMap[objectId].pickups++;
      if (event.event_type === 'PRODUCT_PURCHASED') objectMap[objectId].purchases++;
      if (event.event_type === 'CART_ABANDONED') objectMap[objectId].returns++;
      if (event.event_type === 'WINDOW_SHOPPED') objectMap[objectId].windowShopped++;
    });

    const shelfData = Object.values(objectMap).map(shelf => {
      const totalShelfInteractions = shelf.returns + shelf.purchases + shelf.windowShopped;
      return {
        ...shelf,
        conversionRate: totalShelfInteractions > 0
          ? ((shelf.purchases / totalShelfInteractions) * 100).toFixed(1)
          : '0.0'
      };
    });

    return {
      overallStats: {
        totalPickups,
        totalPurchases: purchasedEvents.length,
        totalReturns: abandonedEvents.length,
        totalWindowShopped: windowShoppedEvents.length,
        conversionRate
      },
      shelfData,
      hourlyTrend,
      categoryData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch overall analytics:', error);
    throw error;
  }
};

/**
 * Fetch analytics for a specific shelf
 * @param {string} shelfId - Shelf ID (e.g., "A1" for mock, "Obj-123" for real)
 * @param {boolean} useMock - Use mock data instead of real API
 */
export const fetchShelfAnalytics = async (shelfId, useMock = false) => {
  try {
    let events;
    const now = Date.now();
    const last24h = now - 24 * 3600000;

    if (useMock) {
      const allEvents = getMockEvents();
      events = allEvents.filter(e => e.object_id === shelfId);
    } else {
      const objectId = shelfId.replace('Obj-', '');
      const eventsRes = await eventsAPI.getAll({ limit: 500, object_id: parseInt(objectId) || undefined });
      events = eventsRes.data || [];
    }

    const parsedEvents = events
      .filter(e => new Date(e.timestamp) > last24h)
      .map(e => ({
        ...e,
        metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata || '{}') : (e.metadata || {})
      }));

    const pickups = parsedEvents.filter(e => e.event_type === 'MOVED').length;
    const purchases = parsedEvents.filter(e => e.event_type === 'PRODUCT_PURCHASED').length;
    const abandoned = parsedEvents.filter(e => e.event_type === 'CART_ABANDONED').length;
    const windowShopped = parsedEvents.filter(e => e.event_type === 'WINDOW_SHOPPED').length;

    const totalInteractions = abandoned + purchases + windowShopped;
    const conversionRate = totalInteractions > 0
      ? ((purchases / totalInteractions) * 100).toFixed(1)
      : '0.0';

    // Calculate average dwell time
    const durationsArray = parsedEvents
      .map(e => e.metadata?.time_moved_seconds || e.metadata?.time_present_seconds || e.metadata?.person_duration_seconds)
      .filter(d => d !== undefined && d !== null);
    const avgDwell = durationsArray.length > 0
      ? durationsArray.reduce((sum, d) => sum + d, 0) / durationsArray.length
      : 0;

    // Hourly data
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hourStart = now - (23 - i) * 3600000;
      const hourEnd = hourStart + 3600000;
      const hourEvents = parsedEvents.filter(e => {
        const time = new Date(e.timestamp).getTime();
        return time >= hourStart && time < hourEnd;
      });

      return {
        hour: new Date(hourStart).getHours(),
        pickups: hourEvents.filter(e => e.event_type === 'MOVED').length,
        purchases: hourEvents.filter(e => e.event_type === 'PRODUCT_PURCHASED').length,
        windowShopped: hourEvents.filter(e => e.event_type === 'WINDOW_SHOPPED').length,
        abandoned: hourEvents.filter(e => e.event_type === 'CART_ABANDONED').length
      };
    });

    const peakHour = hourlyData.reduce((max, curr) =>
      (curr.pickups + curr.windowShopped) > (max.pickups + max.windowShopped) ? curr : max
    );

    // Class performance
    const classMap = {};
    parsedEvents.forEach(event => {
      const className = event.class_name || 'unknown';
      if (!classMap[className]) {
        classMap[className] = {
          name: className.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          sku: className,
          pickups: 0,
          purchases: 0,
          windowShopped: 0,
          abandoned: 0
        };
      }

      if (event.event_type === 'MOVED') classMap[className].pickups++;
      if (event.event_type === 'PRODUCT_PURCHASED') classMap[className].purchases++;
      if (event.event_type === 'WINDOW_SHOPPED') classMap[className].windowShopped++;
      if (event.event_type === 'CART_ABANDONED') classMap[className].abandoned++;
    });

    const products = Object.values(classMap)
      .map(p => {
        const totalClassInteractions = p.abandoned + p.purchases + p.windowShopped;
        return {
          ...p,
          conversionRate: totalClassInteractions > 0
            ? ((p.purchases / totalClassInteractions) * 100).toFixed(1)
            : '0.0'
        };
      })
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 5);

    return {
      stats: {
        totalPickups: pickups,
        totalPurchases: purchases,
        totalReturns: abandoned,
        totalWindowShopped: windowShopped,
        conversionRate,
        averageDwellTime: Math.round(avgDwell)
      },
      hourlyData,
      peakHour,
      products,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch shelf analytics:', error);
    throw error;
  }
};

/**
 * Fetch Sankey chart data
 * @param {boolean} useMock - Use mock data instead of real API
 */
export const fetchSankeyData = async (useMock = false) => {
  try {
    let events;

    if (useMock) {
      events = getMockEvents();
    } else {
      const eventsRes = await eventsAPI.getAll({ limit: 500 });
      events = eventsRes.data || [];
    }

    const now = Date.now();
    const last24h = now - 24 * 3600000;
    const recentEvents = events.filter(e => new Date(e.timestamp) > last24h);

    const classNames = [...new Set(recentEvents.map(e => e.class_name || 'unknown'))];

    const classStats = {};
    classNames.forEach(className => {
      const classEvents = recentEvents.filter(e => (e.class_name || 'unknown') === className);
      classStats[className] = {
        windowShopped: classEvents.filter(e => e.event_type === 'WINDOW_SHOPPED').length,
        cartAbandoned: classEvents.filter(e => e.event_type === 'CART_ABANDONED').length,
        purchased: classEvents.filter(e => e.event_type === 'PRODUCT_PURCHASED').length,
        moved: classEvents.filter(e => e.event_type === 'MOVED').length,
        total: classEvents.length
      };
    });

    const nodes = [
      { name: 'Total Events', fill: '#1a1a1a' }
    ];

    classNames.forEach(className => {
      const displayName = className.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      nodes.push({ name: displayName, fill: '#6b7280' });
    });

    classNames.forEach(className => {
      const displayName = className.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      nodes.push({ name: `${displayName} - Window Shopped`, fill: '#3b82f6' });
      nodes.push({ name: `${displayName} - Cart Abandoned`, fill: '#ef4444' });
      nodes.push({ name: `${displayName} - Purchased`, fill: '#10b981' });
      nodes.push({ name: `${displayName} - Moved`, fill: '#8b5cf6' });
    });

    const links = [];

    classNames.forEach((className, index) => {
      const total = classStats[className].total;
      if (total > 0) {
        links.push({
          source: 0,
          target: index + 1,
          value: total
        });
      }
    });

    classNames.forEach((className, classIndex) => {
      const classNodeIndex = classIndex + 1;
      const baseEventIndex = classNames.length + 1 + (classIndex * 4);
      const stats = classStats[className];

      if (stats.windowShopped > 0) {
        links.push({ source: classNodeIndex, target: baseEventIndex, value: stats.windowShopped });
      }
      if (stats.cartAbandoned > 0) {
        links.push({ source: classNodeIndex, target: baseEventIndex + 1, value: stats.cartAbandoned });
      }
      if (stats.purchased > 0) {
        links.push({ source: classNodeIndex, target: baseEventIndex + 2, value: stats.purchased });
      }
      if (stats.moved > 0) {
        links.push({ source: classNodeIndex, target: baseEventIndex + 3, value: stats.moved });
      }
    });

    return { nodes, links, classNames };
  } catch (error) {
    console.error('Failed to fetch sankey data:', error);
    throw error;
  }
};

/**
 * Fetch daily trends data
 * @param {boolean} useMock - Use mock data instead of real API
 */
export const fetchDailyTrends = async (useMock = false) => {
  try {
    let events;

    if (useMock) {
      events = getMockEvents();
    } else {
      const eventsRes = await eventsAPI.getAll({ limit: 1000 });
      events = eventsRes.data || [];
    }

    const now = Date.now();
    const DAY_MS = 24 * 3600000;
    const threeDaysAgo = now - (3 * DAY_MS);

    const recentEvents = events
      .filter(e => new Date(e.timestamp) > threeDaysAgo)
      .map(e => ({
        ...e,
        metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata || '{}') : (e.metadata || {})
      }));

    const dailyData = [];
    const pointsPerDay = 10;
    const totalPoints = 30;
    const intervalMS = (3 * DAY_MS) / totalPoints;

    for (let i = 0; i < totalPoints; i++) {
      const pointStart = threeDaysAgo + (i * intervalMS);
      const pointEnd = pointStart + intervalMS;
      const date = new Date(pointStart);

      const isNewDay = i % pointsPerDay === 0;
      const formattedDate = isNewDay ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

      const pointEvents = recentEvents.filter(e => {
        const time = new Date(e.timestamp).getTime();
        return time >= pointStart && time < pointEnd;
      });

      dailyData.push({
        date: formattedDate,
        fullDate: date.toISOString().split('T')[0],
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        windowShopped: pointEvents.filter(e => e.event_type === 'WINDOW_SHOPPED').length,
        cartAbandoned: pointEvents.filter(e => e.event_type === 'CART_ABANDONED').length,
        purchased: pointEvents.filter(e => e.event_type === 'PRODUCT_PURCHASED').length,
        moved: pointEvents.filter(e => e.event_type === 'MOVED').length
      });
    }

    const yesterdayStart = totalPoints - 20;
    const yesterdayEnd = totalPoints - 10;
    const comparisonStart = 0;
    const comparisonEnd = 10;

    const sumRange = (start, end, field) => {
      return dailyData.slice(start, end).reduce((sum, d) => sum + d[field], 0);
    };

    const yesterdayTotals = {
      windowShopped: sumRange(yesterdayStart, yesterdayEnd, 'windowShopped'),
      cartAbandoned: sumRange(yesterdayStart, yesterdayEnd, 'cartAbandoned'),
      purchased: sumRange(yesterdayStart, yesterdayEnd, 'purchased'),
      moved: sumRange(yesterdayStart, yesterdayEnd, 'moved')
    };

    const comparisonTotals = {
      windowShopped: sumRange(comparisonStart, comparisonEnd, 'windowShopped'),
      cartAbandoned: sumRange(comparisonStart, comparisonEnd, 'cartAbandoned'),
      purchased: sumRange(comparisonStart, comparisonEnd, 'purchased'),
      moved: sumRange(comparisonStart, comparisonEnd, 'moved')
    };

    const calcPercentChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const comparisonDate = dailyData.find((d, i) => i >= comparisonStart && d.date)?.date || 'N/A';

    const metrics = {
      windowShopped: {
        value: yesterdayTotals.windowShopped,
        change: calcPercentChange(yesterdayTotals.windowShopped, comparisonTotals.windowShopped),
        comparisonDate
      },
      cartAbandoned: {
        value: yesterdayTotals.cartAbandoned,
        change: calcPercentChange(yesterdayTotals.cartAbandoned, comparisonTotals.cartAbandoned),
        comparisonDate
      },
      purchased: {
        value: yesterdayTotals.purchased,
        change: calcPercentChange(yesterdayTotals.purchased, comparisonTotals.purchased),
        comparisonDate
      },
      moved: {
        value: yesterdayTotals.moved,
        change: calcPercentChange(yesterdayTotals.moved, comparisonTotals.moved),
        comparisonDate
      }
    };

    return { dailyData, metrics };
  } catch (error) {
    console.error('Failed to fetch daily trends:', error);
    throw error;
  }
};

/**
 * Fetch daily trends for a specific shelf
 * @param {string} shelfId - Shelf ID
 * @param {boolean} useMock - Use mock data instead of real API
 */
export const fetchShelfDailyTrends = async (shelfId, useMock = false) => {
  try {
    let events;
    const now = Date.now();
    const DAY_MS = 24 * 3600000;
    const threeDaysAgo = now - (3 * DAY_MS);

    if (useMock) {
      const allEvents = getMockEvents();
      events = allEvents.filter(e => e.object_id === shelfId);
    } else {
      const objectId = shelfId.replace('Obj-', '');
      const eventsRes = await eventsAPI.getAll({ limit: 500, object_id: parseInt(objectId) || undefined });
      events = eventsRes.data || [];
    }

    const recentEvents = events.filter(e => new Date(e.timestamp) > threeDaysAgo);

    const dailyData = [];
    const pointsPerDay = 10;
    const totalPoints = 30;
    const intervalMS = (3 * DAY_MS) / totalPoints;

    for (let i = 0; i < totalPoints; i++) {
      const pointStart = threeDaysAgo + (i * intervalMS);
      const pointEnd = pointStart + intervalMS;
      const date = new Date(pointStart);

      const isNewDay = i % pointsPerDay === 0;
      const formattedDate = isNewDay ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

      const pointEvents = recentEvents.filter(e => {
        const time = new Date(e.timestamp).getTime();
        return time >= pointStart && time < pointEnd;
      });

      dailyData.push({
        date: formattedDate,
        fullDate: date.toISOString().split('T')[0],
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        pickups: pointEvents.filter(e => e.event_type === 'MOVED').length,
        purchases: pointEvents.filter(e => e.event_type === 'PRODUCT_PURCHASED').length,
        windowShopped: pointEvents.filter(e => e.event_type === 'WINDOW_SHOPPED').length,
        abandoned: pointEvents.filter(e => e.event_type === 'CART_ABANDONED').length
      });
    }

    const yesterdayStart = totalPoints - 20;
    const yesterdayEnd = totalPoints - 10;
    const comparisonStart = 0;
    const comparisonEnd = 10;

    const sumRange = (start, end, field) => {
      return dailyData.slice(start, end).reduce((sum, d) => sum + d[field], 0);
    };

    const yesterdayTotals = {
      pickups: sumRange(yesterdayStart, yesterdayEnd, 'pickups'),
      purchases: sumRange(yesterdayStart, yesterdayEnd, 'purchases'),
      windowShopped: sumRange(yesterdayStart, yesterdayEnd, 'windowShopped'),
      abandoned: sumRange(yesterdayStart, yesterdayEnd, 'abandoned')
    };

    const comparisonTotals = {
      pickups: sumRange(comparisonStart, comparisonEnd, 'pickups'),
      purchases: sumRange(comparisonStart, comparisonEnd, 'purchases'),
      windowShopped: sumRange(comparisonStart, comparisonEnd, 'windowShopped'),
      abandoned: sumRange(comparisonStart, comparisonEnd, 'abandoned')
    };

    const calcPercentChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const comparisonDate = dailyData.find((d, i) => i >= comparisonStart && d.date)?.date || 'N/A';

    const metrics = {
      pickups: {
        value: yesterdayTotals.pickups,
        change: calcPercentChange(yesterdayTotals.pickups, comparisonTotals.pickups),
        comparisonDate
      },
      purchases: {
        value: yesterdayTotals.purchases,
        change: calcPercentChange(yesterdayTotals.purchases, comparisonTotals.purchases),
        comparisonDate
      },
      windowShopped: {
        value: yesterdayTotals.windowShopped,
        change: calcPercentChange(yesterdayTotals.windowShopped, comparisonTotals.windowShopped),
        comparisonDate
      },
      abandoned: {
        value: yesterdayTotals.abandoned,
        change: calcPercentChange(yesterdayTotals.abandoned, comparisonTotals.abandoned),
        comparisonDate
      }
    };

    return { dailyData, metrics };
  } catch (error) {
    console.error('Failed to fetch shelf daily trends:', error);
    throw error;
  }
};

/**
 * Get list of mock shelf IDs for selection
 */
export const getMockShelfIds = () => {
  return MOCK_SHELVES.map(s => ({
    id: s.id,
    className: s.className,
    displayName: s.className.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));
};

// ============================================================================
// STORE OPTIMIZATION LOGIC
// ============================================================================

/**
 * Categorize shelves based on their analytics metrics
 * @param {Array} shelfData - Array of shelf analytics data
 * @returns {Object} Categorized shelves with optimization recommendations
 */
export const categorizeShelvesForOptimization = (shelfData) => {
  if (!shelfData || shelfData.length === 0) return null;

  // Calculate averages for thresholds
  const avgDwellTime = shelfData.reduce((sum, s) => sum + (s.averageDwellTime || 0), 0) / shelfData.length;
  const avgConversion = shelfData.reduce((sum, s) => sum + parseFloat(s.conversionRate || 0), 0) / shelfData.length;
  const avgAbandonment = shelfData.reduce((sum, s) => {
    const total = (s.windowShopped || 0) + (s.returns || 0) + (s.purchases || 0);
    const rate = total > 0 ? (s.returns / total) * 100 : 0;
    return sum + rate;
  }, 0) / shelfData.length;

  // Categorize each shelf
  const categorized = shelfData.map(shelf => {
    const conversionRate = parseFloat(shelf.conversionRate || 0);
    const dwellTime = shelf.averageDwellTime || 0;
    const total = (shelf.windowShopped || 0) + (shelf.returns || 0) + (shelf.purchases || 0);
    const abandonmentRate = total > 0 ? (shelf.returns / total) * 100 : 0;

    let category = 'normal';
    let placement = 'middle';
    let reason = '';

    // High Dwell Time - "Anchor" items
    if (dwellTime > avgDwellTime * 1.3) {
      category = 'anchor';
      placement = 'center';
      reason = `High dwell time (${Math.round(dwellTime)}s vs avg ${Math.round(avgDwellTime)}s). Customers spend significant time here - surround with discovery items.`;
    }
    // High Conversion - "Magnet" items
    else if (conversionRate > avgConversion * 1.3) {
      category = 'magnet';
      placement = 'back';
      reason = `High conversion (${conversionRate.toFixed(1)}% vs avg ${avgConversion.toFixed(1)}%). Destination item - place in back to drive traffic through store.`;
    }
    // High Abandonment - "Risk" items
    else if (abandonmentRate > avgAbandonment * 1.3) {
      category = 'risk';
      placement = 'front';
      reason = `High abandonment (${abandonmentRate.toFixed(1)}% vs avg ${avgAbandonment.toFixed(1)}%). Place near front so customers can easily return items.`;
    }
    // Low performance - "Discovery" items
    else if (conversionRate < avgConversion * 0.7 && (shelf.pickups || 0) < 5) {
      category = 'discovery';
      placement = 'near_anchor';
      reason = `Low visibility item. Place near high-dwell anchors to leverage borrowed attention.`;
    }

    return {
      ...shelf,
      category,
      placement,
      reason,
      metrics: {
        dwellTime,
        conversionRate,
        abandonmentRate
      }
    };
  });

  return {
    shelves: categorized,
    summary: {
      anchors: categorized.filter(s => s.category === 'anchor'),
      magnets: categorized.filter(s => s.category === 'magnet'),
      risks: categorized.filter(s => s.category === 'risk'),
      discovery: categorized.filter(s => s.category === 'discovery'),
      normal: categorized.filter(s => s.category === 'normal')
    },
    averages: {
      dwellTime: avgDwellTime,
      conversion: avgConversion,
      abandonment: avgAbandonment
    }
  };
};

/**
 * Generate optimized shelf layout by swapping shelf DATA (not positions)
 * This approach keeps shelf positions fixed and swaps the content/metadata
 * to place items in optimal locations based on retail psychology
 *
 * @param {Array} currentShelves - Current shelf positions from the store
 * @param {Object} categorizedData - Output from categorizeShelvesForOptimization
 * @returns {Array} Shelves with swapped data for optimized layout
 */
export const generateOptimizedLayout = (currentShelves, categorizedData) => {
  if (!currentShelves || !categorizedData || currentShelves.length === 0) {
    return currentShelves;
  }

  const { summary } = categorizedData;

  // Sort shelves by position: Y (front to back) then X (left to right)
  const sortedByPosition = [...currentShelves]
    .filter(s => s.normalizedPos)
    .sort((a, b) => {
      const yDiff = (a.normalizedPos?.y ?? 0.5) - (b.normalizedPos?.y ?? 0.5);
      if (Math.abs(yDiff) > 0.01) return yDiff;
      return (a.normalizedPos?.x ?? 0.5) - (b.normalizedPos?.x ?? 0.5);
    });

  if (sortedByPosition.length === 0) {
    console.warn('No valid shelf positions found for optimization');
    return currentShelves;
  }

  // Define position zones (indices into sortedByPosition)
  const totalShelves = sortedByPosition.length;
  const frontCount = Math.ceil(totalShelves * 0.33);  // Front 33%
  const backStart = Math.floor(totalShelves * 0.67);  // Back 33%

  const frontPositions = sortedByPosition.slice(0, frontCount);
  const middlePositions = sortedByPosition.slice(frontCount, backStart);
  const backPositions = sortedByPosition.slice(backStart);

  console.log('Position zones:', {
    front: frontPositions.length,
    middle: middlePositions.length,
    back: backPositions.length
  });
  console.log('Categories:', {
    risks: summary.risks.length,
    anchors: summary.anchors.length,
    magnets: summary.magnets.length,
    discovery: summary.discovery.length,
    normal: summary.normal.length
  });

  // Create a pool of swappable data (label, metadata, id display name)
  // We'll assign this data to optimal positions
  const shelfDataPool = currentShelves.map(shelf => ({
    originalId: shelf.id,
    label: shelf.label,
    metadata: { ...shelf.metadata },
  }));

  // Build assignment: which data goes to which position
  // Map: positionIndex -> dataIndex
  const dataAssignments = new Map();
  const usedDataIndices = new Set();

  // Helper to find data index for a category shelf (by matching to original shelf)
  const findDataIndexForCategory = (categoryShelf) => {
    // Try to match by shelfId to original shelf index
    const idx = currentShelves.findIndex(s => s.id === categoryShelf.shelfId);
    if (idx !== -1 && !usedDataIndices.has(idx)) {
      return idx;
    }
    // If not found or already used, find any unused data
    for (let i = 0; i < shelfDataPool.length; i++) {
      if (!usedDataIndices.has(i)) return i;
    }
    return -1;
  };

  // Helper to get position index from shelf
  const getPositionIndex = (shelf) => {
    return sortedByPosition.findIndex(s => s.id === shelf.id);
  };

  let frontIdx = 0, middleIdx = 0, backIdx = 0;

  // Assign Risk items to FRONT positions
  summary.risks.forEach(categoryShelf => {
    if (frontIdx < frontPositions.length) {
      const positionShelf = frontPositions[frontIdx++];
      const posIdx = getPositionIndex(positionShelf);
      const dataIdx = findDataIndexForCategory(categoryShelf);
      if (posIdx !== -1 && dataIdx !== -1) {
        dataAssignments.set(posIdx, dataIdx);
        usedDataIndices.add(dataIdx);
      }
    }
  });

  // Assign Anchors to MIDDLE positions
  summary.anchors.forEach(categoryShelf => {
    if (middleIdx < middlePositions.length) {
      const positionShelf = middlePositions[middleIdx++];
      const posIdx = getPositionIndex(positionShelf);
      const dataIdx = findDataIndexForCategory(categoryShelf);
      if (posIdx !== -1 && dataIdx !== -1) {
        dataAssignments.set(posIdx, dataIdx);
        usedDataIndices.add(dataIdx);
      }
    }
  });

  // Assign Magnets to BACK positions
  summary.magnets.forEach(categoryShelf => {
    if (backIdx < backPositions.length) {
      const positionShelf = backPositions[backIdx++];
      const posIdx = getPositionIndex(positionShelf);
      const dataIdx = findDataIndexForCategory(categoryShelf);
      if (posIdx !== -1 && dataIdx !== -1) {
        dataAssignments.set(posIdx, dataIdx);
        usedDataIndices.add(dataIdx);
      }
    }
  });

  // Assign Discovery items near middle (after anchors)
  summary.discovery.forEach(categoryShelf => {
    let positionShelf = null;
    if (middleIdx < middlePositions.length) {
      positionShelf = middlePositions[middleIdx++];
    } else if (backIdx < backPositions.length) {
      positionShelf = backPositions[backIdx++];
    } else if (frontIdx < frontPositions.length) {
      positionShelf = frontPositions[frontIdx++];
    }

    if (positionShelf) {
      const posIdx = getPositionIndex(positionShelf);
      const dataIdx = findDataIndexForCategory(categoryShelf);
      if (posIdx !== -1 && dataIdx !== -1) {
        dataAssignments.set(posIdx, dataIdx);
        usedDataIndices.add(dataIdx);
      }
    }
  });

  // Assign Normal items to remaining positions
  const remainingPositions = sortedByPosition.filter((_, idx) => !dataAssignments.has(idx));
  const remainingData = shelfDataPool.map((_, idx) => idx).filter(idx => !usedDataIndices.has(idx));

  remainingPositions.forEach((positionShelf, i) => {
    if (i < remainingData.length) {
      const posIdx = getPositionIndex(positionShelf);
      dataAssignments.set(posIdx, remainingData[i]);
      usedDataIndices.add(remainingData[i]);
    }
  });

  console.log('Data assignments (positionIdx -> dataIdx):', Object.fromEntries(dataAssignments));

  // Build the optimized shelves array
  // Each shelf keeps its position but gets new data assigned
  const optimizedShelves = sortedByPosition.map((shelf, posIdx) => {
    const dataIdx = dataAssignments.get(posIdx);

    if (dataIdx !== undefined && dataIdx !== posIdx) {
      // Swap data from another shelf
      const newData = shelfDataPool[dataIdx];
      console.log(`Shelf at position ${posIdx} (${shelf.id}) gets data from ${newData.originalId}`);

      return {
        ...shelf,
        // Keep position and scale
        normalizedPos: shelf.normalizedPos,
        scale: shelf.scale,
        // Swap the display data
        label: newData.label,
        metadata: { ...newData.metadata },
        // Keep original ID for React key but show swapped label
        _originalDataFrom: newData.originalId
      };
    }

    // No swap needed, keep as is
    return shelf;
  });

  // Also include any shelves that weren't in sortedByPosition (shouldn't happen but safety)
  const optimizedIds = new Set(optimizedShelves.map(s => s.id));
  currentShelves.forEach(shelf => {
    if (!optimizedIds.has(shelf.id)) {
      optimizedShelves.push(shelf);
    }
  });

  console.log('Optimization complete. Total shelves:', optimizedShelves.length);
  return optimizedShelves;
};

export default {
  fetchOverallAnalytics,
  fetchShelfAnalytics,
  fetchSankeyData,
  fetchDailyTrends,
  fetchShelfDailyTrends,
  getMockShelfIds,
  categorizeShelvesForOptimization,
  generateOptimizedLayout
};
