import { clsx } from 'clsx';
import { Check, X, AlertCircle } from 'lucide-react';

export function StatusBadge({ status, text, className }) {
    // status: 'success', 'warning', 'error', 'neutral'
    const styles = {
        success: 'bg-green-50 text-green-700 ring-green-600/20',
        warning: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        error: 'bg-red-50 text-red-700 ring-red-600/20',
        neutral: 'bg-gray-50 text-gray-600 ring-gray-500/10',
        blue: 'bg-blue-50 text-blue-700 ring-blue-700/10',
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
