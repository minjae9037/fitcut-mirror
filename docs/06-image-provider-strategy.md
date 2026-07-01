# Miri Look Image Provider Strategy

> 기준일: 2026-06-24

## Decision

미리룩은 D안으로 진행한다.

- 9개 후보 추천: GPT/OpenAI 기반으로 빠르고 저렴하게 탐색한다.
- 최종 상담용 9장: 고객이 선택한 1개 스타일만 고품질 provider로 생성한다.
- 기본 provider: OpenAI `gpt-image-2`
- 고품질 provider 옵션: Gemini/Nano Banana Pro `gemini-3-pro-image`

## Why

서비스의 핵심 가치는 "멋진 AI 이미지"가 아니라 "내 얼굴 그대로 이 머리를 하면 어떤지"이다.

따라서 비용이 많이 드는 고품질 렌더링은 모든 후보에 쓰지 않고, 고객이 고른 최종 스타일에 집중한다. 후보 단계는 고객의 선택지를 넓히는 탐색이고, 최종 단계는 미용사 상담 자료로 쓰이는 산출물이다.

## Current Implementation

- `/api/hairstyles/recommend`: OpenAI chat 기반 추천 유지
- `/api/hairstyles/preview`: OpenAI 이미지 기반 9개 후보 유지
- `/api/hairstyles/angle`: 최종 상담용 9장 provider 선택 적용

환경변수:

```bash
MIRILOOK_FINAL_IMAGE_PROVIDER=openai # openai | gemini
MIRILOOK_FINAL_IMAGE_FALLBACK=openai # none | openai
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-3-pro-image
GEMINI_IMAGE_ASPECT_RATIO=1:1
GEMINI_IMAGE_SIZE=1K
```

## Provider Roles

### OpenAI

- 추천 분석
- 후보 스타일 이미지 생성
- 최종 9장 fallback
- 빠른 파일럿 테스트

### Gemini / Nano Banana Pro

- 최종 9장 고품질 생성
- 얼굴 보존 우선
- 헤어스타일 변경 정확도 우선
- 미용사용 상담 보드 품질 개선

## Quality Gate

최종 9장은 다음 기준으로 평가한다.

- 얼굴 동일성 유지
- 얼굴형 변화 최소화
- 헤어스타일 반영 정확도
- 좌/우/후면/정수리 각도 정확도
- 옷과 피부 톤 일관성
- 미용사가 참고할 수 있는 실사성

파일럿 기준은 9장 중 최소 7장이 상담에 쓸 수 있는 품질이어야 한다.

## Next Steps

1. Vercel에 `GEMINI_API_KEY`를 추가한다.
2. `MIRILOOK_FINAL_IMAGE_PROVIDER=gemini`로 최종 9장만 Gemini 경로를 켠다.
3. 동일 업로드 사진으로 OpenAI final과 Gemini final을 비교한다.
4. 실패율, 생성 시간, 얼굴 보존, 헤어 정확도를 기록한다.
5. Gemini가 불안정하면 OpenAI fallback과 순차 재시도 정책을 추가한다.
