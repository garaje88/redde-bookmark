import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
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
import CollectionManager from '../components/CollectionManager';
import DashboardStats from '../components/DashboardStats';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';

const COLLECTION_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4'
];

const DEFAULT_COLLECTION_ICON = '\u{1F4C1}';
const UNCATEGORIZED_COLLECTION_ID = '__uncategorized__';
const INBOX_COLLECTION_ID = 'inbox';
const COLUMN_BASE_WIDTHS: Record<number, number> = {
  0: 288, // ~w-72
  1: 288,
  2: 288
};
const NETSCAPE_ROOT_TITLE = 'Marcadores';
const NETSCAPE_HEADER = [
  '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
  '<!-- This is an automatically generated file.',
  '     It will be read and overwritten.',
  '     DO NOT EDIT! -->',
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  '<TITLE>Bookmarks</TITLE>',
  '<H1>Bookmarks</H1>'
].join('\n');

interface CollectionNode extends Collection {
  children: CollectionNode[];
  bookmarks: Bookmark[];
}

type StatusVariant = 'info' | 'success' | 'error';

interface StatusModalState {
  title: string;
  message: string;
  variant: StatusVariant;
  confirmText?: string;
}

interface ParsedFolder {
  type: 'folder';
  title: string;
  description: string;
  addDate?: number;
  lastModified?: number;
  children: ParsedNode[];
}

interface ParsedBookmark {
  type: 'bookmark';
  title: string;
  description: string;
  url: string;
  addDate?: number;
  lastModified?: number;
  icon?: string;
}

type ParsedNode = ParsedFolder | ParsedBookmark;

const isUnassignedBookmark = (bookmark: Bookmark) =>
  !bookmark.collectionId || bookmark.collectionId === INBOX_COLLECTION_ID;

const escapeHtml = (value?: string) => {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const toUnixSeconds = (value: any) => {
  if (!value && value !== 0) return Math.floor(Date.now() / 1000);
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }
  if (typeof value === 'object' && value?.seconds) {
    return Math.floor(value.seconds);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }
  return Math.floor(Date.now() / 1000);
};

const sortCollectionTree = (nodes: CollectionNode[]) => {
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  nodes.forEach(node => {
    node.children && sortCollectionTree(node.children);
    node.bookmarks.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));
  });
};

const buildCollectionTree = (collections: Collection[], bookmarks: Bookmark[]) => {
  const map = new Map<string, CollectionNode>();
  collections.forEach(col => {
    map.set(col.id, { ...col, children: [], bookmarks: [] });
  });

  const roots: CollectionNode[] = [];
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const rootBookmarks: Bookmark[] = [];
  bookmarks.forEach(bookmark => {
    if (bookmark.collectionId && map.has(bookmark.collectionId)) {
      map.get(bookmark.collectionId)!.bookmarks.push(bookmark);
    } else {
      rootBookmarks.push(bookmark);
    }
  });

  sortCollectionTree(roots);
  rootBookmarks.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));

  return { roots, rootBookmarks };
};

const renderBookmarkLine = (bookmark: Bookmark, lines: string[], level: number) => {
  const indent = '  '.repeat(level);
  const attributes = [
    `HREF="${escapeHtml(bookmark.url)}"`,
    `ADD_DATE="${toUnixSeconds(bookmark.createdAt)}"`,
    `LAST_MODIFIED="${toUnixSeconds(bookmark.updatedAt)}"`
  ];
  if (bookmark.faviconUrl) {
    attributes.push(`ICON="${escapeHtml(bookmark.faviconUrl)}"`);
  }
  lines.push(`${indent}<DT><A ${attributes.join(' ')}>${escapeHtml(bookmark.title || bookmark.url)}</A>`);
  if (bookmark.description) {
    lines.push(`${indent}<DD>${escapeHtml(bookmark.description)}`);
  }
};

const renderCollectionNode = (node: CollectionNode, lines: string[], level: number) => {
  const indent = '  '.repeat(level);
  lines.push(`${indent}<DT><H3 ADD_DATE="${toUnixSeconds(node.createdAt)}" LAST_MODIFIED="${toUnixSeconds(node.updatedAt)}">${escapeHtml(node.name)}</H3>`);
  if (node.description) {
    lines.push(`${indent}<DD>${escapeHtml(node.description)}`);
  }
  lines.push(`${indent}<DL><p>`);
  node.bookmarks.forEach(bookmark => renderBookmarkLine(bookmark, lines, level + 1));
  node.children.forEach(child => renderCollectionNode(child, lines, level + 1));
  lines.push(`${indent}</DL><p>`);
};

const generateNetscapeHtml = (bookmarks: Bookmark[], collections: Collection[]) => {
  const { roots, rootBookmarks } = buildCollectionTree(collections, bookmarks);
  const lines: string[] = [NETSCAPE_HEADER, '<DL><p>'];
  const rootTimestamp = Math.floor(Date.now() / 1000);
  lines.push(
    `  <DT><H3 ADD_DATE="${rootTimestamp}" LAST_MODIFIED="${rootTimestamp}" PERSONAL_TOOLBAR_FOLDER="true">${NETSCAPE_ROOT_TITLE}</H3>`
  );
  lines.push('  <DL><p>');
  rootBookmarks.forEach(bookmark => renderBookmarkLine(bookmark, lines, 2));
  roots.forEach(node => renderCollectionNode(node, lines, 2));
  lines.push('  </DL><p>');
  lines.push('</DL><p>');
  return lines.join('\n');
};

const decodeHtmlEntities = (value?: string) => {
  if (!value) return '';
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  return doc.documentElement.textContent || '';
};

const parseAttributeMap = (raw: string) => {
  const attrs: Record<string, string> = {};
  if (!raw) return attrs;
  const regex = /([A-Z0-9_:-]+)\s*=\s*"([^"]*)"/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw))) {
    attrs[match[1].toUpperCase()] = match[2];
  }
  return attrs;
};

const parseNetscapeBookmarks = (html: string): ParsedNode[] => {
  const root: ParsedFolder = {
    type: 'folder',
    title: '__root__',
    description: '',
    children: []
  };

  const parentStack: ParsedFolder[] = [root];
  let pendingFolder: ParsedFolder | null = null;
  let lastFolder: ParsedFolder | null = null;
  let lastBookmark: ParsedBookmark | null = null;

  const lines = html.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const upper = line.toUpperCase();

    if (upper.startsWith('<DT><H3')) {
      const match = line.match(/^<DT><H3([^>]*)>(.*?)<\/H3>/i);
      if (match) {
        const attrs = parseAttributeMap(match[1]);
        const folderNode: ParsedFolder = {
          type: 'folder',
          title: decodeHtmlEntities(match[2]),
          description: '',
          addDate: attrs.ADD_DATE ? Number(attrs.ADD_DATE) : undefined,
          lastModified: attrs.LAST_MODIFIED ? Number(attrs.LAST_MODIFIED) : undefined,
          children: []
        };
        parentStack[parentStack.length - 1].children.push(folderNode);
        pendingFolder = folderNode;
        lastFolder = folderNode;
        lastBookmark = null;
      }
      continue;
    }

    if (upper.startsWith('<DT><A')) {
      const match = line.match(/^<DT><A([^>]*)>(.*?)<\/A>/i);
      if (match) {
        const attrs = parseAttributeMap(match[1]);
        const href = attrs.HREF || attrs.href;
        if (href) {
          const bookmarkNode: ParsedBookmark = {
            type: 'bookmark',
            url: href,
            title: decodeHtmlEntities(match[2]),
            description: '',
            addDate: attrs.ADD_DATE ? Number(attrs.ADD_DATE) : undefined,
            lastModified: attrs.LAST_MODIFIED ? Number(attrs.LAST_MODIFIED) : undefined,
            icon: attrs.ICON || attrs.ICON_URI
          };
          parentStack[parentStack.length - 1].children.push(bookmarkNode);
          lastBookmark = bookmarkNode;
          lastFolder = null;
        }
      }
      continue;
    }

    if (upper.startsWith('<DD>')) {
      const text = decodeHtmlEntities(
        line
          .replace(/^<DD>/i, '')
          .replace(/<\/DD>/i, '')
          .trim()
      );
      if (text) {
        if (lastBookmark) {
          lastBookmark.description = lastBookmark.description
            ? `${lastBookmark.description}\n${text}`
            : text;
        } else if (lastFolder) {
          lastFolder.description = lastFolder.description
            ? `${lastFolder.description}\n${text}`
            : text;
        }
      }
      continue;
    }

    if (upper.startsWith('<DL')) {
      if (pendingFolder) {
        parentStack.push(pendingFolder);
        pendingFolder = null;
      } else {
        parentStack.push(parentStack[parentStack.length - 1]);
      }
      continue;
    }

    if (upper.startsWith('</DL')) {
      if (parentStack.length > 1) {
        parentStack.pop();
      }
      lastBookmark = null;
      lastFolder = parentStack[parentStack.length - 1] ?? null;
      pendingFolder = null;
      continue;
    }
  }

  return root.children;
};

export default function BookmarkApp() {
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'links' | 'pinned' | 'collection' | 'collections'>('home');
  const [activeCollection, setActiveCollection] = useState<string | undefined>();
  const [activeTag, setActiveTag] = useState<string | undefined>();
  const [collectionPath, setCollectionPath] = useState<string[]>([]);
  const [preselectedCollectionId, setPreselectedCollectionId] = useState<string | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({
    0: COLUMN_BASE_WIDTHS[0],
    1: COLUMN_BASE_WIDTHS[1],
    2: COLUMN_BASE_WIDTHS[2]
  });
  const [resizingLevel, setResizingLevel] = useState<number | null>(null);
  const resizeStartRef = useRef({ startX: 0, startWidth: 0 });

  const showStatusModal = (config: Omit<StatusModalState, 'variant'> & { variant?: StatusVariant }) => {
    setStatusModal({
      title: config.title,
      message: config.message,
      variant: config.variant || 'info',
      confirmText: config.confirmText
    });
  };

  const closeStatusModal = () => setStatusModal(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (resizingLevel === null) return;
    const handleMouseMove = (event: MouseEvent) => {
      const { startX, startWidth } = resizeStartRef.current;
      const delta = event.clientX - startX;
      const baseWidth = COLUMN_BASE_WIDTHS[resizingLevel] || COLUMN_BASE_WIDTHS[0];
      const maxWidth = baseWidth * 1.4;
      const nextWidth = Math.max(baseWidth, Math.min(startWidth + delta, maxWidth));
      setColumnWidths((prev) => ({
        ...prev,
        [resizingLevel]: nextWidth
      }));
    };
    const handleMouseUp = () => {
      setResizingLevel(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingLevel]);

  const unassignedBookmarks = useMemo(
    () => bookmarks.filter(isUnassignedBookmark),
    [bookmarks]
  );

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

  useEffect(() => {
    setCollectionPath((prev) =>
      prev
        .filter(id => {
          if (id === UNCATEGORIZED_COLLECTION_ID) {
            return Boolean(unassignedBookmarks.length);
          }
          return collections.some(c => c.id === id);
        })
        .slice(0, 3) // Limitar profundidad máxima (principal + 2 niveles hijas)
    );
  }, [collections, unassignedBookmarks.length]);

  // Calcular tags Ãºnicos
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
      if (!colId || colId === INBOX_COLLECTION_ID) {
        return;
      }
      counts[colId] = (counts[colId] || 0) + 1;
    });
    if (unassignedBookmarks.length > 0) {
      counts[UNCATEGORIZED_COLLECTION_ID] = unassignedBookmarks.length;
    }
    return counts;
  }, [bookmarks, unassignedBookmarks.length]);

  const childCountByCollection = useMemo(() => {
    const counts: Record<string, number> = {};
    collections.forEach((collection) => {
      if (!collection.parentId) return;
      counts[collection.parentId] = (counts[collection.parentId] || 0) + 1;
    });
    return counts;
  }, [collections]);

  const unassignedCollection = useMemo(() => {
    if (unassignedBookmarks.length === 0) {
      return null;
    }
    return {
      id: UNCATEGORIZED_COLLECTION_ID,
      name: 'Links sin colección',
      description: 'Links que aún no pertenecen a una colección',
      color: '#475569',
      icon: DEFAULT_COLLECTION_ICON,
      parentId: undefined,
      owner: 'system',
      createdAt: null,
      updatedAt: null
    } as Collection;
  }, [unassignedBookmarks.length]);

  const rootCollections = useMemo(() => {
    const roots = collections.filter(c => !c.parentId);
    return unassignedCollection ? [unassignedCollection, ...roots] : roots;
  }, [collections, unassignedCollection]);

  // Filtrar bookmarks por bÃºsqueda primero (se aplica siempre)
  const searchFiltered = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return bookmarks;

    return bookmarks.filter(b =>
      b.title?.toLowerCase().includes(search) ||
      b.description?.toLowerCase().includes(search) ||
      b.url?.toLowerCase().includes(search) ||
      b.tags?.some(t => t.toLowerCase().includes(search))
    );
  }, [bookmarks, searchQuery]);

  // Filtrar bookmarks por vista y tag
  const filtered = useMemo(() => {
    let result = searchFiltered;

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

    return result;
  }, [searchFiltered, activeView, activeCollection, activeTag]);

  const maxChildLevels = 2;

  const collectionColumns = useMemo(() => {
    if (rootCollections.length === 0) {
      return [];
    }

    const cols: Array<{
      level: number;
      parentId?: string;
      items: Collection[];
      selectedId?: string;
    }> = [
      {
        level: 0,
        items: rootCollections,
        selectedId: collectionPath[0]
      }
    ];

    collectionPath.slice(0, maxChildLevels).forEach((parentId, index) => {
      if (parentId === UNCATEGORIZED_COLLECTION_ID) {
        return;
      }
      cols.push({
        level: index + 1,
        parentId,
        items: collections.filter(c => c.parentId === parentId),
        selectedId: collectionPath[index + 1]
      });
    });

    return cols;
  }, [collections, collectionPath, rootCollections]);

  const selectedTrail = useMemo(
    () => collectionPath
      .map(id => {
        if (id === UNCATEGORIZED_COLLECTION_ID) {
          return unassignedCollection;
        }
        return collections.find(c => c.id === id);
      })
      .filter((collection): collection is Collection => Boolean(collection)),
    [collectionPath, collections, unassignedCollection]
  );

  const selectedCollection = selectedTrail[selectedTrail.length - 1];
  const isVirtualCollection = selectedCollection?.id === UNCATEGORIZED_COLLECTION_ID;

  const selectedCollectionBookmarks = useMemo(() => {
    if (!selectedCollection) {
      return [];
    }
    return bookmarks.filter(b => {
      if (isVirtualCollection) {
        return isUnassignedBookmark(b);
      }
      return b.collectionId === selectedCollection.id;
    });
  }, [bookmarks, selectedCollection?.id, isVirtualCollection]);
  const handleResizeStart = (level: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const baseWidth = COLUMN_BASE_WIDTHS[level] || COLUMN_BASE_WIDTHS[0];
    const currentWidth = columnWidths[level] || baseWidth;
    resizeStartRef.current = { startX: event.clientX, startWidth: currentWidth };
    setResizingLevel(level);
  };

  const columnViewportHeight = 'calc(100vh - 220px)';

  const getColumnTitle = (level: number) => {
    if (level === 0) return 'Colecciones principales';
    if (level === 1) return 'Colecciones hijas - Nivel 2';
    if (level === 2) return 'Colecciones hijas - Nivel 3';
    return `Nivel ${level + 1}`;
  };

  const handleSelectCollection = (collectionId: string, level: number) => {
    setCollectionPath((prev) => {
      const next = prev.slice(0, level);
      next[level] = collectionId;
      return next.slice(0, maxChildLevels + 1);
    });
  };

  const handleClearCollectionPath = () => setCollectionPath([]);

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
    parentId?: string;
  }) {
    if (!user) return;

    await addDoc(collection(db, `users/${user.uid}/collections`), {
      name: data.name,
      description: data.description,
      color: data.color,
      parentId: data.parentId || null,
      icon: DEFAULT_COLLECTION_ICON,
      owner: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async function handleUpdateCollection(id: string, data: {
    name: string;
    description: string;
    color: string;
    parentId?: string;
  }) {
    if (!user) return;

    await updateDoc(doc(db, `users/${user.uid}/collections`, id), {
      name: data.name,
      description: data.description,
      color: data.color,
      parentId: data.parentId || null,
      updatedAt: serverTimestamp()
    });
  }

  async function handleDeleteCollection(id: string) {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/collections`, id));
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

  const handleExportHtml = () => {
    if (!user) {
      showStatusModal({
        title: 'Inicia sesión para exportar',
        message: 'Conéctate con tu cuenta para descargar tus colecciones y links.',
        variant: 'info'
      });
      return;
    }
    if (!bookmarks.length && !collections.length) {
      showStatusModal({
        title: 'Sin contenido para exportar',
        message: 'Crea al menos una colección o link antes de generar el archivo HTML.',
        variant: 'info'
      });
      return;
    }
    setShowUserMenu(false);
    setIsExporting(true);
    try {
      const html = generateNetscapeHtml(bookmarks, collections);
      const blob = new Blob([html], { type: 'text/html;charset=UTF-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `bookmarks_${dateStamp}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar marcadores', error);
      showStatusModal({
        title: 'No pudimos generar el archivo',
        message: 'Intenta nuevamente o refresca la página antes de exportar.',
        variant: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const triggerHtmlImport = () => {
    if (!user) {
      showStatusModal({
        title: 'Inicia sesión para importar',
        message: 'Conéctate con tu cuenta para traer tus colecciones desde HTML.',
        variant: 'info'
      });
      return;
    }
    setShowUserMenu(false);
    fileInputRef.current?.click();
  };

  const handleHtmlFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    setIsImporting(true);
    try {
      const content = await file.text();
      const parsedNodes = parseNetscapeBookmarks(content);
      if (!parsedNodes.length) {
        throw new Error('Archivo sin estructura NETSCAPE');
      }

      const stats = { collections: 0, bookmarks: 0 };
      let colorCursor = 0;
      const nextColor = () => {
        const color = COLLECTION_COLORS[colorCursor % COLLECTION_COLORS.length];
        colorCursor += 1;
        return color;
      };

      const persistNodes = async (nodes: ParsedNode[], parentId?: string | null) => {
        for (const nodeItem of nodes) {
          if (nodeItem.type === 'folder') {
            const collectionRef = await addDoc(collection(db, `users/${user.uid}/collections`), {
              name: nodeItem.title || 'Colección sin nombre',
              description: nodeItem.description || '',
              color: nextColor(),
              parentId: parentId || null,
              icon: DEFAULT_COLLECTION_ICON,
              owner: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            stats.collections += 1;
            await persistNodes(nodeItem.children, collectionRef.id);
          } else {
            try {
              const urlObj = new URL(nodeItem.url);
              const screenshotUrl = `https://image.thum.io/get/width/800/crop/600/${encodeURIComponent(nodeItem.url)}`;
              const faviconUrl = nodeItem.icon || `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
              await addDoc(collection(db, `users/${user.uid}/bookmarks`), {
                url: nodeItem.url,
                title: nodeItem.title || nodeItem.url,
                description: nodeItem.description || '',
                faviconUrl,
                screenshotUrl,
                screenshotPath: '',
                tags: [],
                collectionId: parentId || null,
                pinned: false,
                lang: navigator.language?.slice(0, 2) || 'es',
                owner: user.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              stats.bookmarks += 1;
            } catch (bookmarkError) {
              console.warn('Marcador omitido por URL inválida', nodeItem.url, bookmarkError);
            }
          }
        }
      };

      await persistNodes(parsedNodes, null);
      showStatusModal({
        title: 'Importación completada',
        message: `Se agregaron ${stats.collections} colecciones y ${stats.bookmarks} links desde el archivo.`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Error al importar HTML', error);
      showStatusModal({
        title: 'No se pudo importar el archivo',
        message: 'Revisa que el HTML siga el formato de ejemplo o vuelve a intentarlo.',
        variant: 'error'
      });
    } finally {
      setIsImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  function handleOpenEdit(bookmark: Bookmark) {
    setEditingBookmark(bookmark);
    setShowEditModal(true);
  }

  const getHeaderTitle = () => {
    if (activeView === 'pinned') return 'Anclados';
    if (activeView === 'links') return 'Todos los Links';
    if (activeView === 'collections') return 'Colecciones';
    if (activeView === 'collection' && activeCollection) {
      const col = collections.find(c => c.id === activeCollection);
      return col?.name || 'ColecciÃ³n';
    }
    if (activeTag) return `#${activeTag}`;
    return 'Dashboard';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Glassmorphic Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-12">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img
                src="/assets/logos/redde 2 logo.png"
                alt="Redde Logo"
                className="h-16 sm:h-20 w-auto"
              />
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">redde bookmark</h1>
              <p className="text-sm text-zinc-600">Continue with your preferred account</p>
            </div>

            {/* Login Buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-zinc-900 font-medium rounded-xl border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => signInWithPopup(auth, githubProvider)}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </button>
            </div>

            {/* Terms */}
            <div className="text-center">
              <a
                href="#"
                className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors underline decoration-dotted"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 text-zinc-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={handleHtmlFileChange}
      />
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
        onManageCollectionsClick={() => {
          setActiveView('collections');
          setActiveCollection(undefined);
          setActiveTag(undefined);
        }}
      />

      {/* Main content */}
      <main className="flex-1 min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-blue-700/5">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b-2 border-zinc-700/50 shadow-lg">
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
                        onClick={triggerHtmlImport}
                        disabled={isImporting}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                        </svg>
                        {isImporting ? 'Importando...' : 'Importar HTML'}
                      </button>
                      <button
                        onClick={handleExportHtml}
                        disabled={isExporting}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v16" />
                        </svg>
                        {isExporting ? 'Generando...' : 'Exportar HTML'}
                      </button>
                      <div className="border-t border-zinc-800 my-1" />
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
                    {searchQuery ? 'Search Results' : 'Recent Links'}
                  </h2>
                  {searchFiltered.length > 0 && !searchQuery && (
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
                {searchFiltered.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                    {searchFiltered.slice(0, 8).map((bookmark) => (
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
              {!searchQuery && collections.map((collection) => {
                const collectionBookmarks = searchFiltered.filter(b => b.collectionId === collection.id).slice(0, 8);
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

          {/* Collections View */}
          {activeView === 'collections' && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 text-xl font-semibold text-white">
                    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Colecciones
                  </div>
                  <p className="text-sm text-zinc-500">
                    Navega {rootCollections.length} colecciones por niveles y encuentra rapidamente sus enlaces.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCollection(null);
                      setShowCollectionModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-200 border border-purple-500/40 hover:bg-purple-600/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva coleccion
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCollectionPath}
                    disabled={collectionPath.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar seleccion
                  </button>
                </div>
              </div>

              {rootCollections.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {collectionColumns.map((column) => {
                    if (column.level > 0 && column.items.length === 0) {
                      return null;
                    }
                    const columnWidth = columnWidths[column.level] || COLUMN_BASE_WIDTHS[column.level] || COLUMN_BASE_WIDTHS[0];
                    return (
                      <div
                        key={`${column.level}-${column.parentId || 'root'}`}
                        className="relative flex-shrink-0 bg-[rgba(8,8,11,0.85)] border border-zinc-900/40 shadow-[0_15px_40px_rgba(0,0,0,0.35)] rounded-3xl p-4 flex flex-col"
                        style={{ height: columnViewportHeight, maxHeight: columnViewportHeight, width: columnWidth }}
                      >
                        <div className="text-xs uppercase tracking-[0.35em] text-zinc-500 mb-3">
                          {getColumnTitle(column.level)}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                          {column.items.length > 0 ? (
                            column.items.map((collection) => {
                            const isSelected = column.selectedId === collection.id;
                            const childCount = childCountByCollection[collection.id] || 0;
                            const bookmarkCount = collectionCounts[collection.id] || 0;
                            const meta: string[] = [];
                            if (childCount > 0) {
                              meta.push(`${childCount} ${childCount === 1 ? 'sub' : 'subs'}`);
                            }
                            if (bookmarkCount > 0) {
                              meta.push(`${bookmarkCount} ${bookmarkCount === 1 ? 'link' : 'links'}`);
                            }

                            return (
                              <button
                                key={collection.id}
                                type="button"
                                onClick={() => handleSelectCollection(collection.id, column.level)}
                                className={`w-full text-left rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                                  isSelected
                                    ? 'border-purple-500/70 bg-purple-500/15 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                    : 'border-transparent bg-zinc-900/60 hover:border-zinc-700/80 hover:bg-zinc-900/80'
                                }`}
                              >
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                                  style={{ backgroundColor: collection.color || '#6366f1' }}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white truncate">{collection.name}</p>
                                  <p className="text-xs text-zinc-500 truncate">
                                    {meta.length > 0 ? meta.join(' / ') : 'Sin elementos'}
                                  </p>
                                </div>
                                <svg
                                  className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-purple-300' : 'text-zinc-600'}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            );
                          })) : (
                            column.level === 0 ? (
                              <div className="h-full flex items-center justify-center text-center text-xs text-zinc-500 border border-dashed border-zinc-800/60 rounded-2xl px-3 py-6">
                                No hay colecciones principales todavia
                              </div>
                            ) : null
                          )}
                        </div>
                        <div
                          role="presentation"
                          onMouseDown={(event) => handleResizeStart(column.level, event)}
                          className="absolute top-0 right-0 w-2 h-full cursor-ew-resize flex items-center justify-center select-none"
                        >
                          <div className="w-0.5 h-12 bg-zinc-700/60 rounded-full" />
                        </div>
                      </div>
                    );
                  })}

                  {selectedCollection && (
                    <div
                      className="flex-shrink-0 w-85 bg-[rgba(8,8,11,0.9)] border border-zinc-900/40 shadow-[0_15px_40px_rgba(0,0,0,0.35)] rounded-3xl p-4 flex flex-col"
                      style={{ height: columnViewportHeight, maxHeight: columnViewportHeight }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Ultimo nivel - Links</p>
                          <p className="text-base font-semibold text-white">{selectedCollection.name}</p>
                          {selectedTrail.length > 1 && (
                            <p className="text-xs text-zinc-500 mt-1 truncate">
                              {selectedTrail.map((c) => c.name).join(' / ')}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">{selectedCollectionBookmarks.length} links</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <button
                          type="button"
                          disabled={isVirtualCollection}
                          onClick={() => {
                            if (!selectedCollection) return;
                            setPreselectedCollectionId(selectedCollection.id);
                            setShowAddModal(true);
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border border-blue-500/30 transition-colors ${
                            isVirtualCollection
                              ? 'bg-blue-600/10 text-blue-400/60 cursor-not-allowed'
                              : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                          }`}
                        >
                          Nuevo link
                        </button>
                        {!isVirtualCollection && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCollection(selectedCollection);
                                setShowCollectionModal(true);
                              }}
                              className="px-3 py-1.5 text-xs rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-400/30 hover:bg-yellow-500/30 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedCollection) return;
                                setCollectionToDelete({ id: selectedCollection.id, name: selectedCollection.name });
                                setShowDeleteConfirm(true);
                              }}
                              className="px-3 py-1.5 text-xs rounded-full bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-colors"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={isVirtualCollection}
                          onClick={() => {
                            if (!selectedCollection) return;
                            setActiveView('collection');
                            setActiveCollection(selectedCollection.id);
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border border-zinc-700 transition-colors ${
                            isVirtualCollection
                              ? 'bg-zinc-900/60 text-zinc-500 cursor-not-allowed'
                              : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                          }`}
                        >
                          Ver detalle
                        </button>
                      </div>
                      {isVirtualCollection && (
                        <p className="text-xs text-blue-300 mb-3">
                          Estos links aún no tienen colección asignada. Edita cada uno para moverlo a una carpeta.
                        </p>
                      )}

                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {selectedCollectionBookmarks.length > 0 ? (
                          selectedCollectionBookmarks.map((bookmark) => (
                            <button
                              key={bookmark.id}
                              type="button"
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  window.open(bookmark.url, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl border border-transparent bg-zinc-900/60 hover:border-purple-500/40 hover:bg-zinc-900 transition-all text-left"
                            >
                              <div className="w-7 h-7 rounded-xl bg-zinc-800/80 flex items-center justify-center text-purple-300">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4a4 4 0 015.656-5.656l-1.1 1.1" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{bookmark.title || bookmark.url}</p>
                                <p className="text-xs text-zinc-500 truncate">
                                  {bookmark.url.replace(/^https?:\/\//, '')}
                                </p>
                              </div>
                              <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))
                        ) : (
                          <div className="text-sm text-zinc-500 text-center border border-dashed border-zinc-800/60 rounded-2xl px-3 py-6">
                            Esta coleccion todavia no tiene links.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500 mb-1">Aun no tienes colecciones</p>
                  <p className="text-xs text-zinc-600">Crea una coleccion para comenzar a organizar tus links.</p>
                </div>
              )}
            </>
          )}

          {/* Other Views (Links, Pinned, Collection, Tag filtered) */}
          {activeView !== 'home' && activeView !== 'collections' && (
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
        onClose={() => {
          setShowAddModal(false);
          setPreselectedCollectionId(undefined);
        }}
        onSubmit={handleCreateBookmark}
        collections={collections}
        existingTags={tags.map(t => t.name)}
        preselectedCollectionId={preselectedCollectionId}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => {
          setShowCollectionModal(false);
          setEditingCollection(null);
        }}
        onSubmit={async (data) => {
          if (editingCollection) {
            await handleUpdateCollection(editingCollection.id, data);
          } else {
            await handleCreateCollection(data);
          }
        }}
        collections={collections}
        collection={editingCollection}
      />

      {/* Collection Manager */}
      <CollectionManager
        isOpen={showCollectionManager}
        onClose={() => setShowCollectionManager(false)}
        collections={collections}
        onCreateCollection={handleCreateCollection}
        onUpdateCollection={handleUpdateCollection}
        onDeleteCollection={handleDeleteCollection}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCollectionToDelete(null);
        }}
        onConfirm={async () => {
          if (collectionToDelete) {
            await handleDeleteCollection(collectionToDelete.id);
          }
        }}
        title="Delete Collection"
        message={`Are you sure you want to delete "${collectionToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
      />

      <FeedbackModal
        isOpen={!!statusModal}
        onClose={closeStatusModal}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        variant={statusModal?.variant}
        confirmText={statusModal?.confirmText}
      />

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-black border-r border-zinc-800/30 z-50 lg:hidden overflow-y-auto">
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
                <img
                  src="/assets/logos/redde 2 logo.png"
                  alt="Redde Logo"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold text-zinc-100">Redde Bookmark</span>
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
