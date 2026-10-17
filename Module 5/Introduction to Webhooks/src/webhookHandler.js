'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Export handleWebhook(req, res), used by POST /webhooks in app.js.
// Also export _processedIds (your Set or Map) for test inspection/reset.
//
// Steps (in order):
//  1. Verify HMAC-SHA256 signature
//     - Signature header: req.headers['x-webhook-signature'] → 'sha256=<hex>'
//     - Compute: crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('hex')
//     - Compare: crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(received,'hex'))
//     - Mismatch or missing → res.status(401).json({ error: 'Invalid signature' })
//
//  2. Parse body: const event = JSON.parse(req.body)
//
//  3. Idempotency: if _processedIds.has(event.id) → res.status(200).json({ status: 'already_processed' })
//
//  4. Mark: _processedIds.add(event.id)
//
//  5. Acknowledge: res.status(200).json({ status: 'received' })
//     Then call handleEvent(event) inside setImmediate(() => { ... })

const { handleEvent } = require('./eventHandlers');
const crypto = require("crypto");
// TODO: implement

const _processedIds = new Set();

async function handleWebhook(req, res) {
  const signatureHeader = req.headers['x-webhook-signature'];
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  const receivedHex = signatureHeader.slice(7);
 let bodyBuffer;
  try {
    if (Buffer.isBuffer(req.body)) {
      bodyBuffer = req.body;
    } else if (typeof req.body === 'string') {
      bodyBuffer = Buffer.from(req.body);
    } else if (req.body && typeof req.body === 'object') {
      bodyBuffer = Buffer.from(JSON.stringify(req.body));
    } else {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let expectedHex;
  try {
    expectedHex = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || '')
      .update(bodyBuffer)
      .digest('hex');
  } catch (err) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const receivedBuffer = Buffer.from(receivedHex, 'hex');
    const expectedBuffer = Buffer.from(expectedHex, 'hex');

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(bodyBuffer);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  _processedIds.add(event.id);

  res.status(200).json({ status: 'received' });

  setImmediate(() => {
    handleEvent(event);
  });
}
module.exports = { handleWebhook, _processedIds };
