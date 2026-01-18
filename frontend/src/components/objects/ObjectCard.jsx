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
            className={`group relative bg-white rounded-lg border overflow-hidden shadow-md hover:shadow-xl hover:border-gray-300 transition-all duration-200 cursor-pointer ${selected ? 'ring-2 ring-[#1a1a1a] border-[#1a1a1a] shadow-lg' : 'border-gray-200'
                }`}
            onClick={handleCardClick}
        >
            {/* Checkbox */}
            {onSelect && (
                <button
                    onClick={handleCheckboxClick}
                    className={`absolute top-3 right-3 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all shadow-md ${
                        selected
                            ? 'bg-[#1a1a1a] border-[#1a1a1a]'
                            : 'border-white bg-white/90 hover:bg-[#1a1a1a] hover:border-[#1a1a1a]'
                    }`}
                >
                    {selected && <Check size={16} className="text-white" strokeWidth={3} />}
                </button>
            )}

            {/* Image */}
            <div className="relative w-full aspect-[4/3] rounded-t-lg overflow-hidden bg-gray-50 border-b border-gray-200">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={object.class_name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <Activity size={24} className="mb-2 opacity-40 text-gray-400" />
                        <span className="text-xs">No Preview</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-2 bg-white">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-[#1a1a1a] capitalize">
                            {object.class_name}
                        </h3>
                        <span className="text-xs font-mono text-gray-500">#{object.object_id}</span>
                    </div>
                    <StatusBadge
                        status={object.is_present ? 'success' : 'error'}
                        text={object.is_present ? 'Present' : 'Absent'}
                    />
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Activity size={12} className="text-gray-400" />
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
