const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { createServiceClient } = require('../lib/supabase');
const mailer = require('../lib/newsletter-mailer');

// Resend 웹훅 서명 확인 (Svix 방식: "id.timestamp.본문"을 비밀 키로 HMAC-SHA256)
// 서명은 받은 본문 그대로 계산해야 하므로 express.json()보다 먼저 연결하고 원본(Buffer)을 받음
function verifySignature(rawBody, headers, secret) {
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signatures = headers['svix-signature'];
  if (!id || !timestamp || !signatures) return false;
  // 오래된 요청을 다시 보내는 공격 방지 (5분)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 5 * 60) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = Buffer.from(crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64'));
  // 헤더 형식: "v1,서명 v1,서명2" (키 교체 중에는 여러 개)
  return signatures.split(' ').some(part => {
    const sig = Buffer.from(part.split(',')[1] || '');
    return sig.length === expected.length && crypto.timingSafeEqual(sig, expected);
  });
}

// 반송·스팸 신고 기록: Resend 대시보드 → Webhooks에 https://www.unicpat.com/api/webhooks/resend 등록
router.post('/resend', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Resend webhook: RESEND_WEBHOOK_SECRET가 설정되지 않았습니다.');
    return res.status(500).json({ error: 'not configured' });
  }
  if (!Buffer.isBuffer(req.body)) {
    console.error('Resend webhook: 본문 원본을 받지 못했습니다.');
    return res.status(400).json({ error: 'no raw body' });
  }
  const raw = req.body.toString('utf8');
  if (!verifySignature(raw, req.headers, secret)) return res.status(401).json({ error: 'invalid signature' });

  try {
    const result = await mailer.recordEmailEvent(createServiceClient(), req.headers['svix-id'], JSON.parse(raw));
    res.json(result);
  } catch (err) {
    // 500을 돌려주면 Resend가 잠시 뒤 다시 보내 줌
    console.error('Resend webhook error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
