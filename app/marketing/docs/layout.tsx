import type { Metadata } from 'next'
import Link from 'next/link'
import '@/app/styles/club-lounge-docs.css'
import { ARTICLES, CATEGORIES } from './_articles'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'clublounge.app'

export const metadata: Metadata = {
  metadataBase: new URL(`https://${ROOT_DOMAIN}`),
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    articles: ARTICLES.filter(a => a.category === cat),
  })).filter(g => g.articles.length > 0)

  return (
    <div className="cl-docs-root">
      {/* Top nav */}
      <header className="cl-docs-header">
        <Link href="/" className="cl-docs-logo">
          Club<span>Lounge</span>
        </Link>
        <nav className="cl-docs-header-nav">
          <Link href="/#pricing">Pricing</Link>
          <Link href="/platform/login">Log in</Link>
          <Link href="/platform/signup" className="cl-docs-cta">Get started</Link>
        </nav>
      </header>

      <div className="cl-docs-body">
        {/* Sidebar */}
        <aside className="cl-docs-sidebar">
          <Link href="/docs" className="cl-docs-sidebar-home">
            ← All docs
          </Link>
          {byCategory.map(({ cat, articles }) => (
            <div key={cat} className="cl-docs-sidebar-group">
              <p className="cl-docs-sidebar-label">{cat}</p>
              <ul>
                {articles.map(a => (
                  <li key={a.slug}>
                    <Link href={`/docs/${a.slug}`} className="cl-docs-sidebar-link">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="cl-docs-content">
          {children}
        </main>
      </div>
    </div>
  )
}
