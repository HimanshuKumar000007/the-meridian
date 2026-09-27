/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { newsRepository } from './data/newsRepository';
import type { Story, TrendingItem, NewsStory } from './data/mockNews';
import { Header } from './components/news/Header';
import { MobileDrawer } from './components/news/MobileDrawer';
import { TrendingBar } from './components/news/TrendingBar';
import { HeroSection } from './components/news/HeroSection';
import { TopStories } from './components/news/TopStories';
import { CategorySection } from './components/news/CategorySection';
import { MostRead } from './components/news/MostRead';
import { NewsletterSignup } from './components/news/NewsletterSignup';
import { Footer } from './components/news/Footer';
import { SearchModal } from './components/news/SearchModal';
import { StoryDetailModal } from './components/news/StoryDetailModal';
import { PolicyModal } from './components/news/PolicyModal';
import { StoryPage } from './components/news/StoryPage';
import { StoryNotFound } from './components/news/StoryNotFound';
import { StoryLoading } from './components/news/StoryLoading';
import { HomepageLoading } from './components/news/HomepageLoading';
import { CategoryPage } from './components/news/CategoryPage';
import { CategoryError } from './components/news/CategoryError';
import { SearchPage } from './components/news/SearchPage';
import type { HomepageData } from './types/repository';

interface StoryRouteProps {
  slug: string;
  onNavigateHome: () => void;
  onSelectCategory: (categorySlug: string, subcategorySlug?: string) => void;
  onSelectStory: (story: Story | NewsStory) => void;
  onOpenSearch: () => void;
  suggestedStories: Story[];
  allStories: Story[];
}

const StoryRoute: React.FC<StoryRouteProps> = ({
  slug,
  onNavigateHome,
  onSelectCategory,
  onSelectStory,
  onOpenSearch,
  suggestedStories,
  allStories,
}) => {
  const [story, setStory] = useState<NewsStory | null>(() => {
    try {
      return newsRepository.getStoryBySlugSync?.(slug) || null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(!story);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStory() {
      setIsLoading(true);
      setNotFound(false);
      try {
        const found = await newsRepository.getStoryBySlug(slug);
        if (isMounted) {
          if (found) {
            setStory(found);
          } else {
            setStory(null);
            setNotFound(true);
          }
        }
      } catch (err) {
        console.error('[StoryRoute] Error loading story from repository:', err);
        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStory();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (isLoading && !story) {
    return <StoryLoading />;
  }

  if (notFound || !story) {
    return (
      <StoryNotFound
        slug={slug}
        onNavigateHome={onNavigateHome}
        onOpenSearch={onOpenSearch}
        onSelectStory={onSelectStory}
        suggestedStories={suggestedStories}
      />
    );
  }

  return (
    <StoryPage
      story={story}
      allStories={allStories}
      onNavigateHome={onNavigateHome}
      onSelectCategory={onSelectCategory}
      onSelectStory={onSelectStory}
    />
  );
};

type RouteState =
  | { type: 'home' }
  | { type: 'story'; slug: string }
  | { type: 'category'; categorySlug: string; subcategorySlug: string }
  | { type: 'search'; query: string; category?: string }
  | { type: 'not-found'; path: string };

function parseCurrentRoute(): RouteState {
  if (typeof window === 'undefined') return { type: 'home' };
  const pathname = window.location.pathname;
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) {
    return { type: 'home' };
  }

  // 1. Search route: /search?q=...
  if (parts[0] === 'search') {
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || undefined;
    return { type: 'search', query: q, category: cat };
  }

  // 2. Story route: /story/[slug]
  if (parts[0] === 'story') {
    if (parts[1]) {
      return { type: 'story', slug: parts[1] };
    }
    return { type: 'not-found', path: pathname };
  }

  // 3. Category route: /[category] or /[category]/[subcategory]
  const categorySlug = parts[0];
  const subcategorySlug = parts[1] || 'all';

  const category = newsRepository.getCategoryBySlugSync(categorySlug);
  if (category) {
    return { type: 'category', categorySlug: category.slug, subcategorySlug };
  }

  return { type: 'not-found', path: categorySlug };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(parseCurrentRoute);
  const [edition, setEdition] = useState<string>('Global');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  // Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard shortcut: Pressing '/' opens search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation handlers
  const navigateToHome = useCallback(() => {
    window.history.pushState(null, '', '/');
    setRoute({ type: 'home' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToStory = useCallback((slug: string) => {
    window.history.pushState(null, '', `/story/${slug}`);
    setRoute({ type: 'story', slug });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToCategory = useCallback((categorySlug: string, subcategorySlug = 'all') => {
    if (categorySlug === 'all' || categorySlug === '/') {
      navigateToHome();
      return;
    }
    const cat = newsRepository.getCategoryBySlugSync(categorySlug);
    const resolvedSlug = cat ? cat.slug : categorySlug;
    const targetPath = subcategorySlug && subcategorySlug !== 'all'
      ? `/${resolvedSlug}/${subcategorySlug}`
      : `/${resolvedSlug}`;

    window.history.pushState(null, '', targetPath);
    setRoute({
      type: cat ? 'category' : 'not-found',
      categorySlug: resolvedSlug,
      subcategorySlug,
      ...(cat ? {} : { path: categorySlug }),
    } as RouteState);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateToHome]);

  const navigateToSearch = useCallback((query: string, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category && category !== 'all') params.set('category', category);
    const queryString = params.toString();
    const targetPath = queryString ? `/search?${queryString}` : '/search';

    window.history.pushState(null, '', targetPath);
    setRoute({ type: 'search', query, category });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectStory = useCallback((story: Story | NewsStory) => {
    navigateToStory(story.slug);
  }, [navigateToStory]);

  const handleSelectTrending = useCallback((item: TrendingItem) => {
    navigateToStory(item.slug);
  }, [navigateToStory]);

  const handleJumpNewsletter = () => {
    const el = document.getElementById('newsletter');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Active header category calculation
  const activeHeaderCategory = useMemo(() => {
    if (route.type === 'home') return 'all';
    if (route.type === 'category') {
      return route.categorySlug === 'technology' ? 'tech' : route.categorySlug;
    }
    return '';
  }, [route]);

  // Homepage data queries via Universal NewsRepository
  const [homepageData, setHomepageData] = useState<HomepageData | null>(() => {
    try {
      return newsRepository.getHomepageDataSync?.() || null;
    } catch {
      return null;
    }
  });
  const [isHomepageLoading, setIsHomepageLoading] = useState<boolean>(!homepageData);

  useEffect(() => {
    let isMounted = true;
    async function loadHome() {
      try {
        const data = await newsRepository.getHomepageData();
        if (isMounted) {
          setHomepageData(data);
        }
      } catch (err) {
        console.error('[App] Failed to load homepage data from repository:', err);
      } finally {
        if (isMounted) {
          setIsHomepageLoading(false);
        }
      }
    }

    if (route.type === 'home') {
      loadHome();
    }
    return () => {
      isMounted = false;
    };
  }, [route.type]);

  const featuredStory = homepageData?.featuredStory;
  const latestNews = homepageData?.latestStories || [];
  const topStories = homepageData?.topStories || [];
  const mostReadStories = homepageData?.mostReadStories || [];
  const trendingHeadlines = useMemo(() => {
    if (homepageData?.trendingStories) {
      return homepageData.trendingStories.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        slug: s.slug,
      }));
    }
    return newsRepository.getTrendingHeadlinesSync?.() || [];
  }, [homepageData]);

  const aiTechStories = homepageData?.aiTechStories || [];
  const gamingStories = homepageData?.gamingStories || [];
  const scienceStories = homepageData?.scienceStories || [];
  const businessStories = homepageData?.businessStories || [];
  const worldStories = homepageData?.worldStories || [];
  const allStories = useMemo(() => newsRepository.getLatestStoriesSync?.(25) || [], []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#141517] flex flex-col font-sans selection:bg-stone-200 selection:text-stone-900">
      {/* 1. Header (Reused across Homepage, Story Page, and Category Page) */}
      <Header
        activeCategory={activeHeaderCategory}
        onSelectCategory={navigateToCategory}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        edition={edition}
        onChangeEdition={setEdition}
        onJumpNewsletter={handleJumpNewsletter}
      />

      {/* 2. Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeCategory={activeHeaderCategory}
        onSelectCategory={(catId) => {
          navigateToCategory(catId);
          setIsMobileMenuOpen(false);
        }}
        onOpenSearch={() => {
          setIsMobileMenuOpen(false);
          setIsSearchOpen(true);
        }}
        edition={edition}
        onChangeEdition={setEdition}
      />

      {/* 3. Trending Bar (Shown on Front Page) */}
      {route.type === 'home' && (
        <TrendingBar
          items={trendingHeadlines}
          onSelectItem={handleSelectTrending}
        />
      )}

      {/* 4. Main Body Content Area */}
      <main className="flex-1 w-full" id="main-content">
        {route.type === 'home' ? (
          // ================= FRONT PAGE VIEW =================
          isHomepageLoading && !homepageData ? (
            <HomepageLoading />
          ) : featuredStory ? (
            <>
              {/* HERO / LEAD NEWS AREA */}
              <HeroSection
                featuredStory={featuredStory}
                latestStories={latestNews}
                onSelectStory={handleSelectStory}
              />

              {/* TOP STORIES (4-card desktop grid) */}
              <TopStories
                stories={topStories}
                onSelectStory={handleSelectStory}
              />

              {/* AI & TECHNOLOGY SECTION */}
              <CategorySection
                title="AI & Technology"
                subtitle="Computation, frontier models, and semiconductor architecture"
                categorySlug="ai"
                stories={aiTechStories}
                layoutType="ai-tech"
                onSelectStory={handleSelectStory}
                onViewCategory={(slug) => navigateToCategory(slug)}
              />

              {/* GAMING SECTION */}
              <CategorySection
                title="Gaming"
                subtitle="Interactive entertainment, hardware engineering, and industry economics"
                categorySlug="gaming"
                stories={gamingStories}
                layoutType="gaming-grid"
                onSelectStory={handleSelectStory}
                onViewCategory={(slug) => navigateToCategory(slug)}
              />

              {/* SCIENCE & SPACE SECTION */}
              <CategorySection
                title="Science & Space"
                subtitle="Astrophysics, orbital logistics, and fundamental research"
                categorySlug="science"
                stories={scienceStories}
                layoutType="science-feature"
                onSelectStory={handleSelectStory}
                onViewCategory={(slug) => navigateToCategory(slug)}
              />

              {/* BUSINESS SECTION */}
              <CategorySection
                title="Business"
                subtitle="Capital allocation, enterprise infrastructure, and global markets"
                categorySlug="business"
                stories={businessStories}
                layoutType="business-columns"
                onSelectStory={handleSelectStory}
                onViewCategory={(slug) => navigateToCategory(slug)}
              />

              {/* WORLD NEWS SECTION */}
              <CategorySection
                title="World"
                subtitle="Diplomatic agreements, international policy, and global statecraft"
                categorySlug="world"
                stories={worldStories}
                layoutType="world-restrained"
                onSelectStory={handleSelectStory}
                onViewCategory={(slug) => navigateToCategory(slug)}
              />

              {/* MOST READ RANKING LIST (01 to 05) */}
              <MostRead
                stories={mostReadStories}
                onSelectStory={handleSelectStory}
              />
            </>
          ) : (
            <HomepageLoading />
          )
        ) : route.type === 'category' ? (
          // ================= UNIVERSAL CATEGORY PAGE ROUTE (/[category]) =================
          (() => {
            const categoryObj = newsRepository.getCategoryBySlugSync(route.categorySlug);
            if (!categoryObj) {
              return (
                <CategoryError
                  categorySlug={route.categorySlug}
                  onNavigateHome={navigateToHome}
                  onSelectCategory={navigateToCategory}
                />
              );
            }
            return (
              <CategoryPage
                category={categoryObj}
                initialSubcategory={route.subcategorySlug || 'all'}
                onNavigateHome={navigateToHome}
                onSelectStory={handleSelectStory}
                onSelectSubcategory={(subcat) => {
                  const targetPath = subcat === 'all'
                    ? `/${categoryObj.slug}`
                    : `/${categoryObj.slug}/${subcat}`;
                  window.history.pushState(null, '', targetPath);
                }}
              />
            );
          })()
        ) : route.type === 'search' ? (
          // ================= UNIVERSAL SEARCH PAGE ROUTE (/search?q=...) =================
          <SearchPage
            initialQuery={route.query}
            initialCategory={route.category}
            onNavigateHome={navigateToHome}
            onSelectCategory={navigateToCategory}
            onSelectStory={handleSelectStory}
            onOpenSearchModal={() => setIsSearchOpen(true)}
            trendingItems={trendingHeadlines}
          />
        ) : route.type === 'story' ? (
          // ================= UNIVERSAL STORY PAGE ROUTE (/story/[slug]) =================
          <StoryRoute
            slug={route.slug}
            onNavigateHome={navigateToHome}
            onSelectCategory={navigateToCategory}
            onSelectStory={handleSelectStory}
            onOpenSearch={() => setIsSearchOpen(true)}
            suggestedStories={topStories}
            allStories={allStories}
          />
        ) : (
          // ================= 404 NOT FOUND =================
          <CategoryError
            categorySlug={route.path}
            onNavigateHome={navigateToHome}
            onSelectCategory={navigateToCategory}
          />
        )}

        {/* 5. NEWSLETTER SECTION (Reused across all pages) */}
        <NewsletterSignup />
      </main>

      {/* 6. PUBLICATION FOOTER (Reused across all pages) */}
      <Footer
        onSelectCategory={navigateToCategory}
        onOpenPolicyModal={(type) => setSelectedPolicy(type)}
      />

      {/* 7. INTERACTIVE SEARCH MODAL */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStory={(story) => {
          setIsSearchOpen(false);
          handleSelectStory(story);
        }}
        onNavigateToSearch={(q) => {
          setIsSearchOpen(false);
          navigateToSearch(q);
        }}
      />

      {/* 8. INTERACTIVE STORY DETAIL MODAL (Optional preview) */}
      <StoryDetailModal
        story={selectedStory}
        onClose={() => setSelectedStory(null)}
        onSelectRelatedStory={handleSelectStory}
        allStories={allStories}
      />

      {/* 9. EDITORIAL POLICY & TRUST MODAL */}
      <PolicyModal
        policyType={selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
      />
    </div>
  );
}
