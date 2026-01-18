import { useState } from 'react';
import { analyzeFloorPlan } from '../services/geminiService';
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Example component demonstrating how to use the geminiService
 * to analyze floor plan images
 */
function FloorPlanUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);

      // Create preview URL
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const shelves = await analyzeFloorPlan(file);
      setResult(shelves);
      console.log('Analysis result:', shelves);
    } catch (err) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Floor Plan Analyzer
        </h2>
        
        <div className="space-y-4">
          {/* File Input */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="floor-plan-input"
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg cursor-pointer hover:bg-black transition-colors"
            >
              <Upload size={20} />
              Choose Floor Plan
            </label>
            <input
              id="floor-plan-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {file && (
              <span className="text-sm text-gray-600">
                {file.name}
              </span>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Analyze Floor Plan
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Preview</h3>
            <img
              src={preview}
              alt="Floor plan preview"
              className="max-w-full h-auto rounded-lg border-2 border-gray-200"
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-green-600" size={24} />
            <h3 className="text-xl font-bold text-green-800">
              Analysis Complete
            </h3>
          </div>
          
          <p className="text-sm text-green-700 mb-4">
            Found {result.length} shelf/container{result.length !== 1 ? 's' : ''}
          </p>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-100">
                  <th className="px-4 py-2 text-left font-semibold text-green-800">ID</th>
                  <th className="px-4 py-2 text-left font-semibold text-green-800">Label</th>
                  <th className="px-4 py-2 text-left font-semibold text-green-800">Position (x, y)</th>
                  <th className="px-4 py-2 text-left font-semibold text-green-800">Size (w, h)</th>
                  <th className="px-4 py-2 text-left font-semibold text-green-800">Item</th>
                  <th className="px-4 py-2 text-left font-semibold text-green-800">Count</th>
                </tr>
              </thead>
              <tbody>
                {result.map((shelf, index) => (
                  <tr key={index} className="border-t border-green-200">
                    <td className="px-4 py-2 font-mono text-green-900">{shelf.id}</td>
                    <td className="px-4 py-2 text-green-900">{shelf.label}</td>
                    <td className="px-4 py-2 font-mono text-green-900">
                      ({shelf.normalizedPos.x.toFixed(2)}, {shelf.normalizedPos.y.toFixed(2)})
                    </td>
                    <td className="px-4 py-2 font-mono text-green-900">
                      ({shelf.scale.w.toFixed(2)}, {shelf.scale.h.toFixed(2)})
                    </td>
                    <td className="px-4 py-2 text-green-900">{shelf.metadata.item}</td>
                    <td className="px-4 py-2 text-green-900">{shelf.metadata.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* JSON Output */}
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-green-800 hover:text-green-900">
              View JSON Output
            </summary>
            <pre className="mt-2 p-4 bg-gray-800 text-green-400 rounded overflow-x-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default FloorPlanUploader;
