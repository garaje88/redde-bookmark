import { useState, useEffect } from 'react';
import type { Collection } from '../types';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    url: string;
    name: string;
    description: string;
    collectionId: string;
    tags: string[];
  }) => Promise<void>;
  collections: Collection[];
  existingTags: string[];
}

export default function AddLinkModal({
  isOpen,
  onClose,
  onSubmit,
  collections,
  existingTags
}: AddLinkModalProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [collectionId, setCollectionId] = useState('inbox');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setName('');
      setDescription('');
      setCollectionId('inbox');
      setSelectedTags([]);
      setTagInput('');
      setShowOptions(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        url,
        name: name || url,
        description,
        collectionId,
        tags: selectedTags
      });
      onClose();
    } catch (error) {
      console.error('Error creating bookmark:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
    }
    setTagInput('');
    setShowTagDropdown(false);
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const filteredTags = existingTags.filter(tag =>
    tag.toLowerCase().includes(tagInput.toLowerCase()) &&
    !selectedTags.includes(tag)
  );

  const selectedCollection = collections.find(c => c.id === collectionId);

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg shadow-2xl animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-100">Create New Link</h2>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Link URL */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Link
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. http://example.com/"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                  autoFocus
                />
              </div>

              {/* Collection */}
              <div className="md:col-span-1 relative">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Collection
                </label>
                <button
                  type="button"
                  onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-left flex items-center justify-between hover:border-zinc-700 focus:outline-none focus:border-blue-600"
                >
                  <span className="truncate">
                    {selectedCollection?.name || 'Unorganized'}
                  </span>
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Collection Dropdown */}
                {showCollectionDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-auto">
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCollectionId('inbox');
                          setShowCollectionDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <div className="font-medium">Unorganized</div>
                        <div className="text-xs text-zinc-500">Default collection</div>
                      </button>
                      {collections.map((collection) => (
                        <button
                          key={collection.id}
                          type="button"
                          onClick={() => {
                            setCollectionId(collection.id);
                            setShowCollectionDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">{collection.name}</div>
                            {collection.description && (
                              <div className="text-xs text-zinc-500">{collection.description}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Will be auto generated if left empty"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            {/* Tags */}
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tags
              </label>
              <div
                className="w-full min-h-[42px] px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600"
                onClick={() => setShowTagDropdown(true)}
              >
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onFocus={() => setShowTagDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tagInput.trim()) {
                          addTag(tagInput);
                        }
                      } else if (e.key === 'Escape') {
                        setShowTagDropdown(false);
                      }
                    }}
                    placeholder={selectedTags.length === 0 ? "Choose or add custom tags..." : ""}
                    className="flex-1 min-w-[200px] bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tags Dropdown */}
              {showTagDropdown && (filteredTags.length > 0 || tagInput.trim()) && (
                <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-auto">
                  <div className="p-2">
                    {tagInput.trim() && !existingTags.includes(tagInput.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <span className="text-blue-400">Create:</span> "{tagInput}"
                      </button>
                    )}
                    {filteredTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="w-full px-3 py-2 text-left text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description (Hidden by default) */}
            {showOptions && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes, thoughts, etc."
                  rows={4}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none"
                />
              </div>
            )}

            {/* Hide/Show Options */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              {showOptions ? 'Hide' : 'Show'} Options
              <svg
                className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!url || isSubmitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
