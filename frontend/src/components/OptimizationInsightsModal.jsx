import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ArrowRight, TrendingUp, AlertTriangle, Target, Eye, Lightbulb, CheckCircle, Loader2 } from 'lucide-react';

/**
 * Modal displaying AI-generated insights about store optimization
 * Explains why shelves were rearranged based on retail psychology principles
 */
function OptimizationInsightsModal({ insights, categorizedData, isLoading, onClose, onApply }) {
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    await onApply();
    setIsApplying(false);
  };

  // Category icons and colors
  const categoryConfig = {
    anchor: { icon: <Target size={14} />, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Anchor' },
    magnet: { icon: <TrendingUp size={14} />, color: 'bg-green-100 text-green-700 border-green-200', label: 'Magnet' },
    risk: { icon: <AlertTriangle size={14} />, color: 'bg-red-100 text-red-700 border-red-200', label: 'Risk' },
    discovery: { icon: <Eye size={14} />, color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Discovery' },
    normal: { icon: <CheckCircle size={14} />, color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Normal' }
  };

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999]">
        {/* Backdrop with blur */}
        <div className="absolute inset-0 bg-black/50" style={{ backdropFilter: 'blur(4px)' }} />
        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                <Sparkles className="text-purple-600 animate-pulse" size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-[18px] font-medium text-[#1a1a1a] mb-2">Analyzing Store Layout</h3>
                <p className="text-[14px] text-gray-500">AI is generating optimization insights...</p>
              </div>
              <Loader2 className="animate-spin text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!insights) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop with blur - covers entire viewport */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      {/* Scrollable content container */}
      <div
        className="absolute inset-0 overflow-y-auto"
        onClick={onClose}
      >
        <div className="min-h-full py-8 px-4 flex items-start justify-center">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="text-purple-600" size={24} />
                </div>
                <div>
                  <h2 className="text-[22px] font-medium text-[#1a1a1a] tracking-[-0.02em]">
                    Store Optimization Insights
                  </h2>
                  <p className="text-[14px] text-gray-500">AI-powered layout recommendations</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-[#f3f3f3] hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5 border border-purple-100">
              <h3 className="text-[15px] font-medium text-[#1a1a1a] mb-2 flex items-center gap-2">
                <Lightbulb size={16} className="text-purple-600" />
                Executive Summary
              </h3>
              <p className="text-[14px] text-gray-700 leading-relaxed">{insights.summary}</p>
            </div>

            {/* Category Overview */}
            {categorizedData?.summary && (
              <div>
                <h3 className="text-[15px] font-medium text-[#1a1a1a] mb-3">Shelf Categories Identified</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(categorizedData.summary).map(([key, items]) => {
                    if (key === 'normal' || !Array.isArray(items)) return null;
                    const config = categoryConfig[key] || categoryConfig.normal;
                    if (!config) return null;
                    return (
                      <div key={key} className={`rounded-xl p-3 border ${config.color}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {config.icon}
                          <span className="text-[12px] font-medium uppercase tracking-wide">{config.label}</span>
                        </div>
                        <div className="text-[24px] font-medium">{items.length}</div>
                        <div className="text-[11px] opacity-75">shelves</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key Changes */}
            {insights.keyChanges && insights.keyChanges.length > 0 && (
              <div>
                <h3 className="text-[15px] font-medium text-[#1a1a1a] mb-3">Key Placement Changes</h3>
                <div className="space-y-3">
                  {insights.keyChanges.map((change, idx) => {
                    const config = categoryConfig[change.category] || categoryConfig.normal;
                    return (
                      <div key={idx} className="bg-[#fafafa] rounded-xl p-4 border border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color} border`}>
                            {config.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[14px] font-medium text-[#1a1a1a]">
                                {change.shelfId}
                              </span>
                              {change.className && (
                                <span className="text-[12px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {change.className.replace(/_/g, ' ')}
                                </span>
                              )}
                              <ArrowRight size={14} className="text-gray-400" />
                              <span className="text-[12px] text-purple-600 font-medium">
                                {change.action}
                              </span>
                            </div>
                            <p className="text-[13px] text-gray-600">{change.rationale}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expected Impact */}
            {insights.expectedImpact && (
              <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                <h3 className="text-[15px] font-medium text-green-800 mb-2 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Expected Impact
                </h3>
                <div className="text-[28px] font-medium text-green-700 mb-1">
                  {insights.expectedImpact.conversionLift}
                </div>
                <p className="text-[13px] text-green-700">{insights.expectedImpact.reasoning}</p>
              </div>
            )}

            {/* Recommendations */}
            {insights.additionalRecommendations && insights.additionalRecommendations.length > 0 && (
              <div>
                <h3 className="text-[15px] font-medium text-[#1a1a1a] mb-3">Additional Recommendations</h3>
                <ul className="space-y-2">
                  {insights.additionalRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[13px] text-gray-700">
                      <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Psychology Note */}
            {insights.retailPsychologyNote && (
              <div className="bg-[#f3f3f3] rounded-xl p-4 border border-gray-200">
                <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Retail Psychology Insight
                </h4>
                <p className="text-[13px] text-gray-700 italic">{insights.retailPsychologyNote}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 bg-[#fafafa] rounded-b-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-gray-500">
                Powered by AI • Based on real-time analytics
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-[14px] font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="px-6 py-2.5 rounded-full text-[14px] font-medium bg-[#1a1a1a] text-white hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isApplying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Apply Optimization
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default OptimizationInsightsModal;
