# Miri Look Service Environment Runbook

> 기준일: 2026-06-25

## 원칙

미리룩은 서비스별 전용 프로젝트와 전용 키를 우선 사용한다.
기존 다른 프로젝트 키는 자동 생성이나 신규 발급이 막힌 경우에만 임시로 사용하고,
실제 고객 데이터가 들어가기 전에는 반드시 미리룩 전용 키로 교체한다.

## 현재 환경변수 상태

Vercel production 프로젝트 `mirilook`에 다음 계열 키를 연결한다.

- OpenAI 이미지/추천 키
- Gemini 이미지 키
- Resend API 키
- Resend 발신자 주소
- Trigger.dev secret key
- Trigger.dev project ref
- PortOne store/channel/API secret/webhook secret

Supabase는 타 프로젝트 DB와 섞이면 고객 히스토리와 얼굴 이미지가 오염될 수 있으므로,
기존 Claude Cowork 키를 복사하지 않는다. `SUPABASE_ACCESS_TOKEN` 또는 `supabase login`
후 미리룩 전용 Supabase 프로젝트를 만든 다음 연결한다.

## Supabase 전용 프로젝트 생성 절차

```bash
npx supabase login
npx supabase orgs list
npx supabase projects create mirilook --org-id <org-id> --db-password <strong-password> --region ap-northeast-2 --size nano
npx supabase projects api-keys --project-ref <project-ref>
```

Vercel production에 추가할 키:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_NAVER_OAUTH_PROVIDER=custom:naver
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_CONSULTATION_BUCKET=mirilook-consultations
```

Supabase Auth:

- Email/password provider를 켠다.
- Google OAuth provider를 켜고 production redirect URL에 `https://mirilook.com/login`을 추가한다.
- Kakao OAuth provider를 켜고 같은 redirect URL을 등록한다.
- Naver는 Supabase custom OIDC/OAuth provider를 `custom:naver` 이름으로 만든다. 다른 provider id를 쓰면 `NEXT_PUBLIC_NAVER_OAUTH_PROVIDER` 값을 함께 바꾼다.

DB migration:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## 교체 기준

- 파일럿 테스트 전: 기존 Resend/Trigger/PortOne 키 임시 사용 가능
- 고객 얼굴 사진 서버 저장 전: Supabase는 반드시 미리룩 전용 프로젝트 사용
- 결제 테스트 전: PortOne은 미리룩 전용 상점/채널/API secret/webhook secret으로 교체
- 이메일 발송 전: Resend는 미리룩 전용 domain/sender로 교체하고 `RESEND_FROM_EMAIL`을 검증된 발신 주소로 설정
- 장기 작업 큐 전: Trigger.dev는 미리룩 전용 project/env로 교체

Trigger.dev 연결 시 추가할 키:

```bash
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_REF=
TRIGGER_API_BASE_URL=https://api.trigger.dev
```

리서치 agent 자동화에는 OpenAI API key가 필요하다. 모델을 고정하고 싶으면
`OPENAI_RESEARCH_MODEL`을 함께 설정한다. 미설정 시 코드는 `gpt-4.1-mini`를 사용한다.

```bash
OPENAI_API_KEY=
OPENAI_RESEARCH_MODEL=gpt-4.1-mini
```

Web Push 연결 시 추가할 키:

```bash
NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:hello@mirilook.com
```

지도 임베드 연결 시 추가할 키:

```bash
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=
```

연예인 헤어 레퍼런스용 Google 이미지 검색을 사이트 안에서 제공하려면 Google
Custom Search JSON API와 이미지 검색이 가능한 검색 엔진 ID를 연결한다. 이 값이
없어도 고객은 직접 업로드, 스크린샷 업로드, 이미지 URL 붙여넣기로 레퍼런스를
추가할 수 있다.

```bash
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=
```

`NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`는 브라우저 구독에 필요한 공개키이며,
`WEB_PUSH_PRIVATE_KEY`는 서버 발송 전용 secret이다. 실패한 알림 이벤트는 관리자
화면에서 다시 `queued` 상태로 바꾸면 재발송 대상에 포함된다.

현재 코드에는 `POST /api/consultations/jobs`와
`mirilook-generate-consultation` task 골격이 준비되어 있다. Supabase Storage에
원본/선택 스타일 이미지가 저장된 뒤에는 이 task로 9장 최종 생성 작업을 넘겨
Vercel 함수 시간 제한과 브라우저 대기 시간을 줄인다. Push 알림은
`mirilook-dispatch-notifications` 수동 dispatch task와
`mirilook-scheduled-dispatch-notifications` 5분 주기 production schedule task를 함께 둔다.
리서치 자동화는 `mirilook-monthly-research-queue-scheduled` production schedule task가
매월 1일 04:15 Asia/Seoul에 국가/성별 묶음별 공개 트렌드 근거를 조사해
`regional_trend_sources`와 `regional_style_priorities`를 갱신한다.

앱 런타임은 Trigger REST API를 직접 호출한다. `@trigger.dev/sdk`는 task 정의와
Trigger 배포용 devDependency로만 둔다.

## 파일럿 확장 라우트

- `/`: 한국 서비스 기준으로 고정된 남성/여성 선택, 사진 업로드, 선호 입력, AI 추천/생성 메인 플로우
- `/login`: 이메일 회원가입/로그인, Google/Kakao/Naver SNS 로그인 화면
- `/history`: 브라우저에 저장된 고객 상담 히스토리 관리, PDF 저장, 이미지별 저장, 공유 링크 생성, 삭제 화면
- `/admin`: 보호된 운영 화면. Supabase 연결 시 상담 세션, 예약 문의, 리뷰, 투표 글, 결제 이벤트, 공유 링크, Push 구독, 알림 이벤트 최근 항목과 카운트를 표시
- `/salons`: 미용실/디자이너 입점, 외부 지도 검색 링크, Kakao/Google 지도 임베드 fallback, 디자이너별 예약 가능 시간표, 예약 문의, 파일럿 리뷰 접수 화면
- `/community`: 인스타그램형 사진 커뮤니티, 회원 ID 검색, 해시태그, 좋아요/싫어요, 공유, DM 파일럿 화면
- `/votes`: 익명 스타일 투표, 댓글, DM 허용/비허용 정책 파일럿 화면
- `POST /api/hairstyles/recommend`: 로그인된 고객의 사진 2~3장, 성별 모드, 추천 기준, 선호 스타일/컬러/메모를 받아 9개 추천 후보를 생성한다. Hair Money 원장이 연결되어 있으면 추천 1회당 고지된 H머니를 차감하며, `requestId` 기준으로 재전송 중복 차감을 방지한다. AI 추천 생성이 실패해 fallback 추천으로 내려가는 경우에도 H머니 환불은 자동 처리하지 않으며, 고객지원 접수 후 회사 귀책 또는 법령상 환불 사유를 검토한다.
  업로드 슬롯은 `photoContext`로 함께 전달한다. 서버는 좌측면, 정면, 우측면 중 어떤 사진이 1번 기준 이미지인지와 실제 정면 사진 유무를 OpenAI 프롬프트에 명시해, 정면이 없는 케이스를 정면처럼 오판하지 않도록 한다.
- `GET /share/[token]`: 미용사/지인에게 전달할 만료형 상담 보드 공유 화면. PDF 저장, 링크 공유/복사, 이미지별 저장을 제공한다.
- `DELETE /api/consultations`: Supabase 연결 시 상담 세션, 결과 asset row, Storage 이미지를 삭제하고 공유 링크를 cascade 정리
- `POST /api/consultations/share`: Supabase 연결 시 `consultation_shares` 토큰 생성 및 공유 URL 발급. 같은 상담 결과에 만료되지 않은 활성 링크가 있으면 새 토큰을 만들지 않고 기존 토큰을 재사용하며, 만료일이 더 짧게 남아 있으면 같은 토큰의 `expires_at`을 최신 요청 기준으로 갱신한다.
- `POST /api/consultations/email`: 로그인된 고객의 상담 결과를 Resend로 전송한다. 저장된 상담 세션이면 공유 링크를 자동 생성 또는 재사용해 이메일에 포함하고 `consultation_email_events`에 성공/실패를 기록한다.
- `POST /api/consultations/jobs`: Trigger.dev 연결 시 저장된 상담 asset 기반으로 장시간 이미지 생성 작업 enqueue
- `POST /api/salons/applications`: Supabase 연결 시 `salon_applications`에 미용실/디자이너 입점 신청 저장 후 운영 알림 queue
- `POST /api/salons/booking-requests`: Supabase 연결 시 `booking_requests`에 예약 문의 저장 후 운영 알림 queue
- `POST /api/salons/reviews`: Supabase 연결 시 `reviews`에 공개 전 `pending` 상태의 살롱/디자이너 리뷰 저장 후 운영 알림 queue
- `POST /api/community/vote-requests`: Supabase 연결 시 `community_posts`에 투표 요청 저장
- `POST /api/community/votes`: 공개된 커뮤니티 투표 글에 익명 투표와 짧은 의견 저장
- `POST /api/community/comments`: 커뮤니티 댓글을 `pending` 상태로 저장하고 관리자 승인 후 공개
- `POST /api/community/messages`: DM 허용 게시글에 한해 메시지 전달 요청을 `pending` 상태로 저장
- `POST /api/community/social-posts`: 사진 커뮤니티 게시물, 이미지, 해시태그, DM 허용 정책 저장
- `POST /api/community/social-reactions`: 사진 커뮤니티 게시물의 좋아요/싫어요 반응 저장
- `POST /api/community/social-shares`: 사진 커뮤니티 게시물의 native share 또는 링크 복사 이벤트 저장
- `POST /api/community/social-messages`: 사진 커뮤니티 DM 요청을 `pending` 상태로 저장
- `POST /api/moderation/reports`: 투표 커뮤니티, 사진 커뮤니티, 리뷰, 공유 링크, 상담 결과에 대한 신고/삭제 요청을 `moderation_events`에 저장
- `POST /api/support/cases`: 생성 실패, 환불 요청, 결제 오류, 계정/일반 문의를 `support_cases`에 저장하고 운영 알림 queue
- `POST /api/notifications/subscriptions`: Supabase 연결 시 Web Push 구독을 `push_subscriptions`에 저장
- `DELETE /api/notifications/subscriptions`: 해당 브라우저의 Web Push 구독을 `revoked`로 변경
- `POST /api/admin/status`: Basic Auth 보호 하에 예약, 리뷰, 커뮤니티 글, 공유 링크, Push 구독, 알림 이벤트, 신고/삭제 요청, 고객지원 문의 상태 변경. `support_cases`의 `refunded` 처리는 추천 요청 ID가 있는 건에 한해 H머니 원장 환급 RPC를 실행
- `POST /api/admin/notifications`: Basic Auth 보호 하에 notification event queue, 동기 dispatch, Trigger dispatch enqueue 실행
- `GET /api/admin/research/trends`: 리서치 agent가 참고할 국가/지역별 기본 트렌드 brief 조회
- `POST /api/admin/research/trends`: 웹 검색, Instagram, YouTube, 지역 살롱 메뉴 등에서 확인한 트렌드 source와 국가/성별별 style priority 저장. `ensure_monthly_queue`는 큐를 만들고, `run_monthly_research`는 선택 국가의 자동 리서치를 즉시 실행
- `POST /api/payments/checkout`: 로그인된 사용자에게만 PortOne 브라우저 SDK에 전달할 결제 요청 정보 생성
- `POST /api/payments/complete`: 클라이언트 결제 반환 후 PortOne 서버 조회로 결제 상태/금액/통화를 검증하고 `payment_events`에 저장
- `GET /api/payments/entitlements`: 로그인 사용자의 결제 기반 `premium_addons`, `vote_boost`, `salon_pack` 권한 조회
- `POST /api/payments/webhook`: PortOne V2 웹훅 raw body와 `webhook-id`, `webhook-signature`, `webhook-timestamp` 헤더를 검증한 뒤 결제 이벤트를 저장

PortOne dashboard에서 웹훅 URL은 production 기준으로 다음 값을 등록한다.

```text
https://mirilook.com/api/payments/webhook
```

커스텀 도메인 런칭 후에는 같은 경로를 공식 도메인으로 교체한다.

결제는 계정 권한과 반드시 연결되어야 하므로 `/api/payments/checkout`과
`/api/payments/complete` 모두 Supabase access token을 요구한다. 비로그인 상태에서는
브라우저 결제창을 열지 않고 `/login` CTA를 먼저 보여준다.

## 지도와 입점 운영

초기 `/salons` 지도는 별도 지도 API 키 없이 좌표 기반 지도 미리보기와 네이버 지도
검색 링크를 함께 연결한다. `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`가 있으면 Kakao Maps JS
SDK를 우선 사용하고, 없지만 `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`가 있으면 Google
Maps Embed iframe을 사용한다. 둘 다 없으면 OpenStreetMap 좌표 미리보기로 fallback한다.
모든 방식은 `pilotSalons` 또는 `salons` row의 `latitude`, `longitude` 값을 기준으로
표시한다.

공개 목록은 `salons.profile_status`와 `designers.booking_status`가 `pilot`,
`approved`, `active`인 항목만 노출한다. 다른 상태의 파트너는 고객 화면, 예약
문의, 리뷰 접수 대상에서 제외한다.

리뷰는 즉시 공개하지 않고 `reviews.status = pending`으로 저장한다. 관리자 화면에서
승인/숨김 액션이 붙기 전까지는 파일럿 카드의 정적 리뷰 요약만 노출한다.

`/salons`는 Supabase가 연결되지 않으면 정적 파일럿 데이터를 사용하고, 연결되면
`salons`와 `designers` 테이블을 우선 읽는다. `202606250007_marketplace_profiles_seed.sql`
및 `202606270002_salon_booking_windows.sql` migration은 파일럿 살롱/디자이너 seed,
화면 표시용 profile column, 디자이너별 `service_menu`, `portfolio_items`,
`booking_windows`, 예약 문의의 `preferred_slot_id`, `consultation_board_url`를 포함한다.

입점 신청은 `salon_applications`에 먼저 저장한다. 운영자는 `/admin`에서 신규 신청을 확인하고
`new -> contacted -> approved/rejected` 상태로 처리한다. 승인 후 실제 노출할 파트너는
`salons`와 `designers` 테이블에 별도로 반영한다.

입점 신청, 예약 문의, 리뷰가 저장되면 각각 `salon_application`,
`salon_booking_request`, `salon_review` `notification_events`를 queue한다. Trigger
dispatch 또는 관리자 알림 발송 API를 통해 운영자 브라우저 push로 전환할 수 있다.

관리자 API는 `/admin`과 같은 Basic Auth matcher로 1차 보호하고, 각
`/api/admin/*` 라우트 내부에서도 `MIRILOOK_ADMIN_USER` /
`MIRILOOK_ADMIN_PASSWORD`를 다시 확인한다. Production에서
`MIRILOOK_ADMIN_PASSWORD`가 없으면 `/admin`과 `/api/admin/*`가 모두 503으로 닫힌다.
이는 안전한 기본값이지만 운영자가 관리자 화면을 쓰려면 Vercel Production 환경변수에
반드시 관리자 비밀번호를 설정해야 한다.

## 커뮤니티 / 투표 / DM 운영

`/community`는 인스타그램형 사진 커뮤니티 주소로 고정한다. Supabase 연결 전에는
파일럿 예시 피드를 보여주고, 연결 후에는 회원 사진 게시물, 회원 ID 검색,
해시태그, 좋아요/싫어요, 공유, DM 요청을 처리한다. 공유 버튼은
`social_shares`에 native share 또는 링크 복사 이벤트를 남기고, 피드 정렬과 관리자
사진 피드 지표에 반영한다.

사진 커뮤니티 반응은 게시물당 1인 1반응에 가깝게 운영한다. 로그인 회원은
`profile_id`, 비로그인 방문자는 브라우저 `session_key` 기준으로 기존 반응을
업데이트한다. 같은 사용자가 좋아요에서 싫어요로 바꾸면 새 반응을 추가하지 않고
기존 row의 `reaction_type`을 바꾸며, API는 최종 좋아요/싫어요 집계치를 반환한다.

사진 게시물은 카드 단위로 신고할 수 있다. 신고 대상은 `target_type = social_post`로
`moderation_events`에 저장되며, 관리자 화면의 신고/삭제 섹션과 운영 알림 큐에서
확인한다. 관리자 화면에서 신고를 `처리 완료`로 바꾸면 숨김 처리 가능한 대상은
실제 원본도 함께 숨긴다. `social_post`, `community_post`, `community_comment`,
`community_message`, `style_vote`, `review`는 `status = hidden`으로 바꾸고,
공유 링크는 `revoked_at`을 기록한다. `기각`은 신고만 닫고 원본 노출 상태를 유지한다.

`/votes`는 스타일 투표 주소로 고정한다. Supabase 연결 전에는 파일럿 투표 피드를
보여주고, 연결 후에는 `community_posts.status = published`인 투표 글을 읽고,
`style_votes`와 `community_comments` 집계치를 함께 표시한다.

투표 요청은 요청자 성별에 따라 `target_gender`를 자동 저장한다. 남성 요청은 여성 대상,
여성 요청은 남성 대상, 기타/비공개 요청은 전체 대상으로 둔다. 투표, 댓글, DM은
`community_posts.status = published`인 글에만 허용한다. 투표는 투표자가 선택한
`voter_gender`가 대상 성별과 맞을 때만 즉시 `style_votes.status = published`로 저장해
집계에 반영한다. 댓글은
`community_comments.status = pending`으로 저장하고 `/admin`에서 공개/숨김 처리한다.
DM 요청은 게시글의 `dm_policy = allow`일 때만 `community_messages`에 저장되며, 관리자
화면에서 전달 완료 또는 숨김으로 처리한다. 투표 요청, 투표, 댓글, DM 요청은 각각
`notification_events`에 queued event를 남겨 Trigger 작업 또는 관리자 dispatch API가
Push로 발송할 수 있게 한다.

## Global Region Strategy

Korea 버전을 먼저 론칭 가능한 수준으로 완성한 뒤, 같은 코드 구조로 China, Japan,
America, Europe 버전을 확장한다. 현재 메인 플로우에는 국가/지역 선택값이 추가되어
추천 API, 미리보기 이미지, 최종 상담용 9장 이미지, 히스토리, 이메일 export에 반영된다.

리서치 agent는 각 지역의 웹 검색, Instagram, YouTube, 지역 살롱 메뉴, 인플루언서
자료를 월 1회 조사해 국가, 성별, 내부 세대별 cache를 업데이트한다. 고객에게 실제
나이대를 선택하게 하지는 않는다. 추천 엔진은 사진에서 보이는 인상, 얼굴형, 두상, 현재
기장 적합성을 먼저 보고, 리서치 cache는 동률 후보의 우선순위와 다양성 조정에 사용한다.

운영 흐름은 다음 순서로 둔다.

1. 리서치 agent가 국가/성별/내부 세대별 단위로 웹 검색, Instagram, YouTube, 지역 살롱 메뉴, 현지 인플루언서 콘텐츠를 월 1회 조사한다.
2. Trigger schedule은 전체 국가/성별 묶음을 자동 조사하고, `/admin`의 자동 리서치 실행 버튼은 선택 국가의 남성/여성 묶음을 즉시 갱신한다.
3. 운영자는 리서치 트렌드 입력 화면에서 조사 큐와 저장된 근거를 확인하고, 필요한 경우 근거 source URL, platform, 요약, 관측된 style id, confidence, `priorities[]`를 수동 보정한다.
4. 고객이 국가와 남성/여성을 선택해 추천을 받으면, 추천 API가 Supabase priority와 verified/active source 요약을 우선 읽고 없으면 `mirilook-regions` 기본 seed와 리서치 큐 brief로 fallback한다.
5. 추천 결과는 안정적으로 잘 어울리는 7개와, 첫인상은 낯설 수 있으나 사진상 인상과 트렌드 근거상 어울릴 수 있는 도전형 2개로 구성한다.
6. 리서치 trend는 고객 얼굴형, 두상, 사진상 인상, 현재 기장, 선호 입력을 이길 수 없고, 적합한 후보가 여러 개일 때 우선순위와 다양성 조정에 사용한다.
7. Instagram, YouTube 등 외부 플랫폼은 무단 스크래핑하지 않는다. 정식 API, 검색 API, 수동 검증, 또는 운영자가 확인한 공개 URL만 저장한다.

## 고객지원 / 환불 운영

생성 실패, 환불 요청, 결제 오류, 계정/일반 문의는 `/refund`의 접수 폼 또는
`POST /api/support/cases`로 `support_cases`에 저장한다. 접수 시 `support_case`
notification event를 queue하고, `/admin`의 최근 고객지원 문의 섹션에 노출한다.

운영 상태는 `new -> reviewing -> waiting_customer -> resolved/dismissed` 흐름으로 둔다.
추천 생성 실패처럼 회사 귀책 또는 법령상 환급 검토 대상인 건은 고객 계정과 추천
`request_id`가 확인되어야 H머니 자동 환급을 실행한다. 운영자가 `/admin`에서
`H머니 환급`을 누르면 `refund_hair_money` RPC가 `hair_money_ledger.direction = refund`
원장을 만들고, 같은 `support_case`는 `refunded`로 닫힌다. 결제수단 원복이 필요한
현금성 환불은 PortOne/카드사 정책에 따라 별도 외부 취소 후 `resolved`로 닫는다.

## PWA / Push

`manifest.webmanifest`와 `sw.js`가 준비되어 있어 모바일 홈 화면 추가와 Web Push 구독 등록을
시작할 수 있다. Vercel에는 다음 값을 설정한다.

```bash
NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:hello@mirilook.com
```

현재 구현 범위는 브라우저 push subscription 저장/해제, `notification_events` queue, 관리자
운영 화면의 Push/알림 상태 관리, 관리자 dispatch API, Trigger.dev
`mirilook-dispatch-notifications` 작업, production 5분 주기
`mirilook-scheduled-dispatch-notifications` 작업이다. 결제 확인, 살롱 입점/예약/리뷰,
커뮤니티 투표, 댓글, DM 요청은 notification event를 큐에 쌓고, Trigger 작업 또는
관리자 API가 queued event를 active push subscription으로 발송한다. 즉시 비동기 발송이
필요하면 `/api/admin/notifications`에 `{ "action": "trigger_dispatch", "limit": 20 }`을
POST한다.

알림 발송은 기본적으로 대상 스코프가 필요하다. `notification_events`는
`subscription_id`, `target_profile_id`, 또는 운영자가 명시한 `broadcast_all = true` 중
하나가 있을 때만 실제 구독을 조회한다. 대상이 없는 이벤트는 dispatch 시
`missing_notification_target`으로 실패 처리해 고객 전체에게 잘못 발송되는 일을 막는다.
로그인 고객의 브라우저 push 구독은 `push_subscriptions.profile_id`에 연결되며, 결제,
투표, 댓글, DM 알림은 해당 `profile_id`의 active subscription으로만 발송한다.

## Payment Entitlements

`premium-style-report`는 코디/메이크업 확장 상담 권한인 `premium_addons`를 부여한다.
`vote-boost-*`는 `vote_boost`, `salon-premium-pack`은 `salon_pack` 권한을 부여한다.
권한은 `payment_events.profile_id + entitlement + entitlement_expires_at` 기준으로 조회하며,
PortOne 검증이 성공한 `verified = true` 결제만 활성 권한으로 인정한다.

메인 추천 화면의 프리미엄 확장 패널은 `GET /api/payments/entitlements` 결과에 따라
`premium_addons`가 없으면 코디/메이크업 확장 선택을 잠그고, `premium-style-report`
PortOne 결제 CTA만 노출한다. 결제 완료 후 `/api/payments/complete`가 계정 권한을
저장하면 클라이언트가 권한을 다시 조회해 확장 상담 버튼을 즉시 활성화한다.
서버도 `POST /api/hairstyles/recommend`에 `premiumAddOns`가 포함되면 같은 권한을
다시 확인하며, 인증 또는 활성 권한이 없으면 추천 생성 전에 401/402 계열 응답으로
차단한다.

H머니 추천 차감은 `spend_hair_money`로 처리한다. AI 추천 provider 장애나 서버 예외로
fallback 응답이 내려가더라도 H머니 환불은 자동 처리하지 않는다. 환불 검토가 필요한
건은 고객지원으로 접수받아 결제/사용 이력, 회사 귀책 여부, 법령상 환불 사유를 확인한
뒤 운영자가 별도 처리한다.
