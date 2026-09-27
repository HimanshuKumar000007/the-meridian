/**
 * Database Seed Generator and Executor for The Meridian
 * Converts normalized local models into PostgreSQL migrations and executes them on Supabase.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MOCK_CATEGORIES } from '../src/data/mockCategories';
import { MOCK_STORIES_DATA } from '../src/data/mockStoriesData';
import { MOCK_STORIES } from '../src/data/mockNews';
import { enrichStoryWithEditorialContent } from '../src/data/storyDatabase';
import type { NewsStory } from '../src/types/story';

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

function escapeJson(obj: any): string {
  if (obj === null || obj === undefined) return "'[]'::jsonb";
  const jsonStr = JSON.stringify(obj).replace(/'/g, "''");
  return `'${jsonStr}'::jsonb`;
}

function resolveCategoryId(catName: string): string {
  const norm = catName.toLowerCase();
  if (norm.includes('ai') || norm.includes('computing')) return 'cat-ai';
  if (norm.includes('semiconductor') || norm.includes('tech')) return 'cat-tech';
  if (norm.includes('game') || norm.includes('gaming')) return 'cat-gaming';
  if (norm.includes('space') || norm.includes('astrophysics')) return 'cat-space';
  if (norm.includes('sci') || norm.includes('physics')) return 'cat-science';
  if (norm.includes('biz') || norm.includes('business') || norm.includes('market')) return 'cat-business';
  if (norm.includes('world') || norm.includes('trade') || norm.includes('diplomacy')) return 'cat-world';
  if (norm.includes('entertain') || norm.includes('culture')) return 'cat-entertainment';
  if (norm.includes('cyber') || norm.includes('security')) return 'cat-cybersecurity';
  if (norm.includes('app') || norm.includes('software')) return 'cat-apps';
  if (norm.includes('hardware') || norm.includes('silicon')) return 'cat-hardware';
  return 'cat-tech';
}

function buildSeedSql(): string {
  const sqlLines: string[] = [
    '-- Migration: 002_seed_news_data.sql',
    '-- Idempotent seed data for The Meridian Global News Platform',
    '',
    '-- 1. SEED CATEGORIES',
  ];

  for (const cat of MOCK_CATEGORIES) {
    sqlLines.push(
      `INSERT INTO categories (id, slug, name, display_name, description, is_active, display_order) ` +
      `VALUES (${escapeSql(cat.id)}, ${escapeSql(cat.slug)}, ${escapeSql(cat.name)}, ${escapeSql(cat.displayName || cat.name)}, ${escapeSql(cat.description)}, true, ${cat.displayOrder || 0}) ` +
      `ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description;`
    );
  }

  sqlLines.push('', '-- 2. SEED SUBCATEGORIES');
  for (const cat of MOCK_CATEGORIES) {
    for (const sub of cat.subcategories) {
      sqlLines.push(
        `INSERT INTO subcategories (id, category_id, slug, name, description, is_active, display_order) ` +
        `VALUES (${escapeSql(sub.id)}, ${escapeSql(cat.id)}, ${escapeSql(sub.slug)}, ${escapeSql(sub.name)}, ${escapeSql(sub.description || null)}, true, ${sub.displayOrder || 0}) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;`
      );
    }
  }

  // Combine detailed stories + enriched stories up to 18 stories
  const storyMap = new Map<string, NewsStory>();
  for (const s of MOCK_STORIES_DATA) {
    storyMap.set(s.slug, s);
  }
  for (const s of MOCK_STORIES) {
    if (!storyMap.has(s.slug) && storyMap.size < 18) {
      storyMap.set(s.slug, enrichStoryWithEditorialContent(s));
    }
  }

  // Add 1 explicit Entertainment and 1 Hardware story if missing
  if (!storyMap.has('global-cinematography-virtual-production-pipelines')) {
    storyMap.set('global-cinematography-virtual-production-pipelines', {
      id: 'ent-virtual-prod',
      slug: 'global-cinematography-virtual-production-pipelines',
      title: 'Real-Time In-Camera VFX and Neural Rendering Reshape Cinematic Production',
      dek: 'Major European and North American studios transition to modular LED soundstages with zero latency camera tracking.',
      summary: 'Major European and North American studios transition to modular LED soundstages with zero latency camera tracking.',
      category: 'Entertainment',
      subcategory: 'Cinema Tech',
      status: 'Analysis',
      lifecycleStatus: 'published',
      publishedAt: '2026-09-26T03:00:00Z',
      timeDisplay: '3h ago',
      readTime: '4 min read',
      author: {
        id: 'auth-clara-dupont',
        name: 'Clara Dupont',
        role: 'Culture & Entertainment Technology Editor',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
      },
      heroImage: {
        url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
        alt: 'Virtual production LED volume soundstage with real-time camera tracking apparatus',
        caption: 'Director and virtual lighting technician testing camera frustum rendering on an LED stage.',
        credit: 'The Meridian / Editorial Studio',
      },
      content: [
        {
          type: 'paragraph',
          lead: true,
          text: 'The traditional green-screen workflow has officially passed its zenith as premier studios invest in full-spectrum parallax volumes.',
        },
        {
          type: 'paragraph',
          text: 'Using high-frequency optical tracking and neural radiance background generation, cinematographers now capture finished in-camera lighting in a single take.',
        },
      ],
      quickSummary: [
        'Modular LED stages reduce physical set shipping logistics by over 60 percent.',
        'Real-time photorealistic frustum tracking eliminates green spill on physical talent.',
        'Major guild standards now support direct archival digital assets from virtual soundstages.',
      ],
      facts: [
        { label: 'Technology', value: 'Neural Frustum Rendering' },
        { label: 'Primary Volume Spec', value: '2.5mm pixel pitch curved LED wall' },
      ],
    });
  }

  const stories = Array.from(storyMap.values());

  // 3. SEED AUTHORS
  sqlLines.push('', '-- 3. SEED AUTHORS');
  const authorMap = new Map<string, { id: string; name: string; slug: string; bio: string; avatar_url: string; role: string }>();

  for (const story of stories) {
    const a = story.author;
    const authorId = a.id || `auth-${a.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const authorSlug = a.slug || a.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (!authorMap.has(authorId)) {
      authorMap.set(authorId, {
        id: authorId,
        name: a.name,
        slug: authorSlug,
        bio: a.bio || `${a.name} is a senior correspondent covering ${story.category} developments for The Meridian.`,
        avatar_url: a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        role: a.role || 'Staff Correspondent',
      });
    }
  }

  for (const auth of authorMap.values()) {
    sqlLines.push(
      `INSERT INTO authors (id, name, slug, bio, avatar_url, role) ` +
      `VALUES (${escapeSql(auth.id)}, ${escapeSql(auth.name)}, ${escapeSql(auth.slug)}, ${escapeSql(auth.bio)}, ${escapeSql(auth.avatar_url)}, ${escapeSql(auth.role)}) ` +
      `ON CONFLICT (id) DO UPDATE SET bio = EXCLUDED.bio, avatar_url = EXCLUDED.avatar_url, role = EXCLUDED.role;`
    );
  }

  // 4. SEED STORIES
  sqlLines.push('', '-- 4. SEED STORIES');
  for (const s of stories) {
    const categoryId = resolveCategoryId(s.category);
    const authorId = s.author.id || `auth-${s.author.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const heroUrl = s.heroImage?.url || s.image || null;
    const heroAlt = s.heroImage?.alt || s.alt || s.title;
    const heroCaption = s.heroImage?.caption || s.caption || null;
    const heroCredit = s.heroImage?.credit || s.credit || null;

    sqlLines.push(
      `INSERT INTO stories (` +
      `id, slug, title, dek, summary, summary_points, category_id, author_id, status, ` +
      `hero_image_url, hero_image_alt, hero_image_caption, hero_image_credit, content, ` +
      `published_at, updated_at, is_featured, view_count, trending_score` +
      `) VALUES (` +
      `${escapeSql(s.id)}, ${escapeSql(s.slug)}, ${escapeSql(s.title)}, ${escapeSql(s.dek || s.summary)}, ` +
      `${escapeSql(s.summary)}, ${escapeJson(s.quickSummary || [])}, ${escapeSql(categoryId)}, ${escapeSql(authorId)}, ` +
      `'published', ${escapeSql(heroUrl)}, ${escapeSql(heroAlt)}, ${escapeSql(heroCaption)}, ${escapeSql(heroCredit)}, ` +
      `${escapeJson(s.content || [])}, ${escapeSql(s.publishedAt)}, ${escapeSql(s.updatedAt || s.publishedAt)}, ` +
      `${Boolean(s.featured)}, ${s.viewCount || 1000}, ${s.trendingScore || 50.0}` +
      `) ON CONFLICT (id) DO UPDATE SET ` +
      `title = EXCLUDED.title, summary = EXCLUDED.summary, content = EXCLUDED.content, ` +
      `hero_image_url = EXCLUDED.hero_image_url, is_featured = EXCLUDED.is_featured, status = EXCLUDED.status;`
    );
  }

  // 5. SEED STORY SOURCES
  sqlLines.push('', '-- 5. SEED STORY SOURCES');
  for (const s of stories) {
    if (s.sources && s.sources.length > 0) {
      let order = 1;
      for (const src of s.sources) {
        const srcId = src.id || `src-${s.id}-${order}`;
        sqlLines.push(
          `INSERT INTO story_sources (id, story_id, name, url, source_type, published_at, is_primary, display_order) ` +
          `VALUES (${escapeSql(srcId)}, ${escapeSql(s.id)}, ${escapeSql(src.name)}, ${escapeSql(src.url || null)}, ` +
          `${escapeSql(src.sourceType || 'publisher')}, ${escapeSql(src.publishedAt || s.publishedAt)}, ` +
          `${Boolean(src.isPrimary)}, ${order}) ` +
          `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url;`
        );
        order++;
      }
    }
  }

  // 6. SEED STORY UPDATES
  sqlLines.push('', '-- 6. SEED STORY UPDATES');
  for (const s of stories) {
    if (s.updates && s.updates.length > 0) {
      let upIdx = 1;
      for (const up of s.updates) {
        const upId = up.id || `up-${s.id}-${upIdx}`;
        sqlLines.push(
          `INSERT INTO story_updates (id, story_id, timestamp, title, body, is_major) ` +
          `VALUES (${escapeSql(upId)}, ${escapeSql(s.id)}, ${escapeSql(up.timestamp || s.publishedAt)}, ` +
          `${escapeSql(up.title || 'Editorial Update')}, ${escapeSql(up.body || up.text || '')}, ${Boolean(up.isMajor)}) ` +
          `ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body;`
        );
        upIdx++;
      }
    }
  }

  // 7. SEED STORY FACTS
  sqlLines.push('', '-- 7. SEED STORY FACTS');
  for (const s of stories) {
    if (s.facts && s.facts.length > 0) {
      let fIdx = 1;
      for (const fact of s.facts) {
        const factId = fact.id || `f-${s.id}-${fIdx}`;
        sqlLines.push(
          `INSERT INTO story_facts (id, story_id, label, value, display_order) ` +
          `VALUES (${escapeSql(factId)}, ${escapeSql(s.id)}, ${escapeSql(fact.label)}, ${escapeSql(fact.value)}, ${fact.order || fIdx}) ` +
          `ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;`
        );
        fIdx++;
      }
    }
  }

  // 8. SEED STORY CORRECTIONS
  sqlLines.push('', '-- 8. SEED STORY CORRECTIONS');
  for (const s of stories) {
    if (s.corrections && s.corrections.length > 0) {
      let cIdx = 1;
      for (const cor of s.corrections) {
        const corId = cor.id || `cor-${s.id}-${cIdx}`;
        sqlLines.push(
          `INSERT INTO story_corrections (id, story_id, summary, body) ` +
          `VALUES (${escapeSql(corId)}, ${escapeSql(s.id)}, 'Formal Correction', ${escapeSql(cor.text)}) ` +
          `ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body;`
        );
        cIdx++;
      }
    }
  }

  // 9. SEED STORY RELATIONSHIPS
  sqlLines.push('', '-- 9. SEED STORY RELATIONSHIPS');
  for (const s of stories) {
    if (s.relatedStoryIds && s.relatedStoryIds.length > 0) {
      let relIdx = 1;
      for (const relId of s.relatedStoryIds) {
        // Ensure related story actually exists in our story map
        const targetStory = stories.find(target => target.id === relId || target.slug === relId);
        if (targetStory && targetStory.id !== s.id) {
          const relRecordId = `rel-${s.id}-${targetStory.id}`;
          sqlLines.push(
            `INSERT INTO story_relationships (id, story_id, related_story_id, relationship_type, score) ` +
            `VALUES (${escapeSql(relRecordId)}, ${escapeSql(s.id)}, ${escapeSql(targetStory.id)}, 'related', 0.95) ` +
            `ON CONFLICT (id) DO NOTHING;`
          );
          relIdx++;
        }
      }
    }
  }

  return sqlLines.join('\n');
}

async function main() {
  console.log('Building seed migration SQL...');
  const seedSql = buildSeedSql();
  const migrationPath = path.resolve('supabase/migrations/002_seed_news_data.sql');
  fs.writeFileSync(migrationPath, seedSql, 'utf8');
  console.log(`Saved seed migration to ${migrationPath}`);

  console.log('Executing seed SQL on Supabase (dzbggkymgdtsyvrvrrjw)...');
  const token = process.env.SUPABASE_ACCESS_TOKEN || '';
  if (!token) {
    console.log('SUPABASE_ACCESS_TOKEN not provided in environment. Skipping direct API execution.');
    return;
  }
  const response = await fetch(
    'https://api.supabase.com/v1/projects/dzbggkymgdtsyvrvrrjw/database/query',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: seedSql }),
    }
  );

  const resJson = await response.json();
  if (response.ok) {
    console.log('Seed executed successfully on Supabase!');
  } else {
    console.error('Seed execution error:', resJson);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Failed to run seed:', err);
  process.exit(1);
});
