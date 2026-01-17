/**
 * =====================================================
 * AMPLITUDE EXPERIMENT HOOKS
 * =====================================================
 * 
 * A/B testing and feature flag management hooks.
 * Integrates with Amplitude Experiment for controlled rollouts.
 * 
 * Usage:
 * 
 * import { ExperimentHooks } from './amplitude-integration/browser/hooks/experiment-hooks.js';
 * 
 * // Track experiment view
 * ExperimentHooks.trackExperimentViewed('new_checkout_flow', 'variant_b');
 * 
 * // Track experiment conversion
 * ExperimentHooks.trackExperimentConverted('new_checkout_flow', 'variant_b', {
 *   revenue: 99.99
 * });
 * 
 * // Check if feature flag is enabled
 * const isEnabled = await ExperimentHooks.isFeatureEnabled('dark_mode');
 */

import { AmplitudeClient, AmplitudeConfig } from '../amplitude-client.js';

export const ExperimentHooks = {
  
  /**
   * Track when a user sees an experiment variant
   * 
   * @param {string} experimentName - Name of the experiment
   * @param {string} variant - Variant shown: 'control', 'variant_a', 'variant_b', etc.
   * @param {Object} properties - Additional properties
   */
  trackExperimentViewed(experimentName, variant, properties = {}) {
    AmplitudeClient.track(AmplitudeConfig.events.EXPERIMENT_VIEWED, {
      experiment_name: experimentName,
      variant: variant,
      timestamp: new Date().toISOString(),
      ...properties
    });
    
    // Also set as user property for segmentation
    AmplitudeClient.setUserProperties({
      [`experiment_${experimentName}`]: variant
    });
    
    console.log(`[ExperimentHooks] User assigned to ${experimentName}: ${variant}`);
  },

  /**
   * Track experiment conversion (goal achieved)
   * 
   * @param {string} experimentName - Name of the experiment
   * @param {string} variant - Variant the user is in
   * @param {Object} properties - Conversion properties (e.g., revenue, items)
   */
  trackExperimentConverted(experimentName, variant, properties = {}) {
    AmplitudeClient.track(AmplitudeConfig.events.EXPERIMENT_CONVERTED, {
      experiment_name: experimentName,
      variant: variant,
      timestamp: new Date().toISOString(),
      ...properties
    });
    
    console.log(`[ExperimentHooks] Conversion for ${experimentName} (${variant}):`, properties);
  },

  /**
   * Assign user to experiment variant (client-side bucketing)
   * Simple hash-based assignment
   * 
   * @param {string} experimentName - Name of the experiment
   * @param {Array<string>} variants - Available variants: ['control', 'variant_a', ...]
   * @param {number} splitPercentage - Percentage for each variant (e.g., 50 = 50/50 split)
   * @returns {string} - Assigned variant
   */
  assignVariant(experimentName, variants = ['control', 'variant_a'], splitPercentage = 50) {
    // Get user/device ID for consistent bucketing
    const userId = AmplitudeClient.userId || 'anonymous';
    
    // Simple hash function
    const hash = this._hashCode(`${userId}_${experimentName}`);
    const bucket = Math.abs(hash) % 100;
    
    // Assign based on split percentage
    let variant;
    if (bucket < splitPercentage) {
      variant = variants[0];
    } else {
      variant = variants[1] || variants[0];
    }
    
    // Track the assignment
    this.trackExperimentViewed(experimentName, variant);
    
    return variant;
  },

  /**
   * Check if feature flag is enabled
   * In production, this would integrate with Amplitude Experiment SDK
   * 
   * @param {string} featureName - Name of the feature flag
   * @returns {Promise<boolean>} - Whether feature is enabled
   */
  async isFeatureEnabled(featureName) {
    // TODO: Integrate with Amplitude Experiment SDK
    // For now, return false as placeholder
    console.warn(`[ExperimentHooks] Feature flag check for "${featureName}" - not yet integrated with Amplitude Experiment`);
    return false;
  },

  /**
   * Get experiment variant from Amplitude Experiment
   * 
   * @param {string} experimentName - Name of the experiment
   * @returns {Promise<string|null>} - Variant or null
   */
  async getExperimentVariant(experimentName) {
    // TODO: Integrate with Amplitude Experiment SDK
    console.warn(`[ExperimentHooks] Variant fetch for "${experimentName}" - not yet integrated with Amplitude Experiment`);
    return null;
  },

  /**
   * Track feature flag evaluation
   * 
   * @param {string} featureName - Feature flag name
   * @param {boolean} isEnabled - Whether it's enabled
   * @param {Object} properties - Additional properties
   */
  trackFeatureFlagEvaluated(featureName, isEnabled, properties = {}) {
    AmplitudeClient.track('FEATURE_FLAG_EVALUATED', {
      feature_name: featureName,
      is_enabled: isEnabled,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // =====================================================
  // INTERNAL HELPERS
  // =====================================================

  /**
   * Simple hash function for consistent bucketing
   * @private
   */
  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.ExperimentHooks = ExperimentHooks;
}

export default ExperimentHooks;
