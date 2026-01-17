import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TableAssignmentModal } from './TableAssignmentModal';
import { formatDate } from '@/utils/formatters';
import { getClassColor } from '@/utils/colors';
import { objectsAPI } from '@/api/endpoints';
import { FolderInput, Activity } from 'lucide-react';

export function ObjectDetail({ object, isOpen, onClose }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  useEffect(() => {
    let objectUrl = null;

    if (object && object.has_thumbnail) {
      setThumbnail(null);
      setLoadingThumbnail(true);
      setThumbnailError(null);

      objectsAPI.getThumbnail(object.object_id)
        .then(response => {
          objectUrl = URL.createObjectURL(response.data);
          setThumbnail(objectUrl);
          setLoadingThumbnail(false);
        })
        .catch(err => {
          console.error('[ObjectDetail] Failed to load thumbnail:', err);
          setThumbnail(null);
          setThumbnailError(err.message || 'Failed to load image');
          setLoadingThumbnail(false);
        });
    } else {
      setThumbnail(null);
      setLoadingThumbnail(false);
      setThumbnailError(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [object?.object_id, object?.has_thumbnail]);

  if (!object) return null;

  const classColor = getClassColor(object.class_name);

  const handleAssignmentComplete = () => {
    window.location.reload();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Object Details"
      footer={
        <div className="flex gap-3">
          <Button
            onClick={() => setAssignmentModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <FolderInput size={18} />
            Assign to Table
          </Button>
          <Button onClick={onClose} variant="primary">
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Section with Thumbnail and Title */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Thumbnail */}
          <div className="relative w-full md:w-1/2 aspect-[4/3] bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center">
            {loadingThumbnail ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                <span className="text-xs">Loading image...</span>
              </div>
            ) : thumbnail ? (
              <img
                src={thumbnail}
                alt={object.class_name}
                className="max-w-full max-h-full object-contain"
              />
            ) : thumbnailError ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-red-400">
                <span className="text-sm">Failed to load</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <Activity size={24} className="opacity-20 mb-2" />
                <span className="text-xs">No Image</span>
              </div>
            )}
          </div>

          {/* Title and Main Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: classColor }}
                />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 capitalize tracking-tight">
                {object.class_name}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-mono border border-gray-200">
                  #{object.object_id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${object.is_present ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {object.is_present ? 'Present' : 'Absent'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - Adjusted for removed confidence */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Detections</p>
            <p className="text-xl font-bold text-gray-900">{object.detection_count}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">First Seen</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(object.first_seen).split(',')[0]}</p>
            <p className="text-xs text-gray-400">{formatDate(object.first_seen).split(',')[1]}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Last Seen</p>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-medium text-gray-900">{formatDate(object.last_seen).split(',')[0]}</p>
              <p className="text-xs text-gray-400">{formatDate(object.last_seen).split(',')[1]}</p>
            </div>
          </div>
        </div>

        {/* Position Data */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-3 text-gray-900 font-semibold">
            <Activity size={18} className="text-blue-500" />
            <h4>Spatial Data</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-400 font-mono block mb-1">X-AXIS</span>
              <span className="font-mono text-gray-900 font-medium">{object.avg_position_x?.toFixed(1)}</span>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-400 font-mono block mb-1">Y-AXIS</span>
              <span className="font-mono text-gray-900 font-medium">{object.avg_position_y?.toFixed(1)}</span>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-400 font-mono block mb-1">Z-AXIS</span>
              <span className="font-mono text-gray-900 font-medium">{object.avg_position_z?.toFixed(1)}</span>
              <span className="text-[10px] text-gray-400 ml-1">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Assignment Modal */}
      <TableAssignmentModal
        isOpen={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        objectIds={[object.object_id]}
        onAssigned={handleAssignmentComplete}
      />
    </Modal>
  );
}
