import { clsx } from 'clsx';

const variants = {
    primary: "bg-[#1a1a1a] text-white hover:bg-black border-transparent",
    secondary: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300",
    danger: "bg-red-500 text-white hover:bg-red-600 border-transparent",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-50 border-transparent",
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
                "inline-flex items-center justify-center px-4 py-2 text-[13px] font-medium rounded-full border",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-gray-300",
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
