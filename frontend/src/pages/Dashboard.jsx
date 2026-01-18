import { useState } from 'react';
import { useStats } from '@/hooks/useStats';
import { useRecentDetections } from '@/hooks/useRecentDetections';
import { ClassChart } from '@/components/stats/ClassChart';
import { PageTransition } from '@/components/common/PageTransition';
import { Modal } from '@/components/common/Modal';
import { ArrowUpRight, ArrowDownRight, Box, Eye, Zap, Tags, Clock, ChevronRight } from 'lucide-react';

// Stat card component
const StatCard = ({ icon: Icon, label, value, subtext, trend, color = "gray" }) => {
    const colorClasses = {
        gray: "bg-gray-100 text-gray-600",
        green: "bg-green-50 text-green-600",
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        orange: "bg-orange-50 text-orange-600",
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
                    <Icon size={18} />
                </div>
                <span className="text-[13px] text-gray-500 font-medium">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-medium text-[#1a1a1a] tracking-[-0.02em]">{value}</span>
                {trend && (
                    <span className={`text-[12px] font-medium flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </span>
                )}
            </div>
            {subtext && <p className="text-[12px] text-gray-400 mt-1">{subtext}</p>}
        </div>
    );
};
import { formatTimeAgo } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';
import { Eye } from 'lucide-react';

export function Dashboard() {
    const { stats, loading: statsLoading } = useStats();
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

    const recentActivity = [
        { type: 'detection', object: 'Laptop', action: 'entered view', time: '2 min ago' },
        { type: 'sync', object: 'Phone', action: 'synced to store', time: '5 min ago' },
        { type: 'detection', object: 'Headphones', action: 'left view', time: '8 min ago' },
        { type: 'alert', object: 'Tablet', action: 'low stock warning', time: '12 min ago' },
        { type: 'detection', object: 'Watch', action: 'entered view', time: '15 min ago' },
    ];

    const allActivity = [
        ...recentActivity,
        { type: 'sync', object: 'Camera', action: 'synced to store', time: '20 min ago' },
        { type: 'detection', object: 'Keyboard', action: 'entered view', time: '25 min ago' },
        { type: 'detection', object: 'Mouse', action: 'left view', time: '30 min ago' },
        { type: 'alert', object: 'Monitor', action: 'position changed', time: '35 min ago' },
        { type: 'sync', object: 'Speaker', action: 'synced to store', time: '40 min ago' },
        { type: 'detection', object: 'USB Drive', action: 'entered view', time: '45 min ago' },
        { type: 'detection', object: 'Charger', action: 'left view', time: '50 min ago' },
        { type: 'alert', object: 'Wallet', action: 'low stock warning', time: '1 hour ago' },
        { type: 'sync', object: 'Badge', action: 'synced to store', time: '1 hour ago' },
        { type: 'detection', object: 'Glasses', action: 'entered view', time: '2 hours ago' },
    ];
    const { detections, loading: detectionsLoading } = useRecentDetections(10, 5000);

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-[28px] font-medium text-[#1a1a1a] tracking-[-0.02em]">Overview</h1>
                    <p className="text-[14px] text-gray-500 mt-1">Real-time inventory tracking and detection analytics</p>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Content - 3 columns */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={Box}
                                label="Total Objects"
                                value={stats?.total_objects || 0}
                                subtext="Tracked items"
                                trend="up"
                                color="blue"
                            />
                            <StatCard
                                icon={Eye}
                                label="In View"
                                value={stats?.present_objects || 0}
                                subtext="Currently visible"
                                trend="up"
                                color="green"
                            />
                            <StatCard
                                icon={Zap}
                                label="Detections"
                                value={stats?.total_detections || 0}
                                subtext="Total events"
                                trend="up"
                                color="purple"
                            />
                            <StatCard
                                icon={Tags}
                                label="Classes"
                                value={stats?.class_distribution ? Object.keys(stats.class_distribution).length : 0}
                                subtext="Categories"
                                color="orange"
                            />
                        </div>

                        {/* Chart Section */}
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <div>
                                    <h3 className="text-[16px] font-medium text-[#1a1a1a]">Detection Analytics</h3>
                                    <p className="text-[12px] text-gray-400 mt-0.5">Object detection over time</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#1a1a1a]"></span>
                                        <span className="text-[12px] text-gray-500">Detections</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                        <span className="text-[12px] text-gray-500">Synced</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-[#fafafa]">
                                <ClassChart classDistribution={stats?.class_distribution} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-background-elevated to-background-card rounded-lg border border-border shadow-sm p-6 relative overflow-hidden">
                        {/* Decorative gradient */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-light/20 to-transparent rounded-bl-full"></div>

                        <h3 className="text-lg font-semibold text-foreground mb-4 relative z-10 flex items-center gap-2">
                            <Eye size={20} className="text-blue-500" />
                            Recent Activity
                        </h3>

                        <div className="space-y-3 relative z-10">
                            {detectionsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                </div>
                            ) : detections && detections.length > 0 ? (
                                detections.map((detection) => {
                                    const classColor = getClassColor(detection.class_name);
                                    return (
                                        <div key={detection.detection_id} className="flex items-start gap-3 pb-3 border-b border-border-light last:border-0 last:pb-0">
                                            <div
                                                className="w-2 h-2 rounded-full mt-2 shadow-sm flex-shrink-0"
                                                style={{ backgroundColor: classColor }}
                                            ></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    <span className="capitalize">{detection.class_name}</span> detected
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-foreground-muted">
                                                        {formatTimeAgo(detection.timestamp)}
                                                    </p>
                                                    {detection.confidence && (
                                                        <span className="text-xs text-gray-400">
                                                            • {(detection.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                    <Eye size={24} className="opacity-20 mb-2" />
                                    <p className="text-xs">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Timeline Modal */}
            <Modal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                title="Activity Timeline"
                className="max-w-md"
            >
                <div className="space-y-0">
                    {allActivity.map((activity, i) => (
                        <div key={i} className="flex gap-4 pb-4 last:pb-0">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                                <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'detection' ? 'bg-blue-500' :
                                    activity.type === 'sync' ? 'bg-green-500' :
                                        'bg-orange-500'
                                    }`}></div>
                                {i < allActivity.length - 1 && (
                                    <div className="w-px h-full bg-gray-200 mt-1"></div>
                                )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-[14px] font-medium text-[#1a1a1a]">{activity.object}</p>
                                    <span className="text-[11px] text-gray-400">{activity.time}</span>
                                </div>
                                <p className="text-[12px] text-gray-500 mt-0.5">{activity.action}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </PageTransition>
    );
}
