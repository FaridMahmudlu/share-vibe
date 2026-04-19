import { useEffect } from 'react'
import { updatePageMeta, updateBreadcrumbs, trackPageView } from '../seo/utils'
import type { PageMetaData, BreadcrumbItem } from '../seo/types'

interface UsePageMetaOptions extends PageMetaData {
  breadcrumbs?: BreadcrumbItem[]
}

/**
 * React hook to update page metadata and track page views
 * Automatically updates meta tags, canonical, OG tags, Twitter cards
 * 
 * @param meta - Page metadata (title, description, etc)
 * @param path - Current page path (e.g., '/cafe/my-cafe')
 * 
 * @example
 * export function MyPage() {
 *   usePageMeta({
 *     title: 'My Page - ShareVibe',
 *     description: 'Page description...',
 *     keywords: ['keyword1', 'keyword2'],
 *     image: 'https://...',
 *     type: 'website',
 *     breadcrumbs: [
 *       { name: 'Home', url: '/' },
 *       { name: 'My Page', url: '/my-page' }
 *     ]
 *   }, '/my-page')
 *   
 *   return <div>Content</div>
 * }
 */
export function usePageMeta(meta: UsePageMetaOptions, path: string): void {
  useEffect(() => {
    // Build full URL
    const fullUrl = `https://sharevibe.co${path}`
    const canonical = meta.canonical || fullUrl

    // Update meta tags
    updatePageMeta({
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      image: meta.image,
      type: meta.type || 'website',
      author: meta.author,
      publishedDate: meta.publishedDate,
      modifiedDate: meta.modifiedDate,
      url: fullUrl,
      canonical,
    })

    // Update breadcrumbs if provided
    if (meta.breadcrumbs && meta.breadcrumbs.length > 0) {
      updateBreadcrumbs(meta.breadcrumbs)
    }

    // Track page view
    trackPageView(path, meta.title, (meta.type as 'page' | 'article' | 'product') || 'page')

    // Scroll to top on route change
    window.scrollTo(0, 0)
  }, [meta, path])
}

export default usePageMeta
