import { getClassColor } from '@/utils/colors';
import { Edit2, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { clsx } from 'clsx';

export function ClassCard({ classData, stats, onEdit, onDelete, onViewObjects }) {
    const classColor = getClassColor(classData.class_name);
    const objectCount = stats?.total_objects || 0;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: classColor }}
                        />
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 capitalize leading-snug">
                                {classData.name || classData.class_name || 'Unknown Class'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5 capitalize">
                                {classData.category || classData.name || classData.class_name || 'Uncategorized'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {classData.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <ToggleRight size={14} />
                                Active
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                <ToggleLeft size={14} />
                                Inactive
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 bg-gray-50/50">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="text-xl font-bold text-gray-900">{objectCount}</div>
                        <div className="text-xs text-gray-500">Objects</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-gray-900">
                            {stats?.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(0)}%` : '—'}
                        </div>
                        <div className="text-xs text-gray-500">Avg Confidence</div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                {onViewObjects && (
                    <button
                        onClick={() => onViewObjects(classData.class_name)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View objects"
                    >
                        <Eye size={16} />
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={() => onEdit(classData)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(classData.class_id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
