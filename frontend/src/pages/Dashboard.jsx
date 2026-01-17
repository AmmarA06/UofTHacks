import { motion } from 'framer-motion';
import { useStats } from '@/hooks/useStats';
import { useRecentDetections } from '@/hooks/useRecentDetections';
import { ClassChart } from '@/components/stats/ClassChart';
import { PageTransition, fadeInUp } from '@/components/common/PageTransition';
import { MetricCard } from '@/components/common/MetricCard';
import { formatTimeAgo } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';
import { Eye } from 'lucide-react';

export function Dashboard() {
    const { stats, loading: statsLoading } = useStats();
    const { detections, loading: detectionsLoading } = useRecentDetections(10, 5000);

    return (
        <PageTransition>
            <div className="space-y-8 py-8">
                {/* Header Section */}
                <motion.div
                    variants={fadeInUp}
                >
                    <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Overview</h1>
                    <p className="mt-2 text-lg text-foreground-muted">
                        Real-time insights and detection analytics.
                    </p>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Objects"
                        value={stats?.total_objects || 0}
                        subtext="Stored assets"
                        trend="up"
                    />
                    <MetricCard
                        title="Present Objects"
                        value={stats?.present_objects || 0}
                        subtext="Live detection"
                        trend="up"
                    />
                    <MetricCard
                        title="Total Detections"
                        value={stats?.total_detections || 0}
                        subtext="Cumulative events"
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gradient-to-br from-background-elevated to-background-card rounded-lg border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-gradient-to-r from-background-subtle to-background-accent">
                            <h3 className="text-lg font-semibold text-foreground">Class Distribution</h3>
                        </div>
                        <div className="p-0 bg-background-elevated">
                            <ClassChart classDistribution={stats?.class_distribution} />
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
        </PageTransition>
    );
}
