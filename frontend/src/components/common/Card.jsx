import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export function Card({
  children,
  className,
  hover = false,
  glass = false,
  glow = false,
  animated = true,
  ...props
}) {
  const cardClasses = clsx(
    // Base styles
    'relative rounded-lg p-6 transition-all duration-300',

    // Background and border
    glass
      ? 'bg-background-elevated/80 backdrop-blur-xl border border-border/50'
      : 'bg-background-elevated border border-border',

    // Hover effects
    hover && [
      'cursor-pointer',
      'hover:border-accent/50',
      'hover:shadow-lg hover:shadow-accent/10',
      'hover:scale-[1.02]',
      'active:scale-[0.98]'
    ],

    // Glow effect
    glow && 'shadow-xl shadow-accent/5',

    // Custom className
    className
  );

  const CardWrapper = animated ? motion.div : 'div';

  const animationProps = animated ? {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  } : {};

  return (
    <CardWrapper
      className={cardClasses}
      {...animationProps}
      {...props}
    >
      {/* Subtle gradient overlay for depth */}
      {glass && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-lg pointer-events-none" />
      )}

      {/* Glow effect on top edge */}
      {glow && (
        <div className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </CardWrapper>
  );
}
