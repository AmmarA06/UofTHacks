import { Card } from '../common/Card';
import { motion } from 'framer-motion';

const itemVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
};

export function StatCard({ icon: Icon, label, value, subtitle, color = 'accent', trend, trendDirection }) {
  const colors = {
    accent: {
      text: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent/20'
    },
    success: {
      text: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/20'
    },
    warning: {
      text: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning/20'
    },
    error: {
      text: 'text-error',
      bg: 'bg-error/10',
      border: 'border-error/20'
    },
  };

  const colorScheme = colors[color];

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card
        animated={false}
        className={`h-full relative overflow-hidden border-t-4 ${colorScheme.border.replace('border-', 'border-t-')}`}
      >
        {/* Subtle background tint */}
        <div className={`absolute inset-0 ${colorScheme.bg} opacity-[0.03] pointer-events-none`} />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1">
            <p className="text-foreground-muted text-xs font-bold uppercase tracking-wider opacity-90">
              {label}
            </p>

            <div className="flex items-baseline gap-2 mt-4">
              <p className="text-4xl font-bold text-foreground tabular-nums tracking-tight">
                {value ?? 0}
              </p>

              {trend && (
                <span className={`text-xs font-semibold ${trendDirection === 'up' ? 'text-success' :
                    trendDirection === 'down' ? 'text-error' :
                      'text-foreground-subtle'
                  }`}>
                  {trendDirection === 'up' && '↑'}
                  {trendDirection === 'down' && '↓'}
                  {trend}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-foreground-subtle text-xs mt-1.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {Icon && (
            <div className={`p-3 rounded-xl ml-4 ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border} shadow-sm group-hover:scale-105 transition-transform`}>
              <Icon size={24} strokeWidth={2} />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
