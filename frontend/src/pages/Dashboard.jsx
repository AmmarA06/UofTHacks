import { motion } from 'framer-motion';
import { useStats } from '@/hooks/useStats';
import { ClassChart } from '@/components/stats/ClassChart';
import { PageTransition, fadeInUp } from '@/components/common/PageTransition';
import { MetricCard } from '@/components/common/MetricCard';

export function Dashboard() {
    const { stats, loading: statsLoading } = useStats();

    return (
        <PageTransition>
            <div className="space-y-8 py-8">
                {/* Header Section */}
                <motion.div
                    variants={fadeInUp}
                    className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
                >
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Overview</h1>
                        <p className="mt-2 text-lg text-gray-500">
                            Real-time insights and system health.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium text-gray-700">System Operational</span>
                        </div>
                    </div>
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
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Class Distribution</h3>
                        </div>
                        <div className="p-0">
                            <ClassChart classDistribution={stats?.class_distribution} />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">System initialization complete</p>
                                        <p className="text-xs text-gray-500 mt-0.5">2 minutes ago</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
