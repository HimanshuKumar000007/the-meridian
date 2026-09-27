/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo } from 'react';
import type { NewsStory } from '../../types/story';
import type { Story } from '../../data/mockNews';
import { SeoService } from '../../services/seo/SeoService';
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
  // Update document title, canonical link, meta tags, and structured data dynamically
  useEffect(() => {
    const originalTitle = document.title;
    const seoMeta = SeoService.generateStoryMeta(story);
    document.title = seoMeta.title;

    // Helper to set or create meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Update meta description
    setMeta('name', 'description', seoMeta.description);

    // Update canonical link
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', seoMeta.canonicalUrl);

    // Update OpenGraph metadata
    Object.entries(seoMeta.og).forEach(([key, val]) => {
      setMeta('property', key, val);
    });

    // Update Twitter card metadata
    Object.entries(seoMeta.twitter).forEach(([key, val]) => {
      setMeta('name', key, val);
    });

    // Dynamic JSON-LD Structured Data for NewsArticle & BreadcrumbList
    const structuredDataId = 'meridian-story-jsonld';
    let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = structuredDataId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(seoMeta.jsonLd);

    // Scroll to top on story mount
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    return () => {
      document.title = originalTitle;
      const script = document.getElementById(structuredDataId);
      if (script) script.remove();
    };
  }, [story]);

  // Phase 11: Privacy-preserving, deduplicated view counting
  useEffect(() => {
    if (!story?.id) return;
    try {
      let sessionHash = sessionStorage.getItem('meridian_anon_sess') || '';
      if (!sessionHash) {
        sessionHash = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
        sessionStorage.setItem('meridian_anon_sess', sessionHash);
      }
      fetch('/api/story/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, sessionHash }),
      }).catch(() => {});
    } catch {
      // Ignore browser environment errors silently
    }
  }, [story?.id]);

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
