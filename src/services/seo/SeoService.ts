/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized SEO Service for The Meridian.
 * Generates canonical URLs, meta tags, and schema.org compliant structured data.
 */

import { SEO_CONFIG, getCanonicalUrl, getSiteUrl } from '../../config/seoConfig';

export type IndexabilityState = 'indexable' | 'noindex' | 'private';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface SeoMetaResult {
  title: string;
  description: string;
  canonicalUrl: string;
  indexability: IndexabilityState;
  og: Record<string, string>;
  twitter: Record<string, string>;
  jsonLd: Record<string, any>;
}

export class SeoService {
  /**
   * Evaluates the indexability state of a given route path
   */
  public static getIndexabilityState(pathname: string): IndexabilityState {
    const clean = (pathname || '/').toLowerCase().trim();

    // Internal, automation, or debugging paths are private
    if (
      clean.startsWith('/api') ||
      clean.startsWith('/automation') ||
      clean.startsWith('/internal') ||
      clean.startsWith('/admin') ||
      clean.startsWith('/debug') ||
      clean.startsWith('/test')
    ) {
      return 'private';
    }

    // Search query result pages are noindex to avoid index bloat
    if (clean.startsWith('/search')) {
      return 'noindex';
    }

    return 'indexable';
  }

  /**
   * Generates complete SEO metadata and structured data for a published story
   */
  public static generateStoryMeta(story: {
    id?: string;
    slug: string;
    title: string;
    dek?: string;
    summary?: string;
    category?: string;
    subcategory?: string;
    publishedAt?: string;
    published_at?: string;
    updatedAt?: string;
    updated_at?: string;
    image?: string;
    heroImage?: { url?: string; alt?: string; caption?: string; credit?: string };
    heroMedia?: { storageUrl?: string; derivatives?: { openGraph?: { url?: string } } };
    hero_image_url?: string;
    author?: { name?: string; role?: string; avatar?: string };
  }): SeoMetaResult {
    const canonicalUrl = getCanonicalUrl(`/story/${story.slug}`);
    const description = story.dek || story.summary || story.title;
    const title = `${story.title} — ${SEO_CONFIG.siteName}`;
    const publishedDate = story.publishedAt || story.published_at || new Date().toISOString();
    const modifiedDate = story.updatedAt || story.updated_at || publishedDate;

    // Resolve primary image URL (prefers approved heroMedia derivative, then standard fields)
    let imageUrl =
      story.heroMedia?.derivatives?.openGraph?.url ||
      story.heroMedia?.storageUrl ||
      story.image ||
      story.heroImage?.url ||
      story.hero_image_url ||
      SEO_CONFIG.defaultSocialImage;

    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      imageUrl = `${getSiteUrl()}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    const authorName = story.author?.name || 'The Meridian Newsroom Desk';
    const authorRole = story.author?.role || 'Correspondent';

    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', path: '/' },
    ];
    if (story.category) {
      breadcrumbs.push({
        name: story.category,
        path: `/${story.category.toLowerCase().replace(/\s+/g, '-')}`,
      });
    }
    breadcrumbs.push({ name: story.title, path: `/story/${story.slug}` });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        SeoService.generateNewsArticleJsonLd({
          canonicalUrl,
          title: story.title,
          description,
          imageUrl,
          publishedDate,
          modifiedDate,
          authorName,
          authorRole,
          category: story.category || 'News',
        }),
        SeoService.generateBreadcrumbJsonLd(breadcrumbs),
      ],
    };

    return {
      title,
      description,
      canonicalUrl,
      indexability: 'indexable',
      og: {
        'og:type': 'article',
        'og:site_name': SEO_CONFIG.siteName,
        'og:title': title,
        'og:description': description,
        'og:url': canonicalUrl,
        'og:image': imageUrl,
        'og:locale': SEO_CONFIG.locale,
        'article:published_time': publishedDate,
        'article:modified_time': modifiedDate,
        'article:section': story.category || 'News',
        'article:author': authorName,
      },
      twitter: {
        'twitter:card': 'summary_large_image',
        'twitter:site': SEO_CONFIG.twitterHandle,
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': imageUrl,
      },
      jsonLd,
    };
  }

  /**
   * Generates SEO metadata and structured data for category & subcategory pages
   */
  public static generateCategoryMeta(
    categoryName: string,
    categorySlug: string,
    description?: string,
    subcategoryName?: string
  ): SeoMetaResult {
    const path = subcategoryName && subcategoryName !== 'all'
      ? `/${categorySlug}/${subcategoryName}`
      : `/${categorySlug}`;

    const canonicalUrl = getCanonicalUrl(path);
    const title = subcategoryName && subcategoryName !== 'all'
      ? `${subcategoryName} — ${categoryName} — ${SEO_CONFIG.siteName}`
      : `${categoryName} News, Analysis & Reports — ${SEO_CONFIG.siteName}`;

    const desc = description || `Latest ${categoryName} reporting, investigation, and analysis from ${SEO_CONFIG.siteName}.`;

    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'Home', path: '/' },
      { name: categoryName, path: `/${categorySlug}` },
    ];
    if (subcategoryName && subcategoryName !== 'all') {
      breadcrumbs.push({ name: subcategoryName, path });
    }

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        SeoService.generateBreadcrumbJsonLd(breadcrumbs),
        {
          '@type': 'CollectionPage',
          name: title,
          description: desc,
          url: canonicalUrl,
          publisher: SeoService.getPublisherObject(),
        },
      ],
    };

    return {
      title,
      description: desc,
      canonicalUrl,
      indexability: 'indexable',
      og: {
        'og:type': 'website',
        'og:site_name': SEO_CONFIG.siteName,
        'og:title': title,
        'og:description': desc,
        'og:url': canonicalUrl,
        'og:image': SEO_CONFIG.defaultSocialImage,
        'og:locale': SEO_CONFIG.locale,
      },
      twitter: {
        'twitter:card': 'summary_large_image',
        'twitter:site': SEO_CONFIG.twitterHandle,
        'twitter:title': title,
        'twitter:description': desc,
        'twitter:image': SEO_CONFIG.defaultSocialImage,
      },
      jsonLd,
    };
  }

  /**
   * Generates Schema.org compliant NewsArticle structured data
   */
  public static generateNewsArticleJsonLd(params: {
    canonicalUrl: string;
    title: string;
    description: string;
    imageUrl: string;
    publishedDate: string;
    modifiedDate: string;
    authorName: string;
    authorRole?: string;
    category?: string;
  }): Record<string, any> {
    return {
      '@type': 'NewsArticle',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': params.canonicalUrl,
      },
      headline: params.title,
      description: params.description,
      image: [params.imageUrl],
      datePublished: params.publishedDate,
      dateModified: params.modifiedDate,
      author: [
        {
          '@type': 'Person',
          name: params.authorName,
          jobTitle: params.authorRole || 'Correspondent',
          url: `${getSiteUrl()}/author/${encodeURIComponent(params.authorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))}`,
          worksFor: SeoService.getPublisherObject(),
        },
      ],
      publisher: SeoService.getPublisherObject(),
      articleSection: params.category || 'News',
    };
  }

  /**
   * Generates Schema.org compliant BreadcrumbList structured data
   */
  public static generateBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, any> {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: getCanonicalUrl(item.path),
      })),
    };
  }

  /**
   * Generates standard Schema.org NewsMediaOrganization object
   */
  public static getPublisherObject(): Record<string, any> {
    const siteUrl = getSiteUrl();
    return {
      '@type': 'NewsMediaOrganization',
      name: SEO_CONFIG.siteName,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}${SEO_CONFIG.logoUrl}`,
      },
      publishingPrinciples: `${siteUrl}/editorial-policy`,
      correctionsPolicy: `${siteUrl}/corrections`,
      ethicsPolicy: `${siteUrl}/ethics`,
    };
  }
}
