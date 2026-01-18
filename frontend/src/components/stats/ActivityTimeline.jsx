import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp } from 'lucide-react';
import { statsAPI } from '@/api/endpoints';

export function ActivityTimeline({ stats }) {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const response = await statsAPI.getTimeline(24);
        const timeline = response.data.timeline;
        
        // Transform data for display
        const now = new Date();
        const dataMap = {};
        
        // Initialize all hours for last 24 hours
        for (let i = 23; i >= 0; i--) {
          const time = new Date(now.getTime() - i * 60 * 60 * 1000);
          const hour = time.getHours().toString().padStart(2, '0') + ':00';
          dataMap[hour] = {
            hour,
            detections: 0,
            objects: 0,
          };
        }
        
        // Fill in actual data
        timeline.forEach(item => {
          const date = new Date(item.hour);
          const hour = date.getHours().toString().padStart(2, '0') + ':00';
          if (dataMap[hour]) {
            dataMap[hour].detections = item.detections;
            dataMap[hour].objects = item.unique_objects;
          }
        });
        
        setTimelineData(Object.values(dataMap));
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
        setLoading(false);
      }
    };

    fetchTimeline();
    // Refresh every 5 minutes
    const interval = setInterval(fetchTimeline, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">
        <div className="p-5 flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#1a1a1a] rounded-full"></div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...timelineData.map(d => d.detections), 1);
  const totalDetections = timelineData.reduce((sum, d) => sum + d.detections, 0);
  const avgPerHour = Math.floor(totalDetections / 24);

  return (
    <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#1a1a1a]" />
          <h3 className="text-[16px] font-semibold text-[#1a1a1a]">Activity Timeline</h3>
        </div>
        <span className="text-[12px] text-gray-500 font-medium">Last 24 Hours</span>
      </div>

      {/* Chart */}
      <div className="p-5 bg-gradient-to-br from-gray-50/50 to-white">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="colorDetections" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorObjects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#374151" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#374151" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="hour" 
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              interval={3}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: '#111827', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', fontWeight: '500', padding: '2px 0' }}
            />
            <Area
              type="monotone"
              dataKey="detections"
              stroke="#1a1a1a"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDetections)"
              name="Detections"
            />
            <Area
              type="monotone"
              dataKey="objects"
              stroke="#374151"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorObjects)"
              name="Objects"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50/50 border-t border-gray-100">
        <div className="text-center">
          <div className="text-xl font-bold text-[#1a1a1a]">{maxValue}</div>
          <div className="text-xs text-gray-500 font-medium mt-0.5">Peak Hour</div>
        </div>
        <div className="text-center border-l border-r border-gray-200">
          <div className="text-xl font-bold text-[#1a1a1a]">{avgPerHour}</div>
          <div className="text-xs text-gray-500 font-medium mt-0.5">Avg/Hour</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-[#1a1a1a]">{totalDetections}</div>
          <div className="text-xs text-gray-500 font-medium mt-0.5">Total</div>
        </div>
      </div>
    </div>
  );
}
