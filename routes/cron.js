const express = require('express');
const router = express.Router();
const { createServiceClient } = require('../lib/supabase');
const mailer = require('../lib/newsletter-mailer');
const automation = require('../lib/automation');

// Vercel Cron이 CRON_SECRET 환경변수 값을 Authorization 헤더에 담아 호출함
function requireCronSecret(req, res, next) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// 뉴스레터 자동 발송: 매일 10시(KST)에 발송 중인 회차를 하루 한도만큼 이어서 보냄
router.get('/newsletter', requireCronSecret, async (req, res) => {
  try {
    const result = await mailer.sendScheduled(createServiceClient());
    console.log('Newsletter cron:', JSON.stringify(result));
    res.json(result);
  } catch (err) {
    console.error('Newsletter cron error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// 홈페이지 관리 자동화: 매일 9시(KST)에 오늘 해당하는 작업 실행 (lib/automation.js 참고)
router.get('/daily', requireCronSecret, async (req, res) => {
  try {
    const results = await automation.runDaily(createServiceClient());
    console.log('Automation cron:', JSON.stringify(results));
    res.json({ results });
  } catch (err) {
    console.error('Automation cron error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
