/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Award, BookOpen, ExternalLink } from 'lucide-react';
import type { Story, NewsStory } from '../../data/mockNews';
import { getAuthorProfile, type AuthorProfile } from '../../data/authorDatabase';
import { newsRepository } from '../../data/newsRepository';
import { getCanonicalUrl, SEO_CONFIG } from '../../config/seoConfig';
import { SeoService } from '../../services/seo/SeoService';
import { StoryCard } from './StoryCard';

interface AuthorPageProps {
  slug: string;
  onNavigateHome: () => void;
  onSelectStory: (story: Story | NewsStory) => void;
  onSelectCategory?: (category: string) => void;
}

export const AuthorPage: React.FC<AuthorPageProps> = ({
  slug,
  onNavigateHome,
  onSelectStory,
}) => {
  const [profile, setProfile] = useState<AuthorProfile | null>(() => getAuthorProfile(slug));
  const [authorStories, setAuthorStories] = useState<NewsStory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const localProfile = getAuthorProfile(slug);
      if (localProfile) {
        setProfile(localProfile);
      }

      try {
        // Fetch all stories and filter by author name or slug
        const all = await newsRepository.getLatestStories(50);
        if (isMounted) {
          const matched = all.filter((s) => {
            const sAuthor = s.author;
            if (!sAuthor) return false;
            const aName = (typeof sAuthor === 'string' ? sAuthor : sAuthor.name || '').toLowerCase();
            const aSlug = (typeof sAuthor === 'object' && sAuthor.slug ? sAuthor.slug : '').toLowerCase();
            const targetSlug = slug.toLowerCase();
            const targetName = localProfile ? localProfile.name.toLowerCase() : '';
            return aSlug === targetSlug || (targetName && aName.includes(targetName)) || aName.includes(targetSlug.replace(/-/g, ' '));
          });
          setAuthorStories(matched);
        }
      } catch (err) {
        console.error('[AuthorPage] Error loading stories:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // SEO & Schema effect
  useEffect(() => {
    const originalTitle = document.title;
    const authorName = profile?.name || slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    const authorRole = profile?.role || 'Correspondent';
    const authorBio = profile?.bio || `${authorName} is an editorial contributor and correspondent for ${SEO_CONFIG.siteName}.`;
    const canonical = getCanonicalUrl(`/author/${slug}`);

    document.title = `${authorName} — ${authorRole} — ${SEO_CONFIG.siteName}`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', authorBio);

    // Canonical link
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonical);

    // Structured Data: ProfilePage + BreadcrumbList
    const structuredDataId = 'meridian-author-jsonld';
    let scriptTag = document.getElementById(structuredDataId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = structuredDataId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ProfilePage',
          name: `${authorName} — Editorial Profile — ${SEO_CONFIG.siteName}`,
          url: canonical,
          description: authorBio,
          mainEntity: {
            '@type': 'Person',
            name: authorName,
            jobTitle: authorRole,
            description: authorBio,
            image: profile?.avatar || undefined,
            worksFor: SeoService.getPublisherObject(),
          },
        },
        SeoService.generateBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Editorial Masthead', path: '/about' },
          { name: authorName, path: `/author/${slug}` },
        ]),
      ],
    };

    scriptTag.text = JSON.stringify(jsonLd);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    return () => {
      document.title = originalTitle;
      const script = document.getElementById(structuredDataId);
      if (script) script.remove();
    };
  }, [profile, slug]);

  const authorName = profile?.name || slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#141517]">
      {/* Navigation header */}
      <div className="border-b border-hairline bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to The Meridian
          </button>
          <div className="text-xs font-mono text-stone-500 uppercase tracking-widest">
            Verified Editorial Profile
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Author Header Card */}
        <section className="bg-white border border-hairline p-6 sm:p-10 mb-12 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-hairline">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={authorName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-stone-200 shrink-0"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-serif text-3xl font-bold shrink-0">
                {authorName.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-red-900 bg-red-50 border border-red-200 px-2 py-0.5 rounded-sm">
                Staff Correspondent
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-2">
                {authorName}
              </h1>
              <p className="font-sans text-sm sm:text-base text-stone-600 font-medium mt-1">
                {profile?.role || 'Senior Correspondent'}
              </p>

              {profile?.location && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-sans mt-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Biography & Credentials */}
          <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h2 className="text-xs font-mono uppercase tracking-widest text-stone-500 mb-2">
                Biography & Editorial Focus
              </h2>
              <p className="font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
                {profile?.bio || 'Reporting on global affairs, technological breakthroughs, and deep scientific inquiries with rigorous verification and on-the-record documentation.'}
              </p>
            </div>

            <div className="bg-[#FAF9F6] p-4 border border-hairline space-y-4 text-xs font-sans">
              <div>
                <h3 className="font-mono uppercase tracking-wider text-stone-600 font-semibold mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-700" /> Credentials
                </h3>
                <ul className="space-y-1 text-stone-700">
                  {profile?.credentials?.map((cred, idx) => (
                    <li key={idx}>• {cred}</li>
                  )) || <li>• Verified Meridian Editorial Staff</li>}
                </ul>
              </div>

              <div>
                <h3 className="font-mono uppercase tracking-wider text-stone-600 font-semibold mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-stone-700" /> Standards
                </h3>
                <p className="text-stone-600 leading-normal">
                  All reporting adheres to The Meridian’s{' '}
                  <a href="/editorial-policy" className="underline hover:text-stone-900">
                    Editorial Independence Code
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Author Bylines */}
        <section>
          <div className="flex items-baseline justify-between border-b-2 border-stone-900 pb-2 mb-6">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Articles & Bylines by {authorName}
            </h2>
            <span className="text-xs font-mono text-stone-500">
              {authorStories.length} {authorStories.length === 1 ? 'Report' : 'Reports'}
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm font-sans text-stone-500">
              Loading byline dispatches...
            </div>
          ) : authorStories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {authorStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story as any}
                  onSelectStory={() => onSelectStory(story)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-hairline p-8 text-center">
              <p className="font-serif text-base text-stone-600">
                Recent wire dispatches and print reports by {authorName} are being indexed.
              </p>
              <button
                type="button"
                onClick={onNavigateHome}
                className="mt-4 text-xs font-mono uppercase tracking-widest text-red-900 hover:underline"
              >
                Return to Latest Global News
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
