import { useState, useMemo } from 'react';
import type { Collection } from '../types';

interface CollectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onCreateCollection: (data: { name: string; description: string; color: string; parentId?: string }) => Promise<void>;
  onUpdateCollection: (id: string, data: { name: string; description: string; color: string; parentId?: string }) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
}

interface TreeNode extends Collection {
  children: TreeNode[];
  level: number;
}

export default function CollectionManager({
  isOpen,
  onClose,
  collections,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection
}: CollectionManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingParentId, setCreatingParentId] = useState<string | undefined>(undefined);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6366f1' });

  // Construir árbol jerárquico
  const collectionTree = useMemo(() => {
    const buildTree = (parentId: string | undefined, level: number = 0): TreeNode[] => {
      return collections
        .filter(c => c.parentId === parentId)
        .map(c => ({
          ...c,
          level,
          children: buildTree(c.id, level + 1)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    };
    return buildTree(undefined);
  }, [collections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      await onUpdateCollection(editingId, {
        ...formData,
        parentId: creatingParentId
      });
      setEditingId(null);
    } else {
      await onCreateCollection({
        ...formData,
        parentId: creatingParentId
      });
    }

    setFormData({ name: '', description: '', color: '#6366f1' });
    setShowCreateForm(false);
    setCreatingParentId(undefined);
  };

  const handleEdit = (collection: Collection) => {
    setEditingId(collection.id);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color || '#6366f1'
    });
    setCreatingParentId(collection.parentId);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    // Verificar si tiene hijos
    const hasChildren = collections.some(c => c.parentId === id);
    if (hasChildren) {
      alert('No puedes eliminar una colección que tiene subcolecciones');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar esta colección?')) {
      await onDeleteCollection(id);
    }
  };

  const renderTree = (nodes: TreeNode[]) => {
    return nodes.map(node => (
      <div key={node.id} className="mb-1">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors group`}
          style={{ paddingLeft: `${node.level * 24 + 12}px` }}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: node.color || '#6366f1' }}
          />
          <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-zinc-100 truncate">{node.name}</div>
            {node.description && (
              <div className="text-xs text-zinc-500 truncate">{node.description}</div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setCreatingParentId(node.id);
                setShowCreateForm(true);
                setEditingId(null);
                setFormData({ name: '', description: '', color: '#6366f1' });
              }}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-blue-400"
              title="Agregar subcolección"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => handleEdit(node)}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-yellow-400"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(node.id)}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {node.children.length > 0 && renderTree(node.children)}
      </div>
    ));
  };

  if (!isOpen) return null;

  const parentCollection = creatingParentId ? collections.find(c => c.id === creatingParentId) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Gestión de Colecciones</h2>
            <p className="text-sm text-zinc-400 mt-1">Organiza tus colecciones y subcolecciones</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Botón crear colección principal */}
          {!showCreateForm && (
            <button
              onClick={() => {
                setShowCreateForm(true);
                setCreatingParentId(undefined);
                setEditingId(null);
                setFormData({ name: '', description: '', color: '#6366f1' });
              }}
              className="w-full mb-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Colección Principal
            </button>
          )}

          {/* Formulario de creación/edición */}
          {showCreateForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-zinc-100">
                  {editingId ? 'Editar Colección' : parentCollection ? `Nueva Subcolección en "${parentCollection.name}"` : 'Nueva Colección'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingId(null);
                    setCreatingParentId(undefined);
                    setFormData({ name: '', description: '', color: '#6366f1' });
                  }}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="Nombre de la colección"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="Descripción opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  {editingId ? 'Guardar Cambios' : 'Crear Colección'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingId(null);
                    setCreatingParentId(undefined);
                    setFormData({ name: '', description: '', color: '#6366f1' });
                  }}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Árbol de colecciones */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-800 p-4">
            {collectionTree.length > 0 ? (
              <div className="space-y-1">
                {renderTree(collectionTree)}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-sm">No hay colecciones creadas</p>
                <p className="text-xs text-zinc-600 mt-1">Crea tu primera colección para comenzar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
