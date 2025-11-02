import type { Bookmark } from '../types';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onEdit?: (bookmark: Bookmark) => void;
}

export default function BookmarkCard({ bookmark, onDelete, onPin, onEdit }: BookmarkCardProps) {
  const { id, url, title, description, faviconUrl, screenshotUrl, tags, pinned, createdAt, collectionId } = bookmark;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('es', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  const getDomain = () => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const getScreenshot = () => {
    if (screenshotUrl) return screenshotUrl;
    // Usar favicon grande como fallback, o generar con thum.io
    if (url) {
      try {
        const urlObj = new URL(url);
        // Usar el servicio de screenshot como fallback
        return `https://image.thum.io/get/width/800/crop/600/${encodeURIComponent(url)}`;
      } catch {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzI3MjcyNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5ObyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg==';
      }
    }
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzI3MjcyNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5ObyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg==';
  };

  return (
    <article className="group relative bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200">
      {/* Screenshot/Preview */}
      <a href={url} target="_blank" rel="noopener noreferrer" className="block relative">
        <div className="relative aspect-video overflow-hidden bg-zinc-950">
          <img
            src={getScreenshot()}
            alt={title || url}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

          {/* Badge de colección (si tiene) */}
          {collectionId && (
            <div className="absolute top-2 left-2">
              <div className="px-2 py-1 bg-purple-600/90 backdrop-blur-sm text-white text-xs font-medium rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-3">
          <div className="flex items-start gap-2 mb-2">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-zinc-100 line-clamp-2 mb-0.5">
                {title || url}
              </h3>
              <p className="text-xs text-zinc-500 truncate">
                {getDomain()}
              </p>
            </div>
          </div>
        </div>
      </a>

      {/* Footer con acciones */}
      <div className="px-3 pb-3 flex items-center justify-between border-t border-zinc-800/50 pt-2">
        {/* Metadata izquierda */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-0 flex-1">
          {tags && tags.length > 0 && (
            <span className="truncate">#{tags[0]}</span>
          )}
          {createdAt && (
            <span className="whitespace-nowrap">{formatDate(createdAt)}</span>
          )}
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit?.(bookmark);
            }}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              onPin?.(id);
            }}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            title={pinned ? "Unpin" : "Pin"}
          >
            <svg className={`w-4 h-4 ${pinned ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              if (confirm('Delete this bookmark?')) {
                onDelete?.(id);
              }
            }}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <button
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
            title="More"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
