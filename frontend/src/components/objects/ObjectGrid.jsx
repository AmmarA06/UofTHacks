import { ObjectCard } from './ObjectCard';
import { Spinner } from '../common/Spinner';

export function ObjectGrid({ objects, loading, error, onDelete, onView, selectedObjects, onSelect }) {
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
      <div className="text-center py-12">
        <p className="text-foreground-muted text-lg">No objects found</p>
        <p className="text-foreground-subtle text-sm mt-2">
          Objects will appear here as they are detected
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {objects.map((object) => (
        <ObjectCard
          key={object.object_id}
          object={object}
          onDelete={onDelete}
          onView={onView}
          selected={selectedObjects?.includes(object.object_id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
