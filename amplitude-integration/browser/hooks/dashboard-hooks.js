/**
 * =====================================================
 * AMPLITUDE DASHBOARD HOOKS
 * =====================================================
 * 
 * Analytics tracking for React/Vue/Svelte dashboard applications.
 * Tracks user interactions with charts, filters, and data exports.
 * 
 * Usage:
 * 
 * import { DashboardHooks } from './amplitude-integration/browser/hooks/dashboard-hooks.js';
 * 
 * // Track dashboard view
 * DashboardHooks.trackDashboardView('sales_overview');
 * 
 * // Track chart interaction
 * DashboardHooks.trackChartInteraction('revenue_chart', 'zoom', { timeRange: '30d' });
 * 
 * // Track filter application
 * DashboardHooks.trackFilterApplied({ category: 'electronics', dateRange: 'last_month' });
 * 
 * // Track export
 * DashboardHooks.trackExport('csv', 'sales_report');
 */

import { AmplitudeClient, AmplitudeConfig } from '../amplitude-client.js';

export const DashboardHooks = {
  
  /**
   * Track when a dashboard page is viewed
   * 
   * @param {string} dashboardName - Name/ID of the dashboard
   * @param {Object} properties - Additional properties
   */
  trackDashboardView(dashboardName, properties = {}) {
    AmplitudeClient.track(AmplitudeConfig.events.DASHBOARD_VIEWED, {
      dashboard_name: dashboardName,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  /**
   * Track chart interactions (hover, click, zoom, etc.)
   * 
   * @param {string} chartId - Identifier for the chart
   * @param {string} interactionType - Type: 'hover', 'click', 'zoom', 'pan', 'filter'
   * @param {Object} properties - Additional properties
   */
  trackChartInteraction(chartId, interactionType, properties = {}) {
    AmplitudeClient.track(AmplitudeConfig.events.CHART_INTERACTED, {
      chart_id: chartId,
      interaction_type: interactionType,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  /**
   * Track when filters are applied
   * 
   * @param {Object} filters - Filter values applied
   * @param {Object} properties - Additional properties
   */
  trackFilterApplied(filters, properties = {}) {
    AmplitudeClient.track(AmplitudeConfig.events.FILTER_APPLIED, {
      filters: filters,
      filter_count: Object.keys(filters).length,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  /**
   * Track data export
   * 
   * @param {string} exportType - Format: 'csv', 'excel', 'pdf', 'json'
   * @param {string} dataType - What's being exported: 'sales_report', 'user_data', etc.
   * @param {Object} properties - Additional properties
   */
  trackExport(exportType, dataType, properties = {}) {
    AmplitudeClient.track(AmplitudeConfig.events.EXPORT_TRIGGERED, {
      export_type: exportType,
      data_type: dataType,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  /**
   * Track time spent on dashboard (call on page unload)
   * 
   * @param {string} dashboardName - Dashboard identifier
   * @param {number} timeSpentMs - Time in milliseconds
   */
  trackTimeSpent(dashboardName, timeSpentMs) {
    AmplitudeClient.track('DASHBOARD_TIME_SPENT', {
      dashboard_name: dashboardName,
      time_spent_ms: timeSpentMs,
      time_spent_seconds: Math.round(timeSpentMs / 1000),
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Track dashboard search
   * 
   * @param {string} searchQuery - Search query
   * @param {number} resultsCount - Number of results found
   */
  trackSearch(searchQuery, resultsCount = 0) {
    AmplitudeClient.track('DASHBOARD_SEARCH', {
      search_query: searchQuery,
      results_count: resultsCount,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Track dashboard errors
   * 
   * @param {string} errorType - Type of error
   * @param {string} errorMessage - Error message
   * @param {Object} context - Error context
   */
  trackError(errorType, errorMessage, context = {}) {
    AmplitudeClient.track('DASHBOARD_ERROR', {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
      timestamp: new Date().toISOString()
    });
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.DashboardHooks = DashboardHooks;
}

export default DashboardHooks;
