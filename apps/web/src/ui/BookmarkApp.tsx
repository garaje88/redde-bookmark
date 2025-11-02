import { useEffect, useMemo, useState } from 'react';
import { auth, db, googleProvider, githubProvider } from '../firebase';
import type { User } from 'firebase/auth';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import type { Bookmark, Collection } from '../types';
import BookmarkCard from '../components/BookmarkCard';
import Sidebar from '../components/Sidebar';
import AddLinkModal from '../components/AddLinkModal';
import CollectionModal from '../components/CollectionModal';
import EditLinkModal from '../components/EditLinkModal';
import DashboardStats from '../components/DashboardStats';

export default function BookmarkApp() {
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'links' | 'pinned' | 'collection'>('home');
  const [activeCollection, setActiveCollection] = useState<string | undefined>();
  const [activeTag, setActiveTag] = useState<string | undefined>();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Cargar bookmarks
  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }
    const col = collection(db, `users/${user.uid}/bookmarks`);
    const q = query(col, orderBy('pinned', 'desc'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBookmarks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bookmark)));
    });
    return () => unsub();
  }, [user]);

  // Cargar collections
  useEffect(() => {
    if (!user) {
      setCollections([]);
      return;
    }
    const col = collection(db, `users/${user.uid}/collections`);
    const q = query(col, orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCollections(snap.docs.map(d => ({ id: d.id, ...d.data() } as Collection)));
    });
    return () => unsub();
  }, [user]);

  // Calcular tags únicos
  const tags = useMemo(() => {
    const tagMap = new Map<string, number>();
    bookmarks.forEach(bookmark => {
      bookmark.tags?.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  // Calcular contadores de colecciones
  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookmarks.forEach(bookmark => {
      const colId = bookmark.collectionId;
      if (colId) {
        counts[colId] = (counts[colId] || 0) + 1;
      }
    });
    return counts;
  }, [bookmarks]);

  // Filtrar bookmarks
  const filtered = useMemo(() => {
    let result = bookmarks;

    // Filtrar por vista
    if (activeView === 'pinned') {
      result = result.filter(b => b.pinned);
    } else if (activeView === 'collection' && activeCollection) {
      result = result.filter(b => b.collectionId === activeCollection);
    }

    // Filtrar por tag
    if (activeTag) {
      result = result.filter(b => b.tags?.includes(activeTag));
    }

    // Filtrar por búsqueda
    const search = searchQuery.trim().toLowerCase();
    if (search) {
      result = result.filter(b =>
        b.title?.toLowerCase().includes(search) ||
        b.description?.toLowerCase().includes(search) ||
        b.url?.toLowerCase().includes(search) ||
        b.tags?.some(t => t.toLowerCase().includes(search))
      );
    }

    return result;
  }, [bookmarks, searchQuery, activeView, activeCollection, activeTag]);

  async function handleCreateBookmark(data: {
    url: string;
    name: string;
    description: string;
    collectionId: string;
    tags: string[];
  }) {
    if (!user) return;

    const urlObj = new URL(data.url);
    const screenshotUrl = `https://image.thum.io/get/width/800/crop/600/${encodeURIComponent(data.url)}`;
    const bookmarkData = {
      url: data.url,
      title: data.name || data.url,
      description: data.description,
      faviconUrl: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`,
      screenshotUrl: screenshotUrl,
      screenshotPath: '',
      tags: data.tags,
      collectionId: data.collectionId,
      pinned: false,
      lang: navigator.language?.slice(0, 2) || 'es',
      owner: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(collection(db, `users/${user.uid}/bookmarks`), bookmarkData);
  }

  async function handleCreateCollection(data: {
    name: string;
    description: string;
    color: string;
  }) {
    if (!user) return;

    await addDoc(collection(db, `users/${user.uid}/collections`), {
      name: data.name,
      description: data.description,
      color: data.color,
      icon: '📁',
      owner: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async function deleteBookmark(id: string) {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/bookmarks`, id));
  }

  async function togglePin(id: string) {
    if (!user) return;
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;
    await updateDoc(doc(db, `users/${user.uid}/bookmarks`, id), {
      pinned: !bookmark.pinned,
      updatedAt: serverTimestamp()
    });
  }

  async function handleEditBookmark(data: {
    url: string;
    name: string;
    description: string;
    collectionId: string;
    tags: string[];
  }) {
    if (!user || !editingBookmark) return;

    const urlObj = new URL(data.url);
    const screenshotUrl = `https://image.thum.io/get/width/800/crop/600/${encodeURIComponent(data.url)}`;

    await updateDoc(doc(db, `users/${user.uid}/bookmarks`, editingBookmark.id), {
      url: data.url,
      title: data.name || data.url,
      description: data.description,
      faviconUrl: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`,
      screenshotUrl: screenshotUrl,
      tags: data.tags,
      collectionId: data.collectionId,
      updatedAt: serverTimestamp()
    });
  }

  function handleOpenEdit(bookmark: Bookmark) {
    setEditingBookmark(bookmark);
    setShowEditModal(true);
  }

  const getHeaderTitle = () => {
    if (activeView === 'pinned') return 'Anclados';
    if (activeView === 'links') return 'Todos los Links';
    if (activeView === 'collection' && activeCollection) {
      const col = collections.find(c => c.id === activeCollection);
      return col?.name || 'Colección';
    }
    if (activeTag) return `#${activeTag}`;
    return 'Dashboard';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-zinc-100 mb-2">Redde Bookmark</h1>
            <p className="text-zinc-400">Guarda y organiza tus enlaces favoritos</p>
          </div>

          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="flex items-center gap-3 px-6 py-3 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            <button
              onClick={() => signInWithPopup(auth, githubProvider)}
              className="flex items-center gap-3 px-6 py-3 bg-zinc-800 text-zinc-100 font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continuar con GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <Sidebar
        collections={collections}
        tags={tags}
        collectionCounts={collectionCounts}
        activeCollection={activeCollection}
        activeTag={activeTag}
        onCollectionClick={(id) => {
          setActiveView('collection');
          setActiveCollection(id);
          setActiveTag(undefined);
        }}
        onTagClick={(tag) => {
          setActiveTag(tag);
        }}
        onHomeClick={() => {
          setActiveView('home');
          setActiveCollection(undefined);
          setActiveTag(undefined);
        }}
        onLinksClick={() => {
          setActiveView('links');
          setActiveCollection(undefined);
          setActiveTag(undefined);
        }}
        onPinnedClick={() => {
          setActiveView('pinned');
          setActiveCollection(undefined);
          setActiveTag(undefined);
        }}
      />

      {/* Main content */}
      <main className="flex-1 min-h-screen w-full overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-zinc-950 border-b border-zinc-800/50">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            {/* Left: Menu + Search */}
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="lg:hidden p-2 hover:bg-zinc-800/50 rounded-md transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Search */}
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search for Links"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:bg-zinc-900 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-zinc-800 rounded transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              {/* Edit Layout button */}
              <button
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors"
              >
                <span>Edit Layout</span>
              </button>

              {/* New button */}
              <button
                onClick={() => setShowFabMenu(!showFabMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New</span>
              </button>

              {/* Theme toggle */}
              <button
                className="hidden sm:block p-2 hover:bg-zinc-800/50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>

              {/* User avatar */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-4 top-14 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-20">
                    <div className="px-3 py-2.5 border-b border-zinc-800">
                      <p className="text-sm font-medium text-zinc-100 truncate">{user?.displayName || 'User'}</p>
                      <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { signOut(auth); setShowUserMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          {/* Dashboard View */}
          {activeView === 'home' && (
            <>
              {/* Title & Stats */}
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </h1>
              </div>
              <DashboardStats
                totalLinks={bookmarks.length}
                totalCollections={collections.length}
                totalTags={tags.length}
                pinnedCount={bookmarks.filter(b => b.pinned).length}
              />

              {/* Recent Links Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-zinc-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent Links
                  </h2>
                  {bookmarks.length > 0 && (
                    <button
                      onClick={() => setActiveView('links')}
                      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                    >
                      View All
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
                {bookmarks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                    {bookmarks.slice(0, 8).map((bookmark) => (
                      <BookmarkCard
                        key={bookmark.id}
                        bookmark={bookmark}
                        onDelete={deleteBookmark}
                        onPin={togglePin}
                        onEdit={handleOpenEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
                    <p className="text-sm text-zinc-500 mb-1">No links yet</p>
                    <p className="text-xs text-zinc-600">Start by adding your first bookmark</p>
                  </div>
                )}
              </div>

              {/* Collection Sections */}
              {collections.map((collection) => {
                const collectionBookmarks = bookmarks.filter(b => b.collectionId === collection.id).slice(0, 8);
                if (collectionBookmarks.length === 0) return null;

                return (
                  <div key={collection.id} className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-medium text-zinc-100 flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: collection.color || '#6366f1' }}
                        />
                        {collection.name}
                      </h2>
                      <button
                        onClick={() => {
                          setActiveView('collection');
                          setActiveCollection(collection.id);
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                      >
                        View All
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                      {collectionBookmarks.map((bookmark) => (
                        <BookmarkCard
                          key={bookmark.id}
                          bookmark={bookmark}
                          onDelete={deleteBookmark}
                          onPin={togglePin}
                          onEdit={handleOpenEdit}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Other Views (Links, Pinned, Collection, Tag filtered) */}
          {activeView !== 'home' && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-xl font-semibold text-white">{getHeaderTitle()}</h1>
                <span className="text-sm text-zinc-500">{filtered.length} items</span>
              </div>

              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {filtered.map((bookmark) => (
                    <BookmarkCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      onDelete={deleteBookmark}
                      onPin={togglePin}
                      onEdit={handleOpenEdit}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-zinc-800 rounded-lg">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500 mb-1">No links found</p>
                  <p className="text-xs text-zinc-600">Try a different filter or add new links</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* New Menu Dropdown (triggered from header button) */}
        {showFabMenu && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setShowFabMenu(false)}
            />
            <div className="fixed top-14 right-4 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-30">
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setShowAddModal(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  New Link
                </button>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setShowCollectionModal(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  New Collection
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateBookmark}
        collections={collections}
        existingTags={tags.map(t => t.name)}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        onSubmit={handleCreateCollection}
      />

      {/* Edit Link Modal */}
      <EditLinkModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingBookmark(null);
        }}
        onSubmit={handleEditBookmark}
        bookmark={editingBookmark}
        collections={collections}
        existingTags={tags.map(t => t.name)}
      />

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 z-50 lg:hidden overflow-y-auto">
            <div className="p-4">
              {/* Close button */}
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Logo */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-zinc-100">Redde</span>
              </div>

              {/* Navigation */}
              <nav className="space-y-1 mb-6">
                <button
                  onClick={() => {
                    setActiveView('home');
                    setActiveCollection(undefined);
                    setActiveTag(undefined);
                    setShowMobileSidebar(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-medium">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('links');
                    setActiveCollection(undefined);
                    setActiveTag(undefined);
                    setShowMobileSidebar(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="font-medium">Links</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('pinned');
                    setActiveCollection(undefined);
                    setActiveTag(undefined);
                    setShowMobileSidebar(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="font-medium">Pinned</span>
                </button>
              </nav>

              {/* Collections */}
              <div className="mb-6">
                <div className="text-sm font-medium text-zinc-400 px-3 mb-2">Collections</div>
                <div className="space-y-0.5">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => {
                        setActiveView('collection');
                        setActiveCollection(collection.id);
                        setActiveTag(undefined);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all ${
                        activeCollection === collection.id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: collection.color || '#6366f1' }}
                      />
                      <span className="text-sm truncate flex-1 text-left">{collection.name}</span>
                      <span className="text-xs text-zinc-500 font-medium">
                        {collectionCounts[collection.id] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="text-sm font-medium text-zinc-400 px-3 mb-2">Tags</div>
                <div className="space-y-0.5">
                  {tags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => {
                        setActiveTag(tag.name);
                        setShowMobileSidebar(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all ${
                        activeTag === tag.name
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-cyan-500">#</span>
                      <span className="text-sm truncate flex-1 text-left">{tag.name}</span>
                      <span className="text-xs text-zinc-500 font-medium">{tag.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
