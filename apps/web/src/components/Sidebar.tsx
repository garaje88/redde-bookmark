import { useState } from 'react';
import type { Collection } from '../types';

interface SidebarProps {
  collections: Collection[];
  tags: { name: string; count: number }[];
  collectionCounts?: Record<string, number>;
  activeCollection?: string;
  activeTag?: string;
  onCollectionClick: (id: string) => void;
  onTagClick: (tag: string) => void;
  onHomeClick: () => void;
  onLinksClick: () => void;
  onPinnedClick: () => void;
}

export default function Sidebar({
  collections,
  tags,
  collectionCounts = {},
  activeCollection,
  activeTag,
  onCollectionClick,
  onTagClick,
  onHomeClick,
  onLinksClick,
  onPinnedClick
}: SidebarProps) {
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);

  return (
    <aside className="w-52 bg-zinc-950 border-r border-zinc-800/50 h-full overflow-y-auto flex-shrink-0 hidden lg:block">
      <div className="p-3">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mb-6 mt-1">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="text-base font-semibold text-zinc-100">Linkwarden</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-0.5 mb-6">
          <button
            onClick={onHomeClick}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            onClick={onLinksClick}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>Links</span>
          </button>

          <button
            onClick={onPinnedClick}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>Pinned</span>
          </button>

          <button
            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Collections</span>
          </button>
        </nav>

        {/* Collections */}
        <div className="mb-5">
          <button
            onClick={() => setCollectionsOpen(!collectionsOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-zinc-500 hover:text-zinc-300 transition-colors mb-1"
          >
            <span className="text-xs font-medium uppercase tracking-wider">Collections</span>
            <svg
              className={`w-3 h-3 transition-transform ${collectionsOpen ? 'rotate-0' : '-rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {collectionsOpen && (
            <div className="space-y-0.5">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => onCollectionClick(collection.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-sm ${
                    activeCollection === collection.id
                      ? 'bg-zinc-800/70 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: collection.color || '#6366f1' }}
                  />
                  <span className="truncate flex-1 text-left text-xs">{collection.name}</span>
                  <span className="text-xs text-zinc-600">
                    {collectionCounts[collection.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-zinc-500 hover:text-zinc-300 transition-colors mb-1"
          >
            <span className="text-xs font-medium uppercase tracking-wider">Tags</span>
            <svg
              className={`w-3 h-3 transition-transform ${tagsOpen ? 'rotate-0' : '-rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {tagsOpen && (
            <div className="space-y-0.5">
              {tags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => onTagClick(tag.name)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-sm ${
                    activeTag === tag.name
                      ? 'bg-zinc-800/70 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-cyan-500 text-xs">#</span>
                  <span className="truncate flex-1 text-left text-xs">{tag.name}</span>
                  <span className="text-xs text-zinc-600">{tag.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
