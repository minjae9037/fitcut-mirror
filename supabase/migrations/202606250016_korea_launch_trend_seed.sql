delete from public.regional_trend_sources
where source_url like 'mirilook://research/korea-launch-baseline-2026-06/%';

insert into public.regional_trend_sources (
  region_id,
  audience,
  age_group,
  research_month,
  platform,
  source_url,
  title,
  summary,
  target_persona,
  metrics,
  observed_style_ids,
  confidence,
  status,
  researched_at
)
values
  (
    'korea',
    'male',
    'all',
    date '2026-06-01',
    'manual-research',
    'mirilook://research/korea-launch-baseline-2026-06/male-core',
    'Korea launch baseline for male salon recommendations',
    '한국 파일럿 런칭에서는 과한 변신보다 미용실에서 바로 상담 가능한 K-뷰티 남성 스타일을 우선한다. 얼굴형 보완, 옆머리 정리, 이마 노출 정도, 관리 난이도를 기준으로 core 7개와 challenge 2개를 나눈다.',
    '사진 업로드만으로 나이대를 묻지 않는 한국 남성 고객. 프로필, 소개팅, 직장, 데일리 미용실 상담에서 실패 리스크가 낮은 추천을 선호한다.',
    '{"search_proxy":"baseline","instagram_proxy":"baseline","youtube_proxy":"baseline","salon_menu_proxy":"baseline","algorithmic_exposure":"baseline","note":"Replace with verified monthly research sources when the research agent is scheduled."}'::jsonb,
    array[
      'leaf-cut',
      'soft-parted',
      'shadow-perm',
      'comma-hair',
      'down-perm-two-block',
      'dandy-cut',
      'ivy-league',
      'crop-cut',
      'side-part-taper'
    ],
    0.710,
    'active',
    now()
  ),
  (
    'korea',
    'female',
    'all',
    date '2026-06-01',
    'manual-research',
    'mirilook://research/korea-launch-baseline-2026-06/female-core',
    'Korea launch baseline for female salon recommendations',
    '한국 파일럿 런칭에서는 기장, 얼굴 주변 레이어, 앞머리, 컬 크기, 염색 톤을 미용실 상담 언어로 명확히 보여주는 여성 스타일을 우선한다. 긴 머리, 중단발, 단발·숏컷을 균형 있게 섞어 core 7개와 challenge 2개를 나눈다.',
    '사진 업로드만으로 나이대를 묻지 않는 한국 여성 고객. 얼굴형 보완, 개인 컬러, 관리 난이도, 미용실 재현 가능성을 함께 고려한다.',
    '{"search_proxy":"baseline","instagram_proxy":"baseline","youtube_proxy":"baseline","salon_menu_proxy":"baseline","algorithmic_exposure":"baseline","note":"Replace with verified monthly research sources when the research agent is scheduled."}'::jsonb,
    array[
      'long-layered-c-curl',
      'side-bang-layered',
      'medium-c-curl',
      'medium-s-curl',
      'butterfly-layered',
      'tassel-bob',
      'build-perm',
      'long-hush-cut',
      'short-bob'
    ],
    0.700,
    'active',
    now()
  );

insert into public.regional_style_priorities (
  region_id,
  audience,
  age_group,
  research_month,
  style_id,
  priority_rank,
  recommendation_bucket,
  score,
  rationale,
  status,
  updated_at
)
values
  ('korea', 'male', 'all', date '2026-06-01', 'leaf-cut', 1, 'core', 91.0, '앞머리와 옆 라인이 자연스럽게 이어져 한국 남성 파일럿에서 실패 리스크가 낮은 상담형 스타일.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'soft-parted', 2, 'core', 89.0, '6:4 가르마 기반으로 데일리, 프로필, 직장 이미지에 폭넓게 쓰기 좋음.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'shadow-perm', 3, 'core', 87.0, '숱과 볼륨 보완 수요가 높고 얼굴형 보정 설명이 쉬움.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'comma-hair', 4, 'core', 85.0, '앞머리 곡선으로 부드럽고 세련된 인상을 만들기 쉬움.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'down-perm-two-block', 5, 'core', 83.0, '옆머리 뜸과 두상 폭을 관리하려는 한국 남성 고객에게 실용적.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'dandy-cut', 6, 'core', 81.0, '첫 시도 고객에게 안전하고 미용실 재현성이 높음.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'ivy-league', 7, 'core', 79.0, '짧고 단정한 스타일을 원하는 고객에게 안정적인 선택지.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'crop-cut', 8, 'challenge', 74.0, '이마와 윤곽을 드러내는 도전형 스타일이지만 잘 맞으면 이미지 개선 폭이 큼.', 'active', now()),
  ('korea', 'male', 'all', date '2026-06-01', 'side-part-taper', 9, 'challenge', 72.0, '성숙하고 포멀한 분위기로 전환되는 도전형 추천.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'long-layered-c-curl', 1, 'core', 91.0, '긴 머리를 유지하면서 얼굴선을 따라 부드럽게 정리되는 안정형 여성 추천.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'side-bang-layered', 2, 'core', 89.0, '사이드뱅과 레이어로 얼굴 주변 보완을 설명하기 쉬움.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'medium-c-curl', 3, 'core', 87.0, '중단발 상담에서 관리성과 변화를 균형 있게 보여줄 수 있음.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'medium-s-curl', 4, 'core', 85.0, '컬감과 볼륨을 조금 더 보여주는 여성 상담용 core 후보.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'butterfly-layered', 5, 'core', 83.0, '얼굴 주변 볼륨과 레이어 움직임을 보여주기 좋음.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'tassel-bob', 6, 'core', 81.0, '단발 변화를 원하는 고객에게 깔끔한 상담 기준을 제공.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'build-perm', 7, 'core', 79.0, '볼륨과 여성스러운 실루엣을 원하는 고객에게 범용성이 있음.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'long-hush-cut', 8, 'challenge', 74.0, '레이어와 질감이 강해 첫인상은 어색할 수 있으나 어울리면 변화 폭이 큼.', 'active', now()),
  ('korea', 'female', 'all', date '2026-06-01', 'short-bob', 9, 'challenge', 72.0, '기장 변화가 큰 도전형 추천으로, 얼굴형이 맞으면 선명한 인상을 줄 수 있음.', 'active', now())
on conflict (region_id, audience, age_group, style_id)
do update set
  research_month = excluded.research_month,
  priority_rank = excluded.priority_rank,
  recommendation_bucket = excluded.recommendation_bucket,
  score = excluded.score,
  rationale = excluded.rationale,
  status = excluded.status,
  updated_at = now();
