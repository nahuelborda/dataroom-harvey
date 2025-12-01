import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataroomsApi, filesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Dataroom, File as DataroomFile } from '../types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  FileText,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import DriveFilePickerModal from '../components/DriveFilePickerModal';
import { authApi } from '../api/client';

export default function DataroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { googleConnected } = useAuth();

  const [dataroom, setDataroom] = useState<Dataroom | null>(null);
  const [files, setFiles] = useState<DataroomFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadDataroom();
    }
  }, [id]);

  async function loadDataroom() {
    try {
      setIsLoading(true);
      setError(null);
      const [dataroomData, filesData] = await Promise.all([
        dataroomsApi.get(id!),
        dataroomsApi.getFiles(id!),
      ]);
      setDataroom(dataroomData);
      setFiles(filesData.files);
    } catch (err) {
      setError('Failed to load dataroom');
      console.error('Error loading dataroom:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteDataroom() {
    if (!dataroom) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${dataroom.name}"? This will also delete all imported files.`
    );

    if (!confirmed) return;

    try {
      await dataroomsApi.delete(dataroom.id);
      navigate('/datarooms', { replace: true });
    } catch (err) {
      console.error('Error deleting dataroom:', err);
      setError('Failed to delete dataroom');
    }
  }

  async function handleDeleteFile(fileId: string) {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingFileId(fileId);
      await filesApi.delete(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    } finally {
      setDeletingFileId(null);
    }
  }

  async function handleDownloadFile(file: DataroomFile) {
    try {
      setDownloadingFileId(file.id);
      const blob = await filesApi.download(file.id);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    } finally {
      setDownloadingFileId(null);
    }
  }

  function handleFileImported(file: DataroomFile) {
    setFiles([file, ...files]);
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getFileIcon(mimeType: string | null) {
    // Could add more specific icons based on mime type
    return FileText;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (error && !dataroom) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-coral-400 mx-auto mb-4" />
          <p className="text-coral-400 mb-4">{error}</p>
          <button onClick={() => navigate('/datarooms')} className="btn-secondary">
            Back to Datarooms
          </button>
        </div>
      </div>
    );
  }

  if (!dataroom) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <button
          onClick={() => navigate('/datarooms')}
          className="flex items-center gap-2 text-midnight-400 hover:text-white 
                     transition-colors duration-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Datarooms
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">
              {dataroom.name}
            </h1>
            {dataroom.description && (
              <p className="text-midnight-400 mt-1">{dataroom.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {googleConnected ? (
              <button
                onClick={() => setShowFilePicker(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Import from Drive
              </button>
            ) : (
              <a
                href={authApi.getGoogleAuthUrl()}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Connect Google Drive
              </a>
            )}

            <button
              onClick={handleDeleteDataroom}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-coral-500/10 border border-coral-500/30 
                        text-coral-400 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-coral-400/70 hover:text-coral-400"
          >
            ×
          </button>
        </div>
      )}

      {/* Files List */}
      {files.length === 0 ? (
        <div className="card text-center py-16 animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-midnight-700/50 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-midnight-400" />
          </div>
          <h2 className="font-display text-xl font-semibold text-white mb-2">
            No files yet
          </h2>
          <p className="text-midnight-400 mb-6 max-w-sm mx-auto">
            {googleConnected
              ? 'Import files from your Google Drive to get started'
              : 'Connect your Google Drive to import files'}
          </p>
          {googleConnected ? (
            <button
              onClick={() => setShowFilePicker(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Import from Drive
            </button>
          ) : (
            <a
              href={authApi.getGoogleAuthUrl()}
              className="btn-primary inline-flex items-center gap-2"
            >
              Connect Google Drive
            </a>
          )}
        </div>
      ) : (
        <div className="card animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-midnight-600/50">
                  <th className="text-left py-3 px-4 text-midnight-400 font-medium text-sm">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-midnight-400 font-medium text-sm hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-midnight-400 font-medium text-sm hidden md:table-cell">
                    Size
                  </th>
                  <th className="text-left py-3 px-4 text-midnight-400 font-medium text-sm hidden lg:table-cell">
                    Imported
                  </th>
                  <th className="text-right py-3 px-4 text-midnight-400 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => {
                  const FileIcon = getFileIcon(file.mime_type);
                  return (
                    <tr
                      key={file.id}
                      className="border-b border-midnight-600/30 last:border-0 
                                 hover:bg-midnight-700/30 transition-colors duration-150"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-midnight-700/50 
                                          flex items-center justify-center flex-shrink-0">
                            <FileIcon className="w-5 h-5 text-teal-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                              {file.name}
                            </p>
                            <p className="text-midnight-500 text-sm sm:hidden">
                              {file.mime_type?.split('/').pop() || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <span className="text-midnight-300 text-sm">
                          {file.mime_type?.split('/').pop() || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="text-midnight-300 text-sm">
                          {formatFileSize(file.size_bytes)}
                        </span>
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <span className="text-midnight-400 text-sm">
                          {formatDate(file.imported_at)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {file.original_url && (
                            <a
                              href={file.original_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg text-midnight-400 hover:text-teal-400 
                                         hover:bg-teal-500/10 transition-all duration-200"
                              title="View in Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDownloadFile(file)}
                            disabled={downloadingFileId === file.id}
                            className="p-2 rounded-lg text-midnight-400 hover:text-teal-400 
                                       hover:bg-teal-500/10 transition-all duration-200
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download"
                          >
                            {downloadingFileId === file.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={deletingFileId === file.id}
                            className="p-2 rounded-lg text-midnight-400 hover:text-coral-400 
                                       hover:bg-coral-500/10 transition-all duration-200
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            {deletingFileId === file.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Picker Modal */}
      {showFilePicker && (
        <DriveFilePickerModal
          dataroomId={dataroom.id}
          onClose={() => setShowFilePicker(false)}
          onFileImported={handleFileImported}
        />
      )}
    </div>
  );
}

