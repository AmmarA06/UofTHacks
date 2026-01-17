import { useState } from 'react';
import { X, Package, TrendingUp, BarChart3, PieChart as PieChartIcon, Clock, Users } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { mockAnalytics } from '../../data/mockAnalytics';

export function OverviewAnalytics({ shelves, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProduct, setSelectedProduct] = useState('all');
  
  const shelfPerformance = mockAnalytics.getShelfPerformance(shelves);
  const productMix = mockAnalytics.getProductMix(shelves);
  const comparisonData = mockAnalytics.getComparisonData();
  const phoneTraffic = mockAnalytics.getHourlyTraffic('cell_phone');
  const bottleTraffic = mockAnalytics.getHourlyTraffic('water_bottle');
  const phoneSegments = mockAnalytics.getCustomerSegments('cell_phone');
  const bottleSegments = mockAnalytics.getCustomerSegments('water_bottle');
  
  // Calculate totals
  const totalRevenue = shelfPerformance.reduce((sum, s) => sum + s.revenue, 0);
  const avgConversion = (shelfPerformance.reduce((sum, s) => sum + s.conversionRate, 0) / shelfPerformance.length).toFixed(1);
  const totalStock = shelves.reduce((sum, s) => sum + (s.metadata.count || 0), 0);
  const lowStockCount = shelfPerformance.filter(s => s.status === 'low' || s.status === 'critical').length;
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'shelves', label: 'Shelf Performance', icon: Package },
    { id: 'products', label: 'Product Comparison', icon: PieChartIcon },
    { id: 'traffic', label: 'Traffic Patterns', icon: Clock },
    { id: 'segments', label: 'Customer Segments', icon: Users }
  ];
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Store Analytics Overview</h2>
            <p className="text-blue-100 mt-1">{shelves.length} Shelves • {totalStock} Total Items in Stock</p>
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
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
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
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                  <div className="text-sm opacity-90 mb-2">Total Revenue</div>
                  <div className="text-3xl font-bold">${totalRevenue.toLocaleString()}</div>
                  <div className="text-xs opacity-80 mt-2">↑ 12.5% vs last month</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
                  <div className="text-sm opacity-90 mb-2">Avg Conversion</div>
                  <div className="text-3xl font-bold">{avgConversion}%</div>
                  <div className="text-xs opacity-80 mt-2">↑ 2.3% vs last month</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
                  <div className="text-sm opacity-90 mb-2">Total Stock</div>
                  <div className="text-3xl font-bold">{totalStock}</div>
                  <div className="text-xs opacity-80 mt-2">{lowStockCount} shelves need restocking</div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg shadow-lg p-6">
                  <div className="text-sm opacity-90 mb-2">Active Shelves</div>
                  <div className="text-3xl font-bold">{shelves.length}</div>
                  <div className="text-xs opacity-80 mt-2">{shelfPerformance.filter(s => s.status === 'healthy').length} performing well</div>
                </div>
              </div>
              
              {/* Product Mix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Product Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productMix}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {productMix.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue by Product</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productMix}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'shelves' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Shelf</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Stock</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Sales Velocity</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Conversion</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shelfPerformance.map((shelf, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{shelf.label}</td>
                          <td className="py-3 px-4">
                            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-700">
                              {shelf.productType === 'cell_phone' ? 'Cell Phone' : 'Water Bottle'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold">{shelf.stockLevel}</span>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    shelf.stockPercentage > 50 ? 'bg-green-500' : 
                                    shelf.stockPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${shelf.stockPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">{shelf.salesVelocity}/day</td>
                          <td className="py-3 px-4 text-center font-semibold text-green-600">{shelf.conversionRate}%</td>
                          <td className="py-3 px-4 text-right font-semibold">${shelf.revenue.toLocaleString()}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              shelf.status === 'healthy' ? 'bg-green-100 text-green-700' :
                              shelf.status === 'low' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {shelf.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Product Performance Comparison</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cell_phone" fill="#3b82f6" name="Cell Phones" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="water_bottle" fill="#10b981" name="Water Bottles" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {activeTab === 'traffic' && (
            <div className="space-y-6">
              {/* Product Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProduct('all')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedProduct === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  All Products
                </button>
                <button
                  onClick={() => setSelectedProduct('cell_phone')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedProduct === 'cell_phone' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  Cell Phones
                </button>
                <button
                  onClick={() => setSelectedProduct('water_bottle')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedProduct === 'water_bottle' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'
                  }`}
                >
                  Water Bottles
                </button>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Hourly Traffic & Sales Pattern</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={selectedProduct === 'cell_phone' ? phoneTraffic : selectedProduct === 'water_bottle' ? bottleTraffic : phoneTraffic}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="traffic" fill="#3b82f6" name="Traffic" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} name="Sales" />
                  </ComposedChart>
                </ResponsiveContainer>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Peak Hours Insight</h4>
                  <p className="text-sm text-blue-800">
                    Peak traffic occurs between 11 AM - 2 PM (lunch) and 5 PM - 8 PM (after work). 
                    Consider promotional campaigns during these hours for maximum impact.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'segments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Cell Phone Customers</h3>
                  <div className="space-y-3">
                    {phoneSegments.map((segment, idx) => (
                      <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-800">{segment.segment}</div>
                          <div className="text-sm font-bold text-blue-600">{segment.count} customers</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600">Avg Spend</div>
                            <div className="font-semibold">${segment.avgSpend}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Conversion</div>
                            <div className="font-semibold text-green-600">{segment.conversionRate}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Water Bottle Customers</h3>
                  <div className="space-y-3">
                    {bottleSegments.map((segment, idx) => (
                      <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-800">{segment.segment}</div>
                          <div className="text-sm font-bold text-green-600">{segment.count} customers</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600">Avg Spend</div>
                            <div className="font-semibold">${segment.avgSpend}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Conversion</div>
                            <div className="font-semibold text-green-600">{segment.conversionRate}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
