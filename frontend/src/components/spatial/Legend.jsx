import { Card } from '../common/Card';
import { getClassColor } from '@/utils/colors';

export function Legend({ objects }) {
  // Get unique classes
  const uniqueClasses = [...new Set(objects.map(obj => obj.class_name))].sort();

  if (uniqueClasses.length === 0) {
    return null;
  }

  return (
    <Card className="absolute top-4 right-4 max-w-xs z-10">
      <h4 className="text-sm font-semibold text-foreground mb-3">Legend</h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {uniqueClasses.map((className) => {
          const color = getClassColor(className);
          const count = objects.filter(obj => obj.class_name === className).length;

          return (
            <div key={className} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-foreground capitalize truncate">
                  {className}
                </span>
              </div>
              <span className="text-xs text-foreground-muted font-mono">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border text-xs text-foreground-subtle space-y-1">
        <p>Controls:</p>
        <p>• Left click + drag to rotate</p>
        <p>• Scroll to zoom</p>
        <p>• Right click + drag to pan</p>
      </div>
    </Card>
  );
}
