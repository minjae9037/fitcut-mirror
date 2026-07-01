"use client";

import { FormEvent, useState } from "react";
import {
  Building2,
  CalendarCheck,
  Clock3,
  Link2,
  Loader2,
  Send,
  Star,
  Vote,
} from "lucide-react";
import {
  communityVotePurposes,
  getBookableSlots,
  pilotSalons,
  type PilotSalon,
} from "@/lib/mirilook-marketplace";

type ApiResult = {
  accepted?: boolean;
  reason?: string;
};

async function readApiResult(response: Response): Promise<ApiResult> {
  return (await response.json().catch(() => ({
    reason: `server_${response.status}`,
  }))) as ApiResult;
}

function buildSalonTargetStatus(reason: string | undefined, fallback: string) {
  switch (reason) {
    case "salon_not_found":
      return "현재 입점된 미용실만 선택할 수 있습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.";
    case "salon_not_bookable":
      return "해당 미용실은 현재 예약 또는 리뷰 접수를 받을 수 없는 상태입니다.";
    case "designer_not_found":
      return "현재 입점된 디자이너만 선택할 수 있습니다. 디자이너 목록을 다시 확인해 주세요.";
    case "designer_salon_mismatch":
      return "선택한 디자이너가 해당 미용실 소속으로 확인되지 않습니다. 미용실과 디자이너를 다시 선택해 주세요.";
    case "designer_not_bookable":
      return "해당 디자이너는 현재 예약 또는 리뷰 접수를 받을 수 없는 상태입니다.";
    case "preferred_date_required":
      return "예약 가능한 날짜와 시간을 선택하거나 희망 시간을 입력해 주세요.";
    case "slot_not_available":
      return "선택한 예약 시간은 현재 접수 가능한 시간표에 없습니다. 다른 시간을 선택해 주세요.";
    case "slot_full":
      return "선택한 예약 시간은 마감되었습니다. 다른 시간을 선택해 주세요.";
    case "salon_lookup_failed":
    case "designer_lookup_failed":
    case "slot_lookup_failed":
      return "미용실 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return fallback;
  }
}

function getFirstBookableSlotId(
  designer: PilotSalon["designers"][number] | undefined,
) {
  return designer ? getBookableSlots(designer)[0]?.id ?? "" : "";
}

function getFirstServiceType(
  designer: PilotSalon["designers"][number] | undefined,
  slotId: string,
) {
  const slot = designer?.bookingSlots.find((item) => item.id === slotId);

  return (
    slot?.serviceTypes[0] ??
    designer?.serviceMenu[0] ??
    "AI 상담 보드 기반 컷 상담"
  );
}

export function SalonApplicationForm() {
  const [applicantType, setApplicantType] = useState("salon");
  const [salonName, setSalonName] = useState("");
  const [designerName, setDesignerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!salonName.trim() || !contactName.trim() || !contact.trim()) {
      setStatus("매장명, 담당자명, 연락처를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("입점 신청을 접수하는 중입니다.");

    try {
      const response = await fetch("/api/salons/applications/", {
        body: JSON.stringify({
          address,
          applicantType,
          contact,
          contactName,
          designerName,
          memo,
          profileUrl,
          salonName,
          specialties,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setStatus("입점 신청 접수에 실패했습니다. 필수 입력값을 확인해 주세요.");
        return;
      }

      const result = (await response.json()) as ApiResult;

      if (!result.accepted) {
        setStatus(
          result.reason === "supabase_not_configured"
            ? "입점 신청 양식이 준비되었습니다. Supabase 전용 프로젝트 연결 후 실제 접수가 활성화됩니다."
            : "입점 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }

      setStatus("입점 신청이 접수되었습니다. 운영자가 확인 후 연락드릴 예정입니다.");
      setDesignerName("");
      setContactName("");
      setContact("");
      setAddress("");
      setSpecialties("");
      setProfileUrl("");
      setMemo("");
    } catch (error) {
      console.error(error);
      setStatus("네트워크 오류로 입점 신청을 보내지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2">
        <Building2 aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          미용실/디자이너 입점 신청
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        미리룩 상담 보드를 실제 시술 상담과 예약으로 연결할 파트너 신청 양식입니다.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          입점 유형
          <select
            className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
            onChange={(event) => setApplicantType(event.target.value)}
            value={applicantType}
          >
            <option value="salon">미용실</option>
            <option value="designer">헤어 디자이너</option>
            <option value="both">미용실 + 디자이너</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="매장명" onChange={setSalonName} value={salonName} />
          <TextField
            label="디자이너명"
            onChange={setDesignerName}
            placeholder="선택"
            value={designerName}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="담당자명"
            onChange={setContactName}
            value={contactName}
          />
          <TextField
            label="연락처"
            onChange={setContact}
            placeholder="전화번호 또는 이메일"
            value={contact}
          />
        </div>

        <TextField
          label="주소"
          onChange={setAddress}
          placeholder="지도 노출에 사용할 주소"
          value={address}
        />
        <TextField
          label="전문 분야"
          onChange={setSpecialties}
          placeholder="예: 리프컷, 여성 레이어드, 퍼스널 컬러"
          value={specialties}
        />
        <TextField
          label="프로필 URL"
          onChange={setProfileUrl}
          placeholder="Instagram, Naver, 홈페이지"
          value={profileUrl}
        />

        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          메모
          <textarea
            className="min-h-28 resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
            onChange={(event) => setMemo(event.target.value)}
            placeholder="입점 희망 지역, 예약 가능 시간, 미리룩 고객에게 제공할 상담 방식 등을 적어주세요."
            value={memo}
          />
        </label>
      </div>

      <button
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <Send aria-hidden="true" size={16} />
        )}
        입점 신청 보내기
      </button>
      {status ? (
        <p className="mt-3 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm leading-6 text-[#b8aa95]">
          {status}
        </p>
      ) : null}
    </form>
  );
}

export function BookingRequestForm({
  salons = pilotSalons,
}: {
  salons?: PilotSalon[];
}) {
  const initialDesigner = salons[0]?.designers[0];
  const initialSlotId = getFirstBookableSlotId(initialDesigner);
  const [salonId, setSalonId] = useState(salons[0]?.id ?? "");
  const [designerId, setDesignerId] = useState(
    initialDesigner?.id ?? "",
  );
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlotId, setPreferredSlotId] = useState(initialSlotId);
  const [serviceType, setServiceType] = useState(
    getFirstServiceType(initialDesigner, initialSlotId),
  );
  const [consultationBoardUrl, setConsultationBoardUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSalon = salons.find((salon) => salon.id === salonId) ?? salons[0];
  const selectedDesigner =
    selectedSalon?.designers.find((designer) => designer.id === designerId) ??
    selectedSalon?.designers[0];
  const selectedSlots = selectedDesigner?.bookingSlots ?? [];
  const bookableSlots = selectedDesigner ? getBookableSlots(selectedDesigner) : [];
  const selectedSlot =
    selectedSlots.find((slot) => slot.id === preferredSlotId) ??
    bookableSlots[0];
  const effectivePreferredDate = selectedSlot
    ? `${selectedSlot.dateLabel} ${selectedSlot.timeLabel}`
    : preferredDate;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !contact.trim()) {
      setStatus("이름과 연락처를 입력해 주세요.");
      return;
    }

    if (!effectivePreferredDate.trim()) {
      setStatus("예약 가능한 날짜와 시간을 선택하거나 희망 시간을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("예약 문의를 접수하는 중입니다.");

    try {
      const response = await fetch("/api/salons/booking-requests/", {
        body: JSON.stringify({
          consultationBoardUrl,
          contact,
          designerId,
          memo,
          name,
          preferredDate: effectivePreferredDate,
          preferredSlotId: selectedSlot?.id,
          salonId,
          serviceType,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setStatus(
          buildSalonTargetStatus(
            result.reason,
            "예약 문의 접수에 실패했습니다. 입력값을 확인해 주세요.",
          ),
        );
        return;
      }

      setStatus(
        result.accepted
          ? "예약 문의가 접수되었습니다. 운영자가 확인 후 연락할 수 있습니다."
          : "파일럿 예약 문의 양식이 준비되었습니다. Supabase 전용 프로젝트 연결 후 실제 접수가 활성화됩니다.",
      );
    } catch (error) {
      console.error(error);
      setStatus("네트워크 오류로 예약 문의를 보내지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2">
        <CalendarCheck aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">파일럿 예약 문의</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        AI 상담 보드를 미용실에 가져가는 흐름을 검증하기 위한 파일럿 문의입니다.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          미용실
          <select
            className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
            onChange={(event) => {
              const nextSalonId = event.target.value;
              const nextSalon = salons.find((salon) => salon.id === nextSalonId);
              const nextDesigner = nextSalon?.designers[0];
              const nextSlotId = getFirstBookableSlotId(nextDesigner);

              setSalonId(nextSalonId);
              setDesignerId(nextDesigner?.id ?? "");
              setPreferredSlotId(nextSlotId);
              setPreferredDate("");
              setServiceType(getFirstServiceType(nextDesigner, nextSlotId));
            }}
            value={salonId}
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          디자이너
          <select
            className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
            onChange={(event) => {
              const nextDesignerId = event.target.value;
              const nextDesigner = selectedSalon?.designers.find(
                (designer) => designer.id === nextDesignerId,
              );
              const nextSlotId = getFirstBookableSlotId(nextDesigner);

              setDesignerId(nextDesignerId);
              setPreferredSlotId(nextSlotId);
              setPreferredDate("");
              setServiceType(getFirstServiceType(nextDesigner, nextSlotId));
            }}
            value={designerId}
          >
            {selectedSalon?.designers.map((designer) => (
              <option key={designer.id} value={designer.id}>
                {designer.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="이름" onChange={setName} value={name} />
          <TextField
            label="연락처"
            onChange={setContact}
            placeholder="전화번호 또는 이메일"
            value={contact}
          />
        </div>

        {bookableSlots.length ? (
          <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
            예약 가능 시간
            <select
              className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
              onChange={(event) => {
                const nextSlotId = event.target.value;

                setPreferredSlotId(nextSlotId);
                setServiceType(getFirstServiceType(selectedDesigner, nextSlotId));
              }}
              value={selectedSlot?.id ?? ""}
            >
              {selectedSlots.map((slot) => (
                <option
                  disabled={slot.status === "full"}
                  key={slot.id}
                  value={slot.id}
                >
                  {slot.dateLabel} {slot.timeLabel} · {slot.capacityLabel}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <TextField
            label="희망 날짜/시간"
            onChange={setPreferredDate}
            placeholder="예: 토요일 오후 2시"
            value={preferredDate}
          />
        )}

        {selectedSlot ? (
          <div className="rounded-md border border-white/8 bg-[#0f0e0c]/72 px-3 py-2 text-xs leading-5 text-[#b8aa95]">
            <p className="flex items-center gap-1.5 font-semibold text-[#fffaf1]">
              <Clock3 aria-hidden="true" size={13} />
              {selectedSlot.dateLabel} {selectedSlot.timeLabel} ·{" "}
              {selectedSlot.capacityLabel}
            </p>
            <p className="mt-1">
              {selectedSlot.serviceTypes.length
                ? selectedSlot.serviceTypes.join(" · ")
                : "AI 상담 보드 기반 상담"}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="상담 종류"
            onChange={setServiceType}
            value={serviceType}
          />
          <TextField
            label="상담 보드 링크"
            onChange={setConsultationBoardUrl}
            placeholder="/share/... 또는 https://..."
            value={consultationBoardUrl}
          />
        </div>

        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          <span className="inline-flex items-center gap-1.5">
            <Link2 aria-hidden="true" size={13} />
            요청 메모
          </span>
          <textarea
            className="min-h-24 resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
            onChange={(event) => setMemo(event.target.value)}
            placeholder="원하는 스타일, 피하고 싶은 스타일, 실제 상담 때 확인할 내용을 적어주세요."
            value={memo}
          />
        </label>
      </div>

      <button
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <Send aria-hidden="true" size={16} />
        )}
        예약 문의 보내기
      </button>
      {status ? (
        <p className="mt-3 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm leading-6 text-[#b8aa95]">
          {status}
        </p>
      ) : null}
    </form>
  );
}

export function SalonReviewForm({
  salons = pilotSalons,
}: {
  salons?: PilotSalon[];
}) {
  const [salonId, setSalonId] = useState(salons[0]?.id ?? "");
  const [designerId, setDesignerId] = useState("");
  const [rating, setRating] = useState(5);
  const [visitorName, setVisitorName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSalon = salons.find((salon) => salon.id === salonId) ?? salons[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      setStatus("리뷰 내용을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("리뷰를 접수하는 중입니다.");

    try {
      const response = await fetch("/api/salons/reviews/", {
        body: JSON.stringify({
          body,
          contact,
          designerId: designerId || undefined,
          rating,
          salonId,
          visitorName,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = await readApiResult(response);

      if (!response.ok) {
        setStatus(
          buildSalonTargetStatus(
            result.reason,
            "리뷰 접수에 실패했습니다. 평점과 내용을 다시 확인해 주세요.",
          ),
        );
        return;
      }

      setStatus(
        result.accepted
          ? "리뷰가 접수되었습니다. 운영자 확인 후 파일럿 화면에 반영됩니다."
          : "파일럿 리뷰 양식은 준비되었습니다. Supabase 전용 프로젝트 연결 후 실제 저장이 활성화됩니다.",
      );

      if (result.accepted) {
        setBody("");
      }
    } catch (error) {
      console.error(error);
      setStatus("네트워크 오류로 리뷰를 보내지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2">
        <Star aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          파일럿 리뷰 남기기
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        실제 방문 전에는 상담 기대치를, 방문 후에는 시술 경험과 상담 품질을
        남기는 리뷰 양식입니다.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          미용실
          <select
            className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
            onChange={(event) => {
              setSalonId(event.target.value);
              setDesignerId("");
            }}
            value={salonId}
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          디자이너
          <select
            className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
            onChange={(event) => setDesignerId(event.target.value)}
            value={designerId}
          >
            <option value="">전체 살롱 리뷰</option>
            {selectedSalon?.designers.map((designer) => (
              <option key={designer.id} value={designer.id}>
                {designer.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
          평점
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                className={`inline-flex h-10 w-10 items-center justify-center rounded-md border text-sm font-bold transition ${
                  rating === value
                    ? "border-[#f3d28a] bg-[#30271a] text-[#f3d28a]"
                    : "border-white/10 bg-[#0f0e0c] text-[#b8aa95] hover:border-[#f3d28a]/50"
                }`}
                key={value}
                onClick={() => setRating(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="이름 또는 닉네임"
            onChange={setVisitorName}
            placeholder="익명 가능"
            value={visitorName}
          />
          <TextField
            label="연락처"
            onChange={setContact}
            placeholder="운영 확인용, 선택"
            value={contact}
          />
        </div>

        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          리뷰 내용
          <textarea
            className="min-h-28 resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
            onChange={(event) => setBody(event.target.value)}
            placeholder="예: 상담 보드가 디자이너와 이야기할 때 도움이 되었는지, 원하는 스타일과 실제 상담이 잘 맞았는지 적어주세요."
            value={body}
          />
        </label>
      </div>

      <button
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <Send aria-hidden="true" size={16} />
        )}
        리뷰 접수하기
      </button>
      {status ? (
        <p className="mt-3 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm leading-6 text-[#b8aa95]">
          {status}
        </p>
      ) : null}
    </form>
  );
}

export function VoteRequestForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [purpose, setPurpose] = useState(communityVotePurposes[0] ?? "소개팅");
  const [requesterGender, setRequesterGender] = useState("male");
  const [dmPolicy, setDmPolicy] = useState<"allow" | "deny">("deny");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !body.trim()) {
      setStatus("투표 제목과 내용을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("투표 요청을 준비하는 중입니다.");

    try {
      const response = await fetch("/api/community/vote-requests/", {
        body: JSON.stringify({
          body,
          contact,
          dmPolicy,
          purpose,
          requesterGender,
          title,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        setStatus("투표 요청 접수에 실패했습니다. 입력값을 확인해 주세요.");
        return;
      }

      const result = (await response.json()) as ApiResult;

      setStatus(
        result.accepted
          ? "투표 요청이 접수되었습니다. 운영자 검수 후 공개할 수 있습니다."
          : "파일럿 투표 요청 양식이 준비되었습니다. Supabase 전용 프로젝트 연결 후 실제 접수가 활성화됩니다.",
      );
    } catch (error) {
      console.error(error);
      setStatus("네트워크 오류로 투표 요청을 보내지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2">
        <Vote aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          스타일 투표 요청
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        추천받은 스타일을 이성 또는 익명 커뮤니티에 투표 요청하는 기능의 파일럿입니다.
        남성 요청은 여성에게, 여성 요청은 남성에게 우선 노출되도록 저장됩니다.
      </p>

      <div className="mt-4 grid gap-3">
        <TextField
          label="제목"
          onChange={setTitle}
          placeholder="예: 소개팅 전에 어떤 스타일이 나을까요?"
          value={title}
        />

        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          내용
          <textarea
            className="min-h-28 resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
            onChange={(event) => setBody(event.target.value)}
            placeholder="상담 보드에서 마음에 드는 후보, 고민되는 상황, 원하는 피드백을 적어주세요."
            value={body}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
            목적
            <select
              className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
              onChange={(event) => setPurpose(event.target.value)}
              value={purpose}
            >
              {communityVotePurposes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
            요청자
            <select
              className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
              onChange={(event) => setRequesterGender(event.target.value)}
              value={requesterGender}
            >
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타/비공개</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
            DM 정책
            <select
              className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
              onChange={(event) =>
                setDmPolicy(event.target.value === "allow" ? "allow" : "deny")
              }
              value={dmPolicy}
            >
              <option value="deny">투표와 댓글만 허용</option>
              <option value="allow">투표자가 DM 가능</option>
            </select>
          </label>
          <TextField
            label="연락처"
            onChange={setContact}
            placeholder="운영자 확인용 이메일 또는 연락처"
            value={contact}
          />
        </div>
      </div>

      <button
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <Send aria-hidden="true" size={16} />
        )}
        투표 요청 보내기
      </button>
      {status ? (
        <p className="mt-3 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm leading-6 text-[#b8aa95]">
          {status}
        </p>
      ) : null}
    </form>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
      {label}
      <input
        className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
