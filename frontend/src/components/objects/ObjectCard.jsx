import { useState, useEffect } from 'react';
import { formatTimeAgo, formatPosition } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';
import { objectsAPI } from '@/api/endpoints';
import { Activity, Check } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';

export function ObjectCard({ object, onDelete, onView, selected, onSelect }) {
    const [thumbnail, setThumbnail] = useState(null);

    useEffect(() => {
        if (object.has_thumbnail) {
            objectsAPI.getThumbnail(object.object_id)
                .then(response => {
                    const url = URL.createObjectURL(response.data);
                    setThumbnail(url);
                })
                .catch(err => console.error('Failed to load thumbnail:', err));
        }

        return () => {
            if (thumbnail) {
                URL.revokeObjectURL(thumbnail);
            }
        };
    }, [object.object_id, object.has_thumbnail]);

    const handleCardClick = () => {
        if (onView) {
            onView(object);
        }
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
        if (onSelect) {
            onSelect(object.object_id);
        }
    };

    return (
        <div
            className={`group relative bg-gradient-to-br from-background-elevated to-background-card rounded-lg border overflow-hidden shadow-sm hover:shadow-md hover:border-border-hover transition-all duration-200 cursor-pointer ${selected ? 'ring-2 ring-accent border-accent' : 'border-border'
                }`}
            onClick={handleCardClick}
        >
            {/* Checkbox */}
            {onSelect && (
                <button
                    onClick={handleCheckboxClick}
                    className={`absolute top-3 right-3 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all shadow-sm ${
                        selected
                            ? 'bg-accent border-accent'
                            : 'border-white bg-white/90 hover:bg-accent hover:border-accent'
                    }`}
                >
                    {selected && <Check size={16} className="text-white" strokeWidth={3} />}
                </button>
            )}

            {/* Image */}
            <div className="relative w-full aspect-[4/3] rounded-t-lg overflow-hidden bg-gradient-to-br from-background-subtle to-background-hover border-b border-border">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={object.class_name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-foreground-muted bg-gradient-to-br from-accent-bg to-background-subtle">
                        <Activity size={24} className="mb-2 opacity-40 text-accent" />
                        <span className="text-xs">No Preview</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-2 bg-background-elevated">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground capitalize">
                            {object.class_name}
                        </h3>
                        <span className="text-xs font-mono text-foreground-subtle">#{object.object_id}</span>
                    </div>
                    <StatusBadge
                        status={object.is_present ? 'success' : 'error'}
                        text={object.is_present ? 'Present' : 'Absent'}
                    />
                </div>

                <div className="pt-2 border-t border-border-light flex items-center justify-between text-xs text-foreground-muted">
                    <div className="flex items-center gap-1">
                        <Activity size={12} className="text-accent" />
                        <span className="font-mono">
                            {formatPosition(object.avg_position_x, object.avg_position_y, object.avg_position_z)}
                        </span>
                    </div>
                    <span>{formatTimeAgo(object.last_seen)}</span>
                </div>
            </div>
        </div>
    );
}
