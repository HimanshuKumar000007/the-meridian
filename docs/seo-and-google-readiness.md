# Production SEO, Google Search & Google News Readiness Guide
**The Meridian — Global News Platform**

## 1. Overview & Official Google Operating Model

The Meridian’s search and news distribution architecture is designed in strict compliance with current official Google Search Central and Google News guidelines.

### Modern Google News Inclusion Principles
1. **Automated Consideration:** As confirmed by Google Search Central and Google News documentation, publications do **not** need to submit an application or be approved through Google Publisher Center to appear on Google News surfaces (News tab, Discover, Google News app, or Top Stories). Google automatically discovers, evaluates, and ranks eligible journalistic web content.
2. **Eligibility $\neq$ Guaranteed Ranking:** Technical compliance ensures crawlability, indexability, and eligibility; editorial quality, originality, factual verification, freshness, and topical authority determine ranking.
3. **No Outdated Hacks:** Modern Google indexing relies on semantic HTML, Schema.org structured data, mobile-first rendering, canonicalization, and transparent publishing ethics. Artificial link schemes, doorway pages, and keyword stuffing violate Google Search spam policies.

---

## 2. Canonical URL Architecture

To eliminate duplicate content penalties across tracking campaigns, syndication feeds, and faceted filters, The Meridian implements centralized canonical normalization in [`src/config/seoConfig.ts`](file:///d:/the-meridian-—-global-news-platform/src/config/seoConfig.ts).

### Key Rules
- **Protocol:** Strict `https://` only.
- **Hostname:** Canonical non-www domain (`https://themeridian.in`).
- **Trailing Slashes:**
  - Root homepage: `https://themeridian.in/` (standard root).
  - All content routes: No trailing slash (e.g., `https://themeridian.in/technology`, `https://themeridian.in/story/quantum-computing-breakthrough`).
- **Tracking Parameter Sanitization:** Strips campaign tokens (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `fbclid`, `gclid`, `msclkid`, `ref`, `source`) while strictly preserving legitimate functional application queries (`page`, `subcat`, `sort`).

---

## 3. Crawler Control (`robots.txt`)

The Meridian serves RFC 9309 compliant `robots.txt` directives statically via `public/robots.txt` and dynamically via `api/robots.ts`.

### Directives
```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /automation/
Disallow: /internal/
Disallow: /admin/
Sitemap: https://themeridian.in/sitemap.xml
```

- **Protected Surfaces:** Internal pipeline orchestration endpoints, API keys, and background workers are inaccessible to external crawlers.
- **Editorial Access:** All journalistic stories, category indices, author profiles, and policy pages are unblocked.

---

## 4. XML Sitemaps & RSS 2.0 Feeds

### XML Sitemap (`/sitemap.xml`)
Generated via [`src/services/distribution/SitemapService.ts`](file:///d:/the-meridian-—-global-news-platform/src/services/distribution/SitemapService.ts):
- **Core Routes:** Root homepage (`priority: 1.0`, `changefreq: hourly`).
- **Categories:** All registered editorial categories (`/ai`, `/technology`, `/gaming`, `/science`, `/space`, `/business`, `/world`, etc.).
- **Publisher Transparency:** Dedicated transparency pages (`/about`, `/contact`, `/editorial-policy`, `/corrections`, `/privacy`, `/terms`).
- **Author Profiles:** Verified journalist profile routes (`/author/:slug`).
- **Published Stories:** Strictly published editorial records with canonical URLs and ISO 8601 `<lastmod>` timestamps. Draft, held, rejected, or archived stories are strictly excluded.

### RSS 2.0 Web Feed (`/rss.xml`)
Generated via [`src/services/distribution/RssFeedService.ts`](file:///d:/the-meridian-—-global-news-platform/src/services/distribution/RssFeedService.ts):
- Valid RSS 2.0 channel with Atom self-reference.
- Full `<item>` payload: `<title>`, `<link>`, `<guid isPermaLink="true">`, `<pubDate>` (RFC 822 / 2822 format), `<description>`, `<category>`, and `<author>`.
- Exclusively syndicates published stories.

---

## 5. Schema.org Structured Data & Rich Results

Implemented via [`src/services/seo/SeoService.ts`](file:///d:/the-meridian-—-global-news-platform/src/services/seo/SeoService.ts):

### `NewsArticle` Schema
Embedded dynamically in every story page:
- `@context`: `https://schema.org`
- `@type`: `NewsArticle`
- `headline`: Title of the report
- `image`: High-resolution primary photography URL (with absolute canonical domain)
- `datePublished`: ISO 8601 publication timestamp
- `dateModified`: ISO 8601 last modified timestamp
- `author`: Array containing `Person` entities with `name`, `jobTitle`, `url`, and `worksFor` referencing the publisher
- `publisher`: `NewsMediaOrganization` with logo, publishing principles, corrections policy, and ethics policy
- `articleSection`: Primary reporting category

### `BreadcrumbList` Schema
Enables breadcrumb navigation snippets in search engine result pages (SERPs):
- Position 1: `Home` (`https://themeridian.in`)
- Position 2: Category (`https://themeridian.in/technology`)
- Position 3: Story Headline (`https://themeridian.in/story/:slug`)

### `NewsMediaOrganization` & `WebSite` Schema
Embedded on the homepage (`index.html`) and publisher transparency pages:
- Explicit trust URLs: `publishingPrinciples`, `correctionsPolicy`, `ethicsPolicy`, `diversityPolicy`, `masthead`.
- **Zero Obsolete Schema:** Compliant with Google's November 2024 deprecation of Sitelinks Search Box (`SearchAction` is omitted).

---

## 6. Publisher Transparency, E-E-A-T & Honest AI Disclosure

Google’s Quality Rater Guidelines and Google News policies emphasize **Experience, Expertise, Authoritativeness, and Trustworthiness (E-E-A-T)**.

### First-Class Editorial Surfaces
1. **Editorial Masthead & Bureau Leadership (`/masthead`, `/about`):** Detailed leadership bios, bureau locations (London, Washington, Tokyo, Brussels), and publisher ownership.
2. **Direct Contact Channels (`/contact`):** Dedicated editorial email (`editorial@themeridian.in`), corrections desk, confidential whistleblower tips channel, and office locations.
3. **Transparent Corrections Protocol (`/corrections`):** Clear policy detailing prompt amendments, inline correction notes, and public corrections audit trail.
4. **Verified Author Profiles (`/author/:slug`):** Every correspondent has a verified profile detailing academic credentials, subject-matter expertise, bureau post, and historical bylines.
5. **Honest AI Disclosure (`/editorial-policy`):**
   - Discloses multi-stage automated news extraction (NVIDIA AI models) from verified official registers and wire wires.
   - Explains independent fact validation gates cross-referencing claims against primary sources.
   - Clarifies that synthetic drafts are never autonomously published; every story passes human editorial governance.
   - Explicitly rejects fake author personas: all bylines represent real human journalists or the institutional *The Meridian Newsroom Desk*.

---

## 7. Search Indexability & Crawl Isolation

To prevent search index bloat, duplicate content generation, and crawl budget wastage:
- **Internal Search (`/search?q=...`):** Injects `<meta name="robots" content="noindex, follow">`. Search bots are allowed to follow internal article links discovered in search results but are prevented from indexing arbitrary search query combinations.

---

## 8. Official Google Documentation References

- [Google Search Central — Google News and Your Site](https://developers.google.com/search/docs/appearance/google-news)
- [Google Search Central — Article Structured Data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google Search Central — Breadcrumb Structured Data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [Google Search Central — Robots.txt Specifications (RFC 9309)](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)
- [Google Search Central — Canonical URLs Guide](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google Search Central — Sitelinks Search Box Deprecation Notice (Nov 2024)](https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox)
- [Google Search Central — Creating Helpful, Reliable, People-First Content (E-E-A-T)](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
