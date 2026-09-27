/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { NewsCategory, CategorySortMode, CategoryPageData } from '../../types/category';
import type { Story } from '../../data/mockNews';
import { SeoService } from '../../services/seo/SeoService';
import { newsRepository } from '../../data/newsRepository';
import { CategoryBreadcrumb } from './CategoryBreadcrumb';
import { CategoryHero } from './CategoryHero';
import { CategoryTabs } from './CategoryTabs';
import { CategoryFeatured } from './CategoryFeatured';
import { CategoryStoryList } from './CategoryStoryList';
import { CategoryTrending } from './CategoryTrending';
import { CategoryMostRead } from './CategoryMostRead';
import { CategoryEmpty } from './CategoryEmpty';
import { CategoryLoading } from './CategoryLoading';

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

  // Update dynamic document SEO, canonical link, & BreadcrumbList structured data
  useEffect(() => {
    const originalTitle = document.title;
    const seoMeta = SeoService.generateCategoryMeta(
      category.name,
      category.slug,
      category.description,
      activeSubcategory !== 'all' ? activeSubcategory : undefined
    );
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

    // Dynamic BreadcrumbList & CollectionPage JSON-LD Structured Data
    const structuredDataId = 'meridian-category-jsonld';
    let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = structuredDataId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(seoMeta.jsonLd);

    // Scroll to top on category mount
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    return () => {
      document.title = originalTitle;
      const script = document.getElementById(structuredDataId);
      if (script) script.remove();
    };
  }, [category, activeSubcategory]);

  const [pageData, setPageData] = useState<CategoryPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load category page data via newsRepository
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await newsRepository.getCategoryPageData(
          category.slug,
          activeSubcategory,
          sortMode
        );
        if (isMounted) {
          if (data) {
            setPageData(data);
          } else {
            setPageData({
              category,
              activeSubcategory,
              featuredStories: [],
              latestStories: [],
              trendingStories: [],
              mostReadStories: [],
              totalCount: 0,
            });
          }
        }
      } catch (err) {
        console.error('[CategoryPage] Failed to load data from repository:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [category.slug, activeSubcategory, sortMode]);

  const featuredStories = pageData?.featuredStories || [];
  const feedStories = pageData?.latestStories || [];
  const trendingStories = pageData?.trendingStories || [];
  const mostReadStories = pageData?.mostReadStories || [];
  const totalCount = pageData?.totalCount ?? (featuredStories.length + feedStories.length);

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
          storyCount={totalCount}
        />

        {/* 3. Subcategory Filter Tabs (Horizontally scrollable on mobile without whole-page overflow) */}
        <CategoryTabs
          subcategories={category.subcategories}
          activeSubcategory={activeSubcategory}
          onSelectSubcategory={handleSubcategoryChange}
        />

        {/* 4. Category Content */}
        {isLoading && !pageData ? (
          <CategoryLoading />
        ) : totalCount === 0 ? (
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
