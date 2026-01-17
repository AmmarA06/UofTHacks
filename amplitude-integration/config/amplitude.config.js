/**
 * =====================================================
 * AMPLITUDE SHARED CONFIGURATION
 * =====================================================
 * 
 * Central configuration file for all Amplitude integrations.
 * This config is used by both browser and server implementations.
 * 
 * Environment Variables Required:
 * - AMPLITUDE_API_KEY: Your Amplitude project API key
 * - AMPLITUDE_SERVER_ZONE: (optional) 'US' or 'EU', defaults to 'US'
 * 
 * Usage:
 *   Browser: import { AmplitudeConfig } from './config/amplitude.config.js'
 *   Node.js: const { AmplitudeConfig } = require('./config/amplitude.config.js')
 */

// Try to load from environment (works in Node.js, Vite, Next.js, etc.)
const getEnvVar = (key, defaultValue = '') => {
  // Browser: Vite uses VITE_ prefix
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || import.meta.env[`VITE_${key}`] || defaultValue;
  }
  // Node.js
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  // Fallback
  return defaultValue;
};

export const AmplitudeConfig = {
  /**
   * API Keys
   */
  apiKey: getEnvVar('AMPLITUDE_API_KEY', ''),
  
  /**
   * Server Zone: 'US' or 'EU'
   * Determines which Amplitude endpoint to use
   */
  serverZone: getEnvVar('AMPLITUDE_SERVER_ZONE', 'US'),
  
  /**
   * Project Configuration
   */
  projectName: 'ShelfSense',
  
  /**
   * SDK Options
   */
  options: {
    // Track sessions automatically
    defaultTracking: {
      sessions: true,
      pageViews: false, // We'll track manually for better control
      formInteractions: false,
      fileDownloads: false
    },
    
    // Minimum time between events (ms) to prevent spam
    minTimeBetweenSessionsMillis: 30 * 60 * 1000, // 30 minutes
    
    // Device ID management
    deviceIdFromUrlParam: false,
    
    // User privacy
    optOut: false,
    
    // Flush events periodically
    flushIntervalMillis: 1000,
    flushQueueSize: 30,
    
    // Retry failed events
    logLevel: getEnvVar('NODE_ENV') === 'production' ? 'WARN' : 'DEBUG',
  },
  
  /**
   * Event Configuration
   */
  events: {
    // Product interaction events
    PRODUCT_VIEWED: 'PRODUCT_VIEWED',
    PRODUCT_WINDOW_SHOPPED: 'PRODUCT_WINDOW_SHOPPED',
    PRODUCT_CART_ABANDONED: 'PRODUCT_CART_ABANDONED',
    PRODUCT_PURCHASED: 'PRODUCT_PURCHASED',
    PRODUCT_ADDED_TO_CART: 'PRODUCT_ADDED_TO_CART',
    
    // Dashboard events (for future React dashboard)
    DASHBOARD_VIEWED: 'DASHBOARD_VIEWED',
    CHART_INTERACTED: 'CHART_INTERACTED',
    FILTER_APPLIED: 'FILTER_APPLIED',
    EXPORT_TRIGGERED: 'EXPORT_TRIGGERED',
    
    // Agent events (for future AI agent features)
    AGENT_QUERY_SENT: 'AGENT_QUERY_SENT',
    AGENT_RESPONSE_RECEIVED: 'AGENT_RESPONSE_RECEIVED',
    AGENT_ACTION_EXECUTED: 'AGENT_ACTION_EXECUTED',
    
    // Experiment events
    EXPERIMENT_VIEWED: 'EXPERIMENT_VIEWED',
    EXPERIMENT_CONVERTED: 'EXPERIMENT_CONVERTED',
  },
  
  /**
   * Product Catalog
   * Centralized product definitions
   */
  products: {
    water_bottle: {
      id: 'water_bottle',
      sku: 'BOTTLE-001',
      name: 'Water Bottle',
      category: 'water_bottle',
      basePrice: 24.99
    },
    phone: {
      id: 'phone',
      sku: 'PHONE-001',
      name: 'Phone',
      category: 'phone',
      basePrice: 999.99
    },
    apple: {
      id: 'apple',
      sku: 'FRUIT-001',
      name: 'Apple',
      category: 'fruit',
      basePrice: 1.49
    }
  },
  
  /**
   * User Properties
   * Standard user properties to track
   */
  userProperties: {
    USER_TYPE: 'user_type', // 'customer', 'admin', 'analyst'
    DEVICE_TYPE: 'device_type',
    BROWSER: 'browser',
    OS: 'os',
  },
  
  /**
   * Validation
   */
  isConfigured() {
    return this.apiKey && this.apiKey.length > 0;
  },
  
  /**
   * Get API Key with validation
   */
  getApiKey() {
    if (!this.isConfigured()) {
      console.error('[AmplitudeConfig] AMPLITUDE_API_KEY not configured! Set it in your .env file.');
      return null;
    }
    return this.apiKey;
  }
};

// CommonJS export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AmplitudeConfig };
}

export default AmplitudeConfig;
