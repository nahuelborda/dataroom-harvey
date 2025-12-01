import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataroomsApi } from '../api/client';
import type { Dataroom } from '../types';
import { Plus, Folder, FileText, ChevronRight, Loader2 } from 'lucide-react';
import CreateDataroomModal from '../components/CreateDataroomModal';

export default function DataroomsPage() {
  const [datarooms, setDatarooms] = useState<Dataroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadDatarooms();
  }, []);

  async function loadDatarooms() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dataroomsApi.list();
      setDatarooms(data.datarooms);
    } catch (err) {
      setError('Failed to load datarooms');
      console.error('Error loading datarooms:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateDataroom(name: string, description: string) {
    try {
      const newDataroom = await dataroomsApi.create(name, description);
      setDatarooms([newDataroom, ...datarooms]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating dataroom:', err);
      throw err;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">My Datarooms</h1>
          <p className="text-midnight-400 mt-1">
            Organize and manage your imported files
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Dataroom
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="card text-center py-12">
          <p className="text-coral-400 mb-4">{error}</p>
          <button onClick={loadDatarooms} className="btn-secondary">
            Try Again
          </button>
        </div>
      ) : datarooms.length === 0 ? (
        <div className="card text-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-midnight-700/50 flex items-center justify-center mx-auto mb-6">
            <Folder className="w-10 h-10 text-midnight-400" />
          </div>
          <h2 className="font-display text-xl font-semibold text-white mb-2">
            No datarooms yet
          </h2>
          <p className="text-midnight-400 mb-6 max-w-sm mx-auto">
            Create your first dataroom to start importing files from Google Drive
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Dataroom
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datarooms.map((dataroom, index) => (
            <Link
              key={dataroom.id}
              to={`/datarooms/${dataroom.id}`}
              className="card card-hover group animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 
                                flex items-center justify-center group-hover:from-teal-500/30 
                                group-hover:to-teal-600/30 transition-all duration-300">
                  <Folder className="w-6 h-6 text-teal-400" />
                </div>
                <ChevronRight className="w-5 h-5 text-midnight-500 group-hover:text-teal-400 
                                         group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <h3 className="font-display font-semibold text-lg text-white mb-1 
                             group-hover:text-teal-400 transition-colors duration-200">
                {dataroom.name}
              </h3>

              {dataroom.description && (
                <p className="text-midnight-400 text-sm mb-4 line-clamp-2">
                  {dataroom.description}
                </p>
              )}

              <div className="flex items-center gap-4 pt-4 border-t border-midnight-600/50">
                <div className="flex items-center gap-1.5 text-midnight-400 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>{dataroom.file_count} file{dataroom.file_count !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-midnight-600">•</span>
                <span className="text-midnight-400 text-sm">
                  {formatDate(dataroom.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDataroomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateDataroom}
        />
      )}
    </div>
  );
}

