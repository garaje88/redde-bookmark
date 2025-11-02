interface DashboardStatsProps {
  totalLinks: number;
  totalCollections: number;
  totalTags: number;
  pinnedCount: number;
}

export default function DashboardStats({
  totalLinks,
  totalCollections,
  totalTags,
  pinnedCount
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Links Card */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 hover:bg-zinc-900/50 transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-0.5">Links</div>
            <div className="text-2xl font-bold text-zinc-100">{totalLinks}</div>
          </div>
        </div>
      </div>

      {/* Collections Card */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 hover:bg-zinc-900/50 transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-0.5">Collections</div>
            <div className="text-2xl font-bold text-zinc-100">{totalCollections}</div>
          </div>
        </div>
      </div>

      {/* Tags Card */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 hover:bg-zinc-900/50 transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-0.5">Tags</div>
            <div className="text-2xl font-bold text-zinc-100">{totalTags}</div>
          </div>
        </div>
      </div>

      {/* Pinned Card */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 hover:bg-zinc-900/50 transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-0.5">Pinned</div>
            <div className="text-2xl font-bold text-zinc-100">{pinnedCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
