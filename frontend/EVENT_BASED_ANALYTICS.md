# Event-Based Analytics Implementation

## Overview

The analytics system has been updated to use **event-based tracking** with three core events:
- `PRODUCT_WINDOW_SHOPPED` - When a customer views/browses a product
- `PRODUCT_ABANDONED` - When a customer leaves without purchasing
- `PRODUCT_PURCHASED` - When a customer completes a purchase

## New Components

### Customer Flow Chart (Compass/Sankey-style Visualization)

Located in: `src/components/analytics/CustomerFlowChart.jsx`

**Features:**
- Visual flow diagram showing customer journey
- Splits into two paths:
  1. **Early Abandonment**: Window shopped → Abandoned immediately
  2. **Continued Browsing**: Window shopped → Continued → (Purchased OR Abandoned late)
- Real-time event counts and percentages
- Color-coded stages (Blue=Window Shop, Red=Abandon, Purple=Purchase)

**Actionable Insights System:**
The flow chart includes an intelligent insights engine that analyzes abandonment patterns and provides:

1. **High Abandonment Rate (>60%)**
   - Critical alert
   - Recommendations: Price reduction (10-15%), promotional offers, improve product descriptions

2. **Moderate Abandonment (50-60%)**
   - Warning alert
   - Recommendations: A/B test pricing, add reviews, highlight value props

3. **Low Conversion (<20%)**
   - Warning alert
   - Recommendations: Simplify checkout, reduce barriers, add urgency indicators

4. **Product-Specific Insights**
   - Cell Phones: High-value product considerations, financing options
   - Water Bottles: Impulse buy optimization, lower price points

### Updated Components

#### 1. **SalesChart.jsx**
- Now displays: Window Shopped (blue), Abandoned (red), Purchased (purple)
- Event labels included at bottom
- Changed from generic "Views" to specific events

#### 2. **CohortAnalysis.jsx**
- Integrated Customer Flow Chart at the top
- Shows journey flow BEFORE cohort retention table
- Combined view: Flow → Retention analysis

#### 3. **FunnelChart.jsx**
- Updated to reflect event-based funnel
- Stages: Window Shopped → Abandoned → Continued → Purchased
- Event badges displayed at top

#### 4. **ShelfAnalytics.jsx**
- Added 4th KPI card for "Abandoned" count
- Updated all labels to reflect events
- Pass flow data to Cohorts tab
- Window Shopped, Purchased, Abandoned, Conversion Rate

## Data Structure Changes

### Time Series Data
```javascript
{
  date: "2026-01-17",
  windowShopped: 52,        // PRODUCT_WINDOW_SHOPPED
  abandoned: 32,            // PRODUCT_ABANDONED
  purchased: 15,            // PRODUCT_PURCHASED
  revenue: 10485,
  conversionRate: "28.85",
  abandonmentRate: "61.54"
}
```

### Funnel Data
```javascript
[
  { 
    stage: 'Window Shopped', 
    count: 1200, 
    percentage: 100, 
    event: 'PRODUCT_WINDOW_SHOPPED' 
  },
  { 
    stage: 'Abandoned', 
    count: 660, 
    percentage: 55, 
    event: 'PRODUCT_ABANDONED' 
  },
  { 
    stage: 'Continued', 
    count: 540, 
    percentage: 45 
  },
  { 
    stage: 'Purchased', 
    count: 378, 
    percentage: 31.5, 
    event: 'PRODUCT_PURCHASED' 
  }
]
```

### Customer Flow Data
```javascript
{
  nodes: [
    { id: 'window_shop', label: 'Window Shopped', value: 1000 },
    { id: 'abandoned_early', label: 'Abandoned Early', value: 550 },
    { id: 'continued', label: 'Continued Browsing', value: 450 },
    { id: 'purchased', label: 'Purchased', value: 315 },
    { id: 'abandoned_late', label: 'Abandoned Late', value: 135 }
  ],
  links: [
    { source: 'window_shop', target: 'abandoned_early', value: 550, label: 'PRODUCT_ABANDONED' },
    { source: 'window_shop', target: 'continued', value: 450 },
    { source: 'continued', target: 'purchased', value: 315, label: 'PRODUCT_PURCHASED' },
    { source: 'continued', target: 'abandoned_late', value: 135, label: 'PRODUCT_ABANDONED' }
  ],
  insights: [
    {
      type: 'critical',
      title: 'High Abandonment Rate',
      message: '65% of window shoppers abandon without purchasing',
      recommendations: [
        'Consider reducing price by 10-15%',
        'Add promotional offers or bundles',
        ...
      ]
    }
  ]
}
```

## Summary Statistics

Updated to include:
- `totalWindowShopped` - Total PRODUCT_WINDOW_SHOPPED events
- `totalAbandoned` - Total PRODUCT_ABANDONED events
- `totalPurchased` - Total PRODUCT_PURCHASED events
- `abandonmentRate` - Percentage of window shoppers who abandoned
- `conversionRate` - Percentage of window shoppers who purchased

## Key Insights Generated

### For Water Bottles (High Abandonment ~65%)
- **Critical**: High abandonment suggests pricing too high for impulse buy
- **Recommendations**: 
  - Lower price point
  - Bundle with other products
  - Place near checkout
  - Emphasize immediate utility

### For Cell Phones (Moderate Abandonment ~55%)
- **Warning**: Moderate abandonment expected for high-value items
- **Recommendations**:
  - Provide detailed specs
  - Offer comparison tools
  - Add financing options
  - Highlight warranty

## Usage

### Per-Shelf Analytics
1. Click on any shelf in the 3D store
2. Click "View Shelf Analytics"
3. Navigate to "Cohorts" tab
4. See Customer Flow Chart with insights + Cohort retention

### Overview Analytics
1. Click "View Analytics" in bottom-left
2. All event-based metrics throughout dashboard
3. Flow visualization available in product-specific views

## Testing

All analytics now use event-based mock data with:
- Realistic abandonment rates (55-65%)
- Conversion rates (20-35%)
- Weekend traffic boosts
- Growth trends over 30 days
- Product-specific patterns

## Color Scheme

- **Blue (#3b82f6)**: PRODUCT_WINDOW_SHOPPED
- **Red (#ef4444)**: PRODUCT_ABANDONED
- **Purple (#8b5cf6)**: PRODUCT_PURCHASED
- **Green (#10b981)**: Continued/Positive actions
- **Orange (#f97316)**: Late abandonment

## Next Steps

To integrate with real Amplitude events:
1. Replace `mockAnalytics` calls with actual Amplitude queries
2. Map Amplitude event names to: `PRODUCT_WINDOW_SHOPPED`, `PRODUCT_ABANDONED`, `PRODUCT_PURCHASED`
3. Add user properties and event properties as needed
4. Implement real-time event streaming for live updates
