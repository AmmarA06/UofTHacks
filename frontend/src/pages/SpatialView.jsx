import { useState } from 'react';
import { useObjects } from '@/hooks/useObjects';
import { Scene3D } from '@/components/spatial/Scene3D';
import { FilterableLegend } from '@/components/spatial/FilterableLegend';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/common/Button';
import { PageHeader } from '@/components/common/PageHeader';
import { PageTransition } from '@/components/common/PageTransition';
import { RefreshCw, Info } from 'lucide-react';

export function SpatialView() {
  const { objects, loading, error, refetch } = useObjects({ present: true });
  const [selectedClass, setSelectedClass] = useState('all');

  // Filter objects based on selected class
  const filteredObjects = selectedClass === 'all'
    ? objects
    : objects.filter(obj => obj.class_name === selectedClass);

  return (
    <PageTransition>
      <div className="space-y-6 py-8">
        {/* Header */}
        <PageHeader
          title="3D Spatial View"
          description="Interactive 3D visualization of detected object positions relative to the camera."
        >
          <Button
            variant="secondary"
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 bg-background-elevated border border-border hover:bg-background-hover text-foreground shadow-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </PageHeader>

        {/* 3D Scene Card */}
        <div className="relative bg-white border border-border rounded-lg overflow-hidden shadow-sm">
          {loading ? (
            <div className="w-full h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="w-full h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
              <div className="text-center">
                <p className="text-red-500 font-medium mb-2">Failed to load objects</p>
                <p className="text-foreground-muted text-sm">{error}</p>
              </div>
            </div>
          ) : objects.length === 0 ? (
            <div className="w-full h-[600px] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
              <div className="text-center text-foreground-muted">
                <p className="text-lg font-medium text-foreground">No objects to display</p>
                <p className="text-sm mt-2">Objects will appear here as they are detected</p>
              </div>
            </div>
          ) : (
            <>
              <Scene3D objects={filteredObjects} />
              {/* FilterableLegend positions itself absolutely in top-right */}
              <FilterableLegend objects={objects} onFilterChange={setSelectedClass} />
            </>
          )}
        </div>

        {/* Info Footer */}
        <div className="flex items-start gap-3 bg-gradient-to-br from-accent-bg to-blue-50 border border-accent-border rounded-lg p-4 text-sm text-foreground shadow-sm">
          <Info className="flex-shrink-0 text-accent mt-0.5" size={18} />
          <div className="space-y-1">
            <p className="font-medium text-foreground">About this view</p>
            <ul className="list-disc pl-4 space-y-1 text-foreground-muted">
              <li>Positions are in meters (converted from millimeters). Origin (0,0,0) is the camera.</li>
              <li>Sphere size indicates detection confidence and count.</li>
              <li>Hover over objects to see labels.</li>
              <li>Showing: <span className="font-semibold text-accent">{filteredObjects.length}</span> objects {selectedClass !== 'all' ? `(filtered by: ${selectedClass})` : ''}</li>
            </ul>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
