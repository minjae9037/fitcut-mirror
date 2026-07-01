alter table public.salons
  add column if not exists description text null,
  add column if not exists tags text[] not null default '{}',
  add column if not exists rating text null,
  add column if not exists review_count integer not null default 0,
  add column if not exists visit_tip text null;

alter table public.designers
  add column if not exists bio text null,
  add column if not exists rating text null,
  add column if not exists review_count integer not null default 0;

insert into public.salons (
  id,
  name,
  address,
  latitude,
  longitude,
  phone,
  hours,
  price_range,
  profile_status,
  description,
  tags,
  rating,
  review_count,
  visit_tip
) values
  (
    'atelier-cheongdam',
    'Atelier Cheongdam',
    '서울 강남구 청담동',
    37.525,
    127.041,
    '02-0000-1101',
    '11:00 - 20:00',
    '컷 55,000원부터',
    'pilot',
    '남성 가르마, 리프, 다운펌과 여성 레이어드 상담에 강한 프리미엄 살롱 후보입니다.',
    array['프리미엄', '남성펌', '레이어드'],
    '4.8',
    128,
    '프리미엄 상담형 매장으로 포트폴리오 촬영, 소개팅, 직장 이미지 개선 목적에 맞습니다.'
  ),
  (
    'mirror-lab-seongsu',
    'Mirror Lab Seongsu',
    '서울 성동구 성수동',
    37.544,
    127.055,
    '02-0000-2202',
    '10:30 - 19:30',
    '컷 45,000원부터',
    'pilot',
    '촬영, 프로필, 소개팅 전 스타일 상담에 맞춘 실용적인 파일럿 제휴 후보입니다.',
    array['프로필', '촬영', '상담 친화'],
    '4.7',
    96,
    '프로필 사진, 면접, 소개팅처럼 특정 목적이 있는 고객에게 적합한 실용형 매장입니다.'
  ),
  (
    'mirilook-pilot-hongdae',
    'mirilook Pilot Hongdae',
    '서울 마포구 서교동',
    37.555,
    126.923,
    '02-0000-3303',
    '12:00 - 21:00',
    '컷 38,000원부터',
    'pilot',
    '첫 시도 비용과 실패 리스크를 낮추는 파일럿 테스트형 제휴 후보입니다.',
    array['파일럿', '가성비', '스타일 변화'],
    '4.6',
    73,
    '첫 스타일 변화, 학생/사회초년생, 저비용 테스트 수요에 맞춘 파일럿 후보입니다.'
  )
on conflict (id) do update set
  address = excluded.address,
  description = excluded.description,
  hours = excluded.hours,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  phone = excluded.phone,
  price_range = excluded.price_range,
  profile_status = excluded.profile_status,
  rating = excluded.rating,
  review_count = excluded.review_count,
  tags = excluded.tags,
  visit_tip = excluded.visit_tip;

insert into public.designers (
  id,
  salon_id,
  name,
  specialties,
  profile_image_path,
  booking_status,
  bio,
  rating,
  review_count
) values
  (
    'jay',
    'atelier-cheongdam',
    'Jay 디자이너',
    array['가르마펌', '리프컷', '두상 보완'],
    null,
    'pilot',
    '남성 두상 보완과 가르마/리프 라인을 안정적으로 잡는 파일럿 담당자입니다.',
    '4.9',
    62
  ),
  (
    'yuna',
    'atelier-cheongdam',
    'Yuna 디자이너',
    array['레이어드', '빌드펌', '톤 상담'],
    null,
    'pilot',
    '여성 레이어드와 톤 상담을 결합해 얼굴선과 퍼스널 컬러를 함께 봅니다.',
    '4.8',
    54
  ),
  (
    'min',
    'mirror-lab-seongsu',
    'Min 디자이너',
    array['아이비리그', '크롭', '쉐도우펌'],
    null,
    'pilot',
    '짧은 남성 스타일과 깔끔한 실루엣을 빠르게 잡는 상담에 강합니다.',
    '4.7',
    41
  ),
  (
    'sora',
    'mirror-lab-seongsu',
    'Sora 디자이너',
    array['중단발', 'C컬', '얼굴형 보완'],
    null,
    'pilot',
    '중단발, C컬, 얼굴형 보완 상담을 여성 파일럿 기준으로 정리합니다.',
    '4.8',
    37
  ),
  (
    'leo',
    'mirilook-pilot-hongdae',
    'Leo 디자이너',
    array['댄디컷', '다운펌', '첫 스타일 변화'],
    null,
    'pilot',
    '첫 스타일 변화와 남성 다운펌 상담을 부담 없는 방향으로 제안합니다.',
    '4.6',
    33
  ),
  (
    'arin',
    'mirilook-pilot-hongdae',
    'Arin 디자이너',
    array['태슬컷', '숏보브', '펌 상담'],
    null,
    'pilot',
    '여성 단발, 태슬컷, 숏보브 상담을 깔끔한 기준으로 정리합니다.',
    '4.7',
    29
  )
on conflict (id) do update set
  bio = excluded.bio,
  booking_status = excluded.booking_status,
  name = excluded.name,
  profile_image_path = excluded.profile_image_path,
  rating = excluded.rating,
  review_count = excluded.review_count,
  salon_id = excluded.salon_id,
  specialties = excluded.specialties;
