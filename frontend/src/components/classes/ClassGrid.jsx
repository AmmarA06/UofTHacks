import { ClassCard } from './ClassCard';
import { Spinner } from '../common/Spinner';

export function ClassGrid({ classes, loading, error, onEdit, onDelete, onViewObjects, stats }) {
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
        <p className="text-error">Error loading classes: {error}</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-muted text-lg">No classes found</p>
        <p className="text-foreground-subtle text-sm mt-2">
          Create classes using the "New Class" button above
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((classData) => (
        <ClassCard
          key={classData.class_id}
          classData={classData}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewObjects={onViewObjects}
          stats={stats?.[classData.class_id]}
        />
      ))}
    </div>
  );
}
