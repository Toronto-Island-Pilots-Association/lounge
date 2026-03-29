import type { Metadata } from 'next'
import Link from 'next/link'
import { ARTICLES, CATEGORIES } from './_articles'

export const metadata: Metadata = {
  title: 'Documentation — Club Lounge',
  description: 'Guides and answers for Club Lounge — getting started, migration, dues, custom domains, and member management.',
}

export default function DocsIndexPage() {
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    articles: ARTICLES.filter(a => a.category === cat),
  })).filter(g => g.articles.length > 0)

  return (
    <div className="cl-docs-index">
      <h1 className="cl-docs-index-title">Documentation</h1>
      <p className="cl-docs-index-sub">
        Everything you need to set up your lounge, migrate your members, and get the most out of Club Lounge.
      </p>

      <div className="cl-docs-index-grid">
        {byCategory.map(({ cat, articles }) => (
          <div key={cat} className="cl-docs-index-group">
            <h2 className="cl-docs-index-cat">{cat}</h2>
            <ul className="cl-docs-index-list">
              {articles.map(a => (
                <li key={a.slug}>
                  <Link href={`/docs/${a.slug}`} className="cl-docs-index-item">
                    <span className="cl-docs-item-title">{a.title}</span>
                    <span className="cl-docs-item-desc">{a.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
