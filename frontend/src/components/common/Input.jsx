import { clsx } from 'clsx';

export function Input({ className, ...props }) {
    return (
        <input
            className={clsx(
                "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[#1a1a1a] text-[14px]",
                "placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...props}
        />
    );
}
