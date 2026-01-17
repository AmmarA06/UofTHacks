// Mock Analytics Data Generator for Store Products

// Generate time series data for the last 30 days
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
    
    const views = Math.floor(
      (baseValue + Math.random() * variance) * weekendMultiplier * trendMultiplier
    );
    const addToCart = Math.floor(views * (0.15 + Math.random() * 0.1));
    const purchases = Math.floor(addToCart * (0.6 + Math.random() * 0.2));
    
    data.push({
      date: date.toISOString().split('T')[0],
      views,
      addToCart,
      purchases,
      revenue: purchases * (productType === 'cell_phone' ? 699 : 2.99)
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

// Generate funnel data
const generateFunnelData = (productType, shelfId = null) => {
  const baseMultiplier = shelfId ? 0.3 : 1.0;
  
  const views = Math.floor((1200 + Math.random() * 300) * baseMultiplier);
  const productViews = Math.floor(views * (0.4 + Math.random() * 0.1));
  const addToCart = Math.floor(productViews * (0.25 + Math.random() * 0.1));
  const checkout = Math.floor(addToCart * (0.8 + Math.random() * 0.1));
  const purchase = Math.floor(checkout * (0.65 + Math.random() * 0.15));
  
  return [
    { stage: 'Views', count: views, percentage: 100 },
    { stage: 'Product Views', count: productViews, percentage: ((productViews / views) * 100).toFixed(1) },
    { stage: 'Add to Cart', count: addToCart, percentage: ((addToCart / views) * 100).toFixed(1) },
    { stage: 'Checkout', count: checkout, percentage: ((checkout / views) * 100).toFixed(1) },
    { stage: 'Purchase', count: purchase, percentage: ((purchase / views) * 100).toFixed(1) }
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
  
  // Summary stats
  getSummaryStats: (productType, shelves = null) => {
    const timeSeriesData = generateTimeSeriesData(productType);
    const totalViews = timeSeriesData.reduce((sum, d) => sum + d.views, 0);
    const totalPurchases = timeSeriesData.reduce((sum, d) => sum + d.purchases, 0);
    const totalRevenue = timeSeriesData.reduce((sum, d) => sum + d.revenue, 0);
    
    return {
      totalViews,
      totalPurchases,
      totalRevenue,
      conversionRate: ((totalPurchases / totalViews) * 100).toFixed(2),
      averageOrderValue: (totalRevenue / totalPurchases).toFixed(2),
      growth: (12.5 + Math.random() * 10).toFixed(1)
    };
  }
};
