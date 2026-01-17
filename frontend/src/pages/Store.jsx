import { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, AlertCircle, Store as StoreIcon, Info, Camera, Lock, BarChart3 } from 'lucide-react';
import { analyzeFloorPlan } from '../services/geminiService';
import StoreScene from '../components/StoreScene';
import ShelfManagementUI from '../components/ShelfManagementUI';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

function Store() {
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadComplete, setUploadComplete] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState(null);
  const [isFreeCam, setIsFreeCam] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const cameraControlsRef = useRef();

  // Get current shelf data from shelves array (always up-to-date)
  const selectedShelf = selectedShelfId 
    ? shelves.find(s => s.id === selectedShelfId) 
    : null;

  // Update stock for a specific shelf
  const handleUpdateStock = (shelfId, delta) => {
    setShelves(prevShelves =>
      prevShelves.map(shelf =>
        shelf.id === shelfId
          ? {
              ...shelf,
              metadata: {
                ...shelf.metadata,
                count: Math.max(0, (shelf.metadata.count || 0) + delta)
              }
            }
          : shelf
      )
    );
  };

  // Update product type for a specific shelf
  const handleUpdateProductType = (shelfId, newType) => {
    setShelves(prevShelves =>
      prevShelves.map(shelf =>
        shelf.id === shelfId
          ? {
              ...shelf,
              metadata: {
                ...shelf.metadata,
                productType: newType
              }
            }
          : shelf
      )
    );
  };

  // Handle shelf selection - switch to shelf view
  const handleShelfSelect = (shelf) => {
    setSelectedShelfId(shelf.id);
  };

  // Return to top-down overview
  const handleBackToOverview = () => {
    setSelectedShelfId(null);
    resetToTopDownView();
  };

  // Reset camera to locked top-down view
  const resetToTopDownView = () => {
    if (cameraControlsRef.current && shelves.length > 0) {
      const platformSize = Math.min(20 + Math.floor(shelves.length / 5) * 3, 50);
      
      cameraControlsRef.current.setLookAt(
        0, platformSize * 1.2, 0, // Camera high above
        0, 0, 0, // Looking at center
        true // Smooth transition
      );
      
      // Lock camera if not in freecam mode
      if (!isFreeCam) {
        lockCamera();
      }
    }
  };

  // Lock camera controls
  const lockCamera = () => {
    setTimeout(() => {
      if (cameraControlsRef.current) {
        cameraControlsRef.current.mouseButtons.left = 0;
        cameraControlsRef.current.mouseButtons.right = 0;
        cameraControlsRef.current.mouseButtons.wheel = 0;
        cameraControlsRef.current.touches.one = 0;
        cameraControlsRef.current.touches.two = 0;
      }
    }, 100);
  };

  // Unlock camera controls for freecam
  const unlockCamera = () => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.mouseButtons.left = 1; // Enable rotation
      cameraControlsRef.current.mouseButtons.right = 2; // Enable pan
      cameraControlsRef.current.mouseButtons.wheel = 16; // Enable zoom
      cameraControlsRef.current.touches.one = 32;
      cameraControlsRef.current.touches.two = 512;
    }
  };

  // Toggle between freecam and locked view
  const toggleFreeCam = () => {
    const newFreeCamState = !isFreeCam;
    setIsFreeCam(newFreeCamState);
    
    if (newFreeCamState) {
      unlockCamera();
    } else {
      lockCamera();
      resetToTopDownView();
    }
  };

  // Set initial top-down view when shelves load (locked)
  useEffect(() => {
    if (shelves.length > 0 && cameraControlsRef.current) {
      const platformSize = Math.min(20 + Math.floor(shelves.length / 5) * 3, 50);
      
      // Small delay to ensure camera controls are ready
      const timer = setTimeout(() => {
        if (cameraControlsRef.current) {
          // Set position directly first
          cameraControlsRef.current.setPosition(0, platformSize * 1.2, 0, false);
          cameraControlsRef.current.setTarget(0, 0, 0, false);
          
          // Then smoothly transition
          setTimeout(() => {
            cameraControlsRef.current?.setLookAt(
              0, platformSize * 1.2, 0,
              0, 0, 0,
              true
            );
            
            // Lock camera unless in freecam mode
            if (!isFreeCam) {
              lockCamera();
            }
          }, 50);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [shelves.length, isFreeCam]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);
    setUploadComplete(false);

    try {
      const result = await analyzeFloorPlan(file);
      setShelves(result);
      setUploadComplete(true);
      console.log('Floor plan analyzed:', result);
    } catch (err) {
      setError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden bg-gray-900 flex flex-col">
      {/* Header - only show when no shelves loaded */}
      {shelves.length === 0 && (
        <>
          <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg z-10">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StoreIcon size={32} />
                  <div>
                    <h1 className="text-2xl font-bold">3D Store Floor Plan Analyzer</h1>
                    <p className="text-sm text-blue-100">AI-powered warehouse visualization</p>
                  </div>
                </div>
                
                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  {uploadComplete && (
                    <div className="text-sm bg-green-500 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                      <StoreIcon size={18} />
                      {shelves.length} Shelf{shelves.length !== 1 ? 's' : ''} Detected
                    </div>
                  )}
                  
                  <label
                    htmlFor="floor-plan-upload"
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-lg font-semibold 
                      cursor-pointer transition-all shadow-lg
                      ${loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-white text-blue-600 hover:bg-blue-50 hover:shadow-xl'
                      }
                    `}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Upload Floor Plan
                      </>
                    )}
                  </label>
                  <input
                    id="floor-plan-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                  />
                </div>
              </div>
              
              {/* File name display */}
              {fileName && (
                <div className="mt-2 text-sm text-blue-100">
                  📄 {fileName}
                </div>
              )}
            </div>
          </header>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500 text-white px-6 py-3 shadow-lg z-10">
              <div className="container mx-auto flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="font-semibold">Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Info Banner */}
          {!uploadComplete && !loading && (
            <div className="bg-indigo-600 text-white px-6 py-3 shadow-lg z-10">
              <div className="container mx-auto flex items-center gap-3">
                <Info size={20} />
                <span>Upload a floor plan image to visualize shelves in 3D</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* 3D Scene */}
      <div className="flex-1 relative">
        {shelves.length > 0 ? (
          <>
            <StoreScene 
              shelves={shelves} 
              onShelfSelect={handleShelfSelect}
              selectedShelfId={selectedShelfId}
              isFreeCam={isFreeCam}
              ref={cameraControlsRef}
            />
            
            {/* Shelf Management UI - appears when shelf selected */}
            <ShelfManagementUI
              shelf={selectedShelf}
              onUpdateStock={handleUpdateStock}
              onUpdateProductType={handleUpdateProductType}
              onClose={handleBackToOverview}
            />

            {/* Analytics Dashboard - appears when analytics button clicked */}
            {showAnalytics && !selectedShelfId && (
              <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center text-gray-400">
              <StoreIcon size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl font-semibold mb-2">No Floor Plan Loaded</p>
              <p className="text-sm">Upload a floor plan image to get started</p>
            </div>
          </div>
        )}
        
        {/* Legend & Controls */}
        {shelves.length > 0 && !selectedShelfId && (
          <div className="absolute bottom-6 left-6 space-y-3">
            {/* Analytics Dashboard Button */}
            <button
              onClick={() => setShowAnalytics(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-xl
                font-semibold transition-all transform hover:scale-105
                bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
            >
              <BarChart3 size={20} />
              <span>View Analytics</span>
            </button>

            {/* FreeCam Toggle Button */}
            <button
              onClick={toggleFreeCam}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg shadow-xl
                font-semibold transition-all transform hover:scale-105
                ${isFreeCam 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-white/90 hover:bg-white text-gray-800'
                }
              `}
            >
              {isFreeCam ? (
                <>
                  <Camera size={20} />
                  <span>FreeCam Mode</span>
                </>
              ) : (
                <>
                  <Lock size={20} />
                  <span>Locked View</span>
                </>
              )}
            </button>

            {/* Legend */}
            <div className="bg-white/90 backdrop-blur rounded-lg shadow-xl p-4 text-sm">
              <h3 className="font-bold text-gray-800 mb-2">Legend</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-700">Stocked Shelf</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-700">Empty Shelf</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded"></div>
                  <span className="text-gray-700">Hovered</span>
                </div>
              </div>
              {isFreeCam && (
                <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600">
                  <p>🖱️ Drag to rotate</p>
                  <p>🔍 Scroll to zoom</p>
                  <p>⌨️ Right-click to pan</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Stats Panel */}
        {shelves.length > 0 && !selectedShelfId && (
          <div className="absolute top-6 right-6 bg-white/90 backdrop-blur rounded-lg shadow-xl p-4 min-w-[200px]">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <StoreIcon size={18} />
              Store Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Shelves:</span>
                <span className="font-semibold text-gray-800">{shelves.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Empty:</span>
                <span className="font-semibold text-yellow-600">
                  {shelves.filter(s => s.metadata.count === 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stocked:</span>
                <span className="font-semibold text-green-600">
                  {shelves.filter(s => s.metadata.count > 0).length}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-semibold text-blue-600">
                  {shelves.reduce((sum, s) => sum + (s.metadata.count || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Store;
