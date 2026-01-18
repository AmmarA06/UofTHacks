/**
 * Amplitude Analytics Service
 * Handles event tracking and analytics data fetching for the store
 * Events: PRODUCT_PURCHASED, WINDOW_SHOPPED, CART_ABANDONED
 */

// Mock event storage (in production, this would be Amplitude API calls)
let mockEvents = [];
let mockUserId = 1;

/**
 * Track an analytics event
 * @param {string} eventType - Event type (PRODUCT_PURCHASED, WINDOW_SHOPPED, CART_ABANDONED)
 * @param {object} properties - Event properties
 */
export const trackEvent = (eventType, properties) => {
  const event = {
    eventType,
    userId: properties.userId || `user_${mockUserId++}`,
    timestamp: new Date().toISOString(),
    properties: {
      shelfId: properties.shelfId,
      product: properties.product,
      productType: properties.productType,
      sku: properties.sku || `SKU-${Math.random().toString(36).substr(2, 9)}`,
      price: properties.price || Math.floor(Math.random() * 100) + 10,
      quantity: properties.quantity || 1,
      ...properties
    }
  };
  
  mockEvents.push(event);
  console.log('Event tracked:', event);
  return event;
};

/**
 * Generate mock events for testing
 */
const generateMockEvents = () => {
  const shelves = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  
  // Each shelf sells only ONE type of product (either phones OR bottles)
  const shelfProductMap = {
    'A1': { name: 'Phone', type: 'cell_phone', price: 899 },
    'A2': { name: 'Bottle', type: 'water_bottle', price: 35 },
    'A3': { name: 'Phone', type: 'cell_phone', price: 999 },
    'A4': { name: 'Bottle', type: 'water_bottle', price: 40 },
    'A5': { name: 'Phone', type: 'cell_phone', price: 949 },
    'A6': { name: 'Bottle', type: 'water_bottle', price: 38 },
    'B1': { name: 'Bottle', type: 'water_bottle', price: 42 },
    'B2': { name: 'Phone', type: 'cell_phone', price: 879 },
    'B3': { name: 'Bottle', type: 'water_bottle', price: 36 },
    'B4': { name: 'Phone', type: 'cell_phone', price: 929 },
    'B5': { name: 'Bottle', type: 'water_bottle', price: 45 },
    'B6': { name: 'Phone', type: 'cell_phone', price: 999 }
  };
  
  const users = Array.from({ length: 50 }, (_, i) => `user_${i + 1}`);
  const now = Date.now();
  
  // Generate events over the last 24 hours
  for (let i = 0; i < 500; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const shelf = shelves[Math.floor(Math.random() * shelves.length)];
    const product = shelfProductMap[shelf]; // Get the product assigned to this shelf
    const hoursAgo = Math.floor(Math.random() * 24);
    
    // Simulate user journey: WINDOW_SHOPPED -> possibly CART_ABANDONED or PRODUCT_PURCHASED
    const journey = Math.random();
    
    // WINDOW_SHOPPED event (always happens)
    mockEvents.push({
      eventType: 'WINDOW_SHOPPED',
      userId: user,
      timestamp: new Date(now - hoursAgo * 3600000 - Math.random() * 3600000).toISOString(),
      properties: {
        shelfId: shelf,
        product: product.name,
        productType: product.type,
        sku: `${shelf}-${product.type}-${i}`,
        price: product.price,
        dwellTime: Math.floor(Math.random() * 60) + 5
      }
    });
    
    // 70% chance of adding to cart (CART_ABANDONED or PRODUCT_PURCHASED)
    if (journey > 0.3) {
      if (journey > 0.6) {
        // 40% convert to purchase
        mockEvents.push({
          eventType: 'PRODUCT_PURCHASED',
          userId: user,
          timestamp: new Date(now - hoursAgo * 3600000 - Math.random() * 1800000).toISOString(),
          properties: {
            shelfId: shelf,
            product: product.name,
            productType: product.type,
            sku: `${shelf}-${product.type}-${i}`,
            price: product.price,
            quantity: Math.floor(Math.random() * 3) + 1,
            revenue: product.price * (Math.floor(Math.random() * 3) + 1)
          }
        });
      } else {
        // 30% abandon cart
        mockEvents.push({
          eventType: 'CART_ABANDONED',
          userId: user,
          timestamp: new Date(now - hoursAgo * 3600000 - Math.random() * 1800000).toISOString(),
          properties: {
            shelfId: shelf,
            product: product.name,
            productType: product.type,
            sku: `${shelf}-${product.type}-${i}`,
            price: product.price,
            abandonReason: ['price', 'changed_mind', 'found_alternative'][Math.floor(Math.random() * 3)]
          }
        });
      }
    }
  }
  
  // Sort by timestamp
  mockEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Initialize mock events
if (mockEvents.length === 0) {
  generateMockEvents();
}

/**
 * Fetch overall analytics for all shelves
 */
export const fetchOverallAnalytics = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const now = Date.now();
  const last24h = now - 24 * 3600000;
  const recentEvents = mockEvents.filter(e => new Date(e.timestamp) > last24h);
  
  // Calculate overall stats
  const windowShoppedEvents = recentEvents.filter(e => e.eventType === 'WINDOW_SHOPPED');
  const purchasedEvents = recentEvents.filter(e => e.eventType === 'PRODUCT_PURCHASED');
  const abandonedEvents = recentEvents.filter(e => e.eventType === 'CART_ABANDONED');
  
  const totalRevenue = purchasedEvents.reduce((sum, e) => sum + (e.properties.revenue || 0), 0);
  const activeUsers = new Set(recentEvents.map(e => e.userId)).size;
  const conversionRate = windowShoppedEvents.length > 0 
    ? ((purchasedEvents.length / windowShoppedEvents.length) * 100).toFixed(1)
    : 0;
  
  // Hourly trend data
  const hourlyTrend = Array.from({ length: 24 }, (_, i) => {
    const hourStart = now - (23 - i) * 3600000;
    const hourEnd = hourStart + 3600000;
    const hourEvents = recentEvents.filter(e => {
      const time = new Date(e.timestamp).getTime();
      return time >= hourStart && time < hourEnd;
    });
    
    return {
      hour: new Date(hourStart).getHours(),
      pickups: hourEvents.filter(e => e.eventType === 'WINDOW_SHOPPED').length,
      purchases: hourEvents.filter(e => e.eventType === 'PRODUCT_PURCHASED').length,
      returns: hourEvents.filter(e => e.eventType === 'CART_ABANDONED').length
    };
  });
  
  // Category distribution
  const categories = recentEvents.reduce((acc, event) => {
    const type = event.properties.productType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const categoryData = Object.entries(categories).map(([name, value]) => {
    const displayName = name === 'cell_phone' ? 'Phone' : 
                       name === 'water_bottle' ? 'Bottle' : 
                       name.replace('_', ' ').toUpperCase();
    return {
      name: displayName,
      value,
      color: name === 'cell_phone' ? '#3b82f6' : name === 'water_bottle' ? '#10b981' : '#6b7280'
    };
  });
  
  // Shelf performance
  const shelfMap = {};
  const shelves = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  
  shelves.forEach(shelfId => {
    const shelfEvents = recentEvents.filter(e => e.properties.shelfId === shelfId);
    const pickups = shelfEvents.filter(e => e.eventType === 'WINDOW_SHOPPED').length;
    const purchases = shelfEvents.filter(e => e.eventType === 'PRODUCT_PURCHASED').length;
    const returns = shelfEvents.filter(e => e.eventType === 'CART_ABANDONED').length;
    const revenue = shelfEvents
      .filter(e => e.eventType === 'PRODUCT_PURCHASED')
      .reduce((sum, e) => sum + (e.properties.revenue || 0), 0);
    
    shelfMap[shelfId] = {
      shelfId,
      pickups,
      purchases,
      returns,
      conversionRate: pickups > 0 ? ((purchases / pickups) * 100).toFixed(1) : '0.0',
      revenue: revenue.toFixed(2)
    };
  });
  
  const shelfData = Object.values(shelfMap);
  
  return {
    overallStats: {
      totalPickups: windowShoppedEvents.length,
      totalPurchases: purchasedEvents.length,
      totalReturns: abandonedEvents.length,
      conversionRate,
      totalRevenue: totalRevenue.toFixed(2),
      activeUsers
    },
    shelfData,
    hourlyTrend,
    categoryData,
    timestamp: new Date().toISOString()
  };
};

/**
 * Fetch analytics for a specific shelf
 */
export const fetchShelfAnalytics = async (shelfId) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const now = Date.now();
  const last24h = now - 24 * 3600000;
  const shelfEvents = mockEvents.filter(e => 
    e.properties.shelfId === shelfId && 
    new Date(e.timestamp) > last24h
  );
  
  const pickups = shelfEvents.filter(e => e.eventType === 'WINDOW_SHOPPED').length;
  const purchases = shelfEvents.filter(e => e.eventType === 'PRODUCT_PURCHASED').length;
  const abandoned = shelfEvents.filter(e => e.eventType === 'CART_ABANDONED').length;
  const revenue = shelfEvents
    .filter(e => e.eventType === 'PRODUCT_PURCHASED')
    .reduce((sum, e) => sum + (e.properties.revenue || 0), 0);
  
  const uniqueUsers = [...new Set(shelfEvents.map(e => e.userId))];
  const avgDwell = shelfEvents
    .filter(e => e.properties.dwellTime)
    .reduce((sum, e, _, arr) => sum + (e.properties.dwellTime || 0) / arr.length, 0);
  
  // Hourly data
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hourStart = now - (23 - i) * 3600000;
    const hourEnd = hourStart + 3600000;
    const hourEvents = shelfEvents.filter(e => {
      const time = new Date(e.timestamp).getTime();
      return time >= hourStart && time < hourEnd;
    });
    
    return {
      hour: new Date(hourStart).getHours(),
      pickups: hourEvents.filter(e => e.eventType === 'WINDOW_SHOPPED').length,
      purchases: hourEvents.filter(e => e.eventType === 'PRODUCT_PURCHASED').length
    };
  });
  
  const peakHour = hourlyData.reduce((max, curr) => 
    curr.pickups > max.pickups ? curr : max
  );
  
  // Product performance
  const productMap = {};
  shelfEvents.forEach(event => {
    const sku = event.properties.sku;
    const product = event.properties.product;
    
    if (!productMap[sku]) {
      productMap[sku] = {
        sku,
        name: product,
        pickups: 0,
        purchases: 0
      };
    }
    
    if (event.eventType === 'WINDOW_SHOPPED') productMap[sku].pickups++;
    if (event.eventType === 'PRODUCT_PURCHASED') productMap[sku].purchases++;
  });
  
  const products = Object.values(productMap)
    .map(p => ({
      ...p,
      conversionRate: p.pickups > 0 ? ((p.purchases / p.pickups) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 5);
  
  // User interactions
  const userMap = {};
  shelfEvents.forEach(event => {
    if (!userMap[event.userId]) {
      userMap[event.userId] = {
        userId: event.userId,
        actions: [],
        lastSeen: event.timestamp,
        totalActions: 0
      };
    }
    
    userMap[event.userId].actions.push({
      event: event.eventType,
      time: event.timestamp
    });
    userMap[event.userId].totalActions++;
    
    if (new Date(event.timestamp) > new Date(userMap[event.userId].lastSeen)) {
      userMap[event.userId].lastSeen = event.timestamp;
    }
  });
  
  const users = Object.values(userMap)
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    .slice(0, 20);
  
  return {
    stats: {
      totalPickups: pickups,
      totalPurchases: purchases,
      totalReturns: abandoned,
      conversionRate: pickups > 0 ? ((purchases / pickups) * 100).toFixed(1) : '0.0',
      totalRevenue: revenue.toFixed(2),
      uniqueUsers: uniqueUsers.length,
      averageDwellTime: Math.round(avgDwell)
    },
    hourlyData,
    peakHour,
    products,
    users,
    timestamp: new Date().toISOString()
  };
};

/**
 * Fetch real-time event stream for a shelf
 */
export const fetchRealtimeEvents = async (shelfId) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const now = Date.now();
  const last30min = now - 30 * 60000;
  
  const recentEvents = mockEvents
    .filter(e => e.properties.shelfId === shelfId && new Date(e.timestamp) > last30min)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20)
    .map(e => ({
      ...e,
      minutesAgo: Math.floor((now - new Date(e.timestamp).getTime()) / 60000)
    }));
  
  return recentEvents;
};

/**
 * Fetch product-specific funnel data for a user
 * @param {string} userId - User ID to track
 * @param {string} productSku - Product SKU to track
 */
export const fetchProductFunnel = async (userId = null, productSku = null) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  let relevantEvents = mockEvents;
  
  if (userId) {
    relevantEvents = relevantEvents.filter(e => e.userId === userId);
  }
  
  if (productSku) {
    relevantEvents = relevantEvents.filter(e => e.properties.sku === productSku);
  }
  
  const windowShopped = relevantEvents.filter(e => e.eventType === 'WINDOW_SHOPPED').length;
  const cartAbandoned = relevantEvents.filter(e => e.eventType === 'CART_ABANDONED').length;
  const productPurchased = relevantEvents.filter(e => e.eventType === 'PRODUCT_PURCHASED').length;
  
  // Calculate conversion rates
  const abandonRate = windowShopped > 0 ? ((cartAbandoned / windowShopped) * 100).toFixed(1) : 0;
  const purchaseRate = windowShopped > 0 ? ((productPurchased / windowShopped) * 100).toFixed(1) : 0;
  
  return {
    funnel: [
      { 
        stage: 'Window Shopped', 
        count: windowShopped, 
        percentage: 100,
        color: '#3b82f6'
      },
      { 
        stage: 'Cart Abandoned', 
        count: cartAbandoned, 
        percentage: parseFloat(abandonRate),
        color: '#ef4444'
      },
      { 
        stage: 'Product Purchased', 
        count: productPurchased, 
        percentage: parseFloat(purchaseRate),
        color: '#10b981'
      }
    ],
    stats: {
      totalViews: windowShopped,
      totalAbandoned: cartAbandoned,
      totalPurchased: productPurchased,
      conversionRate: purchaseRate,
      abandonmentRate: abandonRate
    }
  };
};

/**
 * Get all unique users who interacted with products
 */
export const getUniqueUsers = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const users = [...new Set(mockEvents.map(e => e.userId))];
  return users;
};

/**
 * Get all unique product SKUs
 */
export const getUniqueProducts = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const products = [...new Set(mockEvents.map(e => e.properties.sku))]
    .map(sku => {
      const event = mockEvents.find(e => e.properties.sku === sku);
      return {
        sku,
        name: event?.properties.product,
        type: event?.properties.productType
      };
    });
  
  return products;
};

/**
 * Fetch Sankey chart data for event flow visualization
 * Shows: Total Views → Products → Events per Product
 */
export const fetchSankeyData = async () => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const now = Date.now();
  const last24h = now - 24 * 3600000;
  const recentEvents = mockEvents.filter(e => new Date(e.timestamp) > last24h);
  
  const products = ['Phone', 'Bottle'];
  
  // Calculate totals for each product and event type
  const productStats = {};
  
  products.forEach(productName => {
    const productEvents = recentEvents.filter(e => 
      e.properties.product === productName || 
      (productName === 'Bottle' && e.properties.product === 'Bottle')
    );
    
    productStats[productName] = {
      windowShopped: productEvents.filter(e => e.eventType === 'WINDOW_SHOPPED').length,
      cartAbandoned: productEvents.filter(e => e.eventType === 'CART_ABANDONED').length,
      purchased: productEvents.filter(e => e.eventType === 'PRODUCT_PURCHASED').length,
      total: productEvents.length
    };
  });
  
  // Build Sankey nodes and links
  const nodes = [
    { name: 'Total Views', fill: '#6366f1' }
  ];
  
  // Add product nodes
  products.forEach(product => {
    nodes.push({ name: product, fill: '#8b5cf6' });
  });
  
  // Add event type nodes for each product
  products.forEach(product => {
    nodes.push({ name: `${product} - Window Shopped`, fill: '#3b82f6' });
    nodes.push({ name: `${product} - Cart Abandoned`, fill: '#ef4444' });
    nodes.push({ name: `${product} - Purchased`, fill: '#10b981' });
  });
  
  const links = [];
  
  // Links from Total Views to each product
  products.forEach((product, index) => {
    const total = productStats[product].total;
    if (total > 0) {
      links.push({
        source: 0, // Total Views
        target: index + 1, // Product
        value: total
      });
    }
  });
  
  // Links from each product to its events
  products.forEach((product, productIndex) => {
    const productNodeIndex = productIndex + 1;
    const baseEventIndex = products.length + 1 + (productIndex * 3);
    
    const stats = productStats[product];
    
    if (stats.windowShopped > 0) {
      links.push({
        source: productNodeIndex,
        target: baseEventIndex, // Window Shopped
        value: stats.windowShopped
      });
    }
    
    if (stats.cartAbandoned > 0) {
      links.push({
        source: productNodeIndex,
        target: baseEventIndex + 1, // Cart Abandoned
        value: stats.cartAbandoned
      });
    }
    
    if (stats.purchased > 0) {
      links.push({
        source: productNodeIndex,
        target: baseEventIndex + 2, // Purchased
        value: stats.purchased
      });
    }
  });
  
  return {
    nodes,
    links
  };
};

/**
 * Fetch daily trends data for the Recent Trends chart
 * Returns point-based data over the last 3 days with percentage comparisons
 */
export const fetchDailyTrends = async () => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const now = Date.now();
  const DAY_MS = 24 * 3600000;
  
  // Create point-based data - 10 points per day over 3 days
  const dailyData = [];
  const pointsPerDay = 10;
  const totalPoints = 30; // 10 points per day * 3 days
  const intervalMS = (3 * DAY_MS) / totalPoints;
  
  // Start from Jan 16 (3 days ago)
  const startDate = new Date();
  startDate.setDate(16);
  startDate.setMonth(0); // January
  const startTime = startDate.getTime();
  
  // Generate zigzag data points
  for (let i = 0; i < totalPoints; i++) {
    const pointTime = startTime + (i * intervalMS);
    const date = new Date(pointTime);
    
    // Show date label only at the start of each day
    const isNewDay = i % pointsPerDay === 0;
    const formattedDate = isNewDay ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    
    // Create zigzag pattern with random variations
    const baseWindow = 2 + Math.sin(i * 0.5) * 2 + Math.random() * 2;
    const baseAbandoned = 0 + Math.sin(i * 0.7 + 1) * 1 + Math.random() * 1;
    const basePurchased = 0 + Math.sin(i * 0.3 + 2) * 1 + Math.random() * 1;
    
    dailyData.push({
      date: formattedDate,
      fullDate: date.toISOString().split('T')[0],
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      windowShopped: Math.max(0, Math.round(baseWindow)),
      cartAbandoned: Math.max(0, Math.round(baseAbandoned)),
      purchased: Math.max(0, Math.round(basePurchased))
    });
  }
  
  // Calculate yesterday's total values for metrics
  const yesterdayStart = totalPoints - 20; // Last full day (points 10-20)
  const yesterdayEnd = totalPoints - 10;
  const comparisonStart = 0; // First day (points 0-10)
  const comparisonEnd = 10;
  
  const sumRange = (start, end, field) => {
    return dailyData.slice(start, end).reduce((sum, d) => sum + d[field], 0);
  };
  
  // Calculate totals for yesterday and comparison day
  const yesterdayTotals = {
    windowShopped: sumRange(yesterdayStart, yesterdayEnd, 'windowShopped'),
    cartAbandoned: sumRange(yesterdayStart, yesterdayEnd, 'cartAbandoned'),
    purchased: sumRange(yesterdayStart, yesterdayEnd, 'purchased')
  };
  
  const comparisonTotals = {
    windowShopped: sumRange(comparisonStart, comparisonEnd, 'windowShopped'),
    cartAbandoned: sumRange(comparisonStart, comparisonEnd, 'cartAbandoned'),
    purchased: sumRange(comparisonStart, comparisonEnd, 'purchased')
  };
  
  // Calculate percentage changes
  const calcPercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  // Get date labels for comparison
  const yesterdayDate = dailyData.find((d, i) => i >= yesterdayStart && d.date)?.date || 'Yesterday';
  const comparisonDate = dailyData.find((d, i) => i >= comparisonStart && d.date)?.date || 'N/A';
  
  const metrics = {
    windowShopped: {
      value: yesterdayTotals.windowShopped,
      change: calcPercentChange(yesterdayTotals.windowShopped, comparisonTotals.windowShopped),
      comparisonDate: comparisonDate
    },
    cartAbandoned: {
      value: yesterdayTotals.cartAbandoned,
      change: calcPercentChange(yesterdayTotals.cartAbandoned, comparisonTotals.cartAbandoned),
      comparisonDate: comparisonDate
    },
    purchased: {
      value: yesterdayTotals.purchased,
      change: calcPercentChange(yesterdayTotals.purchased, comparisonTotals.purchased),
      comparisonDate: comparisonDate
    }
  };
  
  return {
    dailyData,
    metrics
  };
};

/**
 * Fetch daily trends data for a specific shelf
 * Returns point-based data over the last 3 days with percentage comparisons
 */
export const fetchShelfDailyTrends = async (shelfId) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const now = Date.now();
  const DAY_MS = 24 * 3600000;
  
  // Create point-based data - 10 points per day over 3 days
  const dailyData = [];
  const pointsPerDay = 10;
  const totalPoints = 30; // 10 points per day * 3 days
  const intervalMS = (3 * DAY_MS) / totalPoints;
  
  // Start from Jan 16 (3 days ago)
  const startDate = new Date();
  startDate.setDate(16);
  startDate.setMonth(0); // January
  const startTime = startDate.getTime();
  
  // Generate zigzag data points specific to this shelf
  for (let i = 0; i < totalPoints; i++) {
    const pointTime = startTime + (i * intervalMS);
    const date = new Date(pointTime);
    
    // Show date label only at the start of each day
    const isNewDay = i % pointsPerDay === 0;
    const formattedDate = isNewDay ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    
    // Create zigzag pattern with random variations (scaled down for individual shelf)
    const baseWindow = 1 + Math.sin(i * 0.5) * 1.5 + Math.random() * 1.5;
    const basePurchased = 0 + Math.sin(i * 0.3 + 2) * 0.8 + Math.random() * 0.8;
    
    dailyData.push({
      date: formattedDate,
      fullDate: date.toISOString().split('T')[0],
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      pickups: Math.max(0, Math.round(baseWindow)),
      purchases: Math.max(0, Math.round(basePurchased))
    });
  }
  
  // Calculate yesterday's total values for metrics
  const yesterdayStart = totalPoints - 20; // Last full day (points 10-20)
  const yesterdayEnd = totalPoints - 10;
  const comparisonStart = 0; // First day (points 0-10)
  const comparisonEnd = 10;
  
  const sumRange = (start, end, field) => {
    return dailyData.slice(start, end).reduce((sum, d) => sum + d[field], 0);
  };
  
  // Calculate totals for yesterday and comparison day
  const yesterdayTotals = {
    pickups: sumRange(yesterdayStart, yesterdayEnd, 'pickups'),
    purchases: sumRange(yesterdayStart, yesterdayEnd, 'purchases')
  };
  
  const comparisonTotals = {
    pickups: sumRange(comparisonStart, comparisonEnd, 'pickups'),
    purchases: sumRange(comparisonStart, comparisonEnd, 'purchases')
  };
  
  // Calculate percentage changes
  const calcPercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  // Get date labels for comparison
  const yesterdayDate = dailyData.find((d, i) => i >= yesterdayStart && d.date)?.date || 'Yesterday';
  const comparisonDate = dailyData.find((d, i) => i >= comparisonStart && d.date)?.date || 'N/A';
  
  const metrics = {
    pickups: {
      value: yesterdayTotals.pickups,
      change: calcPercentChange(yesterdayTotals.pickups, comparisonTotals.pickups),
      comparisonDate: comparisonDate
    },
    purchases: {
      value: yesterdayTotals.purchases,
      change: calcPercentChange(yesterdayTotals.purchases, comparisonTotals.purchases),
      comparisonDate: comparisonDate
    }
  };
  
  return {
    dailyData,
    metrics
  };
};

export default {
  trackEvent,
  fetchOverallAnalytics,
  fetchShelfAnalytics,
  fetchRealtimeEvents,
  fetchProductFunnel,
  getUniqueUsers,
  getUniqueProducts,
  fetchSankeyData,
  fetchDailyTrends,
  fetchShelfDailyTrends
};
