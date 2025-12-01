import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreateDataroomModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

export default function CreateDataroomModal({
  onClose,
  onCreate,
}: CreateDataroomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onCreate(name.trim(), description.trim());
    } catch (err) {
      setError('Failed to create dataroom');
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="card relative w-full max-w-md animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-midnight-400 
                     hover:text-white hover:bg-midnight-700/50 transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-xl font-semibold text-white mb-6">
          Create New Dataroom
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-midnight-300 mb-2"
              >
                Name <span className="text-coral-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="My Dataroom"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-midnight-300 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-[100px] resize-none"
                placeholder="Optional description..."
              />
            </div>
          </div>

          {error && (
            <p className="text-coral-400 text-sm mt-4">{error}</p>
          )}

          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

