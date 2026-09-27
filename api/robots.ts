/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function: /api/robots
 * Generates dynamic RFC 9309 compliant robots.txt with active canonical site URL.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://themeridian.news').replace(/\/+$/, '');

  const content = `# Robots.txt for The Meridian — Global News Platform
# Compliant with RFC 9309 (Robots Exclusion Protocol)

User-agent: *
Allow: /

# Protected internal and API paths
Disallow: /api/
Disallow: /automation/
Disallow: /internal/
Disallow: /admin/
Disallow: /debug/
Disallow: /test/

# Global XML Sitemap
Sitemap: ${siteUrl}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return res.status(200).send(content);
}
