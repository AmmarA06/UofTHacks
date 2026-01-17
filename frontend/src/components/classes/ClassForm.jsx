import { useState, useEffect } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

const CATEGORY_OPTIONS = [
  'electronics',
  'office',
  'kitchen',
  'personal',
  'accessories',
  'tools',
  'food & drink',
  'home',
  'wearables',
  'audio',
  'general',
  'other',
];

export function ClassForm({ initialData, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    color: '#45b7d1',
    description: '',
    confidence_override: '',
    distance_threshold: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        color: initialData.color || '#45b7d1',
        description: initialData.description || '',
        confidence_override: initialData.confidence_override || '',
        distance_threshold: initialData.distance_threshold || '',
      });
      // Show advanced if there's data
      if (initialData.confidence_override || initialData.distance_threshold) {
        setShowAdvanced(true);
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build the submission data
    const data = {
      name: formData.name.trim(),
      category: formData.category || null,
      color: formData.color || null,
      description: formData.description.trim() || null,
      is_active: true, // Always set new/updated classes as active
    };

    // Add advanced fields if provided
    if (formData.confidence_override) {
      data.confidence_override = parseFloat(formData.confidence_override);
    }
    if (formData.distance_threshold) {
      data.distance_threshold = parseFloat(formData.distance_threshold);
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name (Required) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Class Name <span className="text-error">*</span>
        </label>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., laptop computer, coffee mug"
          required
          disabled={loading}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          disabled={loading}
          className="bg-background-elevated border-2 border-border rounded-lg px-3 py-2 text-foreground w-full focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
        >
          <option value="">Select category...</option>
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Color
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            name="color"
            value={formData.color}
            onChange={handleChange}
            disabled={loading}
            className="w-12 h-10 rounded-lg border-2 border-border cursor-pointer shadow-sm"
          />
          <Input
            name="color"
            value={formData.color}
            onChange={handleChange}
            placeholder="#45b7d1"
            disabled={loading}
            className="flex-1"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe this class (optional)..."
          disabled={loading}
          rows={3}
          className="bg-background-elevated border-2 border-border rounded-lg px-3 py-2 text-foreground w-full focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm placeholder:text-foreground-subtle resize-none"
        />
      </div>

      {/* Advanced Settings Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Settings
        </button>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-border">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confidence Override
            </label>
            <Input
              name="confidence_override"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.confidence_override}
              onChange={handleChange}
              placeholder="0.0 - 1.0"
              disabled={loading}
            />
            <p className="text-xs text-foreground-subtle mt-1">
              Minimum confidence threshold for this class
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Distance Threshold (mm)
            </label>
            <Input
              name="distance_threshold"
              type="number"
              step="1"
              min="0"
              value={formData.distance_threshold}
              onChange={handleChange}
              placeholder="e.g., 100"
              disabled={loading}
            />
            <p className="text-xs text-foreground-subtle mt-1">
              Maximum distance to merge detections for this class
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" variant="primary" disabled={loading || !formData.name.trim()}>
          {loading ? 'Saving...' : initialData ? 'Update Class' : 'Create Class'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
