import { clsx } from 'clsx';

const variants = {
    primary: "bg-black text-white hover:bg-gray-800 border-transparent",
    secondary: "bg-white text-gray-900 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border-transparent",
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
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
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
