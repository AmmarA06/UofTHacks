import { clsx } from 'clsx';

const variants = {
    primary: "bg-[#1a1a1a] text-white hover:bg-black border-transparent",
    secondary: "bg-[#f3f3f3] text-[#1a1a1a] border-gray-200 hover:bg-[#e8e8e8] hover:border-gray-300",
    danger: "bg-red-500 text-white hover:bg-red-600 border-transparent",
    ghost: "bg-transparent text-gray-500 hover:bg-[#f3f3f3] hover:text-[#1a1a1a] border-transparent",
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
                "focus:outline-none focus:ring-2 focus:ring-gray-200",
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
