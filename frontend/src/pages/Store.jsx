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
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden bg-[#fafafa] flex flex-col">
      {/* Header - only show when no shelves loaded */}
      {shelves.length === 0 && (
        <div className="flex-1 flex flex-col bg-white">
          {/* Hero Section */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-[48px] md:text-[56px] font-medium text-[#1a1a1a] tracking-[-0.03em] leading-[1.1] mb-4">
                Visualize Your Store.
              </h1>
              <p className="text-[18px] text-gray-500 leading-relaxed mb-8">
                Upload a floor plan and instantly see your shelves rendered in 3D.
                <br />AI-powered analysis for smarter inventory management.
              </p>

              {/* Upload Button */}
              <div className="flex flex-col items-center gap-4">
                <label
                  htmlFor="floor-plan-upload"
                  className={`
                    inline-flex items-center gap-2.5 px-8 py-4 rounded-full font-medium text-[15px]
                    cursor-pointer transition-all
                    ${loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#1a1a1a] text-white hover:bg-black'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analyzing floor plan...
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

                {/* File name display */}
                {fileName && (
                  <p className="text-[14px] text-gray-400">
                    Selected: {fileName}
                  </p>
                )}

                {/* Shelves detected badge */}
                {uploadComplete && (
                  <div className="text-[14px] bg-[#f3f3f3] text-[#1a1a1a] px-5 py-2.5 rounded-full font-medium flex items-center gap-2">
                    <StoreIcon size={16} />
                    {shelves.length} Shelf{shelves.length !== 1 ? 's' : ''} Detected
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-6 py-4 border-t border-red-100">
              <div className="max-w-2xl mx-auto flex items-center gap-3">
                <AlertCircle size={18} />
                <span className="text-[14px]">{error}</span>
              </div>
            </div>
          )}
        </div>
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
              <AnalyticsDashboard
                onClose={() => setShowAnalytics(false)}
                shelves={shelves}
                onOptimizeShelves={setShelves}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#f3f3f3]">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <StoreIcon size={32} className="text-gray-400" />
              </div>
              <p className="text-[18px] font-medium text-[#1a1a1a] mb-1">No Floor Plan Loaded</p>
              <p className="text-[14px] text-gray-500">Upload a floor plan image to get started</p>
            </div>
          </div>
        )}

        {/* Legend & Controls */}
        {shelves.length > 0 && !selectedShelfId && (
          <div className="absolute bottom-6 left-6 space-y-3">
            {/* Analytics Dashboard Button */}
            <button
              onClick={() => setShowAnalytics(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full
                font-medium text-[14px] transition-all
                bg-[#1a1a1a] hover:bg-black text-white shadow-lg"
            >
              <BarChart3 size={18} />
              <span>View Analytics</span>
            </button>

            {/* FreeCam Toggle Button */}
            <button
              onClick={toggleFreeCam}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full
                font-medium text-[14px] transition-all shadow-lg
                ${isFreeCam
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-white hover:bg-[#f3f3f3] text-[#1a1a1a] border border-gray-200'
                }
              `}
            >
              {isFreeCam ? (
                <>
                  <Camera size={18} />
                  <span>FreeCam Mode</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Locked View</span>
                </>
              )}
            </button>

            {/* Legend */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 p-5 min-w-[180px]">
              <h3 className="text-[14px] font-medium text-[#1a1a1a] mb-4 tracking-[-0.01em]">Legend</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-[#1a1a1a] rounded-full"></div>
                  <span className="text-[13px] text-gray-600">Stocked Shelf</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-[13px] text-gray-600">Empty Shelf</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-white border-2 border-[#1a1a1a] rounded-full"></div>
                  <span className="text-[13px] text-gray-600">Hovered</span>
                </div>
              </div>
              {isFreeCam && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-[12px] text-gray-500 space-y-1.5">
                  <p>Drag to rotate</p>
                  <p>Scroll to zoom</p>
                  <p>Right-click to pan</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Panel */}
        {shelves.length > 0 && !selectedShelfId && (
          <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 p-5 min-w-[220px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#f3f3f3] rounded-xl flex items-center justify-center">
                <StoreIcon size={16} className="text-[#1a1a1a]" />
              </div>
              <h3 className="text-[15px] font-medium text-[#1a1a1a] tracking-[-0.01em]">Store Stats</h3>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Total Shelves</span>
                <span className="font-medium text-[#1a1a1a]">{shelves.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Empty</span>
                <span className="font-medium text-gray-500">
                  {shelves.filter(s => s.metadata.count === 0).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Stocked</span>
                <span className="font-medium text-[#1a1a1a]">
                  {shelves.filter(s => s.metadata.count > 0).length}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-gray-500">Total Items</span>
                <span className="font-medium text-[#1a1a1a]">
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
