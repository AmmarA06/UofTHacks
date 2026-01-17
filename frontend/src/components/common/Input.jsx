import { clsx } from 'clsx';

export function Input({ className, ...props }) {
    return (
        <input
            className={clsx(
                "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm",
                "placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...props}
        />
    );
}
