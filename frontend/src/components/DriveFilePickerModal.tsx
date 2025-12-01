import { useState, useEffect, useCallback } from 'react';
import { driveApi, filesApi } from '../api/client';
import type { DriveFile, File as DataroomFile } from '../types';
import {
  X,
  Search,
  Loader2,
  FileText,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface DriveFilePickerModalProps {
  dataroomId: string;
  onClose: () => void;
  onFileImported: (file: DataroomFile) => void;
}

export default function DriveFilePickerModal({
  dataroomId,
  onClose,
  onFileImported,
}: DriveFilePickerModalProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [importedFileIds, setImportedFileIds] = useState<Set<string>>(new Set());
  const [importError, setImportError] = useState<string | null>(null);

  const loadFiles = useCallback(async (query?: string, pageToken?: string) => {
    try {
      if (pageToken) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const data = await driveApi.listFiles({
        page_size: 20,
        page_token: pageToken,
        q: query || undefined,
      });

      if (pageToken) {
        setFiles((prev) => [...prev, ...data.files]);
      } else {
        setFiles(data.files);
      }
      setNextPageToken(data.next_page_token);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('OAUTH_REVOKED')) {
        setError('Your Google connection expired. Please reconnect your account.');
      } else {
        setError('Failed to load files from Google Drive');
      }
      console.error('Error loading Drive files:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFiles(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadFiles]);

  async function handleImportFile(driveFile: DriveFile) {
    try {
      setImportingFileId(driveFile.id);
      setImportError(null);

      const importedFile = await filesApi.import(dataroomId, driveFile.id);
      setImportedFileIds((prev) => new Set([...prev, driveFile.id]));
      onFileImported(importedFile);
    } catch (err: unknown) {
      console.error('Error importing file:', err);
      const error = err as { response?: { data?: { error?: string; message?: string } } };
      if (error.response?.data?.error === 'ALREADY_EXISTS') {
        setImportError('This file has already been imported');
        setImportedFileIds((prev) => new Set([...prev, driveFile.id]));
      } else if (error.response?.data?.error === 'OAUTH_REVOKED') {
        setImportError('Your Google connection expired. Please reconnect.');
      } else {
        setImportError(error.response?.data?.message || 'Failed to import file');
      }
    } finally {
      setImportingFileId(null);
    }
  }

  function formatFileSize(sizeStr: string | null): string {
    if (!sizeStr) return '';
    const bytes = parseInt(sizeStr, 10);
    if (isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="card relative w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-midnight-600/50">
          <h2 className="font-display text-xl font-semibold text-white">
            Import from Google Drive
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-midnight-400 
                       hover:text-white hover:bg-midnight-700/50 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-midnight-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="input pl-12"
            />
          </div>
        </div>

        {/* Import error */}
        {importError && (
          <div className="mb-4 p-3 rounded-lg bg-coral-500/10 border border-coral-500/30 
                          text-coral-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{importError}</span>
            <button
              onClick={() => setImportError(null)}
              className="ml-auto text-coral-400/70 hover:text-coral-400"
            >
              ×
            </button>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-coral-400 mx-auto mb-4" />
              <p className="text-coral-400 mb-4">{error}</p>
              <button
                onClick={() => loadFiles()}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-midnight-500 mx-auto mb-4" />
              <p className="text-midnight-400">
                {searchQuery ? 'No files found matching your search' : 'No files found in your Drive'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const isImported = importedFileIds.has(file.id);
                const isImporting = importingFileId === file.id;

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-3 rounded-xl 
                               hover:bg-midnight-700/30 transition-colors duration-150 group"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-midnight-700/50 
                                    flex items-center justify-center flex-shrink-0">
                      {file.icon_link ? (
                        <img
                          src={file.icon_link}
                          alt=""
                          className="w-6 h-6"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-teal-400" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-midnight-500 text-sm">
                        {file.mime_type?.split('/').pop() || 'Unknown type'}
                        {file.size && ` • ${formatFileSize(file.size)}`}
                      </p>
                    </div>

                    {/* Import button */}
                    <button
                      onClick={() => handleImportFile(file)}
                      disabled={isImported || isImporting}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                        ${
                          isImported
                            ? 'bg-teal-500/20 text-teal-400 cursor-default'
                            : isImporting
                            ? 'bg-midnight-700 text-midnight-400 cursor-wait'
                            : 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 opacity-0 group-hover:opacity-100'
                        }`}
                    >
                      {isImported ? (
                        <span className="flex items-center gap-1.5">
                          <Check className="w-4 h-4" />
                          Imported
                        </span>
                      ) : isImporting ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Importing...
                        </span>
                      ) : (
                        'Import'
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Load more */}
              {nextPageToken && (
                <div className="pt-4 text-center">
                  <button
                    onClick={() => loadFiles(searchQuery, nextPageToken)}
                    disabled={isLoadingMore}
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-midnight-600/50 mt-4">
          <p className="text-midnight-500 text-sm text-center">
            {importedFileIds.size > 0
              ? `${importedFileIds.size} file${importedFileIds.size !== 1 ? 's' : ''} imported`
              : 'Select files to import into your dataroom'}
          </p>
        </div>
      </div>
    </div>
  );
}

