import { useState } from 'react';
import { X, TrendingUp, DollarSign, ShoppingCart, Eye, BarChart3 } from 'lucide-react';
import { mockAnalytics } from '../../data/mockAnalytics';
import { SalesChart, RevenueChart } from './SalesChart';
import { FunnelChart } from './FunnelChart';
import { CohortAnalysis } from './CohortAnalysis';
import { ChurnAnalysis } from './ChurnAnalysis';

export function ShelfAnalytics({ shelf, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!shelf) return null;
  
  const productType = shelf.metadata.productType;
  const timeSeriesData = mockAnalytics.getTimeSeriesData(productType, shelf.id);
  const funnelData = mockAnalytics.getFunnelData(productType, shelf.id);
  const cohortData = mockAnalytics.getCohortData(productType);
  const churnData = mockAnalytics.getChurnData(productType);
  const flowData = mockAnalytics.getCustomerFlow(productType);
  const stats = mockAnalytics.getSummaryStats(productType);
  
  const productName = productType === 'cell_phone' ? 'Cell Phones' : 'Water Bottles';
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'funnel', label: 'Funnel', icon: TrendingUp },
    { id: 'cohorts', label: 'Cohorts', icon: ShoppingCart },
    { id: 'churn', label: 'Churn', icon: TrendingUp }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{shelf.label} - Analytics</h2>
            <p className="text-indigo-100 mt-1">Product: {productName} • Stock: {shelf.metadata.count} units</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="bg-white border-b flex gap-2 px-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Eye size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Window Shopped</div>
                      <div className="text-2xl font-bold text-gray-900">{stats.totalWindowShopped.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">PRODUCT_WINDOW_SHOPPED</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <ShoppingCart size={24} className="text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Purchased</div>
                      <div className="text-2xl font-bold text-gray-900">{stats.totalPurchased.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">PRODUCT_PURCHASED</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <DollarSign size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Revenue</div>
                      <div className="text-2xl font-bold text-gray-900">${(stats.totalRevenue).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <TrendingUp size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Conversion</div>
                      <div className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</div>
                      <div className="text-xs text-gray-500">Window shop → Purchase</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <TrendingUp size={24} className="text-red-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Abandoned</div>
                      <div className="text-2xl font-bold text-gray-900">{stats.totalAbandoned.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">PRODUCT_ABANDONED</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SalesChart data={timeSeriesData} title="30-Day Performance" />
                <RevenueChart data={timeSeriesData} title="Revenue Trend" />
              </div>
            </div>
          )}
          
          {activeTab === 'funnel' && (
            <div className="space-y-6">
              <FunnelChart data={funnelData} title={`${productName} Conversion Funnel`} />
              
              {/* Additional Funnel Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                  <div className="text-sm opacity-90 mb-2">Browse to Cart Rate</div>
                  <div className="text-3xl font-bold">
                    {((funnelData[2].count / funnelData[0].count) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs opacity-80 mt-2">Industry avg: 15-25%</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
                  <div className="text-sm opacity-90 mb-2">Cart to Purchase</div>
                  <div className="text-3xl font-bold">
                    {((funnelData[4].count / funnelData[2].count) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs opacity-80 mt-2">Industry avg: 45-65%</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
                  <div className="text-sm opacity-90 mb-2">Overall Conversion</div>
                  <div className="text-3xl font-bold">{funnelData[4].percentage}%</div>
                  <div className="text-xs opacity-80 mt-2">Industry avg: 2-5%</div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'cohorts' && (
            <CohortAnalysis data={cohortData} flowData={flowData} title={`${productName} Customer Journey & Cohorts`} />
          )}
          
          {activeTab === 'churn' && (
            <ChurnAnalysis data={churnData} title={`${productName} Churn Analysis`} />
          )}
        </div>
      </div>
    </div>
  );
}
