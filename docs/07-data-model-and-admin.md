# Miri Look Data Model And Admin Plan

> 기준일: 2026-06-24

## Purpose

고객 화면과 관리자 화면을 분리하고, 이후 Supabase 연결 시 필요한 핵심 데이터 단위를 고정한다.

## Phase 1 Storage Boundary

현재 파일럿 웹은 서버 DB 저장 없이 AI 생성 흐름을 검증한다.

- 고객 사진은 AI 요청에만 사용한다.
- 정식 히스토리와 공유 링크는 Supabase Storage 도입 후 연결한다. 삭제 요청 관리는 관리자 운영 목록으로 확장한다.
- 관리자 화면은 `/admin`으로 분리하되, 초기에는 운영 구조를 보여주는 shell 상태로 둔다.

## Core Tables

### profiles

- id
- email
- display_name
- avatar_url
- provider
- created_at
- updated_at

고객용 웹에서는 실제 나이대와 국가 선택을 묻지 않는다. 현재 한국 버전은 region을 `korea`로
고정하고, 글로벌 확장 시 국가 선택 UI를 다시 노출한다. 로그인은 Supabase Auth를 사용하며
Google/Kakao는 기본 OAuth provider, Naver는 `custom:naver` custom provider로 연결한다.

### generation_sessions

- id
- profile_id
- status
- uploaded_count
- region_name
- selected_style_id
- selected_hair_color_id
- style_memo
- final_image_provider
- created_at
- completed_at

### generation_assets

- id
- session_id
- asset_type: original | preview | final_angle | report
- angle_label
- storage_path
- provider
- model
- status
- error_message
- created_at

### hairstyle_recommendations

- id
- session_id
- style_id
- rank
- reason
- tags
- suitability_score
- salon_process
- caution

### hair_money_accounts

- profile_id
- balance
- total_purchased
- total_spent
- created_at
- updated_at

### hair_money_ledger

- id
- profile_id
- direction: credit | debit | refund | adjustment
- amount
- balance_after
- source_type
- source_id
- reason
- metadata
- created_at

### support_cases

- id
- profile_id
- case_type: generation_failure | refund_request | payment_issue | account_issue | general_inquiry
- status: new | reviewing | waiting_customer | resolved | dismissed | refunded
- priority: low | normal | high | urgent
- contact_email
- contact_phone
- subject
- body
- source_type
- source_id
- payment_id
- request_id
- refund_amount_hm
- resolution_note
- metadata
- resolved_at
- refunded_at
- created_at
- updated_at

### consultation_shares

- token
- session_id
- expires_at
- revoked_at
- created_at

### consultation_email_events

- id
- session_id
- profile_id
- recipient_email
- resend_email_id
- share_token
- status: pending | sent | failed
- error_message
- created_at
- updated_at

### regional_trend_sources

- id
- region_id: korea | china | japan | america | europe
- audience: male | female
- age_group: all | teen | 20s | 30s | 40s | 50s | 60s | 70plus
- research_month
- platform: web | instagram | youtube | salon-menu | influencer | manual-research
- source_url
- title
- summary
- target_persona
- metrics: search, instagram, youtube, share, algorithmic exposure 등 proxy 지표
- observed_style_ids
- confidence
- status: candidate | verified | active
- researched_at
- created_at

### regional_style_priorities

- id
- region_id
- audience
- age_group
- research_month
- style_id
- priority_rank
- recommendation_bucket: core | challenge
- score
- rationale
- source_ids
- status: active | hidden

### push_subscriptions

- id
- endpoint
- p256dh
- auth
- contact
- consent_context
- user_agent
- status: active | revoked | disabled
- created_at
- updated_at

### notification_events

- id
- subscription_id
- event_type
- title
- body
- url
- payload
- status: queued | sent | failed | cancelled
- created_at
- sent_at
- updated_at
- created_at

### salons

- id
- name
- address
- latitude
- longitude
- phone
- description
- tags
- rating
- review_count
- visit_tip
- hero_image_path
- profile_status
- created_at

### designers

- id
- salon_id
- name
- specialties
- profile_image_path
- bio
- rating
- review_count
- booking_status
- service_menu
- portfolio_items
- booking_windows
- created_at

### salon_applications

- id
- applicant_type: salon | designer | both
- salon_name
- designer_name
- contact_name
- contact
- address
- specialties
- profile_url
- memo
- status: new | contacted | approved | rejected
- created_at
- updated_at

### reviews

- id
- salon_id
- designer_id
- profile_id
- rating
- body
- visitor_name
- contact
- status
- created_at

### community_posts

- id
- profile_id
- anonymous_name
- post_type: discussion | vote | before_after
- body
- visibility
- dm_policy
- requester_gender
- target_gender
- status
- created_at

### style_votes

- id
- post_id
- voter_profile_id
- selected_asset_id
- selected_style_id
- voter_gender
- tags
- comment
- status
- created_at

### community_comments

- id
- post_id
- anonymous_name
- body
- status: pending | published | hidden
- created_at

### community_messages

- id
- post_id
- sender_name
- contact
- body
- status: pending | delivered | hidden
- created_at

### moderation_events

- id
- target_type
- target_id
- reporter_profile_id
- reason
- action
- created_at

## Admin Screens

### MVP Admin Shell

- AI 생성 모니터링
- 고객 히스토리
- 미용실/디자이너 입점 관리
- 신고/운영 정책

### Launch Admin

- 생성 요청 목록
- 실패 요청 재시도
- 사용자 삭제 요청 처리
- 공유 링크 비활성화
- 신고/댓글 숨김
- 미용실/디자이너 승인

## Privacy Rules

- 원본 얼굴 사진과 생성 결과는 고객 소유 데이터로 취급한다.
- 공유 링크, 커뮤니티 공개, 미용사 전달은 각각 별도 동의가 필요하다.
- 삭제 요청 시 원본, preview, final, report asset을 모두 삭제한다.
- 고객 히스토리 화면의 삭제 동작은 브라우저 IndexedDB 항목을 삭제하고, Supabase 연결 시
  `DELETE /api/consultations`를 통해 `generation_sessions`와 Storage 결과 이미지를 함께 삭제한다.
- 고객이 생성한 공유 링크는 `/history`에서 회수할 수 있으며, 회수 시
  `DELETE /api/consultations/share`가 `consultation_shares.revoked_at`을 기록해 기존
  `/share/[token]` 열람을 차단한다.
- 상담 결과 이메일 발송 시 저장된 상담 세션이면 `/share/[token]` 링크를 자동 생성 또는
  재사용해 이메일 본문에 포함하고, Resend 발송 결과를 `consultation_email_events`에 기록한다.
- 추천 요청은 클라이언트가 보낸 `requestId`를 H머니 원장 `source_id`로 사용한다. 같은 요청이
  네트워크 재시도로 재전송되면 `already_applied`로 감지해 중복 차감하지 않고 추천 흐름을 계속한다.
- 관리자 화면은 public route로 노출하지 않고 auth guard를 붙인다.

## Global Versioning

1차 론칭은 Korea 버전으로 완성한다. 이후 같은 웹/앱 구조를 China, Japan,
America, Europe 버전으로 확장한다. 고객 플로우는 `국가/지역 선택 -> 남성/여성
선택 -> 사진 업로드 -> 선호 입력 -> 추천/생성` 순서로 둔다.

국가별 선호 스타일은 `mirilook-regions`의 priority seed로 시작하고, 리서치 agent가
웹 검색, Instagram, YouTube, 지역 살롱 메뉴, 인플루언서 자료를 조사해 주기적으로
업데이트한다. 추천 엔진은 고객의 얼굴/두상 적합성을 1순위로 두되, 동률일 때 지역별
트렌드 priority를 우선 반영한다.

## Research Agent Trend Loop

리서치 agent는 국가/지역/성별/내부 세대별로 사람들이 선호하는 헤어스타일을 월 1회 조사하고, 근거와 우선순위를
`regional_trend_sources`와 `regional_style_priorities`에 저장한다. production schedule은
`mirilook-monthly-research-queue-scheduled`이며, 관리자 화면에서는 선택 국가에 대해
`POST /api/admin/research/trends`의 `run_monthly_research` action으로 즉시 실행할 수 있다.
이 API는 `/api/admin/*` 보호 정책을 따르므로 production에서는 관리자 비밀번호 설정 후에만 사용할 수 있다.

추천 API는 `regional_style_priorities`에서 `region_id + audience + age_group + active` 우선순위를
먼저 읽고, `regional_trend_sources`의 verified/active source 요약을 추천 프롬프트에 함께
넣는다. 고객에게 실제 나이대를 묻지는 않으며, 기본 추천은 전체 세대 cache와 사진상 인상
분석을 함께 사용한다. Supabase가 없거나 해당 국가/성별의 검증 priority가 없으면
`mirilook-regions` 기본 seed와 리서치 agent 조사 큐 brief로 fallback한다. 추천 기준의
우선순위는 `개인 얼굴/두상 적합성 -> 사진상 인상 -> 고객 선호 입력 -> 국가별/세대별 트렌드
priority -> 다양성` 순서다. 결과는 core 7개와 challenge 2개를 목표로 한다.

관리자 화면의 리서치 트렌드 입력 섹션은 국가/성별/내부 세대별 조사 큐를 보여준다. 웹 검색,
Instagram, YouTube, 현지 살롱 메뉴, 인플루언서 자료에서 반복 등장하는 스타일만 source로
저장하고, 외부 플랫폼은 정식 API나 수동 검증 URL 기준으로 운영한다.

## Support And Refund Operations

생성 실패, 환불 요청, 결제 문제, 계정/일반 문의는 `support_cases`에 저장한다. 고객은
`/refund` 접수 폼을 통해 문의를 만들 수 있고, 접수 시 `notification_events.event_type =
support_case` 운영 알림을 queue한다.

관리자 화면은 최근 고객지원 문의를 보여주고 `reviewing`, `waiting_customer`, `resolved`,
`dismissed`, `refunded` 상태 변경을 제공한다. `refunded`는 단순 상태 변경이 아니라
`refund_hair_money` RPC를 실행해 `hair_money_ledger.direction = refund` 원장을 남긴다.
이 자동 환급은 `profile_id`와 추천 차감 원장의 `request_id`가 확인된 케이스에만 적용한다.
PortOne 결제수단 취소가 필요한 환불은 외부 결제 관리자에서 처리한 뒤 `resolved`로 닫는다.

## Admin Guard

The production guard is Basic Auth on both `/admin` and `/api/admin/*`.
The proxy protects the route family, and each admin API route also checks the
same credentials internally before mutating Supabase or dispatching notifications.

```bash
MIRILOOK_ADMIN_USER=mirilook
MIRILOOK_ADMIN_PASSWORD=change-me
```

If `MIRILOOK_ADMIN_PASSWORD` is empty, the admin shell and admin APIs remain open
only for local pilot work. In Vercel production, `/admin` and `/api/admin/*`
return setup-required status until the password is configured.

## Next Build Steps

1. Supabase 프로젝트를 만든다.
2. Auth, Storage bucket, RLS policy를 설계한다. 진행: `/login`에서 이메일, Google, Kakao, Naver custom provider 로그인을 제공하고 `profiles` RLS migration을 추가했다.
3. `generation_sessions`와 `generation_assets`부터 연결한다.
4. 고객 히스토리 화면을 만든다. 완료: `/history`에서 로컬/서버 히스토리 동기화, PDF,
   이메일, 공유 링크 생성, 공유 링크 회수, 개별 이미지 저장, 삭제 동선을 제공한다.
5. `/admin`에 생성 로그 목록과 운영 처리 목록을 붙인다. 진행: Supabase 연결 시 상담, 예약, 리뷰, 투표, 결제, 공유 링크, Push 구독, 알림 이벤트, 신고/삭제 요청, 고객지원 문의 최근 항목을 표시하고, 예약/리뷰/커뮤니티/공유 링크/Push/알림/신고/고객지원 상태 변경 액션을 제공한다. 입점 신청은 승인 시 `salons`/`designers` 공개 프로필로 승격하고, 리뷰는 승인/숨김 시 살롱과 디자이너 평점·리뷰 수를 재계산한다. 커뮤니티 투표는 요청자 성별로 `target_gender`를 자동 계산하고, 투표자가 선택한 `voter_gender`가 대상과 맞을 때만 저장한다. 고객지원 환급은 추천 요청 ID가 확인된 건에 한해 H머니 원장 환급으로 처리한다.

## 2026-06-26 Moderation Update

- `moderation_events` migration을 추가해 커뮤니티 글, 댓글, DM, 투표, 리뷰, 공유 링크, 상담 결과에 대한 신고와 삭제 요청을 저장한다.
- 고객 커뮤니티 글에는 `POST /api/moderation/reports` 신고 접수 흐름을 연결했다. 익명 신고가 가능하고, 로그인 토큰이 있으면 `reporter_profile_id`를 함께 저장한다.
- `/admin` 운영 데이터에는 신고/삭제 카운트와 최근 신고 목록을 추가했고, `new -> reviewing -> resolved/dismissed` 상태 처리를 지원한다.
6. `/salons`는 파일럿 입점 카드, 좌표 기반 지도 미리보기, 외부 지도 검색 링크, 예약 문의, 리뷰 접수 폼까지 연결했다. Supabase 연결 시 `salons`와 `designers`를 우선 읽고, 공개 가능한 상태(`pilot`, `approved`, `active`)만 고객 화면과 예약/리뷰 대상으로 사용한다. 승인된 리뷰는 고객 화면의 리뷰 하이라이트와 평점/리뷰 수에 반영한다. 미연결 시 정적 파일럿 데이터로 fallback한다. 2026-06-27 기준 디자이너별 `service_menu`, `portfolio_items`, `booking_windows`, 예약 문의의 `preferred_slot_id`와 `consultation_board_url`, Kakao/Google 지도 키 기반 임베드 fallback까지 연결했다. 남은 일은 실제 예약 확정/변경 캘린더와 파트너가 직접 시간표를 갱신하는 운영 화면이다.
