import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { clsx } from 'clsx';

export function MetricCard({ title, value, subtext, trend, className }) {
    return (
        <div className={clsx(
            "bg-white rounded-xl border border-gray-200 p-6 shadow-sm",
            "hover:shadow-md transition-shadow duration-200",
            className
        )}>
            <div className="flex flex-col h-full justify-between">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</h3>
                    <div className="text-3xl font-bold text-gray-900 tracking-tight mt-2">{value}</div>
                </div>

                {subtext && (
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />}
                        {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />}
                        {trend === 'neutral' && <Minus className="w-4 h-4 text-gray-400 mr-1" />}
                        {subtext}
                    </div>
                )}
            </div>
        </div>
    );
}
