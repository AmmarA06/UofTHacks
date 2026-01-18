import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { clsx } from 'clsx';

export function MetricCard({ title, value, subtext, trend, className }) {
    return (
        <div className={clsx(
            "bg-white rounded-2xl p-6 relative overflow-hidden border border-gray-200",
            "hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl",
            className
        )}>
            <div className="flex flex-col h-full justify-between relative z-10">
                <div>
                    <h3 className="text-[12px] font-medium uppercase tracking-wider text-gray-600 mb-1">{title}</h3>
                    <div className="text-[32px] font-medium text-[#1a1a1a] tracking-[-0.02em] mt-2">{value}</div>
                </div>

                {subtext && (
                    <div className="mt-4 flex items-center text-[13px] text-gray-700">
                        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />}
                        {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />}
                        {trend === 'neutral' && <Minus className="w-4 h-4 text-gray-400 mr-1" />}
                        {subtext}
                    </div>
                )}
            </div>
        </div>
    );
}
