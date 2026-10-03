import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { SupabaseNewsRepository } from '../src/data/repositories/SupabaseNewsRepository';

async function verify() {
  const repo = new SupabaseNewsRepository();
  const slug = 'top-50-global-dispatch-ai-space-science-tech-business-mursn9eh';
  const story = await repo.getStoryBySlug(slug);
  if (!story) {
    console.error('❌ Story not found in SupabaseNewsRepository');
    process.exit(1);
  }
  console.log('✅ Story successfully queried through SupabaseNewsRepository:');
  console.log('ID:         ', story.id);
  console.log('Title:      ', story.title);
  console.log('Category:   ', story.category);
  console.log('Author:     ', story.author?.name);
  console.log('Blocks:     ', story.content?.length);
  console.log('Sources:    ', story.sources?.length);
  console.log('Facts:      ', story.facts?.length);
  console.log('Hero Image: ', story.image);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
