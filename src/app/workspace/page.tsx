const drawerTabs = ['Activity', 'Simulation', 'Validation', 'Agent'] as const;

export default function WorkspacePage() {
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-slate-50 text-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm text-slate-500">Workspace</p>
          <h1 className="text-lg font-semibold">ProcessTwin</h1>
        </div>
        <div className="flex items-center gap-2" aria-label="Workspace controls">
          <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Undo
          </button>
          <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Redo
          </button>
          <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Main process
          </button>
          <button type="button" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
            Simulate
          </button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[13rem_1fr_18rem] gap-px bg-slate-200">
        <aside className="bg-white p-4" aria-label="Step palette">
          <h2 className="text-sm font-semibold">Palette</h2>
          <p className="mt-2 text-sm text-slate-500">Step palette placeholder</p>
        </aside>
        <section className="bg-slate-50 p-4" aria-label="Process canvas">
          <p className="text-sm text-slate-500">Process canvas placeholder</p>
        </section>
        <aside className="bg-white p-4" aria-label="Inspector">
          <h2 className="text-sm font-semibold">Inspector</h2>
          <p className="mt-2 text-sm text-slate-500">Right rail placeholder</p>
        </aside>
      </div>

      <section className="border-t border-slate-200 bg-white px-6 py-3" aria-label="Workspace drawer">
        <div className="flex gap-2" role="tablist" aria-label="Workspace drawer tabs">
          {drawerTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={tab === 'Activity'}
              className="rounded px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              {tab}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
