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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-52'} bg-black border-r-2 border-zinc-700/50 h-screen overflow-y-auto flex-shrink-0 hidden lg:block transition-all duration-300 sticky top-0`}>
      <div className={`${isCollapsed ? 'p-2' : 'p-3'} h-full flex flex-col`}>
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between px-2 mb-6 mt-1">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <img
                src="/assets/logos/redde 2 logo.png"
                alt="Redde Logo"
                className="h-6 w-auto"
              />
              <span className="text-base font-semibold text-zinc-100">Redde</span>
            </div>
          )}
          {isCollapsed && (
            <img
              src="/assets/logos/redde 2 logo.png"
              alt="Redde Logo"
              className="h-6 w-auto mx-auto"
            />
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-zinc-800/50 rounded transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-2 mb-4 hover:bg-zinc-800/50 rounded transition-colors flex justify-center"
            title="Expand sidebar"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Navigation */}
        <nav className="space-y-0.5 mb-6 pb-6 border-b border-zinc-800/50">
          <button
            onClick={onHomeClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors`}
            title={isCollapsed ? "Dashboard" : ""}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!isCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={onLinksClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors`}
            title={isCollapsed ? "Links" : ""}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {!isCollapsed && <span>Links</span>}
          </button>

          <button
            onClick={onPinnedClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors`}
            title={isCollapsed ? "Pinned" : ""}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {!isCollapsed && <span>Pinned</span>}
          </button>
        </nav>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
        {/* Collections Section - Hidden when collapsed */}
        {!isCollapsed && (
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
        )}

        {/* Tags Section - Hidden when collapsed */}
        {!isCollapsed && (
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
        )}

        {/* Collapsed mode - Show collection and tag icons */}
        {isCollapsed && collections.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/30">
            <button
              className="w-full p-2 mb-2 hover:bg-zinc-800/50 rounded transition-colors flex justify-center"
              title={`${collections.length} Collections`}
            >
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          </div>
        )}

        {isCollapsed && tags.length > 0 && (
          <div>
            <button
              className="w-full p-2 hover:bg-zinc-800/50 rounded transition-colors flex justify-center"
              title={`${tags.length} Tags`}
            >
              <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
          </div>
        )}
        </div>
      </div>
    </aside>
  );
}
