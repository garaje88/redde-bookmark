import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
// import { httpsCallable, getFunctions } from 'firebase/functions'; // si usas fetchMetadata

export default function NewBookmark({ url="" }: { url?: string }) {
  const [value, setValue] = useState(url);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function enrich() {
    if (!value) return;
    setLoading(true);
    try {
      // TODO: usar functions callable cuando despliegues fetchMetadata
      // const fn = httpsCallable<{url:string}, any>(getFunctions(), 'fetchMetadata');
      // const res = await fn({ url: value });
      // setMeta(res.data);
      // MVP: placeholder (favicon por dominio)
      const urlObj = new URL(value);
      setMeta({ title: value, description: '', faviconUrl: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32` });
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { if (value) enrich(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const user = auth.currentUser; if (!user || !value) return;
    const data = {
      url: value,
      title: meta?.title || value,
      description: meta?.description || '',
      faviconUrl: meta?.faviconUrl || '',
      tags: [],
      collectionId: 'inbox',
      pinned: false,
      lang: navigator.language?.slice(0,2) || 'es',
      owner: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await addDoc(collection(db, `users/${user.uid}/bookmarks`), data);
    location.href = '/';
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <input className="border rounded px-3 py-2 w-full" value={value} onChange={e=>setValue(e.target.value)} placeholder="https://..." />
      {loading ? <div>Cargando…</div> : meta && (
        <div className="flex items-start gap-3">
          {meta.faviconUrl && <img src={meta.faviconUrl} width={16} height={16} />}
          <div>
            <div className="font-semibold">{meta.title}</div>
            {meta.description && <div className="text-sm opacity-80">{meta.description}</div>}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="border rounded px-3 py-2">Guardar</button>
        <a href="/" className="border rounded px-3 py-2">Cancelar</a>
      </div>
    </form>
  );
}
