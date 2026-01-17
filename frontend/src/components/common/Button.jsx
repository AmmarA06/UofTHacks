import { clsx } from 'clsx';

const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover border-transparent shadow-sm hover:shadow",
    secondary: "bg-background-elevated text-foreground border-border hover:bg-background-hover hover:border-border-strong shadow-sm",
    danger: "bg-error text-white hover:bg-red-700 border-transparent shadow-sm hover:shadow",
    ghost: "bg-transparent text-foreground-muted hover:bg-background-hover hover:text-foreground border-transparent",
};

export function Button({
    children,
    variant = 'secondary',
    className,
    disabled,
    ...props
}) {
    return (
        <button
            className={clsx(
                "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-accent/20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                className
            )}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
