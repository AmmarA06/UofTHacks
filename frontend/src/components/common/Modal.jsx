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
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={clsx(
                "relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[85vh] overflow-hidden",
                "animate-in fade-in zoom-in-95 duration-200",
                className
            )}>
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-[18px] font-medium text-[#1a1a1a]">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-[#1a1a1a] hover:bg-[#f3f3f3] rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh] bg-white">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-[#fafafa]">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
