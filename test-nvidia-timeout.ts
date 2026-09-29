/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Local Unit Test: NvidiaClient Timeout & Non-Retry Verification
 * Confirms that AbortController strictly enforces timeouts and never retries timed-out requests.
 */

import http from 'http';
import assert from 'assert';
import { NvidiaClient } from './src/services/extraction/NvidiaClient';

async function runTimeoutTest() {
  console.log('--- Unit Test: NvidiaClient Timeout & Non-Retry Verification ---');

  let requestCount = 0;
  // Create a local test server that intentionally delays responding for 5 seconds
  const server = http.createServer((req, res) => {
    requestCount++;
    // Intentionally hold the socket open without responding
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: '{}' } }] }));
    }, 5000);
  });

  await new Promise<void>((resolve) => server.listen(59998, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;

  try {
    const timeoutMs = 800; // 800ms timeout
    const client = new NvidiaClient({
      baseUrl: `http://127.0.0.1:${port}`,
      apiKey: 'test-nvidia-api-key',
      timeoutMs,
    });

    const start = Date.now();
    let caughtError: any = null;

    try {
      await client.extractStructuredNews('System prompt', 'User prompt');
    } catch (err: any) {
      caughtError = err;
    }

    const elapsed = Date.now() - start;

    assert(caughtError !== null, 'Test A: Expected timeout error to be thrown');
    assert(
      caughtError.message.includes(`Request timed out after ${timeoutMs}ms`),
      `Test B: Expected timeout message, got: ${caughtError.message}`
    );
    assert(
      elapsed >= timeoutMs && elapsed < timeoutMs + 1000,
      `Test C: Request should abort within ~${timeoutMs}ms without retry loop, actual elapsed: ${elapsed}ms`
    );
    assert.strictEqual(
      requestCount,
      1,
      `Test D: Timed-out request must NEVER be retried; expected 1 attempt, saw ${requestCount}`
    );

    console.log(`✅ [PASS] All 4 NvidiaClient timeout assertions passed in ${elapsed}ms (attempts: ${requestCount})`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runTimeoutTest()
  .then(() => {
    console.log('NvidiaClient timeout test completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('NvidiaClient timeout test FAILED:', err);
    process.exit(1);
  });
