import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { clsx } from 'clsx';

export function MetricCard({ title, value, subtext, trend, className }) {
    return (
        <div className={clsx(
            "bg-gradient-to-br from-background-elevated to-background-card rounded-lg border border-border p-6 shadow-sm relative overflow-hidden",
            "hover:shadow-md hover:border-border-hover transition-all duration-200",
            className
        )}>
            {/* Subtle gradient accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full"></div>
            
            <div className="flex flex-col h-full justify-between relative z-10">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-1">{title}</h3>
                    <div className="text-3xl font-bold text-foreground tracking-tight mt-2">{value}</div>
                </div>

                {subtext && (
                    <div className="mt-4 flex items-center text-sm text-foreground-muted">
                        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-success mr-1" />}
                        {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-error mr-1" />}
                        {trend === 'neutral' && <Minus className="w-4 h-4 text-foreground-subtle mr-1" />}
                        {subtext}
                    </div>
                )}
            </div>
        </div>
    );
}
