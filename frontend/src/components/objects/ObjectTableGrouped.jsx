import { useState, useEffect } from 'react';
import { Spinner } from '../common/Spinner';
import { formatTimeAgo, formatPosition } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';
import { groupsAPI } from '@/api/endpoints';
import { TableAssignmentModal } from './TableAssignmentModal';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidencePill } from '../common/ConfidencePill';
import { clsx } from 'clsx';
import {
  Trash2,
  Check,
  Maximize2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Tag,
  Package,
  Table2,
  ChevronDown,
  ChevronRight,
  FolderInput,
  X
} from 'lucide-react';

export function ObjectTableGrouped({ objects, loading, error, onDelete, onView, selectedObjects, onSelect }) {
  const [sortColumn, setSortColumn] = useState('last_seen');
  const [sortDirection, setSortDirection] = useState('desc');
  const [objectGroups, setObjectGroups] = useState({});
  const [allGroups, setAllGroups] = useState([]);
  const [collapsedTables, setCollapsedTables] = useState(new Set());
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [objectsToAssign, setObjectsToAssign] = useState([]);

  // Fetch group data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const groupsResponse = await groupsAPI.getAll();
        setAllGroups(groupsResponse.data);

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
      } catch (err) {
        console.error('Failed to fetch groups:', err);
      }
    };

    if (objects.length > 0) fetchData();
  }, [objects]);

  const toggleTable = (tableId) => {
    setCollapsedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-black" />
      : <ArrowDown size={14} className="text-black" />;
  };

  // Group objects logic
  const groupedObjects = {};
  const ungroupedObjects = [];

  objects.forEach(obj => {
    const groups = objectGroups[obj.object_id] || [];
    const tableGroups = groups.filter(g => g.group_name.startsWith('Table '));

    if (tableGroups.length > 0) {
      tableGroups.forEach(tableGroup => {
        if (!groupedObjects[tableGroup.group_id]) {
          groupedObjects[tableGroup.group_id] = { group: tableGroup, objects: [] };
        }
        groupedObjects[tableGroup.group_id].objects.push(obj);
      });
    } else {
      ungroupedObjects.push(obj);
    }
  });

  const sortObjects = (objectList) => {
    return [...objectList].sort((a, b) => {
      // ... existing sort logic ...
      let aVal, bVal;
      switch (sortColumn) {
        case 'class_name': aVal = a.class_name.toLowerCase(); bVal = b.class_name.toLowerCase(); break;
        case 'object_id': aVal = a.object_id; bVal = b.object_id; break;
        case 'confidence': aVal = a.avg_confidence; bVal = b.avg_confidence; break;
        case 'detections': aVal = a.detection_count; bVal = b.detection_count; break;
        case 'position': aVal = a.avg_position_z; bVal = b.avg_position_z; break;
        case 'last_seen': aVal = new Date(a.last_seen).getTime(); bVal = new Date(b.last_seen).getTime(); break;
        case 'status': aVal = a.is_present ? 1 : 0; bVal = b.is_present ? 1 : 0; break;
        default: return 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const actions = {
    handleSelectToggle: (e, key) => { e.stopPropagation(); onSelect && onSelect(key); },
    handleDelete: (e, objectId) => { e.stopPropagation(); onDelete && onDelete(objectId); },
    handleView: (object) => onView && onView(object),
    handleAssignToTable: (e, objectId) => { e.stopPropagation(); setObjectsToAssign([objectId]); setAssignmentModalOpen(true); },
    handleBulkAssign: () => {
      const objectIds = [...new Set(selectedObjects.map(k => parseInt(k.split('-').pop())))];
      setObjectsToAssign(objectIds);
      setAssignmentModalOpen(true);
    },
    handleDeleteTable: async (e, id, name) => {
      e.stopPropagation();
      if (window.confirm(`Delete "${name}"? Objects moved to Unclassified.`)) {
        try { await groupsAPI.delete(id); window.location.reload(); } catch (e) { console.error(e); }
      }
    },
    handleAssignmentComplete: () => window.location.reload()
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  if (!objects.length) return (
    <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
      <Package className="mx-auto text-gray-300 mb-4" size={48} />
      <p className="text-gray-500 font-medium">No objects found</p>
    </div>
  );

  const SortableHeader = ({ column, children, className }) => (
    <button onClick={() => handleSort(column)} className={`flex items-center gap-1.5 hover:text-black transition-colors ${className}`}>
      <span>{children}</span>
      {getSortIcon(column)}
    </button>
  );

  const renderObjectRow = (object, tableId = null) => {
    const classColor = getClassColor(object.class_name);
    const selectionKey = tableId ? `${tableId}-${object.object_id}` : object.object_id;
    const isSelected = selectedObjects?.includes(selectionKey);
    const groups = objectGroups[object.object_id] || [];

    return (
      <tr
        key={selectionKey}
        onClick={() => actions.handleView(object)}
        className={clsx(
          "hover:bg-gray-50 cursor-pointer transition-colors group",
          isSelected ? 'bg-blue-50/50' : ''
        )}
      >
        <td className="px-4 py-3">
          {onSelect && (
            <button
              onClick={(e) => actions.handleSelectToggle(e, selectionKey)}
              className={clsx(
                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
              )}
            >
              {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
            </button>
          )}
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: classColor }} />
            <span className="font-medium text-gray-900 capitalize text-sm">{object.class_name}</span>
          </div>
        </td>

        <td className="px-4 py-3">
          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">#{object.object_id}</span>
        </td>

        {/* Removed Confidence Column */}

        <td className="px-4 py-3">
          <span className="text-sm text-gray-600 tabular-nums">{object.detection_count}</span>
        </td>

        <td className="px-4 py-3">
          <StatusBadge
            status={object.is_present ? 'success' : 'neutral'}
            text={object.is_present ? 'Present' : 'Absent'}
          />
        </td>

        <td className="px-4 py-3">
          <span className="font-mono text-xs text-gray-500 tabular-nums tracking-tight">
            {formatPosition(object.avg_position_x, object.avg_position_y, object.avg_position_z)}
          </span>
        </td>

        <td className="px-4 py-3">
          {groups.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {groups.filter(g => !g.group_name.startsWith('Table ')).slice(0, 2).map((group) => (
                <span key={group.group_id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded border border-blue-100">
                  <Tag size={10} />
                  {group.group_name}
                </span>
              ))}
              {groups.filter(g => !g.group_name.startsWith('Table ')).length > 2 && (
                <span className="text-[10px] text-gray-400">+{groups.filter(g => !g.group_name.startsWith('Table ')).length - 2}</span>
              )}
            </div>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>

        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 whitespace-nowrap">{formatTimeAgo(object.last_seen)}</span>
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => actions.handleAssignToTable(e, object.object_id)} className="p-1.5 hover:bg-gray-100 hover:text-blue-600 rounded text-gray-400" title="Assign to table"><FolderInput size={16} /></button>
            <button onClick={() => actions.handleView(object)} className="p-1.5 hover:bg-gray-100 hover:text-black rounded text-gray-400" title="View details"><Maximize2 size={16} /></button>
            {onDelete && <button onClick={(e) => actions.handleDelete(e, object.object_id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400" title="Delete"><Trash2 size={16} /></button>}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bulk actions */}
      {selectedObjects?.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
          <span className="text-blue-900 font-medium text-sm">{selectedObjects.length} object(s) selected</span>
          <button onClick={actions.handleBulkAssign} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition-all"><FolderInput size={16} /> Assign to Table</button>
        </div>
      )}

      {/* Tables */}
      {Object.entries(groupedObjects)
        .sort(([, a], [, b]) => parseInt(a.group.group_name.replace('Table ', '')) - parseInt(b.group.group_name.replace('Table ', '')))
        .map(([groupId, { group, objects: tableObjects }]) => {
          const isCollapsed = collapsedTables.has(groupId);
          return (
            <div key={groupId} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleTable(groupId)}>
                <div className="flex items-center gap-3">
                  <button className="text-gray-400 hover:text-gray-600 transition-colors transform duration-200">
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <Table2 size={18} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{group.group_name}</h3>
                  <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{tableObjects.length}</span>
                </div>
                {group.group_name !== 'Unclassified' && (
                  <button onClick={(e) => actions.handleDeleteTable(e, groupId, group.group_name)} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition-colors"><X size={16} /></button>
                )}
              </div>
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/30 border-b border-gray-100">
                      <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 w-10"><Check size={14} className="opacity-0" /></th>
                        <th className="px-4 py-3 text-left"><SortableHeader column="class_name">Class</SortableHeader></th>
                        <th className="px-4 py-3 text-left"><SortableHeader column="object_id">ID</SortableHeader></th>
                        {/* Removed Confidence Header */}
                        <th className="px-4 py-3 text-left"><SortableHeader column="detections">Detections</SortableHeader></th>
                        <th className="px-4 py-3 text-left"><SortableHeader column="status">Status</SortableHeader></th>
                        <th className="px-4 py-3 text-left"><SortableHeader column="position">Position</SortableHeader></th>
                        <th className="px-4 py-3 text-left"><div className="flex items-center gap-1.5"><Tag size={14} /><span>Groups</span></div></th>
                        <th className="px-4 py-3 text-left"><SortableHeader column="last_seen">Last Seen</SortableHeader></th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sortObjects(tableObjects).map(obj => renderObjectRow(obj, groupId))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

      {/* Ungrouped */}
      {ungroupedObjects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-200">
            <Package size={18} className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Ungrouped Objects</h3>
            <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{ungroupedObjects.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/30 border-b border-gray-100">
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-10"><Check size={14} className="opacity-0" /></th>
                  <th className="px-4 py-3 text-left"><SortableHeader column="class_name">Class</SortableHeader></th>
                  <th className="px-4 py-3 text-left"><SortableHeader column="object_id">ID</SortableHeader></th>
                  {/* Removed Confidence Header */}
                  <th className="px-4 py-3 text-left"><SortableHeader column="detections">Detections</SortableHeader></th>
                  <th className="px-4 py-3 text-left"><SortableHeader column="status">Status</SortableHeader></th>
                  <th className="px-4 py-3 text-left"><SortableHeader column="position">Position</SortableHeader></th>
                  <th className="px-4 py-3 text-left"><div className="flex items-center gap-1.5"><Tag size={14} /><span>Groups</span></div></th>
                  <th className="px-4 py-3 text-left"><SortableHeader column="last_seen">Last Seen</SortableHeader></th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortObjects(ungroupedObjects).map(obj => renderObjectRow(obj))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TableAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        objectIds={objectsToAssign}
        onAssigned={actions.handleAssignmentComplete}
      />
    </div>
  );
}
