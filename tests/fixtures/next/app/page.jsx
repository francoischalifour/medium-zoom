import Link from 'next/link'
export default function Page() {
  return (
    <main>
      <h1>Server Components fixture</h1>
      <Link href="/zoom">Open the image example</Link>
      <Link href="/composed">Open the composed example</Link>
    </main>
  )
}
