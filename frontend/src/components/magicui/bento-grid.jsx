import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BentoGrid = ({
    children,
    className,
}) => {
    return (
        <div
            className={cn(
                "grid w-full auto-rows-[22rem] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
                className
            )}
        >
            {children}
        </div>
    );
};

export const BentoCard = ({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
    value,
    trend,
    trendDirection
}) => (
    <div
        key={name}
        className={cn(
            "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
            "bg-gradient-to-br from-white via-white to-gray-50", // White to subtle gray ombre
            "border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300", // Outline and shadow
            className
        )}
    >
        <div className="absolute inset-0 z-0 transition-transform duration-300 group-hover:scale-105 pointer-events-none">
            {/* Background tint/accent */}
            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {background}
        </div>

        <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
            <div className="w-fit rounded-lg bg-accent/10 p-2 text-accent">
                {Icon && <Icon className="h-6 w-6 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-75" />}
            </div>
            <h3 className="text-xl font-semibold text-black">
                {name}
            </h3>

            {/* Value Display for Stats */}
            {value !== undefined && (
                <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-bold text-black tracking-tight tabular-nums">
                        {value}
                    </span>
                    {trend && (
                        <span className={cn(
                            "text-xs font-semibold",
                            trendDirection === 'up' ? 'text-success' :
                                trendDirection === 'down' ? 'text-error' :
                                    'text-foreground-subtle'
                        )}>
                            {trendDirection === 'up' && '↑'}
                            {trendDirection === 'down' && '↓'}
                            {trend}
                        </span>
                    )}
                </div>
            )}

            <p className="max-w-lg text-black">{description}</p>
        </div>

        {cta && (
            <div
                className={cn(
                    "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
                )}
            >
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-sm font-semibold text-accent"
                >
                    {cta}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                </motion.div>
            </div>
        )}
    </div>
);
