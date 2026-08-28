import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center bg-slate-50 px-6 py-16 text-slate-950 sm:px-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white px-7 py-10 shadow-sm sm:px-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">WebMCP process simulator</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">ProcessTwin</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">Pull requests for application state. The agent branches, experiments, and proposes; the human reviews a diff and merges.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/workspace?template=refund" className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700">Open demo</Link>
          <Link href="/workspace?blank=1" className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50">Start blank</Link>
        </div>
      </section>
    </main>
  );
}
