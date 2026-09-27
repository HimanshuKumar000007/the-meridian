/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Secure Endpoint Security & Authentication Verification
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import orchestratorHandler from '../api/automation/orchestrator';
import discoveryHandler from '../test/legacy_api/discovery';
import extractionHandler from '../test/legacy_api/extraction';
import validationHandler from '../test/legacy_api/validation';
import lifecycleHandler from '../test/legacy_api/lifecycle';
import publishingHandler from '../test/legacy_api/publishing';
import healthHandler from '../api/automation/health';

function createMockReqRes(options: {
  headers?: Record<string, string>;
  body?: any;
}) {
  let statusCode = 200;
  let jsonBody: any = null;

  const req: any = {
    method: 'POST',
    headers: options.headers || {},
    body: options.body || {},
  };

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonBody = data;
      return res;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => jsonBody,
  };
}

async function main() {
  console.log('====================================================');
  console.log('AUTOMATION ENDPOINT SECURITY & AUTHENTICATION TEST');
  console.log('====================================================\n');

  const validSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-automation-secret';
  process.env.CRON_SECRET = 'meridian-test-cron-secret-xyz';

  const handlers = [
    { name: '/api/automation/orchestrator', fn: orchestratorHandler },
    { name: '/api/automation/discovery', fn: discoveryHandler },
    { name: '/api/automation/extraction', fn: extractionHandler },
    { name: '/api/automation/validation', fn: validationHandler },
    { name: '/api/automation/lifecycle', fn: lifecycleHandler },
    { name: '/api/automation/publishing', fn: publishingHandler },
    { name: '/api/automation/health', fn: healthHandler },
  ];

  for (const h of handlers) {
    // 1. Missing Auth (Browser / Anonymous Request)
    const noAuth = createMockReqRes({});
    await h.fn(noAuth.req, noAuth.res);
    if (noAuth.getStatus() !== 401) {
      throw new Error(`Security Failure: ${h.name} did not return 401 on missing auth! Got: ${noAuth.getStatus()}`);
    }
    console.log(`✅ [PASS] ${h.name}: Anonymous request rejected with 401 Unauthorized`);

    // 2. Invalid Secret
    const badAuth = createMockReqRes({
      headers: { authorization: 'Bearer invalid-token-12345' },
    });
    await h.fn(badAuth.req, badAuth.res);
    if (badAuth.getStatus() !== 401) {
      throw new Error(`Security Failure: ${h.name} did not return 401 on invalid token! Got: ${badAuth.getStatus()}`);
    }
    console.log(`✅ [PASS] ${h.name}: Invalid token rejected with 401 Unauthorized`);

    // 3. Valid Secret in Dry Run
    const goodAuth = createMockReqRes({
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      body: { dryRun: true },
    });
    await h.fn(goodAuth.req, goodAuth.res);
    const status = goodAuth.getStatus();
    const bodyStr = JSON.stringify(goodAuth.getBody());

    if (status !== 200 && status !== 409) {
      throw new Error(`Execution Failure: ${h.name} failed on valid auth! Got status ${status}: ${bodyStr}`);
    }

    // Verify secret is NOT leaked in response
    if (bodyStr.includes(process.env.CRON_SECRET)) {
      throw new Error(`Data Leak: ${h.name} leaked secret in response body!`);
    }
    console.log(`✅ [PASS] ${h.name}: Authorized server request accepted (Status: ${status}) with zero secret leakage`);
  }

  console.log('\n====================================================');
  console.log('ALL 7 AUTOMATION ENDPOINTS PASSED SECURITY & AUTH AUDIT');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('\nSecurity Test Failure:', err);
  process.exit(1);
});
