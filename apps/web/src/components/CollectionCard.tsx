import type { Collection } from '../types';

interface CollectionCardProps {
  collection: Collection;
  bookmarkCount: number;
  onEdit: (collection: Collection) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

export default function CollectionCard({
  collection,
  bookmarkCount,
  onEdit,
  onDelete,
  onClick
}: CollectionCardProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getColorStyle = () => {
    const color = collection.color || '#3b82f6';
    return {
      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
      borderColor: `${color}30`
    };
  };

  return (
    <div
      className="group relative rounded-xl border hover:border-opacity-60 transition-all duration-300 overflow-hidden cursor-pointer bg-[#18181b]"
      style={getColorStyle()}
      onClick={() => onClick(collection.id)}
    >
      {/* Top color accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: collection.color || '#3b82f6' }}
      />

      {/* Card content */}
      <div className="p-5">
        {/* Header with icon and menu */}
        <div className="flex items-start justify-between mb-4">
          {/* Collection icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-lg"
            style={{ backgroundColor: collection.color || '#3b82f6' }}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>

          {/* Menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(collection);
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>

        {/* Collection name */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
          {collection.name}
        </h3>

        {/* Description */}
        {collection.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-4 min-h-[40px]">
            {collection.description}
          </p>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between text-sm pt-3 border-t border-zinc-800">
          {/* Bookmark count */}
          <div className="flex items-center gap-2 text-zinc-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="font-medium">{bookmarkCount}</span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 text-zinc-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">
              {formatDate(collection.updatedAt || collection.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-end p-4 gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(collection);
          }}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-sm font-medium rounded-lg transition-colors border border-white/20"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete collection "${collection.name}"? The bookmarks will not be deleted.`)) {
              onDelete(collection.id);
            }
          }}
          className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700 backdrop-blur-md text-white text-sm font-medium rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
