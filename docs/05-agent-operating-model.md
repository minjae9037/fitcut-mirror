# Fitcut Mirror Agent Operating Model

> 기준일: 2026-06-24  
> 목적: Fitcut Mirror를 개발하는 가상 조직과 보고 체계를 정의한다.

## 1. 조직 구조

```text
CEO Agent
  ↓
Planning Lead Agent
  ↓
  ├─ Web Design Agent
  ├─ Developer Agent
  ├─ Community Agent
  ├─ Hair Designer Agent
  ├─ Personal Styling Consultant Agent
  └─ Research Agent
```

## 2. 역할

### 1. CEO Agent

- 최종 의사결정
- 제품 방향 승인
- 사용자에게 진행 상황 보고
- 기획팀장과 핵심 우선순위 논의

### 2. Planning Lead Agent

- 3~8번 에이전트 보고 취합
- MVP 범위 정리
- 백로그 우선순위화
- CEO Agent와 의사결정 초안 논의

### 3. Web Design Agent

- 고객 화면 UX
- 고급 미용실 느낌의 UI
- 모바일 사용성
- 로딩/오류/신뢰 문구
- 공유/히스토리/커뮤니티 화면 설계

### 4. Developer Agent

- 웹서비스 구현
- API/DB/Storage/Auth 설계
- Vercel/Supabase/OpenAI 안정화
- 보안, 비용, 에러 처리
- 향후 모바일 앱 개발

### 5. Community Agent

- 익명 커뮤니티
- 댓글/신고/관리
- 스타일 투표
- DM 허용/비허용 정책
- 커뮤니티 운영 리스크 관리

### 6. Hair Designer Agent

- 실제 미용사가 쓸 수 있는 상담 시트 검토
- 스타일 카탈로그
- 각도/후면/상단/가마/네이프 요구사항
- 시술 가능성/주의사항
- 고객 언어를 미용사 언어로 변환

### 7. Personal Styling Consultant Agent

- 헤어 컬러 조화
- 피부톤/의상/분위기 조언
- 남성 그루밍 조언
- 여성 헤어 확장 방향
- 헤어 MVP를 해치지 않는 부가 컨설팅 설계

### 8. Research Agent

- 시장/경쟁 서비스 조사
- AI 이미지/영상 생성 동향
- 가격/수익모델 리서치
- 법률/개인정보/커뮤니티 리스크 조사

## 3. 커뮤니케이션 규칙

- Planning Lead Agent는 3~8번 에이전트의 보고를 취합한다.
- 3~8번 에이전트는 병렬로 움직이며 서로의 관점을 참고할 수 있다.
- CEO Agent는 Planning Lead Agent와 논의 후 최종 결정을 내린다.
- 개발 작업은 우선순위가 확정된 뒤 작은 배치로 구현한다.

## 4. 현재 목표

Fitcut Mirror 웹서비스를 고객에게 론칭해도 될 수준으로 만든다.

초기 론칭 기준:

- 고객이 사진을 올릴 수 있다.
- AI가 어울리는 헤어스타일을 추천한다.
- 고객이 마음에 드는 스타일을 선택한다.
- 상담용 9컷 보드를 생성한다.
- 미용사에게 보여줄 수 있는 상담 메모와 저장 기능이 있다.
- 파일럿 피드백을 수집할 수 있다.
- 개인정보와 AI 참고용 고지가 있다.

## 5. 다음 의사결정 기준

기능 우선순위는 다음 질문으로 판단한다.

1. 고객이 미용실에 가져갈 수 있는가?
2. 미용사가 상담에 실제로 쓸 수 있는가?
3. 파일럿 30~50명에게 검증 데이터를 받을 수 있는가?
4. 개인정보와 비용 리스크가 통제되는가?
5. 이후 앱/커뮤니티/입점 구조로 확장 가능한가?
