import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { groupsAPI } from '@/api/endpoints';
import { Table2, Plus, Check, Edit2, X, Trash2 } from 'lucide-react';

export function TableAssignmentModal({ isOpen, onClose, objectIds, onAssigned }) {
  const [tables, setTables] = useState([]);
  const [selectedTableIds, setSelectedTableIds] = useState(new Set());
  const [newTableName, setNewTableName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingTableId, setEditingTableId] = useState(null);
  const [editingTableName, setEditingTableName] = useState('');

  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        await fetchTables();
        await loadCurrentAssignments();
      };
      init();
    } else {
      setSelectedTableIds(new Set());
      setIsCreatingNew(false);
      setNewTableName('');
      setError(null);
      setEditingTableId(null);
      setEditingTableName('');
    }
  }, [isOpen, objectIds]);

  const fetchTables = async () => {
    try {
      const response = await groupsAPI.getAll();
      const tableTables = response.data.filter(g =>
        g.group_name.startsWith('Table ')
      );
      setTables(tableTables);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      setError('Failed to load tables');
    }
  };

  const loadCurrentAssignments = async () => {
    if (objectIds.length === 0) return;

    try {
      if (objectIds.length === 1) {
        const response = await groupsAPI.getObjectGroups(objectIds[0]);
        const tableGroups = response.data.groups.filter(g =>
          g.group_name.startsWith('Table ')
        );
        const tableIds = new Set(tableGroups.map(g => g.group_id));
        setSelectedTableIds(tableIds);
      } else {
        const allTables = [];
        for (const objId of objectIds) {
          const response = await groupsAPI.getObjectGroups(objId);
          const tableGroups = response.data.groups
            .filter(g => g.group_name.startsWith('Table '))
            .map(g => g.group_id);
          allTables.push(new Set(tableGroups));
        }

        if (allTables.length > 0) {
          const intersection = allTables.reduce((acc, curr) =>
            new Set([...acc].filter(x => curr.has(x)))
          );
          setSelectedTableIds(intersection);
        }
      }
    } catch (err) {
      console.error('Failed to load current assignments:', err);
    }
  };

  const handleAssign = async () => {
    setLoading(true);
    setError(null);

    try {
      let finalSelectedIds = new Set(selectedTableIds);

      if (isCreatingNew) {
        const trimmedName = newTableName.trim();

        if (!trimmedName) {
          setError('Please enter a table name');
          setLoading(false);
          return;
        }

        if (!trimmedName.startsWith('Table ')) {
          setError('Table name must start with "Table " (e.g., "Table 1", "Table Desk")');
          setLoading(false);
          return;
        }

        try {
          const createResponse = await groupsAPI.create(trimmedName, 'User-created table');
          finalSelectedIds.add(createResponse.data.group_id);
          setIsCreatingNew(false);
          setNewTableName('');
        } catch (err) {
          if (err.response?.status === 400) {
            setError(`Table "${trimmedName}" already exists. Please choose a different name.`);
          } else {
            setError('Failed to create table');
          }
          setLoading(false);
          return;
        }
      }

      // Process assignments (same logic as before, simplified for display)
      for (const objId of objectIds) {
        const response = await groupsAPI.getObjectGroups(objId);
        const currentTables = response.data.groups
          .filter(g => g.group_name.startsWith('Table '))
          .map(g => g.group_id);
        const currentTableSet = new Set(currentTables);

        const toAdd = [...finalSelectedIds].filter(id => !currentTableSet.has(id));
        const toRemove = currentTables.filter(id => !finalSelectedIds.has(id));

        for (const tableId of toRemove) {
          await groupsAPI.removeObjects(tableId, [objId]);
        }
        for (const tableId of toAdd) {
          await groupsAPI.addObjects(tableId, [objId]);
        }
      }

      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      console.error('Failed to assign to tables:', err);
      setError('Failed to assign to tables');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    const tableNumbers = tables
      .filter(t => t.group_name.startsWith('Table '))
      .map(t => {
        const match = t.group_name.match(/Table (\d+)/);
        return match ? parseInt(match[1]) : 0;
      });

    const nextNum = tableNumbers.length > 0 ? Math.max(...tableNumbers) + 1 : 1;
    setNewTableName(`Table ${nextNum}`);
  };

  const toggleTableSelection = (tableId) => {
    const newSelection = new Set(selectedTableIds);
    if (newSelection.has(tableId)) {
      newSelection.delete(tableId);
    } else {
      newSelection.add(tableId);
    }
    setSelectedTableIds(newSelection);
  };

  const handleSaveRename = async (tableId) => {
    // ... Rename logic
    const trimmedName = editingTableName.trim();
    if (!trimmedName || !trimmedName.startsWith('Table ')) {
      setError('Invalid name');
      return;
    }
    try {
      await groupsAPI.update(tableId, { group_name: trimmedName });
      setEditingTableId(null);
      await fetchTables();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTable = async (table) => {
    if (!window.confirm(`Delete "${table.group_name}"?`)) return;
    try {
      await groupsAPI.delete(table.group_id);
      await fetchTables();
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign to Tables">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <p className="text-gray-500 text-sm">
          Assigning <span className="font-semibold text-gray-900">{objectIds.length} object{objectIds.length !== 1 ? 's' : ''}</span> to specific tables.
        </p>

        {/* Existing tables */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 border-l-2 border-blue-500 pl-2">Available Tables</h3>
            {tables.length > 0 && (
              <span className="text-xs text-gray-400">{selectedTableIds.size} selected</span>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
            {tables.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Table2 className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-500">No tables created yet.</p>
              </div>
            ) : (
              tables.map((table) => (
                <div
                  key={table.group_id}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 group ${selectedTableIds.has(table.group_id)
                      ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  {editingTableId === table.group_id ? (
                    <div className="flex items-center gap-2 flex-1 animate-in fade-in zoom-in-95">
                      <Input
                        autoFocus
                        value={editingTableName}
                        onChange={(e) => setEditingTableName(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(table.group_id)}
                      />
                      <button onClick={() => handleSaveRename(table.group_id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                      <button onClick={() => setEditingTableId(null)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => toggleTableSelection(table.group_id)}
                        className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedTableIds.has(table.group_id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                          }`}>
                          {selectedTableIds.has(table.group_id) && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Table2 size={16} className={selectedTableIds.has(table.group_id) ? "text-blue-600" : "text-gray-400"} />
                          <span className={`text-sm font-medium ${selectedTableIds.has(table.group_id) ? "text-blue-900" : "text-gray-700"}`}>
                            {table.group_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingTableId(table.group_id); setEditingTableName(table.group_name); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteTable(table)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )))}
          </div>
        </div>

        {/* Create new table */}
        <div className="pt-2">
          {!isCreatingNew ? (
            <Button
              variant="secondary"
              onClick={handleCreateNew}
              className="w-full border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30"
            >
              <Plus size={16} className="mr-2" />
              Create New Table
            </Button>
          ) : (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-in slide-in-from-top-2">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase">New Table Name</label>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g. Table 5"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAssign();
                    if (e.key === 'Escape') setIsCreatingNew(false);
                  }}
                />
                <Button variant="secondary" onClick={() => setIsCreatingNew(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
