import { useState, useEffect } from 'react';
import { Spinner } from '../common/Spinner';
import { formatTimeAgo, formatConfidence, formatPosition } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';
import { groupsAPI } from '@/api/endpoints';
import {
  Trash2,
  Check,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Tag,
  Package
} from 'lucide-react';

export function ObjectTable({ objects, loading, error, onDelete, onView, selectedObjects, onSelect }) {
  const [sortColumn, setSortColumn] = useState('last_seen');
  const [sortDirection, setSortDirection] = useState('desc');
  const [objectGroups, setObjectGroups] = useState({});

  // Fetch groups for all objects
  useEffect(() => {
    const fetchGroups = async () => {
      const groupsData = {};
      for (const obj of objects) {
        try {
          const response = await groupsAPI.getObjectGroups(obj.object_id);
          groupsData[obj.object_id] = response.data.groups;
        } catch (err) {
          groupsData[obj.object_id] = [];
        }
      }
      setObjectGroups(groupsData);
    };

    if (objects.length > 0) {
      fetchGroups();
    }
  }, [objects]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-accent" />
      : <ArrowDown size={14} className="text-accent" />;
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
        // Sort by Z distance
        aVal = a.avg_position_z || 0;
        bVal = b.avg_position_z || 0;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Error loading objects: {error}</p>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="text-center py-12 bg-background-elevated border border-border rounded-lg">
        <Package size={48} className="mx-auto text-foreground-subtle mb-4" />
        <p className="text-foreground-muted text-lg font-medium">No objects found</p>
        <p className="text-foreground-subtle text-sm mt-2">
          Objects will appear here as they are detected
        </p>
      </div>
    );
  }

  const handleSelectToggle = (e, objectId) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(objectId);
    }
  };

  const handleDelete = (e, objectId) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(objectId);
    }
  };

  const handleView = (object) => {
    if (onView) {
      onView(object);
    }
  };

  const SortableHeader = ({ column, children, className = "" }) => (
    <button
      onClick={() => handleSort(column)}
      className={`flex items-center gap-1.5 hover:text-foreground transition-colors ${className}`}
    >
      <span>{children}</span>
      {getSortIcon(column)}
    </button>
  );

  return (
    <div className="bg-background-elevated border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Table wrapper with horizontal scroll */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table header */}
          <thead className="bg-background-hover border-b border-border">
            <tr className="text-sm font-semibold text-foreground">
              <th className="px-4 py-3 text-left w-12">
                <Check size={16} className="opacity-50" />
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader column="class_name">Class</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader column="object_id">ID</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader column="confidence">Confidence</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader column="detections">Detections</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader column="status">Status</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader column="position">Position</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left min-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <Tag size={14} />
                  <span>Groups</span>
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader column="last_seen">Last Seen</SortableHeader>
              </th>
              <th className="px-4 py-3 text-right w-24">Actions</th>
            </tr>
          </thead>

          {/* Table body */}
          <tbody className="divide-y divide-border">
            {sortedObjects.map((object) => {
              const classColor = getClassColor(object.class_name);
              const isSelected = selectedObjects?.includes(object.object_id);
              const groups = objectGroups[object.object_id] || [];

              return (
                <tr
                  key={object.object_id}
                  onClick={() => handleView(object)}
                  className={`hover:bg-background-hover cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/5' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    {onSelect && (
                      <button
                        onClick={(e) => handleSelectToggle(e, object.object_id)}
                        className={`p-1 rounded transition-all ${
                          isSelected
                            ? 'bg-accent text-white'
                            : 'hover:bg-background text-foreground-muted'
                        }`}
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </td>

                  {/* Class name with color indicator */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-background-elevated"
                        style={{ backgroundColor: classColor }}
                      />
                      <span className="font-medium text-foreground capitalize">
                        {object.class_name}
                      </span>
                    </div>
                  </td>

                  {/* ID */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-foreground-muted bg-background px-2 py-0.5 rounded">
                      #{object.object_id}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[100px]">
                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all"
                            style={{ width: `${object.avg_confidence * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground min-w-[45px]">
                        {formatConfidence(object.avg_confidence)}
                      </span>
                    </div>
                  </td>

                  {/* Detections */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 bg-background rounded-full text-sm font-medium text-foreground">
                      {object.detection_count}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        object.is_present
                          ? 'bg-success/10 text-success'
                          : 'bg-foreground-subtle/10 text-foreground-subtle'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          object.is_present ? 'bg-success' : 'bg-foreground-subtle'
                        }`}
                      />
                      {object.is_present ? 'Present' : 'Absent'}
                    </span>
                  </td>

                  {/* Position */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-foreground-muted">
                      {formatPosition(object.avg_position_x, object.avg_position_y, object.avg_position_z)}
                    </span>
                  </td>

                  {/* Groups */}
                  <td className="px-4 py-3">
                    {groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {groups.slice(0, 2).map((group) => (
                          <span
                            key={group.group_id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-md"
                            title={group.group_name}
                          >
                            <Tag size={10} />
                            {group.group_name.length > 12
                              ? group.group_name.substring(0, 12) + '...'
                              : group.group_name}
                          </span>
                        ))}
                        {groups.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-foreground-subtle/10 text-foreground-subtle text-xs rounded-md">
                            +{groups.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-foreground-subtle text-xs">—</span>
                    )}
                  </td>

                  {/* Last seen */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground-muted whitespace-nowrap">
                      {formatTimeAgo(object.last_seen)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleView(object)}
                        className="p-1.5 hover:bg-background rounded transition-colors text-foreground-muted hover:text-foreground"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => handleDelete(e, object.object_id)}
                          className="p-1.5 hover:bg-error/10 hover:text-error rounded transition-colors text-foreground-muted"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
