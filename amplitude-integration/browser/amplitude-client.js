/**
 * =====================================================
 * AMPLITUDE BROWSER CLIENT
 * =====================================================
 * 
 * Centralized Amplitude SDK initialization for browser/frontend apps.
 * Provides a simple API for initializing and using Amplitude across
 * multiple frontend applications.
 * 
 * Usage:
 * 
 * // In your HTML:
 * <script type="module">
 *   import { AmplitudeClient } from './amplitude-integration/browser/amplitude-client.js';
 *   
 *   // Initialize once in your app
 *   AmplitudeClient.init({
 *     apiKey: 'your-api-key',
 *     userId: 'user-123' // optional
 *   });
 *   
 *   // Track events anywhere
 *   AmplitudeClient.track('BUTTON_CLICKED', { buttonName: 'signup' });
 * </script>
 * 
 * Or use the hooks for specific features:
 * - ecommerce-hooks.js: Product tracking
 * - dashboard-hooks.js: Analytics dashboard tracking
 * - experiment-hooks.js: A/B testing & feature flags
 */

import { AmplitudeConfig } from '../config/amplitude.config.js';

/**
 * AmplitudeClient - Singleton wrapper for Amplitude Browser SDK
 */
class AmplitudeBrowserClient {
  constructor() {
    this.isInitialized = false;
    this.amplitude = null;
    this.userId = null;
    this.sessionId = null;
  }

  /**
   * Initialize Amplitude SDK
   * 
   * @param {Object} options - Initialization options
   * @param {string} options.apiKey - Amplitude API key (optional, reads from config)
   * @param {string} options.userId - User identifier (optional)
   * @param {Object} options.userProperties - Initial user properties (optional)
   * @param {Object} options.sdkOptions - Override SDK options (optional)
   * @returns {Promise<boolean>} - Returns true if initialization successful
   */
  async init(options = {}) {
    if (this.isInitialized) {
      console.warn('[AmplitudeClient] Already initialized');
      return true;
    }

    // Check if Amplitude SDK is loaded
    if (typeof window === 'undefined' || !window.amplitude) {
      console.error('[AmplitudeClient] Amplitude SDK not found! Make sure to include the Amplitude script in your HTML.');
      console.error('Add this to your <head>: <script src="https://cdn.amplitude.com/libs/analytics-browser-2.3.8-min.js.gz"></script>');
      return false;
    }

    // Get API key from options or config
    const apiKey = options.apiKey || AmplitudeConfig.getApiKey();
    
    if (!apiKey) {
      console.error('[AmplitudeClient] No API key provided. Set AMPLITUDE_API_KEY in .env or pass apiKey to init()');
      return false;
    }

    try {
      // Initialize the SDK
      this.amplitude = window.amplitude;
      
      // Merge options with defaults
      const sdkOptions = {
        ...AmplitudeConfig.options,
        ...(options.sdkOptions || {})
      };

      // Initialize
      await this.amplitude.init(apiKey, options.userId, sdkOptions);
      
      this.isInitialized = true;
      this.userId = options.userId || null;

      console.log('[AmplitudeClient] ✓ Initialized successfully', {
        project: AmplitudeConfig.projectName,
        userId: this.userId,
        sessionId: await this.getSessionId()
      });

      // Set initial user properties if provided
      if (options.userProperties) {
        this.setUserProperties(options.userProperties);
      }

      return true;
    } catch (error) {
      console.error('[AmplitudeClient] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Track an event
   * 
   * @param {string} eventName - Event name (use AmplitudeConfig.events constants)
   * @param {Object} eventProperties - Event properties
   */
  track(eventName, eventProperties = {}) {
    if (!this.isInitialized || !this.amplitude) {
      console.warn('[AmplitudeClient] Not initialized. Call init() first.');
      return;
    }

    try {
      this.amplitude.track(eventName, eventProperties);
      console.log(`[AmplitudeClient] Tracked: ${eventName}`, eventProperties);
    } catch (error) {
      console.error('[AmplitudeClient] Track error:', error);
    }
  }

  /**
   * Identify a user
   * 
   * @param {string} userId - User identifier
   * @param {Object} userProperties - User properties (optional)
   */
  identify(userId, userProperties = {}) {
    if (!this.isInitialized || !this.amplitude) {
      console.warn('[AmplitudeClient] Not initialized. Call init() first.');
      return;
    }

    try {
      this.userId = userId;
      
      const identifyEvent = new this.amplitude.Identify();
      
      // Set user properties
      Object.entries(userProperties).forEach(([key, value]) => {
        identifyEvent.set(key, value);
      });

      this.amplitude.setUserId(userId);
      this.amplitude.identify(identifyEvent);
      
      console.log(`[AmplitudeClient] Identified user: ${userId}`, userProperties);
    } catch (error) {
      console.error('[AmplitudeClient] Identify error:', error);
    }
  }

  /**
   * Set user properties
   * 
   * @param {Object} properties - User properties to set
   */
  setUserProperties(properties) {
    if (!this.isInitialized || !this.amplitude) {
      console.warn('[AmplitudeClient] Not initialized. Call init() first.');
      return;
    }

    try {
      const identifyEvent = new this.amplitude.Identify();
      
      Object.entries(properties).forEach(([key, value]) => {
        identifyEvent.set(key, value);
      });

      this.amplitude.identify(identifyEvent);
      console.log('[AmplitudeClient] User properties set:', properties);
    } catch (error) {
      console.error('[AmplitudeClient] Set user properties error:', error);
    }
  }

  /**
   * Get current session ID
   * 
   * @returns {Promise<number|null>} - Session ID
   */
  async getSessionId() {
    if (!this.isInitialized || !this.amplitude) {
      return null;
    }

    try {
      const session = await this.amplitude.getSessionId();
      this.sessionId = session;
      return session;
    } catch (error) {
      console.error('[AmplitudeClient] Get session ID error:', error);
      return null;
    }
  }

  /**
   * Get current device ID
   * 
   * @returns {Promise<string|null>} - Device ID
   */
  async getDeviceId() {
    if (!this.isInitialized || !this.amplitude) {
      return null;
    }

    try {
      return await this.amplitude.getDeviceId();
    } catch (error) {
      console.error('[AmplitudeClient] Get device ID error:', error);
      return null;
    }
  }

  /**
   * Flush events immediately (useful before page unload)
   */
  async flush() {
    if (!this.isInitialized || !this.amplitude) {
      return;
    }

    try {
      await this.amplitude.flush();
      console.log('[AmplitudeClient] Events flushed');
    } catch (error) {
      console.error('[AmplitudeClient] Flush error:', error);
    }
  }

  /**
   * Reset user & device (e.g., on logout)
   */
  reset() {
    if (!this.isInitialized || !this.amplitude) {
      return;
    }

    try {
      this.amplitude.reset();
      this.userId = null;
      this.sessionId = null;
      console.log('[AmplitudeClient] Reset complete');
    } catch (error) {
      console.error('[AmplitudeClient] Reset error:', error);
    }
  }

  /**
   * Get the raw Amplitude instance (for advanced usage)
   * 
   * @returns {Object|null} - Amplitude SDK instance
   */
  getAmplitudeInstance() {
    return this.amplitude;
  }

  /**
   * Check if initialized
   * 
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.amplitude !== null;
  }
}

// Export singleton instance
export const AmplitudeClient = new AmplitudeBrowserClient();

// Export the class itself for advanced usage
export { AmplitudeBrowserClient };

// Export config for convenience
export { AmplitudeConfig };

// Make available globally (for non-module scripts)
if (typeof window !== 'undefined') {
  window.AmplitudeClient = AmplitudeClient;
  window.AmplitudeConfig = AmplitudeConfig;
}

export default AmplitudeClient;
