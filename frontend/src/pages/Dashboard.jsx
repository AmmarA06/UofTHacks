import { motion } from 'framer-motion';
import { useStats } from '@/hooks/useStats';
import { useRecentDetections } from '@/hooks/useRecentDetections';
import { ClassChart } from '@/components/stats/ClassChart';
import { PageTransition, fadeInUp } from '@/components/common/PageTransition';
import { MetricCard } from '@/components/common/MetricCard';
import { formatTimeAgo } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';

export function Dashboard() {
    const { stats, loading: statsLoading } = useStats();
    const { detections, loading: detectionsLoading } = useRecentDetections(10, 5000);

    return (
        <PageTransition>
            <div className="space-y-8 py-4">
                {/* Header Section */}
                <motion.div variants={fadeInUp}>
                    <h1 className="text-[32px] md:text-[40px] font-normal tracking-[-0.02em] text-[#1a1a1a]">Overview</h1>
                    <p className="mt-2 text-[16px] text-gray-500">
                        Real-time inventory tracking and detection analytics.
                    </p>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Objects"
                        value={stats?.total_objects || 0}
                        subtext="Tracked items"
                        trend="up"
                    />
                    <MetricCard
                        title="Present Objects"
                        value={stats?.present_objects || 0}
                        subtext="In view"
                        trend="up"
                    />
                    <MetricCard
                        title="Total Detections"
                        value={stats?.total_detections || 0}
                        subtext="Events logged"
                        trend="up"
                    />
                    <MetricCard
                        title="Unique Classes"
                        value={stats?.class_distribution ? Object.keys(stats.class_distribution).length : 0}
                        subtext="Categories"
                        trend="up"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-[#f3f3f3] rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200/50">
                            <h3 className="text-[18px] font-medium text-[#1a1a1a] tracking-[-0.01em]">Class Distribution</h3>
                        </div>
                        <div className="p-0 bg-white">
                            <ClassChart classDistribution={stats?.class_distribution} />
                        </div>
                    </div>

                    <div className="bg-[#f3f3f3] rounded-2xl p-6">
                        <h3 className="text-[18px] font-medium text-[#1a1a1a] tracking-[-0.01em] mb-5 flex items-center gap-2">
                            <div className="grid grid-cols-3 gap-0.5 w-5 h-5">
                                <div></div>
                                <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
                                <div></div>
                                <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
                                <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
                                <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
                                <div></div>
                                <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full"></div>
                                <div></div>
                            </div>
                            Recent Activity
                        </h3>
                        <div className="space-y-4">
                            {detectionsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin w-6 h-6 border-2 border-[#1a1a1a] border-t-transparent rounded-full"></div>
                                </div>
                            ) : detections && detections.length > 0 ? (
                                detections.map((detection) => {
                                    const classColor = getClassColor(detection.class_name);
                                    return (
                                        <div key={detection.detection_id} className="flex items-start gap-3 pb-4 border-b border-gray-200/50 last:border-0 last:pb-0">
                                            <div
                                                className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                                style={{ backgroundColor: classColor }}
                                            ></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] font-medium text-[#1a1a1a] truncate">
                                                    <span className="capitalize">{detection.class_name}</span> detected
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[12px] text-gray-500">
                                                        {formatTimeAgo(detection.timestamp)}
                                                    </p>
                                                    {detection.confidence && (
                                                        <span className="text-[12px] text-gray-400">
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
                                    <div className="w-3 h-3 bg-gray-300 rounded-full mb-2"></div>
                                    <p className="text-[12px]">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
