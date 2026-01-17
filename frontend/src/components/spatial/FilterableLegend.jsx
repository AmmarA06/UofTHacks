import { useState } from 'react';
import { Card } from '../common/Card';
import { getClassColor } from '@/utils/colors';
import { ChevronDown, Eye, EyeOff, Layers } from 'lucide-react';

export function FilterableLegend({ objects, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('all');

  // Get unique classes with counts
  const classStats = {};
  objects.forEach(obj => {
    if (!classStats[obj.class_name]) {
      classStats[obj.class_name] = 0;
    }
    classStats[obj.class_name]++;
  });

  const uniqueClasses = Object.keys(classStats).sort();

  const handleClassSelect = (className) => {
    setSelectedClass(className);
    setIsOpen(false);
    if (onFilterChange) {
      onFilterChange(className);
    }
  };

  const getDisplayInfo = () => {
    if (selectedClass === 'all') {
      return {
        label: 'All Objects',
        count: objects.length,
        color: '#0070f3'
      };
    }
    return {
      label: selectedClass,
      count: classStats[selectedClass] || 0,
      color: getClassColor(selectedClass)
    };
  };

  const displayInfo = getDisplayInfo();

  if (uniqueClasses.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-20 w-64">
      {/* Dropdown Button */}
      <div className="bg-white/95 backdrop-blur-md border border-border rounded-lg shadow-md p-3">
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {selectedClass === 'all' ? (
                  <Layers className="w-5 h-5 text-accent" />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: displayInfo.color }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground capitalize truncate">
                    {displayInfo.label}
                  </span>
                  <span className="text-xs text-foreground-muted bg-background-subtle px-2 py-0.5 rounded-full font-mono">
                    {displayInfo.count}
                  </span>
                </div>
                <div className="text-xs text-foreground-subtle mt-0.5">
                  {selectedClass === 'all' ? 'Showing all types' : 'Isolated view'}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-foreground-muted transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="mt-3 pt-3 border-t border-border max-h-80 overflow-y-auto">
            {/* All Objects Option */}
            <button
              onClick={() => handleClassSelect('all')}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all ${
                selectedClass === 'all'
                  ? 'bg-accent/10 border border-accent/30'
                  : 'hover:bg-background-hover'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Layers className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">All Objects</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted font-mono bg-background-subtle px-2 py-0.5 rounded-full">
                  {objects.length}
                </span>
                {selectedClass === 'all' && <Eye className="w-4 h-4 text-accent" />}
              </div>
            </button>

            {/* Separator */}
            <div className="my-2 border-t border-border" />

            {/* Individual Class Options */}
            <div className="space-y-1">
              {uniqueClasses.map((className) => {
                const color = getClassColor(className);
                const count = classStats[className];
                const isSelected = selectedClass === className;

                return (
                  <button
                    key={className}
                    onClick={() => handleClassSelect(className)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-background-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-foreground capitalize truncate">
                        {className}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground-muted font-mono bg-background-subtle px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                      {isSelected ? (
                        <Eye className="w-4 h-4 text-accent" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-foreground-subtle" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
