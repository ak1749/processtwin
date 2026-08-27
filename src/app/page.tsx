import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>ProcessTwin</h1>
      <p>Design and simulate a shared business process.</p>
      <Link href="/workspace">Open workspace</Link>
    </main>
  );
}
