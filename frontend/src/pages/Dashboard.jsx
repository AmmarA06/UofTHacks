import { motion } from 'framer-motion';
import { useStats } from '@/hooks/useStats';
import { ClassChart } from '@/components/stats/ClassChart';
import { PageTransition, fadeInUp } from '@/components/common/PageTransition';
import { MetricCard } from '@/components/common/MetricCard';

export function Dashboard() {
    const { stats, loading: statsLoading } = useStats();

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
                        <h3 className="text-[18px] font-medium text-[#1a1a1a] tracking-[-0.01em] mb-5">Recent Activity</h3>
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-200/50 last:border-0 last:pb-0">
                                    <div className="w-2 h-2 rounded-full bg-[#1a1a1a] mt-2"></div>
                                    <div>
                                        <p className="text-[14px] font-medium text-[#1a1a1a]">Object detected</p>
                                        <p className="text-[12px] text-gray-500 mt-0.5">{i * 2} minutes ago</p>
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
