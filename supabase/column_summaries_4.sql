-- 유니크 칼럼 요약 4차: 2026년 11월 최신 글 3개 (서비스 키로 DB에 직접 저장함, 기록용)
-- 공개 전(summary_ready = false) 상태입니다. 관리자 → 칼럼 관리 표에서 확인 후 체크하면 게시됩니다.

update public.columns set summary_ready = false,
summary = $$이름이 비슷해 헷갈리기 쉬운 우선심사, 가출원(임시명세서 출원), 국내우선권 주장출원을 상담에서 자주 나오는 세 가지 사례로 비교했습니다.

빨리 등록받고 싶다면 우선심사(특허법 제61조)를 검토합니다. 심사청구가 되어 있고 실시 중이거나 실시 준비 중인 출원, 벤처기업 출원 등 법령상 대상에 해당해야 하며, 심사 순서만 앞당길 뿐 등록을 보장하지는 않습니다. 명세서 작성에 시간이 걸리는데 전시회나 발표가 임박했다면 임시명세서 출원(제42조의2)으로 논문·도면·기술소개서 등을 활용해 출원일부터 확보할 수 있습니다. 다만 나중에 새로 개발한 내용까지 최초 출원일의 이익을 받지는 못하고, 청구범위는 원칙적으로 출원일부터 1년 2개월 안에 내야 합니다.

출원 후 제품 구조가 개량되었다면 선출원일부터 1년 이내, 설정등록 전에 국내우선권 주장출원(제55조)으로 기존 발명과 개량발명을 하나로 묶을 수 있습니다. 이때 최초 출원에 적힌 발명은 최초 출원일을, 새로 추가한 개량발명은 후출원일을 기준으로 판단합니다. 세 제도는 개발 단계에 따라 함께 활용할 수도 있습니다.$$,
key_points = $$우선심사는 심사 순서를 앞당기는 제도로, 법령상 대상 요건과 증빙이 필요하고 등록을 보장하지 않습니다.
임시명세서 출원은 정식 명세서 없이 출원일을 먼저 확보하지만, 나중에 추가한 기술은 최초 출원일로 인정되지 않습니다.
국내우선권 주장출원은 선출원일부터 1년 이내에 기존 발명과 개량발명을 묶어 다시 출원하는 제도입니다.
국내우선권의 1년과 청구범위 제출의 1년 2개월은 서로 다른 기한이므로 따로 관리해야 합니다.$$,
checkpoint = $$출원을 서둘러야 하는지, 개량내용을 추가해야 하는지, 등록을 앞당겨야 하는지 먼저 정하고 그에 맞는 제도와 기한을 확인하세요.$$,
title_en = $$Priority Examination, Provisional Applications and Priority Claims: How Do They Differ?$$,
summary_en = $$This column compares three easily confused procedures, priority examination, provisional (temporary specification) applications and domestic priority claims, through three situations that often come up in consultations.

If you want a patent granted quickly, consider priority examination (Article 61 of the Korean Patent Act). The application must already have an examination request and fall within a category set by law, such as an invention being worked or prepared for working, or an application by a venture company. It only moves the application up in the queue and does not guarantee grant. If drafting the specification will take time but a trade show or announcement is imminent, a temporary specification application (Article 42-2) lets you secure a filing date using papers, drawings or technical presentations. However, technology developed later does not receive the original filing date, and the claims must in principle be filed within 1 year and 2 months of the filing date.

If the product structure has been improved after filing, a domestic priority claim (Article 55), filed within one year of the earlier application and before its registration, can combine the original and improved inventions in one application. Inventions described in the earlier application are judged as of the earlier filing date, while newly added improvements are judged as of the later filing date. The three procedures can also be used together depending on the development stage.$$,
key_points_en = $$Priority examination moves examination forward; it requires a statutory ground and supporting evidence and does not guarantee grant.
A temporary specification application secures a filing date without a formal specification, but technology added later does not get that date.
A domestic priority claim combines the original and improved inventions in a new application filed within one year of the earlier one.
The one-year priority period and the 1-year-2-month deadline for filing claims are separate deadlines and must be tracked separately.$$,
checkpoint_en = $$First decide whether you need to file quickly, add improvements or speed up grant, then confirm the matching procedure and its deadlines.$$
where url = 'https://blog.naver.com/unicpat/224475554171';

update public.columns set summary_ready = false,
summary = $$불사용취소심판을 청구받은 인천 지역 상표권자의 문의를 계기로, 상표 불사용취소심판의 요건 가운데 '3년'의 의미와 사용 사실의 입증책임을 정리했습니다.

상표법 제119조 제1항 제3호는 상표권자나 사용권자 누구도 정당한 이유 없이 등록상표를 지정상품에 대해 심판청구일 전 계속하여 3년 이상 국내에서 사용하지 않은 경우를 취소사유로 정합니다. 3년의 기준일은 심결일이나 청구서를 받은 날이 아니라 취소심판청구일이며, 예컨대 2026년 11월 10일에 청구했다면 2023년 11월 10일부터 2026년 11월 9일까지의 사용 여부를 봅니다. 이 기간 안에 정당한 사용이 한 번이라도 있으면 되지만, 출처 표시로서의 실제 거래상 사용이어야 하고 명목상 사용은 인정되지 않을 수 있습니다.

입증책임은 피청구인인 상표권자에게 있어, 기간 내 정당한 사용이나 사용하지 못한 정당한 이유를 증명하지 못하면 취소를 면하기 어렵습니다. 심판청구 후에 사용을 시작해도 이미 성립한 취소사유는 없어지지 않으므로, 평소 상품·광고·거래자료를 날짜와 연결해 보관해 두는 것이 중요합니다.$$,
key_points = $$3년은 심결일이 아니라 취소심판청구일을 기준으로 거슬러 올라가 계산합니다.
기간 안에 정당한 사용이 한 번이라도 있으면 되지만, 명목상 사용은 인정되지 않을 수 있습니다.
사용 사실은 상표권자(피청구인)가 언제, 어떤 상표를, 어느 상품에, 누가 사용했는지 자료로 증명해야 합니다.
심판청구 후 사용을 시작해도 청구일 전에 성립한 취소사유는 없어지지 않습니다.$$,
checkpoint = $$등록상표를 쓰고 있다면 거래일자가 드러나는 판매·광고 자료와 상표가 표시된 제품·포장 사진을 함께 보관해 두세요.$$,
title_en = $$Trademark Non-Use Cancellation: When Does the "Three Years" Start and End?$$,
summary_en = $$Prompted by an inquiry from an Incheon-based trademark owner who received a non-use cancellation action, this column explains what the "three years" requirement means and who bears the burden of proving use.

Article 119(1)(iii) of the Korean Trademark Act makes it a ground for cancellation if neither the owner nor any licensee has used the registered trademark in Korea for the designated goods, without justifiable reason, for three or more consecutive years before the date the action is filed. The reference date is the filing date of the cancellation action, not the decision date or the date the petition was received. For an action filed on 10 November 2026, use is examined from 10 November 2023 to 9 November 2026. A single genuine use within that period is enough, but it must be real commercial use that indicates the source of goods; token use may not be accepted.

The burden of proof lies with the trademark owner as respondent. Without proof of genuine use during the period, or a justifiable reason for non-use, cancellation is hard to avoid. Starting use after the action is filed does not remove a ground that already existed, so it is important to keep product, advertising and transaction records linked to their dates.$$,
key_points_en = $$The three years are counted back from the filing date of the cancellation action, not the decision date.
One genuine use within the period is enough, but token use may not be recognized.
The owner (respondent) must prove with evidence when, which mark, on which goods and by whom the mark was used.
Starting use after the action is filed does not remove a ground for cancellation that existed before filing.$$,
checkpoint_en = $$If you use a registered trademark, keep dated sales and advertising records together with photos of products and packaging bearing the mark.$$
where url = 'https://blog.naver.com/unicpat/224464668506';

update public.columns set summary_ready = false,
summary = $$특허 등록결정을 받은 뒤 특허료를 내기 전에, 개발 과정에서 바뀐 최종 제품이 특허결정된 청구항으로 보호되는지 확인해야 하는 이유를 정리했습니다.

특허권은 설정등록으로 발생하고(특허법 제87조), 이후 등록공고로 명세서와 도면이 공개됩니다. 이렇게 공개된 본인의 특허공보도 나중에 출원하는 개량발명의 선행기술이 되어 진보성 거절이유로 쓰일 수 있습니다. 출원인이 같다는 이유로 배제되지 않고, 법률에 따른 공개는 공지예외 대상도 아닙니다.

보호범위는 청구범위에 적힌 사항으로 정해지므로(제97조), 청구항의 구성요소와 결합관계가 제품에 그대로 있는지, 빠지거나 바뀐 구성이 있는지 비교해야 합니다. 최종 제품이 청구항 범위를 벗어난다면, 최초 명세서에 기재된 구조는 결정 등본을 받은 날부터 3개월 이내이자 설정등록 전에 분할출원을 검토하고, 새로운 개량내용은 별도 신규 출원이나 국내우선권 주장출원을 검토합니다. 후속 출원이 필요하면 납부기한 안에서 후속 출원을 먼저 마친 뒤 기존 출원의 특허료를 내는 순서를 고려할 수 있습니다.$$,
key_points = $$등록결정을 받았다고 개량된 최종 제품까지 자동으로 보호되는 것은 아닙니다.
등록공고된 본인의 특허도 후속 개량발명의 진보성을 부정하는 선행기술이 될 수 있습니다.
청구항의 구성요소와 결합관계를 최종 제품의 실제 구성과 하나씩 비교해야 합니다.
분할출원은 결정 등본 수령 후 3개월 이내이면서 설정등록 전에 해야 합니다.$$,
checkpoint = $$특허료를 내기 전에 최종 제품과 청구항을 비교하고, 추가 출원이 필요하면 후속 출원을 먼저 마친 뒤 납부기한 안에 특허료를 내세요.$$,
title_en = $$After a Decision to Grant, Compare Your Product with the Claims Before Paying the Patent Fee$$,
summary_en = $$This column explains why, after receiving a decision to grant and before paying the registration fee, you should check whether the final product, which may have changed during development, is still covered by the allowed claims.

A patent right arises upon registration (Article 87 of the Korean Patent Act), and the specification and drawings are then published in the registration gazette. Your own published patent can then serve as prior art against an improvement invention you file later and be cited for lack of inventive step. Having the same applicant does not exclude it, and statutory publications are not covered by the grace period for self-disclosure.

Because the scope of protection is defined by the claims (Article 97), you need to compare whether the claim elements and their relationships are present in the product and whether any element has been removed or replaced. If the final product falls outside the claims, a structure already described in the original specification can be pursued through a divisional application, filed within three months of receiving the decision and before registration, while new improvements call for a new application or a domestic priority claim. If a follow-up application is needed, consider filing it first and then paying the fee for the original application within the payment deadline.$$,
key_points_en = $$A decision to grant does not automatically protect an improved final product.
Your own published patent can be prior art that defeats the inventive step of a later improvement.
Compare each claim element and its relationships with the actual configuration of the final product.
A divisional application must be filed within three months of receiving the decision and before registration.$$,
checkpoint_en = $$Before paying the patent fee, compare the final product with the claims; if more filings are needed, file them first and then pay the fee within the deadline.$$
where url = 'https://blog.naver.com/unicpat/224461162193';
