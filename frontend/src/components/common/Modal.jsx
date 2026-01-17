import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export function Modal({ isOpen, onClose, title, children, footer, className }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={clsx(
                "relative bg-background-elevated rounded-lg shadow-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-hidden",
                "animate-in fade-in zoom-in-95 duration-200",
                className
            )}>
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background-subtle">
                        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-foreground-muted hover:text-foreground hover:bg-background-hover rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh] bg-background-elevated">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-border bg-background-subtle">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
