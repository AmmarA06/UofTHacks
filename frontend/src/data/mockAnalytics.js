// Mock Analytics Data Generator for Store Products
// Based on Events: PRODUCT_PURCHASED, PRODUCT_WINDOW_SHOPPED, PRODUCT_ABANDONED

// Generate time series data for the last 30 days based on events
const generateTimeSeriesData = (productType, shelfId = null) => {
  const data = [];
  const baseValue = productType === 'cell_phone' ? 45 : 38;
  const variance = productType === 'cell_phone' ? 15 : 12;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    
    // Weekend boost
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
    
    // Trend (increasing over time)
    const trendMultiplier = 1 + (29 - i) * 0.01;
    
    // Event: PRODUCT_WINDOW_SHOPPED (browsing/viewing)
    const windowShopped = Math.floor(
      (baseValue + Math.random() * variance) * weekendMultiplier * trendMultiplier
    );
    
    // Event: PRODUCT_ABANDONED (window shopped but left without purchasing)
    const abandoned = Math.floor(windowShopped * (0.6 + Math.random() * 0.15));
    
    // Event: PRODUCT_PURCHASED (converted from window shopping)
    const purchased = Math.floor((windowShopped - abandoned) * (0.4 + Math.random() * 0.3));
    
    data.push({
      date: date.toISOString().split('T')[0],
      windowShopped,
      abandoned,
      purchased,
      revenue: purchased * (productType === 'cell_phone' ? 699 : 2.99),
      conversionRate: ((purchased / windowShopped) * 100).toFixed(2),
      abandonmentRate: ((abandoned / windowShopped) * 100).toFixed(2)
    });
  }
  
  return data;
};

// Generate cohort data
const generateCohortData = (productType) => {
  const cohorts = [];
  const months = ['Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'];
  
  months.forEach((month, idx) => {
    const retention = [100];
    for (let i = 1; i < 4 - idx; i++) {
      const lastRetention = retention[i - 1];
      retention.push(Math.max(10, lastRetention * (0.7 + Math.random() * 0.15)));
    }
    
    cohorts.push({
      cohort: month,
      month0: retention[0],
      month1: retention[1] || null,
      month2: retention[2] || null,
      month3: retention[3] || null,
      size: Math.floor(80 + Math.random() * 120)
    });
  });
  
  return cohorts;
};

// Generate funnel data based on events
const generateFunnelData = (productType, shelfId = null) => {
  const baseMultiplier = shelfId ? 0.3 : 1.0;
  
  // PRODUCT_WINDOW_SHOPPED event
  const windowShopped = Math.floor((1200 + Math.random() * 300) * baseMultiplier);
  
  // PRODUCT_ABANDONED event
  const abandoned = Math.floor(windowShopped * (0.55 + Math.random() * 0.15));
  
  // Continued shopping (didn't abandon yet)
  const continued = windowShopped - abandoned;
  
  // PRODUCT_PURCHASED event
  const purchased = Math.floor(continued * (0.6 + Math.random() * 0.2));
  
  return [
    { stage: 'Window Shopped', count: windowShopped, percentage: 100, event: 'PRODUCT_WINDOW_SHOPPED' },
    { stage: 'Abandoned', count: abandoned, percentage: ((abandoned / windowShopped) * 100).toFixed(1), event: 'PRODUCT_ABANDONED' },
    { stage: 'Continued', count: continued, percentage: ((continued / windowShopped) * 100).toFixed(1), event: null },
    { stage: 'Purchased', count: purchased, percentage: ((purchased / windowShopped) * 100).toFixed(1), event: 'PRODUCT_PURCHASED' }
  ];
};

// Generate churn data
const generateChurnData = (productType) => {
  const data = [];
  const baseChurnRate = productType === 'cell_phone' ? 8 : 12;
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    const seasonalFactor = [1.2, 1.3, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.4][date.getMonth()];
    
    data.push({
      month: monthName,
      churnRate: (baseChurnRate + Math.random() * 5) * seasonalFactor,
      newCustomers: Math.floor(40 + Math.random() * 30),
      returningCustomers: Math.floor(60 + Math.random() * 40)
    });
  }
  
  return data;
};

// Generate comparison data between products
const generateComparisonData = () => {
  const metrics = ['Sales', 'Revenue', 'Conversion', 'Avg Order Value', 'Views'];
  
  return metrics.map(metric => {
    const phoneBase = 100;
    const bottleMultiplier = metric === 'Revenue' || metric === 'Avg Order Value' ? 0.02 : 0.85;
    
    return {
      metric,
      cell_phone: phoneBase + Math.random() * 20,
      water_bottle: (phoneBase * bottleMultiplier) + Math.random() * 15
    };
  });
};

// Generate shelf-specific performance data
const generateShelfPerformance = (shelves) => {
  return shelves.map(shelf => {
    const productType = shelf.metadata.productType;
    const stockLevel = shelf.metadata.count || 0;
    const maxStock = 50;
    
    const stockPercentage = (stockLevel / maxStock) * 100;
    const salesVelocity = Math.floor(5 + Math.random() * 15);
    const conversionRate = (8 + Math.random() * 12).toFixed(1);
    const revenue = Math.floor((productType === 'cell_phone' ? 15000 : 250) + Math.random() * 5000);
    
    return {
      shelfId: shelf.id,
      label: shelf.label,
      productType,
      stockLevel,
      stockPercentage,
      salesVelocity,
      conversionRate: parseFloat(conversionRate),
      revenue,
      status: stockPercentage > 50 ? 'healthy' : stockPercentage > 20 ? 'low' : 'critical'
    };
  });
};

// Generate product mix data
const generateProductMix = (shelves) => {
  const productCounts = {
    cell_phone: 0,
    water_bottle: 0
  };
  
  shelves.forEach(shelf => {
    const type = shelf.metadata.productType;
    if (productCounts.hasOwnProperty(type)) {
      productCounts[type]++;
    }
  });
  
  return [
    { 
      name: 'Cell Phones', 
      value: productCounts.cell_phone, 
      revenue: productCounts.cell_phone * 45000,
      color: '#3b82f6' 
    },
    { 
      name: 'Water Bottles', 
      value: productCounts.water_bottle, 
      revenue: productCounts.water_bottle * 3500,
      color: '#10b981' 
    }
  ];
};

// Generate hourly traffic patterns
const generateHourlyTraffic = (productType) => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const isPeakHour = (i >= 11 && i <= 14) || (i >= 17 && i <= 20);
    const baseTraffic = isPeakHour ? 60 : 25;
    
    hours.push({
      hour: `${i.toString().padStart(2, '0')}:00`,
      traffic: Math.floor(baseTraffic + Math.random() * 20),
      sales: Math.floor((isPeakHour ? 15 : 5) + Math.random() * 10)
    });
  }
  
  return hours;
};

// Generate customer segment data
const generateCustomerSegments = (productType) => {
  const segments = [
    { segment: 'New Visitors', count: 450, avgSpend: 45, conversionRate: 2.3 },
    { segment: 'Returning Customers', count: 320, avgSpend: 125, conversionRate: 18.5 },
    { segment: 'VIP Customers', count: 85, avgSpend: 450, conversionRate: 45.2 },
    { segment: 'At-Risk', count: 120, avgSpend: 15, conversionRate: 5.1 }
  ];
  
  return segments;
};

// Generate customer journey flow data (for Sankey/flow chart)
const generateCustomerFlow = (productType) => {
  const baseWindowShop = 1000;
  const windowShopped = baseWindowShop + Math.floor(Math.random() * 200);
  
  // High abandonment suggests pricing or value issues
  const abandonmentRate = productType === 'cell_phone' ? 0.55 : 0.65; // Higher for water bottles
  const abandoned = Math.floor(windowShopped * abandonmentRate);
  const continued = windowShopped - abandoned;
  
  const purchased = Math.floor(continued * 0.7);
  const abandonedLater = continued - purchased;
  
  return {
    nodes: [
      { id: 'window_shop', label: 'Window Shopped', value: windowShopped },
      { id: 'abandoned_early', label: 'Abandoned Early', value: abandoned },
      { id: 'continued', label: 'Continued Browsing', value: continued },
      { id: 'purchased', label: 'Purchased', value: purchased },
      { id: 'abandoned_late', label: 'Abandoned Late', value: abandonedLater }
    ],
    links: [
      { source: 'window_shop', target: 'abandoned_early', value: abandoned, label: 'PRODUCT_ABANDONED' },
      { source: 'window_shop', target: 'continued', value: continued },
      { source: 'continued', target: 'purchased', value: purchased, label: 'PRODUCT_PURCHASED' },
      { source: 'continued', target: 'abandoned_late', value: abandonedLater, label: 'PRODUCT_ABANDONED' }
    ],
    insights: generateFlowInsights(abandonmentRate, purchased, windowShopped, productType)
  };
};

// Generate actionable insights based on flow data
const generateFlowInsights = (abandonmentRate, purchased, windowShopped, productType) => {
  const insights = [];
  const conversionRate = (purchased / windowShopped) * 100;
  
  // High abandonment rate insights
  if (abandonmentRate > 0.6) {
    insights.push({
      type: 'critical',
      title: 'High Abandonment Rate',
      message: `${(abandonmentRate * 100).toFixed(0)}% of window shoppers abandon without purchasing`,
      recommendations: [
        'Consider reducing price by 10-15%',
        'Add promotional offers or bundles',
        'Improve product descriptions and images',
        'Offer limited-time discounts'
      ]
    });
  }
  
  if (abandonmentRate > 0.5 && abandonmentRate <= 0.6) {
    insights.push({
      type: 'warning',
      title: 'Moderate Abandonment',
      message: `${(abandonmentRate * 100).toFixed(0)}% abandonment suggests some friction in purchase decision`,
      recommendations: [
        'A/B test pricing strategies',
        'Add customer reviews and social proof',
        'Highlight value propositions',
        'Consider "Buy Now, Pay Later" options'
      ]
    });
  }
  
  // Low conversion insights
  if (conversionRate < 20) {
    insights.push({
      type: 'warning',
      title: 'Low Conversion Rate',
      message: `Only ${conversionRate.toFixed(1)}% of window shoppers complete purchase`,
      recommendations: [
        'Simplify checkout process',
        'Reduce barriers to purchase',
        'Add urgency indicators (limited stock)',
        'Offer free shipping or returns'
      ]
    });
  }
  
  // Product-specific insights
  if (productType === 'cell_phone') {
    insights.push({
      type: 'info',
      title: 'High-Value Product',
      message: 'Cell phones require more consideration before purchase',
      recommendations: [
        'Provide detailed specifications',
        'Offer comparison tools',
        'Add financing options',
        'Highlight warranty and support'
      ]
    });
  } else {
    insights.push({
      type: 'info',
      title: 'Impulse Purchase Item',
      message: 'Water bottles are typically impulse buys - high abandonment suggests opportunity',
      recommendations: [
        'Lower price point for quick decisions',
        'Place near checkout areas',
        'Bundle with other products',
        'Emphasize immediate utility'
      ]
    });
  }
  
  return insights;
};

// Main export object
export const mockAnalytics = {
  // Time series data
  getTimeSeriesData: (productType, shelfId = null) => generateTimeSeriesData(productType, shelfId),
  
  // Funnel data
  getFunnelData: (productType, shelfId = null) => generateFunnelData(productType, shelfId),
  
  // Cohort analysis
  getCohortData: (productType) => generateCohortData(productType),
  
  // Churn analysis
  getChurnData: (productType) => generateChurnData(productType),
  
  // Product comparison
  getComparisonData: () => generateComparisonData(),
  
  // Shelf performance
  getShelfPerformance: (shelves) => generateShelfPerformance(shelves),
  
  // Product mix
  getProductMix: (shelves) => generateProductMix(shelves),
  
  // Hourly traffic
  getHourlyTraffic: (productType) => generateHourlyTraffic(productType),
  
  // Customer segments
  getCustomerSegments: (productType) => generateCustomerSegments(productType),
  
  // Customer journey flow
  getCustomerFlow: (productType) => generateCustomerFlow(productType),
  
  // Summary stats
  getSummaryStats: (productType, shelves = null) => {
    const timeSeriesData = generateTimeSeriesData(productType);
    const totalWindowShopped = timeSeriesData.reduce((sum, d) => sum + d.windowShopped, 0);
    const totalAbandoned = timeSeriesData.reduce((sum, d) => sum + d.abandoned, 0);
    const totalPurchased = timeSeriesData.reduce((sum, d) => sum + d.purchased, 0);
    const totalRevenue = timeSeriesData.reduce((sum, d) => sum + d.revenue, 0);
    
    return {
      totalWindowShopped,
      totalAbandoned,
      totalPurchased,
      totalRevenue,
      conversionRate: ((totalPurchased / totalWindowShopped) * 100).toFixed(2),
      abandonmentRate: ((totalAbandoned / totalWindowShopped) * 100).toFixed(2),
      averageOrderValue: (totalRevenue / totalPurchased).toFixed(2),
      growth: (12.5 + Math.random() * 10).toFixed(1)
    };
  }
};
