import { useState, useEffect } from 'react';
import { formatTimeAgo, formatPosition } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';
import { objectsAPI } from '@/api/endpoints';
import { Activity } from 'lucide-react';
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

    return (
        <div
            className={`group relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-3 ${selected ? 'ring-2 ring-blue-500' : ''
                }`}
            onClick={handleCardClick}
        >
            {/* Image */}
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={object.class_name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Activity size={24} className="mb-2 opacity-30" />
                        <span className="text-xs">No Preview</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="mt-3 space-y-2">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 capitalize">
                            {object.class_name}
                        </h3>
                        <span className="text-xs font-mono text-gray-400">#{object.object_id}</span>
                    </div>
                    <StatusBadge
                        status={object.is_present ? 'success' : 'neutral'}
                        text={object.is_present ? 'Present' : 'Absent'}
                    />
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Activity size={12} className="text-blue-400" />
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
