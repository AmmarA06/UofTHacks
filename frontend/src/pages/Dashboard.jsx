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
                        
                        <h3 className="text-lg font-semibold text-foreground mb-4 relative z-10">Recent Activity</h3>
                        <div className="space-y-4 relative z-10">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border-light last:border-0 last:pb-0">
                                    <div className="w-2 h-2 rounded-full bg-gradient-to-br from-accent to-accent-light mt-2 shadow-sm"></div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Detection processed</p>
                                        <p className="text-xs text-foreground-muted mt-0.5">2 minutes ago</p>
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
