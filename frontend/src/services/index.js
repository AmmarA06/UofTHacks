/**
 * Services Index
 *
 * Central export for all services.
 */

// Gemini AI Service for floor plan analysis
export { analyzeFloorPlan } from './geminiService.js';

// Default export for convenience
import * as geminiService from './geminiService.js';

export default {
  gemini: geminiService,
};
