import Link from 'next/link';
import { ArrowRight, GitBranch, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-slate-50 px-6 py-6 text-slate-950 sm:px-10 sm:py-10">
      <section className="relative mx-auto grid min-h-[calc(100dvh-3rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgb(15_23_42/0.08)] sm:min-h-[calc(100dvh-5rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col p-7 sm:p-12 lg:p-16">
          <div className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-700"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white"><GitBranch size={15} /></span> ProcessTwin</div>
          <div className="my-auto py-12 lg:py-0">
            <p className="pt-section-label text-sky-700">WebMCP process simulator</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-6xl sm:leading-[1.02]">The review surface for shared process work.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Agents propose process changes through the same command layer. People review the impact before anything merges.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/workspace?template=refund" className="pt-control min-h-11 px-5">Open demo <ArrowRight size={16} /></Link>
              <Link href="/workspace?blank=1" className="pt-subtle-control min-h-11 px-5">Start blank</Link>
            </div>
          </div>
          <p className="text-sm text-slate-500">Build, simulate, branch, and review in one shared workspace.</p>
        </div>
        <aside className="relative overflow-hidden border-t border-slate-200 bg-slate-950 p-7 text-slate-100 sm:p-12 lg:border-l lg:border-t-0 lg:p-16" aria-label="Product principles">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgb(148_163_184/0.15)_1px,transparent_1px),linear-gradient(90deg,rgb(148_163_184/0.15)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative flex h-full flex-col justify-between">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-sky-200"><Sparkles size={18} /></span>
            <div>
              <p className="text-sm font-medium text-slate-300">Human judgment stays in the loop.</p>
              <p className="mt-3 max-w-sm text-2xl font-medium tracking-[-0.03em] text-white">A scenario is a proposal, not a silent overwrite.</p>
              <dl className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[['One command layer', 'Shared state for people and agents'], ['Policy-aware changes', 'Constraints agents cannot bypass'], ['Human-only merge', 'Review the diff before applying it']].map(([title, description]) => <div key={title} className="border-t border-white/15 pt-3"><dt className="text-sm font-medium text-white">{title}</dt><dd className="mt-1 text-sm leading-5 text-slate-400">{description}</dd></div>)}
              </dl>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
