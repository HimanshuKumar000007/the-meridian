/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const DEFAULT_SUPABASE_URL = 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Ymdna3ltZ2R0c3l2cnZycmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NzI0NDksImV4cCI6MjEwNjA0ODQ0OX0.Ao5sTZNb8SVZdUvvx9nSr6zc0S1lVBGmP73-PG6AK1s';

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseUrl.includes('YOUR_') &&
    !supabaseAnonKey.includes('YOUR_')
  );
}

let client: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} else {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
    console.warn(
      '[The Meridian] Supabase environment variables missing. ' +
      'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in .env.local.'
    );
  }
}

export const supabase = client;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    throw new Error(
      '[The Meridian] Supabase client is not initialized. ' +
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY configuration.'
    );
  }
  return client;
}
