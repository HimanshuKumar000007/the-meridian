/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — OPERATOR REVIEW NOTIFICATIONS TEST SUITE
 * Verification of Operator Alerting, Idempotency, Fail-Safe & Security
 */

import http from 'http';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import {
  OperatorNotificationService,
  NotificationConfigService,
  WebhookSecretSanitizer,
  GenericWebhookProvider,
  SlackWebhookProvider,
  DiscordWebhookProvider,
  MemoryReviewNotificationStateRepository,
} from './src/services/notification';
import {
  StoryLifecycleEngine,
  CURRENT_LIFECYCLE_VERSION,
} from './src/services/lifecycle';
import { MockLifecycleRepository } from './src/data/repositories/MockLifecycleRepository';
import { makeTestCandidate, makeTestValidation } from './test/fixtures/lifecycles/fixtures';
import handler from './src/api/orchestrator';

async function runOperatorNotificationsTestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — OPERATOR REVIEW NOTIFICATIONS SUITE');
  console.log('Operator Alerting, Idempotency & Security Verification');
  console.log('====================================================\n');

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    } else {
      console.log(`✅ [PASS] ${testName}`);
      testsPassed++;
    }
  }

  // --- Local Mock Webhook Server Setup ---
  let receivedRequests: Array<{ method: string; url: string; headers: http.IncomingHttpHeaders; body: any }> = [];
  let serverHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void = (req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let parsed = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }
      receivedRequests.push({
        method: req.method || 'GET',
        url: req.url || '/',
        headers: req.headers,
        body: parsed,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  };

  const server = http.createServer((req, res) => serverHandler(req, res));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const mockWebhookUrl = `http://127.0.0.1:${address.port}/webhook`;

  try {
    // --- 1. Test 1: needs_review -> notification generated ---
    console.log('\n--- 1. Trigger Verification ---');
    receivedRequests = [];

    process.env.REVIEW_NOTIFICATIONS_ENABLED = 'true';
    process.env.REVIEW_NOTIFICATION_PROVIDER = 'webhook';
    process.env.REVIEW_NOTIFICATION_WEBHOOK_URL = mockWebhookUrl;

    const configService = new NotificationConfigService();
    const stateRepo = new MemoryReviewNotificationStateRepository();
    const service = new OperatorNotificationService({ configService, stateRepository: stateRepo });

    const result1 = await service.notifyReviewRequired({
      storyId: 'story-test-01',
      headline: 'Breakthrough Quantum Processor Demonstrated in Lab',
      source: 'src-nature-news',
      reason: 'Candidate held for editorial review (sensitive claim flags present).',
      category: 'technology',
      validationStatus: 'needs_review',
      validationId: 'val-test-01',
      issues: [{ code: 'SENSITIVE_CLAIM', message: 'Medical/quantum claim unverified' }],
    });

    assert(result1.notified === true, 'Test 1a: needs_review status triggers notification');
    assert(result1.success === true, 'Test 1b: Webhook send returns success');
    assert(receivedRequests.length === 1, 'Test 1c: Mock webhook endpoint received exactly 1 request');
    assert(receivedRequests[0].body.event === 'needs_review', 'Test 1d: Webhook payload event is needs_review');
    assert(receivedRequests[0].body.story.id === 'story-test-01', 'Test 1e: Story ID matches in payload');
    assert(receivedRequests[0].body.story.headline.includes('Quantum Processor'), 'Test 1f: Headline matches in payload');
    assert(receivedRequests[0].body.text.includes('The Meridian — Review Required'), 'Test 1g: Standard text header present');
    assert(receivedRequests[0].body.text.includes('Review URL:'), 'Test 1h: Review URL is present in text');

    // --- 2. Test 2: rejected -> no review notification ---
    console.log('\n--- 2. Non-Review Status Insulation ---');
    receivedRequests = [];

    const result2 = await service.notifyReviewRequired({
      storyId: 'story-test-02',
      headline: 'Unverified Rumor on Tech Acquisition',
      source: 'src-tech-blog',
      reason: 'Validation gate rejected candidate (unverified quote).',
      category: 'technology',
      validationStatus: 'rejected',
      validationId: 'val-test-02',
    });

    assert(result2.notified === false, 'Test 2a: rejected candidate does NOT trigger review notification');
    assert(result2.skipReason === 'NON_REVIEW_STATUS', 'Test 2b: Skip reason is NON_REVIEW_STATUS for rejected');
    assert(receivedRequests.length === 0, 'Test 2c: Zero webhook calls made for rejected candidate');

    // --- 3. Test 3: valid -> no review notification ---
    const result3 = await service.notifyReviewRequired({
      storyId: 'story-test-03',
      headline: 'Official NASA Rover Sample Analysis Published',
      source: 'src-nasa-breaking',
      reason: 'All facts verified successfully',
      category: 'science',
      validationStatus: 'valid',
      validationId: 'val-test-03',
    });

    assert(result3.notified === false, 'Test 3a: valid candidate does NOT trigger review notification');
    assert(result3.skipReason === 'NON_REVIEW_STATUS', 'Test 3b: Skip reason is NON_REVIEW_STATUS for valid');
    assert(receivedRequests.length === 0, 'Test 3c: Zero webhook calls made for valid candidate');

    // --- 4. Test 4: same review state repeated -> no duplicate notification ---
    console.log('\n--- 3. Idempotency & Anti-Spam Verification ---');
    receivedRequests = [];

    // First notify
    const resA1 = await service.notifyReviewRequired({
      storyId: 'story-anti-spam-01',
      headline: 'Clinical Trial Results Under Review',
      source: 'src-health-news',
      reason: 'Unverified percentage metric',
      category: 'health',
      validationStatus: 'needs_review',
      issues: [{ code: 'NUMBER_MISMATCH', message: 'Percentage conflicting' }],
    });
    assert(resA1.notified === true, 'Test 4a: Initial review candidate receives notification');
    assert(receivedRequests.length === 1, 'Test 4b: Exactly one webhook request dispatched initially');

    // Second notify with IDENTICAL review state
    const resA2 = await service.notifyReviewRequired({
      storyId: 'story-anti-spam-01',
      headline: 'Clinical Trial Results Under Review',
      source: 'src-health-news',
      reason: 'Unverified percentage metric',
      category: 'health',
      validationStatus: 'needs_review',
      issues: [{ code: 'NUMBER_MISMATCH', message: 'Percentage conflicting' }],
    });

    assert(resA2.notified === false, 'Test 4c: Duplicate review state suppresses notification');
    assert(resA2.skipReason === 'DUPLICATE_REVIEW_STATE', 'Test 4d: Skip reason is DUPLICATE_REVIEW_STATE');
    assert(receivedRequests.length === 1, 'Test 4e: Webhook count strictly unchanged on duplicate state');

    // --- 5. Test 5: new review state -> notification allowed ---
    console.log('\n--- 4. State Transition Notification ---');
    const resA3 = await service.notifyReviewRequired({
      storyId: 'story-anti-spam-01',
      headline: 'Clinical Trial Results Under Review',
      source: 'src-health-news',
      reason: 'Category mismatch and new sensitive claim added',
      category: 'health',
      validationStatus: 'needs_review',
      issues: [
        { code: 'NUMBER_MISMATCH', message: 'Percentage conflicting' },
        { code: 'CATEGORY_MISMATCH', message: 'Category conflicts with source text' },
      ],
    });

    assert(resA3.notified === true, 'Test 5a: Changed review state allows new notification');
    assert(resA3.success === true, 'Test 5b: State transition notification dispatched successfully');
    assert(receivedRequests.length === 2, 'Test 5c: Exactly two requests received after state transition');

    // --- 6. Test 6: Webhook failure -> story processing continues safely ---
    console.log('\n--- 5. Fail-Safe & Error Resilience ---');
    serverHandler = (req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error on Webhook Target' }));
    };

    const resFail = await service.notifyReviewRequired({
      storyId: 'story-fail-01',
      headline: 'Resilience Test Headline',
      source: 'src-tech',
      reason: 'Test review reason',
      category: 'technology',
      validationStatus: 'needs_review',
    });

    assert(resFail.notified === true, 'Test 6a: Attempted notification despite upstream error');
    assert(resFail.success === false, 'Test 6b: Success is false when webhook responds with 500');
    assert(resFail.error !== undefined, 'Test 6c: Error message captured');

    // Verify StoryLifecycleEngine fail-safe: notification failure does NOT interrupt lifecycle processing
    const mockRepo = new MockLifecycleRepository();
    const failingEngine = new StoryLifecycleEngine(mockRepo, {
      lifecycleVersion: CURRENT_LIFECYCLE_VERSION,
      notificationService: service,
    });

    const candidate = makeTestCandidate({
      id: 'ext-fail-safe',
      title: 'Resilient Pipeline Story',
      category: 'technology',
    });
    const validation = makeTestValidation({
      id: 'val-fail-safe',
      extractionId: 'ext-fail-safe',
      status: 'needs_review',
    });

    const decision = await failingEngine.processCandidate(candidate, validation);
    assert(decision.action === 'HOLD', 'Test 6d: Pipeline safely produced HOLD decision despite webhook failure');
    assert(decision.validationId === 'val-fail-safe', 'Test 6e: Decision metadata preserved cleanly');

    // --- 7. Test 7: Timeout -> bounded failure ---
    console.log('\n--- 6. Bounded Timeout Verification ---');
    serverHandler = (req, res) => {
      // Deliberately delay response beyond timeout
      setTimeout(() => {
        res.writeHead(200);
        res.end();
      }, 500);
    };

    const timeoutProvider = new GenericWebhookProvider(mockWebhookUrl, 60, 1);
    const startTimeout = Date.now();
    const timeoutResult = await timeoutProvider.send({
      storyId: 'story-timeout-01',
      headline: 'Timeout Test',
      source: 'src-tech',
      reason: 'Timeout test reason',
      category: 'tech',
      reviewUrl: 'https://the-meridian.news/review/1',
      timestamp: new Date().toISOString(),
    });
    const duration = Date.now() - startTimeout;

    assert(timeoutResult.success === false, 'Test 7a: Timed out request flagged as failure');
    assert(timeoutResult.error?.includes('timed out') || false, 'Test 7b: Error indicates request timeout');
    assert(duration < 1500, `Test 7c: Bounded duration was ${duration}ms (strictly under 1500ms limit)`);

    // --- 8. Test 8: Missing webhook configuration -> safe no-op ---
    console.log('\n--- 7. Disabled / Missing Config Safety ---');
    process.env.REVIEW_NOTIFICATIONS_ENABLED = 'false';
    const disabledConfigService = new NotificationConfigService();
    const disabledService = new OperatorNotificationService({ configService: disabledConfigService });

    const disabledResult = await disabledService.notifyReviewRequired({
      storyId: 'story-disabled-01',
      headline: 'Disabled Config Test',
      source: 'src-tech',
      reason: 'Review required',
      category: 'technology',
      validationStatus: 'needs_review',
    });

    assert(disabledResult.notified === false, 'Test 8a: Disabled notifications return notified: false');
    assert(disabledResult.skipReason === 'DISABLED', 'Test 8b: Skip reason is DISABLED');

    delete process.env.REVIEW_NOTIFICATION_WEBHOOK_URL;
    process.env.REVIEW_NOTIFICATIONS_ENABLED = 'true';
    const noUrlConfigService = new NotificationConfigService();
    const noUrlService = new OperatorNotificationService({ configService: noUrlConfigService });

    const noUrlResult = await noUrlService.notifyReviewRequired({
      storyId: 'story-no-url-01',
      headline: 'No URL Test',
      source: 'src-tech',
      reason: 'Review required',
      category: 'technology',
      validationStatus: 'needs_review',
    });

    assert(noUrlResult.notified === false, 'Test 8c: Missing URL returns notified: false');
    assert(noUrlResult.skipReason === 'MISSING_URL', 'Test 8d: Skip reason is MISSING_URL');

    // --- 9. Test 9: Secret never appears in logs ---
    console.log('\n--- 8. Secret Security & Log Redaction ---');
    const secretDiscordUrl = 'https://discord.com/api/webhooks/123456789/ultra_confidential_token_xyz987';
    const sanitizedDiscord = WebhookSecretSanitizer.sanitizeUrl(secretDiscordUrl);
    assert(!sanitizedDiscord.includes('ultra_confidential_token_xyz987'), 'Test 9a: Discord token is redacted');
    assert(sanitizedDiscord.includes('[REDACTED]'), 'Test 9b: Discord URL contains [REDACTED]');

    const secretSlackUrl = 'https://hooks.slack.com/services/T001/B002/super_secret_slack_token_456';
    const sanitizedSlack = WebhookSecretSanitizer.sanitizeUrl(secretSlackUrl);
    assert(!sanitizedSlack.includes('super_secret_slack_token_456'), 'Test 9c: Slack token is redacted');
    assert(sanitizedSlack.includes('[REDACTED]'), 'Test 9d: Slack URL contains [REDACTED]');

    const secretQueryUrl = 'https://custom.webhook.corp/notify?secret_key=top_secret_key_111';
    const sanitizedQuery = WebhookSecretSanitizer.sanitizeUrl(secretQueryUrl);
    assert(!sanitizedQuery.includes('top_secret_key_111'), 'Test 9e: Query parameter token is redacted');

    const rawError = `Connection failed to ${secretDiscordUrl}: socket closed`;
    const sanitizedMsg = WebhookSecretSanitizer.sanitizeMessage(rawError, secretDiscordUrl);
    assert(!sanitizedMsg.includes('ultra_confidential_token_xyz987'), 'Test 9f: Error message does not leak raw secret');

    // --- 10. Test 10: Anonymous client cannot trigger arbitrary webhook calls ---
    console.log('\n--- 9. Anonymous Access Insulation ---');
    let mockStatusCode = 0;
    let mockResponseBody: any = {};

    const mockReq: any = {
      headers: {}, // Anonymous request (no Authorization header, no x-cron-secret)
      body: { trigger: 'api', stages: ['lifecycle'] },
    };
    const mockRes: any = {
      status(code: number) {
        mockStatusCode = code;
        return this;
      },
      json(data: any) {
        mockResponseBody = data;
        return this;
      },
    };

    await handler(mockReq, mockRes);
    assert(mockStatusCode === 401, `Test 10a: Anonymous request is rejected with HTTP 401 (got ${mockStatusCode})`);
    assert(mockResponseBody.error?.includes('Unauthorized'), 'Test 10b: Error message specifies Unauthorized');

    // --- 11. Multi-Provider Format Verification ---
    console.log('\n--- 10. Multi-Provider Formatting Verification ---');
    const samplePayload = {
      storyId: 'story-fmt-01',
      headline: 'New Exo-Planet Discovered by James Webb Telescope',
      source: 'src-nasa-breaking',
      reason: 'Sensory measurement variance flags review',
      category: 'science',
      reviewUrl: 'https://the-meridian.news/review/val-fmt-01',
      timestamp: '2026-09-28T12:00:00.000Z',
    };

    // Slack Formatting
    const slackProvider = new SlackWebhookProvider(mockWebhookUrl);
    const slackPayload = slackProvider.formatPayload(samplePayload);
    assert(slackPayload.blocks.length >= 4, 'Test 11a: Slack payload generates Block Kit blocks');
    assert((slackPayload.blocks[0] as any)?.text?.text?.includes('Review Required'), 'Test 11b: Slack header text matches');
    assert(JSON.stringify(slackPayload).includes('Exo-Planet'), 'Test 11c: Headline embedded in Slack blocks');

    // Discord Formatting
    const discordProvider = new DiscordWebhookProvider(mockWebhookUrl);
    const discordPayload = discordProvider.formatPayload(samplePayload);
    assert(discordPayload.embeds.length === 1, 'Test 11d: Discord payload generates rich embed');
    assert(discordPayload.embeds[0].color === 0xf59e0b, 'Test 11e: Discord embed uses amber warning color');
    assert(discordPayload.embeds[0].fields.some((f) => f.name === 'Reason'), 'Test 11f: Reason field present in Discord embed');

    // Generic Webhook Text Format
    const genericProvider = new GenericWebhookProvider(mockWebhookUrl);
    const genericText = genericProvider.formatMessageText(samplePayload);
    assert(genericText.includes('The Meridian — Review Required'), 'Test 11g: Generic webhook header matches spec');
    assert(genericText.includes('Story:\nNew Exo-Planet Discovered'), 'Test 11h: Generic webhook story section formatted');
    assert(genericText.includes('Reason:\nSensory measurement variance'), 'Test 11i: Generic webhook reason formatted');
    assert(genericText.includes('Story ID:\nstory-fmt-01'), 'Test 11j: Generic webhook story ID formatted');

  } finally {
    // Restore environment
    process.env.REVIEW_NOTIFICATIONS_ENABLED = 'false';
    delete process.env.REVIEW_NOTIFICATION_WEBHOOK_URL;
    server.close();
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE COMPLETE: ${testsPassed} / ${totalTests} PASSED (100%)`);
  console.log('====================================================\n');
}

runOperatorNotificationsTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
