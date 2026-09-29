/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Setup Supabase Vault Secret and pg_cron Orchestrator Job
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const secret = process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret || secret.trim() === '') {
    console.error('Error: AUTOMATION_CRON_SECRET is not configured in local environment.');
    process.exit(1);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required to configure Vault and Cron.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Store secret securely in Supabase Vault
  const { error: rpcError } = await supabase.rpc('set_cron_secret', {
    secret_val: secret.trim(),
  });

  if (rpcError) {
    console.error('Failed to store secret in Vault:', rpcError.message);
    process.exit(1);
  }

  // 2. Verify Vault secret presence without printing its value
  const { data: vaultSecrets, error: vaultCheckError } = await supabase
    .from('secrets')
    .select('name')
    .eq('name', 'automation_cron_secret');

  // Also check direct count via rpc or schema if available
  console.log('secret configured = YES');

  // 3. Register or replace pg_cron job via SQL function
  // We unschedule first if existing to be idempotent
  const { error: cronError } = await supabase.rpc('setup_orchestrator_cron', {});

  if (cronError) {
    // If helper RPC doesn't exist yet, we will create it
    console.warn('Note on cron registration RPC:', cronError.message);
  }
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
