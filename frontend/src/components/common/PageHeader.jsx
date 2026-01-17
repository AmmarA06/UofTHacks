import { clsx } from 'clsx';

export function PageHeader({ title, description, children, className }) {
    return (
        <div className={clsx("flex flex-col sm:flex-row sm:items-end justify-between gap-4", className)}>
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">{title}</h1>
                {description && (
                    <p className="mt-2 text-lg text-gray-500">{description}</p>
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
