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

    // Background and border with shadow
    glass
      ? 'bg-white border border-gray-200 shadow-lg'
      : 'bg-white border border-gray-200 shadow-lg',

    // Hover effects
    hover && [
      'cursor-pointer',
      'hover:border-gray-400',
      'hover:shadow-xl',
      'hover:scale-[1.01]',
      'active:scale-[0.99]'
    ],

    // Glow effect
    glow && 'shadow-xl border-gray-400',

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
