import { useState, useEffect } from 'react';
import { useObjects } from '@/hooks/useObjects';
import { ObjectGrid } from '@/components/objects/ObjectGrid';
import { ObjectList } from '@/components/objects/ObjectList';
import { ObjectTableGrouped } from '@/components/objects/ObjectTableGrouped';
import { ObjectDetail } from '@/components/objects/ObjectDetail';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { PageHeader } from '@/components/common/PageHeader';
import { PageTransition } from '@/components/common/PageTransition';
import { objectsAPI } from '@/api/endpoints';
import { Search, Trash2, CheckSquare, Square, LayoutGrid, List, Table2, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

const ITEMS_PER_PAGE = 64;

export function ObjectBrowser() {
  const [search, setSearch] = useState('');
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', or 'table'
  const [currentPage, setCurrentPage] = useState(1);

  const params = { query: search };

  const { objects, loading, error, refetch } = useObjects(params);

  const handleDelete = async (objectId) => {
    if (window.confirm('Are you sure you want to delete this object?')) {
      try {
        await objectsAPI.delete(objectId);
        refetch();
      } catch (err) {
        console.error('Failed to delete object:', err);
        alert('Failed to delete object');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedObjects.length === 0) return;

    // Extract unique object IDs from selection keys
    const objectIds = [...new Set(selectedObjects.map(key => {
      const parts = String(key).split('-');
      return parseInt(parts[parts.length - 1]); // Get last part (objectId)
    }))];

    if (window.confirm(`Are you sure you want to delete ${objectIds.length} selected object(s)?`)) {
      try {
        const response = await objectsAPI.bulkDelete(objectIds);
        console.log(`Deleted ${response.data.total_deleted} objects`);
        setSelectedObjects([]);
        refetch();
      } catch (err) {
        console.error('Failed to bulk delete:', err);
        alert('Failed to delete objects');
      }
    }
  };

  const handleSelect = (key) => {
    setSelectedObjects(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (viewMode === 'table') {
      return;
    }

    const currentPageIds = paginatedObjects.map(obj => obj.object_id);
    const allSelected = currentPageIds.every(id => selectedObjects.includes(id));

    if (allSelected) {
      setSelectedObjects(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedObjects(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(objects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedObjects = objects.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 py-8">
        {/* Header */}
        <PageHeader
          title="Object Browser"
          description="Browse, search, and manage all detected objects from your visual database."
        />

        {/* Filters & Actions */}
        <div className="space-y-4">
          {/* Main filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle group-focus-within:text-accent transition-colors" size={18} />
              <Input
                type="text"
                placeholder="Search by ID, class name, or table name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full bg-background-elevated border-border focus:border-accent focus:ring-accent transition-all"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex bg-white border border-gray-200 p-1 rounded-full gap-1 shadow-md">
              {[
                { mode: 'grid', icon: LayoutGrid, label: 'Grid' },
                { mode: 'list', icon: List, label: 'List' },
                { mode: 'table', icon: Table2, label: 'Table' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    "px-4 py-2 flex items-center gap-2 rounded-full text-[13px] font-medium transition-all duration-200",
                    viewMode === mode
                      ? "bg-white text-[#1a1a1a] shadow-sm"
                      : "text-gray-500 hover:text-[#1a1a1a]"
                  )}
                  title={`${label} view`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selection actions */}
          {paginatedObjects.length > 0 && (
            <div className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-gray-200 shadow-md">
              <Button
                variant="secondary"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                {paginatedObjects.every(obj => selectedObjects.includes(obj.object_id)) ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
                {paginatedObjects.every(obj => selectedObjects.includes(obj.object_id)) ? 'Deselect Page' : 'Select Page'}
              </Button>

              {selectedObjects.length > 0 && (
                <>
                  <span className="text-[13px] text-gray-500">
                    {selectedObjects.length} selected
                  </span>
                  <Button
                    variant="danger"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Selected
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="text-[13px] text-gray-500 border-b border-gray-100 pb-4">
            Found <span className="font-medium text-[#1a1a1a]">{objects.length}</span> object{objects.length !== 1 ? 's' : ''}
            {objects.length > ITEMS_PER_PAGE && (
              <span> • Showing {startIndex + 1}-{Math.min(endIndex, objects.length)}</span>
            )}
            {selectedObjects.length > 0 && ` • (${selectedObjects.length} selected)`}
          </div>
        )}

        {/* Objects Grid, List, or Table */}
        <div className="min-h-[400px]">
          {viewMode === 'grid' ? (
            <ObjectGrid
              objects={paginatedObjects}
              loading={loading}
              error={error}
              onView={setSelectedObject}
              onDelete={handleDelete}
              selectedObjects={selectedObjects}
              onSelect={handleSelect}
            />
          ) : viewMode === 'list' ? (
            <ObjectList
              objects={paginatedObjects}
              loading={loading}
              error={error}
              onView={setSelectedObject}
              onDelete={handleDelete}
              selectedObjects={selectedObjects}
              onSelect={handleSelect}
            />
          ) : (
            <ObjectTableGrouped
              objects={paginatedObjects}
              loading={loading}
              error={error}
              onView={setSelectedObject}
              onDelete={handleDelete}
              selectedObjects={selectedObjects}
              onSelect={handleSelect}
            />
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-6">
            <Button
              variant="secondary"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft size={18} />
              Previous
            </Button>

            <div className="text-sm text-gray-500">
              Page <span className="font-semibold text-black">{currentPage}</span> of{' '}
              <span className="font-semibold text-black">{totalPages}</span>
            </div>

            <Button
              variant="secondary"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight size={18} />
            </Button>
          </div>
        )}

        {/* Object Detail Modal */}
        <ObjectDetail
          object={selectedObject}
          isOpen={!!selectedObject}
          onClose={() => setSelectedObject(null)}
        />
      </div>
    </PageTransition>
  );
}
