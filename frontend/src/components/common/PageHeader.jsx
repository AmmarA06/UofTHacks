import { clsx } from 'clsx';

export function PageHeader({ title, description, children, className }) {
    return (
        <div className={clsx("flex flex-col sm:flex-row sm:items-end justify-between gap-4", className)}>
            <div>
                <h1 className="text-[28px] font-medium tracking-[-0.02em] text-[#1a1a1a]">{title}</h1>
                {description && (
                    <p className="mt-1 text-[14px] text-gray-700">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    );
}
