import { clsx } from 'clsx';
import { Check, X, AlertCircle } from 'lucide-react';

export function StatusBadge({ status, text, className }) {
    // status: 'success', 'warning', 'error', 'neutral'
    const styles = {
        success: 'bg-green-100 text-green-700 ring-green-500/30',
        warning: 'bg-yellow-100 text-yellow-700 ring-yellow-500/30',
        error: 'bg-red-100 text-red-700 ring-red-500/30',
        neutral: 'bg-gray-100 text-gray-700 ring-gray-400/30',
        blue: 'bg-gray-100 text-gray-700 ring-gray-400/30',
    };

    const icons = {
        success: Check,
        warning: AlertCircle,
        error: X,
        neutral: null,
        blue: null
    };

    const Icon = icons[status];

    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset",
                styles[status] || styles.neutral,
                className
            )}
        >
            {Icon && <Icon size={12} strokeWidth={3} />}
            <span className={clsx(status === 'neutral' ? 'mt-[1px]' : '')}>{text}</span>
        </span>
    );
}
