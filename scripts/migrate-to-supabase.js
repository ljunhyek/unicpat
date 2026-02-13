/**
 * One-time migration script: JSON files → Supabase tables
 *
 * Usage:
 *   node scripts/migrate-to-supabase.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dataDir = path.join(__dirname, '..', 'data');

async function migrate() {
  console.log('=== Supabase Migration Start ===\n');

  // 1. columns (blog-posts.json)
  const posts = JSON.parse(fs.readFileSync(path.join(dataDir, 'blog-posts.json'), 'utf-8'));
  if (posts.length) {
    const rows = posts.map((p, i) => ({
      title: p.title,
      url: p.url,
      image: p.image || '',
      category: p.category || 'strategy',
      sort_order: i
    }));
    const { data, error } = await supabase.from('columns').insert(rows);
    if (error) console.error('columns insert error:', error.message);
    else console.log(`✓ columns: ${rows.length} rows inserted`);
  }

  // 2. newsletters (newsletters.json)
  const newsletters = JSON.parse(fs.readFileSync(path.join(dataDir, 'newsletters.json'), 'utf-8'));
  if (newsletters.length) {
    const rows = newsletters.map(n => ({
      title: n.title,
      link: n.link,
      date: n.date
    }));
    const { data, error } = await supabase.from('newsletters').insert(rows);
    if (error) console.error('newsletters insert error:', error.message);
    else console.log(`✓ newsletters: ${rows.length} rows inserted`);
  }

  // 3. gov-support.json → gov_support_types + gov_projects
  const govSupport = JSON.parse(fs.readFileSync(path.join(dataDir, 'gov-support.json'), 'utf-8'));

  if (govSupport.types && govSupport.types.length) {
    const rows = govSupport.types.map(t => ({
      agency: t.agency,
      programs: t.programs,
      description: t.description,
      url: t.url
    }));
    const { data, error } = await supabase.from('gov_support_types').insert(rows);
    if (error) console.error('gov_support_types insert error:', error.message);
    else console.log(`✓ gov_support_types: ${rows.length} rows inserted`);
  }

  if (govSupport.projects && govSupport.projects.length) {
    const rows = govSupport.projects.map(p => ({
      title: p.title,
      period: p.period,
      url: p.url
    }));
    const { data, error } = await supabase.from('gov_projects').insert(rows);
    if (error) console.error('gov_projects insert error:', error.message);
    else console.log(`✓ gov_projects: ${rows.length} rows inserted`);
  }

  console.log('\n=== Migration Complete ===');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
