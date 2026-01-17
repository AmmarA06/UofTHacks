import { getClassColor } from '@/utils/colors';
import { Edit2, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { clsx } from 'clsx';

export function ClassCard({ classData, stats, onEdit, onDelete, onViewObjects }) {
    // Use the color from classData, fallback to getClassColor if not set
    const classColor = classData.color || getClassColor(classData.class_name);

    return (
        <div className="bg-gradient-to-br from-background-elevated to-background-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-border-hover transition-all duration-200 relative">
            {/* Subtle color accent based on class color */}
            <div
                className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-bl-full"
                style={{ backgroundColor: classColor }}
            />

            {/* Header */}
            <div className="p-5 border-b border-border bg-background-subtle relative z-10">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 shadow-md"
                        style={{
                            backgroundColor: classColor
                        }}
                    />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground capitalize leading-snug">
                            {classData.name || classData.class_name || 'Unknown Class'}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Content - Category and Description */}
            <div className="px-5 py-4 bg-background-elevated relative z-10 space-y-4">
                <div>
                    <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                        Category
                    </div>
                    <div className="text-sm text-foreground capitalize font-medium">
                        {classData.category || <span className="text-foreground-subtle italic font-normal">No category set</span>}
                    </div>
                </div>

                <div>
                    <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1.5">
                        Description
                    </div>
                    <div className="text-sm text-foreground leading-relaxed">
                        {classData.description || <span className="text-foreground-subtle italic">No description provided</span>}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 border-t border-border bg-background-subtle flex items-center justify-end gap-2 relative z-10">
                {onViewObjects && (
                    <button
                        onClick={() => onViewObjects(classData.class_name)}
                        className="p-1.5 text-foreground-muted hover:text-accent hover:bg-accent/10 rounded transition-colors"
                        title="View objects"
                    >
                        <Eye size={16} />
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={() => onEdit(classData)}
                        className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-background-hover rounded transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(classData.class_id)}
                        className="p-1.5 text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
