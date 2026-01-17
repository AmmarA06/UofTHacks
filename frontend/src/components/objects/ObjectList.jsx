import { ArrowUp, ArrowDown, ArrowUpDown, Tag, Package, Check } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { getClassColor } from '@/utils/colors';
import { formatTimeAgo, formatPosition } from '@/utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidencePill } from '../common/ConfidencePill';

export function ObjectList({ objects, onDelete, onView, selectedObjects, onSelect }) {
  const [sortColumn, setSortColumn] = useState('last_seen');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedObjects = [...objects].sort((a, b) => {
    let aVal, bVal;

    switch (sortColumn) {
      case 'class_name':
        aVal = a.class_name.toLowerCase();
        bVal = b.class_name.toLowerCase();
        break;
      case 'object_id':
        aVal = a.object_id;
        bVal = b.object_id;
        break;
      case 'confidence':
        aVal = a.avg_confidence;
        bVal = b.avg_confidence;
        break;
      case 'detections':
        aVal = a.detection_count;
        bVal = b.detection_count;
        break;
      case 'position':
        aVal = a.avg_position_z || 0;
        bVal = a.avg_position_z || 0;
        break;
      case 'last_seen':
        aVal = new Date(a.last_seen).getTime();
        bVal = new Date(b.last_seen).getTime();
        break;
      case 'status':
        aVal = a.is_present ? 1 : 0;
        bVal = b.is_present ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-black" />
      : <ArrowDown size={14} className="text-black" />;
  };

  const SortableHeader = ({ column, children, className = "" }) => (
    <button
      onClick={() => handleSort(column)}
      className={`flex items-center gap-1.5 hover:text-black transition-colors ${className}`}
    >
      <span>{children}</span>
      {getSortIcon(column)}
    </button>
  );

  const handleSelectToggle = (e, objectId) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(objectId);
    }
  };

  if (objects.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg font-medium">No objects found matching your criteria</p>
        <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 w-12">
                <Check size={16} className="opacity-50" />
              </th>
              <th className="px-4 py-3 min-w-[140px]">
                <SortableHeader column="class_name">Class</SortableHeader>
              </th>
              <th className="px-4 py-3 w-20">
                <SortableHeader column="object_id">ID</SortableHeader>
              </th>
              {/* Removed Confidence Header */}
              <th className="px-4 py-3 w-28 text-center">
                <SortableHeader column="detections" className="justify-center">Detections</SortableHeader>
              </th>
              <th className="px-4 py-3 w-32">
                <SortableHeader column="status">Status</SortableHeader>
              </th>
              <th className="px-4 py-3 min-w-[180px]">
                <SortableHeader column="position">Position (X, Y, Z)</SortableHeader>
              </th>
              <th className="px-4 py-3 min-w-[140px]">
                <SortableHeader column="last_seen">Last Seen</SortableHeader>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedObjects.map((object) => {
              const classColor = getClassColor(object.class_name);
              const isSelected = selectedObjects?.includes(object.object_id);
              return (
                <tr
                  key={object.object_id}
                  className={`hover:bg-gray-50/80 transition-colors group cursor-pointer ${
                    isSelected ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => onView(object)}
                >
                  <td className="px-4 py-3">
                    {onSelect && (
                      <button
                        onClick={(e) => handleSelectToggle(e, object.object_id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-accent border-accent'
                            : 'border-gray-300 hover:border-accent bg-white'
                        }`}
                      >
                        {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: classColor }}
                      />
                      <span className="font-medium text-gray-900 capitalize text-sm">
                        {object.class_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                      #{object.object_id}
                    </span>
                  </td>
                  {/* Removed Confidence Column */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                      {object.detection_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={object.is_present ? 'success' : 'error'}
                      text={object.is_present ? 'Present' : 'Absent'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500 tabular-nums tracking-tight">
                      {formatPosition(object.avg_position_x, object.avg_position_y, object.avg_position_z)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(object.last_seen)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
