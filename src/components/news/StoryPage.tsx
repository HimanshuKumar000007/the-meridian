/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo } from 'react';
import type { NewsStory } from '../../types/story';
import type { Story } from '../../data/mockNews';
import { ReadingProgress } from './ReadingProgress';
import { StoryHeader } from './StoryHeader';
import { StoryHero } from './StoryHero';
import { QuickSummary } from './QuickSummary';
import { ArticleContent } from './ArticleContent';
import { KeyFacts } from './KeyFacts';
import { StoryTimeline } from './StoryTimeline';
import { SourcesList } from './SourcesList';
import { AuthorBlock } from './AuthorBlock';
import { StoryCorrections } from './StoryCorrections';
import { RelatedStories } from './RelatedStories';
import { MoreFromCategory } from './MoreFromCategory';

interface StoryPageProps {
  story: NewsStory;
  allStories?: Story[];
  onNavigateHome: () => void;
  onSelectCategory?: (category: string) => void;
  onSelectStory: (story: Story | NewsStory) => void;
}

export const StoryPage: React.FC<StoryPageProps> = ({
  story,
  allStories = [],
  onNavigateHome,
  onSelectCategory,
  onSelectStory,
}) => {
  // Update document title, meta tags, and structured data dynamically
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${story.title} — The Meridian`;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const descriptionText = story.dek || story.summary || story.title;
    metaDesc.setAttribute('content', descriptionText);

    // Update OpenGraph Title & Description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${story.title} — The Meridian`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', descriptionText);
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && story.heroImage?.url) {
      ogImage.setAttribute('content', story.heroImage.url);
    }

    // Dynamic JSON-LD Structured Data for NewsArticle & BreadcrumbList
    const structuredDataId = 'meridian-story-jsonld';
    let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = structuredDataId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://themeridian.news/story/${story.slug}`;

    const jsonLdData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'NewsArticle',
          headline: story.title,
          description: descriptionText,
          url: currentUrl,
          datePublished: story.publishedAt,
          dateModified: story.updatedAt || story.publishedAt,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': currentUrl,
          },
          author: story.author
            ? {
                '@type': 'Person',
                name: story.author.name,
                jobTitle: story.author.role,
              }
            : {
                '@type': 'Organization',
                name: 'The Meridian Editorial Team',
              },
          publisher: {
            '@type': 'NewsMediaOrganization',
            name: 'The Meridian',
            url: 'https://themeridian.news',
          },
          image: story.heroImage?.url ? [story.heroImage.url] : undefined,
          articleSection: story.category,
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://themeridian.news',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: story.category,
              item: `https://themeridian.news/${story.category.toLowerCase().replace(/\s+/g, '-')}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: story.title,
              item: currentUrl,
            },
          ],
        },
      ],
    };

    scriptTag.text = JSON.stringify(jsonLdData);

    // Scroll to top on story mount
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    return () => {
      document.title = originalTitle;
      const script = document.getElementById(structuredDataId);
      if (script) script.remove();
    };
  }, [story]);

  // Compute related stories (excluding current story)
  const relatedStories = useMemo(() => {
    if (story.relatedSlugs && story.relatedSlugs.length > 0) {
      const explicit = allStories.filter((s) => story.relatedSlugs?.includes(s.slug));
      if (explicit.length > 0) return explicit;
    }
    // Fallback: stories in the same category
    return allStories
      .filter((s) => s.id !== story.id && s.slug !== story.slug)
      .filter(
        (s) =>
          s.category.toLowerCase() === story.category.toLowerCase() ||
          s.category.toLowerCase().includes(story.category.toLowerCase()) ||
          story.category.toLowerCase().includes(s.category.toLowerCase())
      )
      .slice(0, 3);
  }, [story, allStories]);

  // Category stories for "More from {category}" sidebar widget
  const categoryStories = useMemo(() => {
    return allStories
      .filter((s) => s.id !== story.id && s.slug !== story.slug)
      .filter(
        (s) =>
          s.category.toLowerCase().includes(story.category.toLowerCase()) ||
          story.category.toLowerCase().includes(s.category.toLowerCase())
      )
      .slice(0, 4);
  }, [story, allStories]);

  return (
    <article
      className="w-full bg-[#FAF9F6] text-[#141517] selection:bg-stone-200 selection:text-stone-900"
      itemScope
      itemType="https://schema.org/NewsArticle"
    >
      {/* 1. Subtle Reading Progress Bar (Pinned to viewport top) */}
      <ReadingProgress targetId="article-body" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* 2. Story Header (Breadcrumb, Share, Category, Headline, Deck, Metadata) */}
        <StoryHeader
          story={story}
          onNavigateHome={onNavigateHome}
          onSelectCategory={onSelectCategory}
        />

        {/* 3. Hero Image (16:9 Editorial presentation) */}
        <StoryHero
          heroImage={story.heroImage}
          title={story.title}
          category={story.category}
        />

        {/* 4. Quick Summary (Editorial takeaways immediately below hero) */}
        <QuickSummary items={story.quickSummary} />

        {/* 5. Desktop Grid: Main Content Column (dominant) + Editorial Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8">
          {/* Main Article Content Column (Max-width 720–780px, body 18px) */}
          <div className="lg:col-span-8 flex flex-col">
            {/* Structured Article Body */}
            <ArticleContent blocks={story.content} />

            {/* Mobile / Tablet Placement for Key Facts if needed */}
            <div className="lg:hidden my-8 space-y-6">
              <KeyFacts facts={story.facts} />
              <StoryTimeline updates={story.updates} />
            </div>

            {/* Sources and Reporting Attribution */}
            <SourcesList sources={story.sources} />

            {/* Corrections & Updates (only rendered if metadata exists) */}
            <StoryCorrections corrections={story.corrections} />

            {/* Author Byline & Bio Block */}
            <AuthorBlock
              author={story.author}
              updatedAt={story.updatedAt}
              publishedAt={story.publishedAt}
            />
          </div>

          {/* Desktop Editorial Sidebar (Sticky, clean, restrained) */}
          <aside
            aria-label="Story Context and Updates"
            className="hidden lg:block lg:col-span-4"
          >
            <div className="sticky top-24 space-y-6">
              {/* Key Facts Card */}
              <KeyFacts facts={story.facts} />

              {/* Living Story Updates Timeline */}
              <StoryTimeline updates={story.updates} />

              {/* More From Category */}
              <MoreFromCategory
                category={story.category}
                stories={categoryStories}
                onSelectStory={onSelectStory}
                onViewCategory={onSelectCategory}
              />
            </div>
          </aside>
        </div>

        {/* 6. Related Stories (3-4 cards grid) */}
        <RelatedStories
          stories={relatedStories}
          onSelectStory={onSelectStory}
          title={`Related Stories in ${story.category}`}
        />
      </div>
    </article>
  );
};

// Universal export alias
export const UniversalStoryPage = StoryPage;
