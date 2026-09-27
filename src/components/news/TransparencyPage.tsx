/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Mail, CheckCircle2, FileText, Globe2, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { getCanonicalUrl, SEO_CONFIG } from '../../config/seoConfig';
import { SeoService } from '../../services/seo/SeoService';

export type TransparencyTopic =
  | 'about'
  | 'contact'
  | 'editorial-policy'
  | 'corrections'
  | 'privacy'
  | 'terms'
  | 'ethics'
  | 'diversity'
  | 'masthead';

interface TransparencyPageProps {
  topic: TransparencyTopic;
  onNavigateHome: () => void;
  onSelectTopic?: (topic: TransparencyTopic) => void;
}

interface TopicMeta {
  title: string;
  description: string;
  badge: string;
  schemaType: string;
}

const TOPIC_CONFIG: Record<TransparencyTopic, TopicMeta> = {
  about: {
    title: `About The Meridian — Independent Global Newsroom`,
    description: `The Meridian is an independent international news publication delivering calm, deeply verified journalism across science, technology, economics, and world affairs.`,
    badge: 'Publisher Transparency',
    schemaType: 'AboutPage',
  },
  contact: {
    title: `Contact The Meridian — Newsroom, Bureaus & Press Inquiries`,
    description: `Get in touch with The Meridian newsroom, editors, bureau chiefs, and corrections desk. Secure channels available for sensitive news tips.`,
    badge: 'Editorial Directory',
    schemaType: 'ContactPage',
  },
  'editorial-policy': {
    title: `Editorial Principles, Independence & AI Disclosure — The Meridian`,
    description: `Read The Meridian's core editorial guidelines, source corroboration standards, conflicts of interest policy, and honest disclosure of AI-assisted newsroom tools.`,
    badge: 'Editorial Standards',
    schemaType: 'ItemPage',
  },
  corrections: {
    title: `Corrections & Clarifications Policy — The Meridian`,
    description: `The Meridian's protocol for prompt, transparent corrections and factual amendments across digital and syndicated reporting.`,
    badge: 'Accountability Protocol',
    schemaType: 'ItemPage',
  },
  privacy: {
    title: `Privacy Policy & Reader Data Stewardship — The Meridian`,
    description: `Our transparent data protection policy. We do not sell personal reader information or license behavioral telemetry to third-party ad brokers.`,
    badge: 'Data Ethics',
    schemaType: 'ItemPage',
  },
  terms: {
    title: `Terms of Service & Content Syndication — The Meridian`,
    description: `Terms and conditions governing access, syndication, intellectual property rights, and fair use of The Meridian reporting.`,
    badge: 'Legal & Syndication',
    schemaType: 'ItemPage',
  },
  ethics: {
    title: `Code of Journalistic Ethics — The Meridian`,
    description: `Our enforceable ethical standards: truth, fairness, right of reply, whistleblower protection, and separation of editorial from commercial interests.`,
    badge: 'Code of Ethics',
    schemaType: 'ItemPage',
  },
  diversity: {
    title: `Diversity, Equity & Global Representation — The Meridian`,
    description: `Our commitment to diverse voices, international perspectives, and inclusive coverage across all reporting beats.`,
    badge: 'Institutional Values',
    schemaType: 'ItemPage',
  },
  masthead: {
    title: `Editorial Masthead & Bureau Leadership — The Meridian`,
    description: `The editorial leadership, senior correspondents, and bureau chiefs guiding global coverage at The Meridian.`,
    badge: 'Newsroom Leadership',
    schemaType: 'AboutPage',
  },
};

export const TransparencyPage: React.FC<TransparencyPageProps> = ({
  topic,
  onNavigateHome,
  onSelectTopic,
}) => {
  const meta = TOPIC_CONFIG[topic] || TOPIC_CONFIG.about;
  const canonical = getCanonicalUrl(`/${topic}`);

  // SEO & Schema effect
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${meta.title} — ${SEO_CONFIG.siteName}`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', meta.description);

    // Canonical link
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonical);

    // JSON-LD Structured Data
    const structuredDataId = 'meridian-transparency-jsonld';
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
          '@type': meta.schemaType,
          name: meta.title,
          description: meta.description,
          url: canonical,
          isPartOf: {
            '@type': 'WebSite',
            name: SEO_CONFIG.siteName,
            url: SEO_CONFIG.siteUrl,
          },
          publisher: SeoService.getPublisherObject(),
        },
        SeoService.generateBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: meta.badge, path: `/${topic}` },
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
  }, [topic, meta, canonical]);

  const handleNavTopic = (t: TransparencyTopic) => {
    if (onSelectTopic) {
      onSelectTopic(t);
    } else {
      window.history.pushState(null, '', `/${t}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#141517]">
      {/* Top Bar */}
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
            {meta.badge}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Tabs */}
        <nav aria-label="Transparency Topics" className="flex flex-wrap gap-2 mb-10 pb-4 border-b border-hairline">
          {[
            { id: 'about' as const, label: 'About' },
            { id: 'contact' as const, label: 'Contact' },
            { id: 'editorial-policy' as const, label: 'Editorial Policy & AI' },
            { id: 'corrections' as const, label: 'Corrections' },
            { id: 'ethics' as const, label: 'Ethics' },
            { id: 'masthead' as const, label: 'Masthead' },
            { id: 'privacy' as const, label: 'Privacy' },
            { id: 'terms' as const, label: 'Terms' },
          ].map((item) => {
            const isActive = topic === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavTopic(item.id)}
                className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-sm transition-colors ${
                  isActive
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-white border border-hairline text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Content Section */}
        <article className="bg-white border border-hairline p-6 sm:p-12 shadow-xs">
          {/* Header */}
          <div className="border-b border-hairline pb-8 mb-8">
            <span className="text-[11px] font-mono uppercase tracking-widest text-red-900 font-semibold">
              The Meridian Transparency & Accountability
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 mt-3 mb-4 leading-tight">
              {meta.title}
            </h1>
            <p className="font-serif text-lg sm:text-xl text-stone-600 leading-relaxed max-w-3xl">
              {meta.description}
            </p>
          </div>

          {/* Dynamic Topic Bodies */}
          {topic === 'about' && (
            <div className="space-y-8 font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
              <section>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">Our Mission</h2>
                <p>
                  The Meridian was founded on a simple premise: modern digital media has sacrificed depth, verifiable documentation, and analytical clarity in favor of algorithmically-driven emotional velocity.
                </p>
                <p className="mt-3">
                  We exist to deliver calm, authoritative, and fact-verified reporting on structural transformations across artificial intelligence, semiconductor physics, astrophysics, monetary policy, and global statecraft.
                </p>
              </section>

              <section className="bg-[#FAF9F6] p-6 border border-hairline not-italic font-sans text-sm">
                <h3 className="font-mono text-xs uppercase tracking-wider text-stone-700 font-bold mb-2">
                  Institutional Transparency Snapshot
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-stone-500 font-mono text-xs">Publisher Entity</dt>
                    <dd className="font-semibold text-stone-900">The Meridian Global Media Inc.</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500 font-mono text-xs">Editorial Independence</dt>
                    <dd className="font-semibold text-stone-900">100% autonomous; zero sponsor influence</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500 font-mono text-xs">Primary Bureaus</dt>
                    <dd className="font-semibold text-stone-900">London, Washington, Tokyo, Brussels</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500 font-mono text-xs">Funding Structure</dt>
                    <dd className="font-semibold text-stone-900">Independent subscriber & reader supported</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">Verification & Sourcing Standards</h2>
                <p>
                  Our journalists do not report rumors as fact. Every assertion requires independent corroboration from primary filings, peer-reviewed preprints, on-the-record statements, or verified whistleblowers. Secondary wire reports are treated as leads to be independently substantiated.
                </p>
              </section>
            </div>
          )}

          {topic === 'contact' && (
            <div className="space-y-8 font-sans text-sm text-stone-800">
              <p className="font-serif text-lg text-stone-700 leading-relaxed">
                We welcome inquiries, feedback, corrections, and confidential news tips from our global readership.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-hairline p-6 bg-[#FAF9F6]">
                  <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-red-900" /> Editorial Newsroom
                  </h3>
                  <p className="text-stone-600 mb-3">For story pitches, press releases, and general editorial inquiries:</p>
                  <p className="font-mono font-semibold text-stone-900">editorial@themeridian.news</p>
                </div>

                <div className="border border-hairline p-6 bg-[#FAF9F6]">
                  <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700" /> Corrections Desk
                  </h3>
                  <p className="text-stone-600 mb-3">To report factual inaccuracies or request a clarification:</p>
                  <p className="font-mono font-semibold text-stone-900">corrections@themeridian.news</p>
                  <p className="text-xs text-stone-500 mt-1">Audited within four hours during active news cycles.</p>
                </div>

                <div className="border border-hairline p-6 bg-[#FAF9F6]">
                  <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-700" /> Confidential News Tips
                  </h3>
                  <p className="text-stone-600 mb-3">For whistleblowers and sensitive leaked primary documentation:</p>
                  <p className="font-mono font-semibold text-stone-900">tips@themeridian.news</p>
                  <p className="text-xs text-stone-500 mt-1">PGP key available upon request. Signal channel available.</p>
                </div>

                <div className="border border-hairline p-6 bg-[#FAF9F6]">
                  <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-blue-700" /> Bureau Offices
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    <strong>London:</strong> 25 Farringdon Street, EC4A 4AB<br />
                    <strong>Washington:</strong> 1300 Pennsylvania Ave NW, DC 20004<br />
                    <strong>Tokyo:</strong> Marunouchi 2-Chome, Chiyoda-ku
                  </p>
                </div>
              </div>
            </div>
          )}

          {topic === 'editorial-policy' && (
            <div className="space-y-8 font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
              <section>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">1. Factual Verification & Evidence Hierarchy</h2>
                <p>
                  The Meridian enforces a strict hierarchy of evidence in all published journalism:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2 font-sans text-sm">
                  <li><strong>Tier 1 — Primary Source:</strong> Direct audio/video recordings, official SEC/court filings, peer-reviewed scientific datasets, or verified cryptographic proofs.</li>
                  <li><strong>Tier 2 — Dual-Corroborated Witness:</strong> Two independent, non-affiliated individuals with direct firsthand knowledge of the event.</li>
                  <li><strong>Tier 3 — Official Statement:</strong> On-the-record spokesperson statements, attributed explicitly with context and critical examination.</li>
                </ul>
              </section>

              {/* Honest AI Disclosure Required by Google News Guidelines */}
              <section className="bg-amber-50/60 border border-amber-200 p-6 rounded-xs">
                <div className="flex items-center gap-2 text-amber-900 font-mono text-xs uppercase tracking-widest font-bold mb-2">
                  <Sparkles className="w-4 h-4 text-amber-800" />
                  Honest AI Disclosure: How The Meridian Uses Artificial Intelligence
                </div>
                <h3 className="font-serif text-xl font-bold text-amber-950 mb-3">
                  AI-Assisted News Extraction & Human Editorial Gatekeeping
                </h3>
                <div className="space-y-3 font-sans text-sm text-amber-900/90 leading-relaxed">
                  <p>
                    In accordance with Google News and international journalistic best practices, The Meridian maintains complete transparency regarding how technological automation and artificial intelligence are utilized in our newsroom:
                  </p>
                  <p>
                    <strong>1. Multi-Stage Ingestion & Extraction:</strong> We employ specialized language models (including NVIDIA-accelerated extraction models) to monitor verified government registers, corporate regulatory repositories, and global wire disclosures, extracting factual timelines and primary source citations.
                  </p>
                  <p>
                    <strong>2. Independent Fact Validation Engine:</strong> Before any candidate story can proceed, an automated validation gate cross-references entity references, claims, dates, and geographic locations against verified ground-truth repositories to eliminate hallucinations.
                  </p>
                  <p>
                    <strong>3. Human Editorial Governance:</strong> Machine-extracted drafts are never published autonomously without strict lifecycle gates. Editors review key factual claims, source provenance, tone, and public interest value prior to public distribution.
                  </p>
                  <p>
                    <strong>4. No Fake Authorship:</strong> The Meridian never creates synthetic or fictitious author personas. Bylines represent verified human correspondents, subject-matter fellows, or explicitly marked institutional desk bylines (e.g. <em>The Meridian Newsroom Desk</em>).
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">2. Editorial Autonomy & Commercial Firewall</h2>
                <p>
                  The Meridian’s editorial staff operates behind an impassable firewall separating reporting decisions from commercial revenue, sponsorships, or subscriptions. Advertisers possess zero advance visibility or approval power over editorial content.
                </p>
              </section>
            </div>
          )}

          {topic === 'corrections' && (
            <div className="space-y-8 font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
              <section>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">Transparent Corrections Protocol</h2>
                <p>
                  The Meridian strives for pristine accuracy. When an error of fact, figure, name, or material context occurs, we amend the record promptly and transparently. We do not quietly delete or overwrite errors.
                </p>
              </section>

              <section className="bg-[#FAF9F6] p-6 border border-hairline font-sans text-sm space-y-4">
                <h3 className="font-mono text-xs uppercase tracking-wider text-stone-800 font-bold">
                  How We Correct Articles
                </h3>
                <ul className="space-y-3 text-stone-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span><strong>Inline Flag & Bottom Notice:</strong> A prominent notice is appended immediately detailing the previous text, the accurate information, and the exact timestamp the amendment took effect.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span><strong>Major Structural Retractions:</strong> In the rare event a story fails our verification gate post-publication, an Editor’s Note is published explaining the retraction and reason.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span><strong>How to Report an Inaccuracy:</strong> Email <code className="font-mono text-xs bg-stone-200 px-1 py-0.5">corrections@themeridian.news</code> with article URL and supporting primary evidence.</span>
                  </li>
                </ul>
              </section>
            </div>
          )}

          {topic === 'ethics' && (
            <div className="space-y-8 font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
              <section>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mb-3">Code of Journalistic Ethics</h2>
                <p>
                  Our reporters and editors adhere to the Society of Professional Journalists (SPJ) Code of Ethics and international standards for fair and honest reportage:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-3 font-sans text-sm text-stone-700">
                  <li><strong>Seek Truth and Report It:</strong> Diligently test accuracy, verify sources, and give subjects reasonable opportunity to respond to critical allegations prior to publication.</li>
                  <li><strong>Minimize Harm:</strong> Show compassion for individuals affected by tragedy or conflict; balance public interest against personal privacy rights.</li>
                  <li><strong>Act Independently:</strong> Avoid conflicts of interest; refuse gifts, favored treatment, or advisory compensation from entities covered.</li>
                  <li><strong>Be Accountable & Transparent:</strong> Clarify and explain coverage decisions; invite public dialogue; admit and correct errors promptly.</li>
                </ul>
              </section>
            </div>
          )}

          {topic === 'masthead' && (
            <div className="space-y-8 font-sans text-sm text-stone-800">
              <p className="font-serif text-lg text-stone-700 leading-relaxed">
                The Meridian newsroom is led by experienced correspondents, investigative researchers, and senior editors spanning five continents.
              </p>

              <div className="border border-hairline p-6 bg-white space-y-6">
                <div>
                  <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-red-900 mb-2">
                    Executive Editorial Leadership
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-stone-900">Evelyn Ross</p>
                      <p className="text-xs text-stone-500">Editor-in-Chief</p>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">David H. Vance</p>
                      <p className="text-xs text-stone-500">Managing Editor</p>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">Claire Delacroix</p>
                      <p className="text-xs text-stone-500">Deputy Editor (Global Affairs)</p>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">Marcus Chen</p>
                      <p className="text-xs text-stone-500">Creative & Visual Director</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-hairline">
                  <h3 className="font-mono uppercase tracking-wider text-xs font-bold text-red-900 mb-2">
                    Bureau Chiefs & Senior Correspondents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <a href="/author/helen-vance" className="font-semibold text-stone-900 hover:underline">Dr. Helen Vance</a>
                      <p className="text-xs text-stone-500">Senior Science & Deep Tech Correspondent</p>
                    </div>
                    <div>
                      <a href="/author/julian-foster" className="font-semibold text-stone-900 hover:underline">Julian Foster</a>
                      <p className="text-xs text-stone-500">Technology & AI Policy Correspondent</p>
                    </div>
                    <div>
                      <a href="/author/sarah-lin" className="font-semibold text-stone-900 hover:underline">Sarah Lin</a>
                      <p className="text-xs text-stone-500">Senior Semiconductor & Hardware Reporter</p>
                    </div>
                    <div>
                      <a href="/author/victoria-sterling" className="font-semibold text-stone-900 hover:underline">Victoria Sterling</a>
                      <p className="text-xs text-stone-500">Chief Economics Correspondent</p>
                    </div>
                    <div>
                      <a href="/author/alina-thorne" className="font-semibold text-stone-900 hover:underline">Alina Thorne</a>
                      <p className="text-xs text-stone-500">Senior Aerospace & Astrophysics Correspondent</p>
                    </div>
                    <div>
                      <a href="/author/kenji-takahashi" className="font-semibold text-stone-900 hover:underline">Kenji Takahashi</a>
                      <p className="text-xs text-stone-500">Tokyo Bureau Chief</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {topic === 'privacy' && (
            <div className="space-y-6 font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
              <p>
                The Meridian treats reader privacy with the utmost seriousness. Reading the news is an essential civic act that should not result in intrusive commercial surveillance.
              </p>
              <h2 className="font-serif text-2xl font-bold text-stone-900">Data Minimization</h2>
              <p>
                We do not sell, rent, or trade reader personal data, browsing histories, or reading habits to third-party ad brokers or analytics marketplaces. Any telemetry gathered is restricted to aggregated performance monitoring and site reliability.
              </p>
            </div>
          )}

          {topic === 'terms' && (
            <div className="space-y-6 font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
              <p>
                All reporting, investigative analysis, photographic works, and visual assets published on The Meridian are copyrighted works protected by international intellectual property law.
              </p>
              <h2 className="font-serif text-2xl font-bold text-stone-900">Fair Use & Syndication</h2>
              <p>
                Academic and non-commercial quotations are permitted with proper attribution and a canonical backlink to the original article on <code className="font-mono text-sm bg-stone-100 px-1">themeridian.news</code>. For commercial syndication, contact <code className="font-mono text-sm bg-stone-100 px-1">syndication@themeridian.news</code>.
              </p>
            </div>
          )}

          {topic === 'diversity' && (
            <div className="space-y-6 font-serif text-base sm:text-lg text-stone-800 leading-relaxed">
              <h2 className="font-serif text-2xl font-bold text-stone-900">Commitment to Global Inclusivity</h2>
              <p>
                Global news cannot be accurately reported through a single geopolitical lens. The Meridian is committed to recruiting correspondents across diverse cultural, geographic, and scientific disciplines to ensure broad, empathetic, and nuanced international coverage.
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};
