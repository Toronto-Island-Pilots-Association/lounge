import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ARTICLES } from '../_articles'

export function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = ARTICLES.find(a => a.slug === slug)
  if (!article) return {}
  return {
    title: `${article.title} — Club Lounge Docs`,
    description: article.description,
  }
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = ARTICLES.find(a => a.slug === slug)
  if (!article) notFound()

  const categoryArticles = ARTICLES.filter(a => a.category === article.category && a.slug !== slug)

  return (
    <article className="cl-docs-article">
      <div className="cl-docs-article-meta">
        <span className="cl-docs-article-cat">{article.category}</span>
      </div>
      <h1 className="cl-docs-article-title">{article.title}</h1>
      <p className="cl-docs-article-lead">{article.description}</p>

      <div className="cl-docs-article-body">
        {article.sections.map((section, i) => (
          <div key={i} className="cl-docs-section">
            {section.heading && <h2 className="cl-docs-section-heading">{section.heading}</h2>}
            <p className="cl-docs-section-body">{section.body}</p>
          </div>
        ))}
      </div>

      {categoryArticles.length > 0 && (
        <div className="cl-docs-related">
          <h3 className="cl-docs-related-title">Also in {article.category}</h3>
          <ul className="cl-docs-related-list">
            {categoryArticles.map(a => (
              <li key={a.slug}>
                <Link href={`/docs/${a.slug}`} className="cl-docs-related-link">
                  {a.title} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cl-docs-footer-nav">
        <Link href="/docs" className="cl-docs-back">← All docs</Link>
        <a href={`mailto:hello@clublounge.app?subject=Docs feedback: ${article.title}`} className="cl-docs-feedback">
          Something wrong? Email us
        </a>
      </div>
    </article>
  )
}
