// Predefined colors for common classes
const CLASS_COLORS = {
  'coffee mug': '#ff6b6b',
  'water bottle': '#4ecdc4',
  'laptop computer': '#45b7d1',
  'wireless mouse': '#f9ca24',
  'mechanical keyboard': '#f0932b',
  'smartphone': '#6c5ce7',
  'tablet': '#a29bfe',
  'headphones': '#fd79a8',
  'notebook': '#fdcb6e',
  'pen': '#00b894',
  'pencil': '#00cec9',
  'book': '#0984e3',
  'desk lamp': '#fab1a0',
  'plant pot': '#55efc4',
};

// Generate deterministic color from class name
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getClassColor(className) {
  if (!className) return '#888888';

  // Check if we have a predefined color
  if (CLASS_COLORS[className.toLowerCase()]) {
    return CLASS_COLORS[className.toLowerCase()];
  }

  // Generate color from hash
  const hue = hashString(className) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function getClassColorRgb(className) {
  const hex = getClassColor(className);

  // Convert HSL to RGB (simplified)
  if (hex.startsWith('hsl')) {
    const matches = hex.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const h = parseInt(matches[0]) / 360;
      const s = parseInt(matches[1]) / 100;
      const l = parseInt(matches[2]) / 100;

      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
      const g = Math.round(hue2rgb(p, q, h) * 255);
      const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

      return [r, g, b];
    }
  }

  // Convert hex to RGB
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [136, 136, 136];
}

export { CLASS_COLORS };
