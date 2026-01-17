import { clsx } from 'clsx';

export function Input({ className, ...props }) {
    return (
        <input
            className={clsx(
                "w-full px-3 py-2 bg-background-elevated border border-border rounded-lg text-foreground text-sm shadow-sm",
                "placeholder:text-foreground-subtle",
                "focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...props}
        />
    );
}
