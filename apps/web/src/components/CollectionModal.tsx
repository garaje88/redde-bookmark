import { useState, useEffect } from 'react';
import type { Collection } from '../types';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    color: string;
    parentId?: string;
  }) => Promise<void>;
  collections?: Collection[];
  collection?: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    parentId?: string;
  } | null;
}

const COLLECTION_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
];

export default function CollectionModal({
  isOpen,
  onClose,
  onSubmit,
  collections = [],
  collection
}: CollectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLLECTION_COLORS[0]);
  const [parentId, setParentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description || '');
      setColor(collection.color || COLLECTION_COLORS[0]);
      setParentId(collection.parentId || '');
    } else if (!isOpen) {
      setName('');
      setDescription('');
      setColor(COLLECTION_COLORS[0]);
      setParentId('');
    }
  }, [collection, isOpen]);

  // Filtrar colecciones válidas para seleccionar como padre
  // Solo se permiten 2 niveles de subcolecciones (0 -> 1 -> 2)
  // Por lo tanto, solo las colecciones de nivel 0 y 1 pueden ser padres
  const availableParentCollections = collections.filter(c => {
    // No puede ser la misma colección
    if (c.id === collection?.id) return false;

    // No puede ser una subcolección de sí misma (evitar ciclos)
    if (c.parentId === collection?.id) return false;

    // Solo las colecciones de nivel 0 (sin padre) y nivel 1 (con padre de nivel 0) pueden ser padres
    // Nivel 2 (con padre que tiene padre) no puede ser padre
    if (c.parentId) {
      // Esta colección es nivel 1 o nivel 2
      const parent = collections.find(p => p.id === c.parentId);
      if (parent?.parentId) {
        // Esta colección es nivel 2, no puede ser padre
        return false;
      }
    }

    return true;
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        color,
        parentId: parentId || undefined
      });
      onClose();
    } catch (error) {
      console.error('Error saving collection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop with blur effect */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#18181b] rounded-lg border border-zinc-800 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              {collection ? 'Edit Collection' : 'Create a New Collection'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5">
            {/* Icon & Name */}
            <div className="flex gap-4 mb-4">
              {/* Color Preview Icon */}
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>

              {/* Name Input */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Example Collection"
                  className="w-full px-3 py-2 bg-[#0d0d0f] border border-zinc-800 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The purpose of this Collection..."
                rows={3}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-zinc-800 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
              />
            </div>

            {/* Parent Collection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Parent Collection (optional)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-zinc-800 rounded-md text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="">None (Main Collection)</option>
                {availableParentCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? '  └─ ' : ''}{c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Select a parent to create a subcollection
              </p>
            </div>

            {/* Color Selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Color
              </label>
              <div className="grid grid-cols-6 gap-2">
                {COLLECTION_COLORS.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setColor(colorOption)}
                    className={`w-10 h-10 rounded-md transition-all ${
                      color === colorOption
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#18181b] scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorOption }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (collection ? 'Saving...' : 'Creating...') : (collection ? 'Save Changes' : 'Create Collection')}
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
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
