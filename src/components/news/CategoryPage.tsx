/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { NewsCategory, CategorySortMode } from '../../types/category';
import type { Story } from '../../data/mockNews';
import { getStoriesByCategory, getFeaturedStoriesByCategory, getTrendingStoriesByCategory, getMostReadStoriesByCategory } from '../../data/categoryDatabase';
import { CategoryBreadcrumb } from './CategoryBreadcrumb';
import { CategoryHero } from './CategoryHero';
import { CategoryTabs } from './CategoryTabs';
import { CategoryFeatured } from './CategoryFeatured';
import { CategoryStoryList } from './CategoryStoryList';
import { CategoryTrending } from './CategoryTrending';
import { CategoryMostRead } from './CategoryMostRead';
import { CategoryEmpty } from './CategoryEmpty';

interface CategoryPageProps {
  category: NewsCategory;
  initialSubcategory?: string;
  onNavigateHome: () => void;
  onSelectStory: (story: Story) => void;
  onSelectSubcategory?: (subcatSlug: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({
  category,
  initialSubcategory = 'all',
  onNavigateHome,
  onSelectStory,
  onSelectSubcategory,
}) => {
  const [activeSubcategory, setActiveSubcategory] = useState<string>(initialSubcategory);
  const [sortMode, setSortMode] = useState<CategorySortMode>('latest');

  // Sync state if initialSubcategory prop changes
  useEffect(() => {
    setActiveSubcategory(initialSubcategory || 'all');
  }, [initialSubcategory]);

  // Update dynamic document SEO & BreadcrumbList structured data
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${category.name} News, Analysis & Reports — The Meridian`;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', category.description);

    // Update OpenGraph Title & Description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${category.name} News — The Meridian`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', category.description);

    // Dynamic BreadcrumbList JSON-LD Structured Data
    const structuredDataId = 'meridian-category-jsonld';
    let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = structuredDataId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://themeridian.news/${category.slug}`;

    const jsonLdData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: `${category.name} News & Coverage`,
          description: category.description,
          url: currentUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: 'The Meridian',
            url: 'https://themeridian.news',
          },
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
              name: category.name,
              item: currentUrl,
            },
          ],
        },
      ],
    };

    scriptTag.text = JSON.stringify(jsonLdData);

    // Scroll to top on category mount
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    return () => {
      document.title = originalTitle;
      const script = document.getElementById(structuredDataId);
      if (script) script.remove();
    };
  }, [category]);

  // Query category datasets
  const allCategoryStories = useMemo(() => {
    return getStoriesByCategory(category.slug, {
      subcategory: activeSubcategory,
      sort: sortMode,
    });
  }, [category.slug, activeSubcategory, sortMode]);

  // Featured stories
  const featuredStories = useMemo(() => {
    // Only show top featured section when viewing 'all' subcategory
    if (activeSubcategory !== 'all') return [];
    return getFeaturedStoriesByCategory(category.slug);
  }, [category.slug, activeSubcategory]);

  // Latest stories (excluding primary featured story from the feed to avoid visual duplication)
  const feedStories = useMemo(() => {
    if (activeSubcategory !== 'all') return allCategoryStories;
    const leadId = featuredStories[0]?.id;
    return allCategoryStories.filter((s) => s.id !== leadId);
  }, [allCategoryStories, featuredStories, activeSubcategory]);

  // Category trending & most read
  const trendingStories = useMemo(() => {
    return getTrendingStoriesByCategory(category.slug);
  }, [category.slug]);

  const mostReadStories = useMemo(() => {
    return getMostReadStoriesByCategory(category.slug);
  }, [category.slug]);

  const handleSubcategoryChange = (subcatSlug: string) => {
    setActiveSubcategory(subcatSlug);
    onSelectSubcategory?.(subcatSlug);
  };

  const activeSubcatObj = category.subcategories?.find((s) => s.slug === activeSubcategory);

  return (
    <div className="w-full bg-[#FAF9F6] text-[#141517] selection:bg-stone-200 selection:text-stone-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* 1. Category Breadcrumb */}
        <div className="mb-4">
          <CategoryBreadcrumb
            categoryName={category.name}
            subcategoryName={activeSubcategory !== 'all' ? activeSubcatObj?.name : undefined}
            onNavigateHome={onNavigateHome}
            onSelectCategory={() => handleSubcategoryChange('all')}
          />
        </div>

        {/* 2. Category Hero Section */}
        <CategoryHero
          category={category}
          storyCount={allCategoryStories.length}
        />

        {/* 3. Subcategory Filter Tabs (Horizontally scrollable on mobile without whole-page overflow) */}
        <CategoryTabs
          subcategories={category.subcategories}
          activeSubcategory={activeSubcategory}
          onSelectSubcategory={handleSubcategoryChange}
        />

        {/* 4. Category Content */}
        {allCategoryStories.length === 0 ? (
          // Empty State
          <CategoryEmpty
            categoryName={category.name}
            onNavigateHome={onNavigateHome}
          />
        ) : (
          <>
            {/* 5. Featured Story Block (Lead story + secondary stack) */}
            {featuredStories.length > 0 && (
              <CategoryFeatured
                stories={featuredStories}
                onSelectStory={onSelectStory}
              />
            )}

            {/* 6. Main Editorial Grid (Latest Dispatches + Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8">
              {/* Left Column: Latest Story Grid / List (8 cols) */}
              <div className="lg:col-span-8">
                <CategoryStoryList
                  categoryName={category.name}
                  stories={feedStories}
                  sortMode={sortMode}
                  onChangeSort={setSortMode}
                  onSelectStory={onSelectStory}
                />
              </div>

              {/* Right Column: Editorial Sidebar (4 cols, sticky on desktop) */}
              <aside
                aria-label={`Trending and Most Read in ${category.name}`}
                className="lg:col-span-4 space-y-8"
              >
                <div className="sticky top-28 space-y-8">
                  {/* Category Trending */}
                  <CategoryTrending
                    stories={trendingStories}
                    onSelectStory={onSelectStory}
                  />

                  {/* Category Most Read */}
                  <CategoryMostRead
                    stories={mostReadStories}
                    onSelectStory={onSelectStory}
                  />
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Universal export alias
export const UniversalCategoryPage = CategoryPage;
