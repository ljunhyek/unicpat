-- 11월호 뉴스레터에 ipbot1.com(실시간 특허현황 조회) 소개글 추가
-- Supabase 대시보드 → SQL Editor에서 실행. 실행 후 다음 자동 발송분부터 소개글이 들어갑니다.
-- 위치: '이번 달, 확인할 세 가지' 아래, 남색 '아이디어를, 사업의 권리로.' 상자 위
-- 이미 소개글이 들어간 캠페인은 건너뛰므로 두 번 실행해도 안전합니다.
-- 실행 결과에 11월호 캠페인 1줄이 나오면 정상입니다.

update public.newsletter_campaigns
set html = replace(
  html,
  $m$<tr><td style="background:#122D3A;$m$,
  $s$<tr><td style="padding:6px 32px 34px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #C8D4D1;border-radius:8px;background:#F4F8F7;"><tr><td style="padding:24px 24px 26px;"><p style="margin:0 0 8px;font-size:13px;color:#007C78;font-weight:bold;">유니크 소식</p><h2 style="font-size:19px;line-height:1.5;margin:0 0 14px;color:#172E39;word-break:keep-all;">내 특허 연차료, 이제 회원가입 없이 바로 조회하세요</h2><p style="margin:0 0 20px;font-size:14px;line-height:1.9;color:#172E39;word-break:keep-all;overflow-wrap:break-word;">유니크 특허사무소가 만든 실시간 특허 조회 서비스 ipbot1.com을 회원가입 없이 쓸 수 있도록 새로 단장했습니다. 사업자번호나 특허고객번호만 입력하면 등록특허, 출원·공개특허, 거절특허를 한 번에 확인할 수 있습니다. 등록특허마다 연차료 납부 여부와 금액, 납부 마감일, 추가 납부·회복 가능 기간까지 현재 시점 기준으로 보여 드립니다. 특허 전문 PDF도 바로 내려받을 수 있어, 여러 건의 특허를 관리하는 중소기업과 스타트업에 특히 유용합니다.</p><a href="https://www.ipbot1.com/" target="_blank" style="display:inline-block;background:#007C78;color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:6px;">실시간 특허현황 조회하기 ↗</a></td></tr></table></td></tr>
<tr><td style="background:#122D3A;$s$
)
where subject like '%유니크 특허 인사이트 · 11월%'
  and status in ('draft', 'sending')
  and position($m$<tr><td style="background:#122D3A;$m$ in html) > 0
  and html not like '%ipbot1.com%'
returning id, subject, status;
