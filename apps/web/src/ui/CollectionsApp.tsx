import { useEffect, useState, useMemo } from 'react';
import { auth, db, googleProvider, githubProvider } from '../firebase';
import type { User } from 'firebase/auth';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, where
} from 'firebase/firestore';
import type { Bookmark, Collection } from '../types';
import CollectionCard from '../components/CollectionCard';
import CollectionModal from '../components/CollectionModal';
import Sidebar from '../components/Sidebar';

export default function CollectionsApp() {
  const [user, setUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Load collections
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

  // Load bookmarks to count per collection
  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }
    const col = collection(db, `users/${user.uid}/bookmarks`);
    const unsub = onSnapshot(col, (snap) => {
      setBookmarks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bookmark)));
    });
    return () => unsub();
  }, [user]);

  // Calculate bookmark counts per collection
  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bookmarks.forEach(bookmark => {
      const colId = bookmark.collectionId || 'inbox';
      counts[colId] = (counts[colId] || 0) + 1;
    });
    return counts;
  }, [bookmarks]);

  // Calculate tags for sidebar
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

  // Filter collections
  const filteredCollections = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return collections;
    return collections.filter(col =>
      col.name.toLowerCase().includes(search) ||
      col.description?.toLowerCase().includes(search)
    );
  }, [collections, searchQuery]);

  async function handleCreateCollection(data: {
    name: string;
    description: string;
    color: string;
  }) {
    if (!user) return;

    if (editingCollection) {
      // Update existing
      await updateDoc(doc(db, `users/${user.uid}/collections`, editingCollection.id), {
        name: data.name,
        description: data.description,
        color: data.color,
        updatedAt: serverTimestamp()
      });
      setEditingCollection(null);
    } else {
      // Create new
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
  }

  async function handleDeleteCollection(id: string) {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/collections`, id));
  }

  function handleEditCollection(col: Collection) {
    setEditingCollection(col);
    setShowModal(true);
  }

  function handleCollectionClick(id: string) {
    // Navigate to collection view
    window.location.href = `/?collection=${id}`;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-zinc-100 mb-2">Redde Bookmark</h1>
            <p className="text-zinc-400">Organiza tus enlaces en colecciones</p>
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
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collections={collections}
        tags={tags}
        collectionCounts={collectionCounts}
        activeCollection={undefined}
        activeTag={undefined}
        onCollectionClick={handleCollectionClick}
        onTagClick={(tag) => {
          window.location.href = `/?tag=${tag}`;
        }}
        onHomeClick={() => {
          window.location.href = '/';
        }}
        onLinksClick={() => {
          window.location.href = '/';
        }}
        onPinnedClick={() => {
          window.location.href = '/?view=pinned';
        }}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
          <div className="px-8 py-4">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Theme toggle */}
              <button
                className="relative p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300 group overflow-hidden"
                title="Toggle theme"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-orange-500/0 group-hover:from-yellow-500/5 group-hover:to-orange-500/5 transition-all duration-300"></div>
                <svg className="relative w-5 h-5 text-zinc-400 group-hover:text-yellow-400 group-hover:rotate-45 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>

              {/* User menu */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => signOut(auth)}
                  className="px-4 py-2.5 text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
                >
                  Sign Out
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Collections
              </h1>
              <p className="text-sm text-zinc-500">
                Collections you own
              </p>
            </div>

            <button
              onClick={() => {
                setEditingCollection(null);
                setShowModal(true);
              }}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-purple-600/25 hover:scale-[1.02]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Collection
            </button>
          </div>

          {/* Collections grid */}
          {filteredCollections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredCollections.map((col) => (
                <CollectionCard
                  key={col.id}
                  collection={col}
                  bookmarkCount={collectionCounts[col.id] || 0}
                  onEdit={handleEditCollection}
                  onDelete={handleDeleteCollection}
                  onClick={handleCollectionClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-zinc-500 text-lg mb-2">No collections yet</p>
              <p className="text-zinc-600 text-sm mb-4">Create your first collection to organize your bookmarks</p>
              <button
                onClick={() => {
                  setEditingCollection(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Collection
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCollection(null);
        }}
        onSubmit={handleCreateCollection}
        collection={editingCollection}
      />
    </div>
  );
}
