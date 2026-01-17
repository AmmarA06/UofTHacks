import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClasses } from '@/hooks/useClasses';
import { classesAPI } from '@/api/endpoints';
import { ClassGrid } from '@/components/classes/ClassGrid';
import { ClassForm } from '@/components/classes/ClassForm';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { PageTransition } from '@/components/common/PageTransition';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Plus } from 'lucide-react';

export function ClassManager() {
  const { classes, loading, error, refetch } = useClasses();
  const navigate = useNavigate();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states
  const [selectedClass, setSelectedClass] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Statistics
  const [classStats, setClassStats] = useState({});

  // Fetch stats for all classes
  useEffect(() => {
    const fetchStats = async () => {
      if (!classes || classes.length === 0) return;

      const statsPromises = classes.map(async (cls) => {
        try {
          const response = await classesAPI.getStats(cls.class_id);
          return { id: cls.class_id, stats: response.data };
        } catch (err) {
          console.error(`Failed to fetch stats for class ${cls.class_id}:`, err);
          return { id: cls.class_id, stats: null };
        }
      });

      const results = await Promise.all(statsPromises);
      const statsMap = {};
      results.forEach(({ id, stats }) => {
        statsMap[id] = stats;
      });
      setClassStats(statsMap);
    };

    fetchStats();
  }, [classes]);

  // Calculate summary stats
  const totalClasses = classes?.length || 0;
  const activeClasses = classes?.filter(c => c.is_active).length || 0;
  const totalObjects = Object.values(classStats).reduce((sum, stats) =>
    sum + (stats?.total_objects || 0), 0);

  // Handlers
  const handleCreate = async (data) => {
    try {
      setFormLoading(true);
      await classesAPI.create(data);
      setIsCreateModalOpen(false);
      refetch();

      try {
        const syncResult = await classesAPI.syncDetector();
        console.log('Detector synced:', syncResult.data);
        alert(`Class created! Detector updated with ${syncResult.data.count} active class(es).`);
      } catch (syncErr) {
        console.error('Failed to sync detector:', syncErr);
        alert('Class created, but failed to sync detector. You may need to restart the backend.');
      }
    } catch (err) {
      console.error('Failed to create class:', err);
      alert('Failed to create class. See console for details.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (classData) => {
    setSelectedClass(classData);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (data) => {
    if (!selectedClass) return;

    try {
      setFormLoading(true);
      await classesAPI.update(selectedClass.class_id, data);
      setIsEditModalOpen(false);
      setSelectedClass(null);
      refetch();

      try {
        const syncResult = await classesAPI.syncDetector();
        console.log('Detector synced:', syncResult.data);
        alert(`Class updated! Detector updated with ${syncResult.data.count} active class(es).`);
      } catch (syncErr) {
        console.error('Failed to sync detector:', syncErr);
        alert('Class updated, but failed to sync detector. You may need to restart the backend.');
      }
    } catch (err) {
      console.error('Failed to update class:', err);
      alert('Failed to update class. See console for details.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (classId) => {
    const classData = classes.find(c => c.class_id === classId);
    const stats = classStats[classId];
    const objectCount = stats?.total_objects || 0;

    let message = 'Are you sure you want to delete this class?';
    if (objectCount > 0) {
      message += `\n\nThis will unlink ${objectCount} object(s). The objects will not be deleted.`;
    }

    if (window.confirm(message)) {
      try {
        await classesAPI.delete(classId, false); // cascade=false by default
        refetch();

        try {
          const syncResult = await classesAPI.syncDetector();
          console.log('Detector synced:', syncResult.data);
          alert(`Class deleted! Detector updated with ${syncResult.data.count} active class(es).`);
        } catch (syncErr) {
          console.error('Failed to sync detector:', syncErr);
          alert('Class deleted, but failed to sync detector. You may need to restart the backend.');
        }
      } catch (err) {
        console.error('Failed to delete class:', err);
        alert('Failed to delete class. See console for details.');
      }
    }
  };

  const handleViewObjects = (className) => {
    navigate(`/objects?class=${encodeURIComponent(className)}`);
  };

  return (
    <PageTransition>
      <div className="space-y-8 py-8">
        {/* Header */}
        <PageHeader
          title="Class Manager"
          description="Manage object detection classes, training data settings, and active model labels."
        >
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-black text-white hover:bg-gray-800 border-none shadow-sm">
            <Plus size={18} className="mr-2" />
            New Class
          </Button>
        </PageHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Total Classes"
            value={totalClasses}
            subtext="Registered categories"
            trend="up"
          />
          <MetricCard
            title="Active Classes"
            value={activeClasses}
            subtext="Currently detecting"
            trend="up"
          />
          <MetricCard
            title="Total Objects"
            value={totalObjects}
            subtext="Linked instances"
            trend="up"
          />
        </div>

        {/* Classes Grid */}
        <div>
          <div className="flex items-center justify-between mb-4 mt-8 px-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">All Classes</h2>
          </div>

          <ClassGrid
            classes={classes}
            loading={loading}
            error={error}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewObjects={handleViewObjects}
            stats={classStats}
          />
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Class"
        >
          <ClassForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateModalOpen(false)}
            loading={formLoading}
          />
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedClass(null);
          }}
          title="Edit Class"
        >
          <ClassForm
            initialData={selectedClass}
            onSubmit={handleUpdate}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedClass(null);
            }}
            loading={formLoading}
          />
        </Modal>
      </div>
    </PageTransition>
  );
}
