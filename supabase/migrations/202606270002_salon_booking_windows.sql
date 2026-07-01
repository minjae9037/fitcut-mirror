alter table public.salons
  add column if not exists hero_image_path text null;

alter table public.designers
  add column if not exists service_menu text[] not null default '{}',
  add column if not exists portfolio_items jsonb not null default '[]'::jsonb,
  add column if not exists booking_windows jsonb not null default '[]'::jsonb;

alter table public.booking_requests
  add column if not exists preferred_slot_id text null,
  add column if not exists consultation_board_url text null;

create index if not exists booking_requests_designer_slot_idx
  on public.booking_requests (designer_id, preferred_slot_id, status);

update public.salons
set
  name = '청담 아뜰리에',
  hero_image_path = '/salons/salon-cheongdam.png'
where id = 'atelier-cheongdam';

update public.salons
set
  name = '미러랩 성수',
  hero_image_path = '/salons/salon-seongsu.png'
where id = 'mirror-lab-seongsu';

update public.salons
set
  name = '미리룩 파일럿 홍대',
  hero_image_path = '/salons/salon-hongdae.png'
where id = 'mirilook-pilot-hongdae';

update public.designers
set
  name = '준 디자이너',
  profile_image_path = '/salons/designer-jun.png',
  service_menu = array['가르마펌 상담', '리프컷 정리', '다운펌 리스크 체크'],
  portfolio_items = '[
    {
      "title": "남성 가르마·여성 레이어드 상담",
      "imageUrl": "/salons/portfolio-jun.png",
      "note": "남성은 가르마 흐름과 옆머리 밀도를 정리하고, 여성은 긴 레이어와 얼굴선 보완을 함께 제안합니다."
    }
  ]'::jsonb,
  booking_windows = '[
    {
      "id": "jay-weekday-1500",
      "dateLabel": "평일",
      "timeLabel": "15:00",
      "capacityLabel": "잔여 2",
      "status": "available",
      "serviceTypes": ["AI 상담 보드 기반 컷 상담", "다운펌 상담"]
    },
    {
      "id": "jay-sat-1130",
      "dateLabel": "토요일",
      "timeLabel": "11:30",
      "capacityLabel": "잔여 1",
      "status": "few-left",
      "serviceTypes": ["리프컷 상담", "포트폴리오 촬영 전 상담"]
    }
  ]'::jsonb
where id = 'jay';

update public.designers
set
  name = '유나 디자이너',
  profile_image_path = '/salons/designer-yuna.png',
  service_menu = array['레이어드 컷', '빌드펌 상담', '퍼스널 톤 상담'],
  portfolio_items = '[
    {
      "title": "남성 댄디·여성 빌드펌 상담",
      "imageUrl": "/salons/portfolio-yuna.png",
      "note": "남성은 깔끔한 볼륨, 여성은 레이어와 브라운 톤을 맞춰 상담합니다."
    }
  ]'::jsonb,
  booking_windows = '[
    {
      "id": "yuna-weekday-1330",
      "dateLabel": "평일",
      "timeLabel": "13:30",
      "capacityLabel": "잔여 2",
      "status": "available",
      "serviceTypes": ["여성 레이어드 상담", "톤 상담"]
    },
    {
      "id": "yuna-fri-1900",
      "dateLabel": "금요일",
      "timeLabel": "19:00",
      "capacityLabel": "잔여 1",
      "status": "few-left",
      "serviceTypes": ["빌드펌 상담"]
    }
  ]'::jsonb
where id = 'yuna';

update public.designers
set
  name = '민재 디자이너',
  profile_image_path = '/salons/designer-minjae.png',
  service_menu = array['아이비리그 컷', '크롭컷 상담', '쉐도우펌 상담'],
  portfolio_items = '[
    {
      "title": "남성 아이비리그·여성 C컬 상담",
      "imageUrl": "/salons/portfolio-minjae.png",
      "note": "남성은 이마 노출과 옆 라인, 여성은 중단발 C컬과 얼굴형 보완을 기준으로 잡습니다."
    }
  ]'::jsonb,
  booking_windows = '[
    {
      "id": "min-tue-1600",
      "dateLabel": "화요일",
      "timeLabel": "16:00",
      "capacityLabel": "잔여 3",
      "status": "available",
      "serviceTypes": ["프로필 전 컷 상담", "짧은 머리 상담"]
    },
    {
      "id": "min-sat-1400",
      "dateLabel": "토요일",
      "timeLabel": "14:00",
      "capacityLabel": "잔여 1",
      "status": "few-left",
      "serviceTypes": ["면접 전 이미지 상담"]
    }
  ]'::jsonb
where id = 'min';

update public.designers
set
  name = '소라 디자이너',
  profile_image_path = '/salons/designer-sora.png',
  service_menu = array['중단발 컷', 'C컬 상담', '얼굴형 보완 상담'],
  portfolio_items = '[
    {
      "title": "남성 크롭·여성 숏보브 상담",
      "imageUrl": "/salons/portfolio-sora.png",
      "note": "남성은 짧은 텍스처, 여성은 턱선과 C컬 끝처리를 중심으로 제안합니다."
    }
  ]'::jsonb,
  booking_windows = '[
    {
      "id": "sora-wed-1200",
      "dateLabel": "수요일",
      "timeLabel": "12:00",
      "capacityLabel": "잔여 2",
      "status": "available",
      "serviceTypes": ["중단발 C컬 상담"]
    },
    {
      "id": "sora-sun-1500",
      "dateLabel": "일요일",
      "timeLabel": "15:00",
      "capacityLabel": "잔여 1",
      "status": "few-left",
      "serviceTypes": ["여성 얼굴형 보완 상담"]
    }
  ]'::jsonb
where id = 'sora';

update public.designers
set
  name = '레오 디자이너',
  profile_image_path = '/salons/designer-leo.png',
  service_menu = array['댄디컷', '다운펌 상담', '첫 스타일 변화 상담'],
  portfolio_items = '[
    {
      "title": "남성 댄디·여성 단발 상담",
      "imageUrl": "/salons/portfolio-leo.png",
      "note": "남성은 자연스러운 다운펌, 여성은 부드러운 단발 라인으로 부담을 낮춥니다."
    }
  ]'::jsonb,
  booking_windows = '[
    {
      "id": "leo-weekday-1800",
      "dateLabel": "평일",
      "timeLabel": "18:00",
      "capacityLabel": "잔여 3",
      "status": "available",
      "serviceTypes": ["가성비 컷 상담", "다운펌 상담"]
    },
    {
      "id": "leo-sat-1630",
      "dateLabel": "토요일",
      "timeLabel": "16:30",
      "capacityLabel": "잔여 1",
      "status": "few-left",
      "serviceTypes": ["첫 스타일 변화 상담"]
    }
  ]'::jsonb
where id = 'leo';

update public.designers
set
  name = '아린 디자이너',
  profile_image_path = '/salons/designer-arin.png',
  service_menu = array['태슬컷', '숏보브 상담', '단발 펌 상담'],
  portfolio_items = '[
    {
      "title": "남성 콤마·여성 태슬컷 상담",
      "imageUrl": "/salons/portfolio-arin.png",
      "note": "남성은 낮은 유지 난이도, 여성은 선명한 태슬 라인과 안쪽 C컬을 중심으로 잡습니다."
    }
  ]'::jsonb,
  booking_windows = '[
    {
      "id": "arin-thu-1430",
      "dateLabel": "목요일",
      "timeLabel": "14:30",
      "capacityLabel": "잔여 2",
      "status": "available",
      "serviceTypes": ["단발 상담", "숏보브 상담"]
    },
    {
      "id": "arin-sun-1300",
      "dateLabel": "일요일",
      "timeLabel": "13:00",
      "capacityLabel": "마감",
      "status": "full",
      "serviceTypes": ["태슬컷 상담"]
    }
  ]'::jsonb
where id = 'arin';
