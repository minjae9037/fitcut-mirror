"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import {
  defaultRegion,
  MirilookRegions,
  getRegionProfile,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import {
  getMonthlyResearchQueue,
  getResearchAgentPlan,
  type MonthlyResearchQueueItem,
} from "@/lib/mirilook-research-agent";
import {
  defaultAgeGroup,
  MirilookAgeGroups,
  type MirilookAgeGroup,
} from "@/lib/mirilook-demographics";
import {
  defaultAudience,
  getStylesByAudience,
  type MirilookAudience,
} from "@/lib/mirilook-styles";

type SubmitResult = {
  accepted?: boolean;
  failedPairs?: string[];
  processedPairs?: number;
  priorityCount?: number;
  queuedCount?: number;
  reason?: string;
  researchMonth?: string;
  sourceId?: string;
  sourceCount?: number;
};

const platformOptions = [
  "web",
  "instagram",
  "youtube",
  "salon-menu",
  "influencer",
  "manual-research",
];

const statusOptions = ["candidate", "verified", "active"];

export function AdminResearchTrendForm() {
  const [regionId, setRegionId] = useState<MirilookRegionId>(defaultRegion);
  const [ageGroup, setAgeGroup] = useState<MirilookAgeGroup>(defaultAgeGroup);
  const [audience, setAudience] = useState<MirilookAudience>(defaultAudience);
  const [platform, setPlatform] = useState("manual-research");
  const [status, setStatus] = useState("candidate");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState("0.75");
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>(() =>
    getRegionProfile(defaultRegion).priorityStyleIds[defaultAudience].slice(0, 9),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoResearching, setIsAutoResearching] = useState(false);
  const [isQueueCreating, setIsQueueCreating] = useState(false);
  const [message, setMessage] = useState("");

  const styles = useMemo(() => getStylesByAudience(audience), [audience]);
  const monthlyQueue = useMemo(
    () => getMonthlyResearchQueue(regionId),
    [regionId],
  );
  const researchPlan = useMemo(
    () => getResearchAgentPlan(regionId, audience, ageGroup),
    [ageGroup, audience, regionId],
  );
  const selectedRegion = getRegionProfile(regionId);
  const selectedStyles = selectedStyleIds
    .map((styleId) => styles.find((style) => style.id === styleId))
    .filter(Boolean);

  function resetToRegionSeed(
    nextRegionId = regionId,
    nextAudience = audience,
  ) {
    setSelectedStyleIds(
      getRegionProfile(nextRegionId).priorityStyleIds[nextAudience].slice(0, 9),
    );
  }

  function handleRegionChange(value: string) {
    const nextRegion = MirilookRegions.some((region) => region.id === value)
      ? (value as MirilookRegionId)
      : defaultRegion;

    setRegionId(nextRegion);
    resetToRegionSeed(nextRegion, audience);
  }

  function handleAudienceChange(value: string) {
    const nextAudience = value === "female" ? "female" : "male";

    setAudience(nextAudience);
    resetToRegionSeed(regionId, nextAudience);
  }

  function toggleStyle(styleId: string) {
    setSelectedStyleIds((current) => {
      if (current.includes(styleId)) {
        return current.filter((id) => id !== styleId);
      }

      return [...current, styleId].slice(0, 18);
    });
  }

  function applyResearchQueue() {
    fillResearchInputs(researchPlan);
    setMessage(
      "리서치 agent 큐를 입력값으로 채웠습니다. 실제 검색/Instagram/YouTube/살롱 메뉴 확인 후 URL과 요약을 보강해 저장해 주세요.",
    );
  }

  function applyResearchQueueItem(item: MonthlyResearchQueueItem) {
    setAgeGroup(item.ageGroup);
    setAudience(item.audience);
    resetToRegionSeed(item.region, item.audience);
    fillResearchInputs(item.plan);
    setMessage(`${selectedRegion.label} ${item.plan.title} 큐를 입력값으로 채웠습니다.`);
  }

  function fillResearchInputs(plan: ReturnType<typeof getResearchAgentPlan>) {
    setPlatform("web");
    setStatus("candidate");
    setTitle(plan.title);
    setSummary(
      [
        plan.sourceSummary,
        "",
        "조사 채널",
        ...plan.targets.map(
          (target) => `- ${target.label}: ${target.query}`,
        ),
      ].join("\n"),
    );
    setRationale(plan.rankingRule);
  }

  async function createMonthlyQueue() {
    setIsQueueCreating(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/research/trends/", {
        body: JSON.stringify({
          action: "ensure_monthly_queue",
          regionId,
          source: {
            researchMonth: new Date().toISOString().slice(0, 7),
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as SubmitResult;

      if (!response.ok || !result.accepted) {
        setMessage(
          result.reason === "supabase_not_configured"
            ? "Supabase 전용 프로젝트 연결 후 월간 리서치 큐를 생성할 수 있습니다."
            : `월간 큐를 생성하지 못했습니다. ${result.reason ?? response.status}`,
        );
        return;
      }

      setMessage(
        `${selectedRegion.label} ${result.researchMonth ?? "이번 달"} 리서치 큐 ${result.queuedCount ?? monthlyQueue.length}개를 생성했습니다.`,
      );
    } catch (error) {
      console.error(error);
      setMessage("월간 리서치 큐 생성 요청에 실패했습니다.");
    } finally {
      setIsQueueCreating(false);
    }
  }

  async function runMonthlyResearch() {
    setIsAutoResearching(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/research/trends/", {
        body: JSON.stringify({
          action: "run_monthly_research",
          limitPairs: 2,
          regionId,
          source: {
            researchMonth: new Date().toISOString().slice(0, 7),
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as SubmitResult;

      if (!response.ok || !result.accepted) {
        setMessage(
          result.reason === "supabase_not_configured"
            ? "Supabase 전용 프로젝트 연결 후 자동 리서치를 실행할 수 있습니다."
            : result.reason === "openai_not_configured"
              ? "OPENAI_API_KEY 연결 후 자동 리서치를 실행할 수 있습니다. 월간 큐만 생성했습니다."
              : `자동 리서치를 완료하지 못했습니다. ${result.reason ?? response.status}`,
        );
        return;
      }

      const failed = result.failedPairs?.length
        ? ` 실패: ${result.failedPairs.join(", ")}`
        : "";

      setMessage(
        `${selectedRegion.label} 자동 리서치 완료: ${result.processedPairs ?? 0}개 성별 묶음, 근거 ${result.sourceCount ?? 0}개, priority ${result.priorityCount ?? 0}개 저장.${failed}`,
      );
    } catch (error) {
      console.error(error);
      setMessage("자동 리서치 실행 요청에 실패했습니다.");
    } finally {
      setIsAutoResearching(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStyleIds.length) {
      setMessage("저장할 우선 스타일을 1개 이상 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/research/trends/", {
        body: JSON.stringify({
          audience,
          ageGroup,
          priorities: selectedStyleIds.map((styleId, index) => ({
            bucket: index >= 7 ? "challenge" : "core",
            rationale: rationale.trim() || `${selectedRegion.label} ${audience === "female" ? "여성" : "남성"} 트렌드 우선순위`,
            score: Math.max(1, 100 - index * 4),
            styleId,
          })),
          regionId,
          source: {
            confidence,
            researchMonth: new Date().toISOString().slice(0, 7),
            observedStyleIds: selectedStyleIds,
            platform,
            status,
            summary,
            title,
            url: sourceUrl,
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as SubmitResult;

      if (!response.ok || !result.accepted) {
        setMessage(
          result.reason === "supabase_not_configured"
            ? "Supabase 전용 프로젝트 연결 후 리서치 priority를 저장할 수 있습니다."
            : `저장하지 못했습니다. ${result.reason ?? response.status}`,
        );
        return;
      }

      setMessage(
        `${selectedRegion.label} ${audience === "female" ? "여성" : "남성"} 트렌드 ${result.priorityCount ?? selectedStyleIds.length}개를 저장했습니다.`,
      );
      setSourceUrl("");
      setTitle("");
      setSummary("");
      setRationale("");
    } catch (error) {
      console.error(error);
      setMessage("리서치 trend 저장 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
            <h2 className="text-lg font-semibold text-[#fffaf1]">
              리서치 트렌드 입력
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b8aa95]">
            국가/연령대/성별별 웹 검색, Instagram, YouTube, 현지 살롱 메뉴에서 확인한 스타일 선호를
            저장합니다. 저장된 priority는 고객 추천 시 얼굴/두상 적합성 다음 단계에서
            우선 반영됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex w-fit items-center gap-2 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-3 py-2 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#3a2e18]"
            onClick={() => resetToRegionSeed()}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={15} />
            기본 seed
          </button>
          <button
            className="inline-flex w-fit items-center gap-2 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-3 py-2 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#3a2e18] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isQueueCreating}
            onClick={() => void createMonthlyQueue()}
            type="button"
          >
            {isQueueCreating ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Sparkles aria-hidden="true" size={15} />
            )}
            월간 큐 생성
          </button>
          <button
            className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-400/35 bg-emerald-950/40 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isAutoResearching}
            onClick={() => void runMonthlyResearch()}
            type="button"
          >
            {isAutoResearching ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Sparkles aria-hidden="true" size={15} />
            )}
            자동 리서치 실행
          </button>
        </div>
      </div>

      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
            국가/지역
            <select
              className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none focus:border-[#f3d28a]"
              onChange={(event) => handleRegionChange(event.target.value)}
              value={regionId}
            >
              {MirilookRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
            리서치 연령대
            <select
              className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none focus:border-[#f3d28a]"
              onChange={(event) =>
                setAgeGroup(event.target.value as MirilookAgeGroup)
              }
              value={ageGroup}
            >
              {MirilookAgeGroups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
            추천 모드
            <select
              className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none focus:border-[#f3d28a]"
              onChange={(event) => handleAudienceChange(event.target.value)}
              value={audience}
            >
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
            플랫폼
            <select
              className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none focus:border-[#f3d28a]"
              onChange={(event) => setPlatform(event.target.value)}
              value={platform}
            >
              {platformOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
            검증 상태
            <select
              className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none focus:border-[#f3d28a]"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-md border border-[#c9a96a]/24 bg-[#0f0e0c]/72 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#fffaf1]">
                리서치 agent 조사 큐
              </p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[#b8aa95]">
                국가/연령대/성별별로 웹 검색, Instagram, YouTube, 현지 살롱 메뉴, 인플루언서
                자료를 확인하고 반복 등장하는 스타일만 priority로 저장합니다.
              </p>
            </div>
            <button
              className="inline-flex w-fit items-center gap-2 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-3 py-2 text-xs font-semibold text-[#f3d28a] transition hover:bg-[#3a2e18]"
              onClick={applyResearchQueue}
              type="button"
            >
              <Sparkles aria-hidden="true" size={14} />
              큐로 채우기
            </button>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-5">
            {monthlyQueue.map((item) => {
              const active =
                item.ageGroup === ageGroup && item.audience === audience;

              return (
                <button
                  className={`rounded-md border p-3 text-left text-xs transition ${
                    active
                      ? "border-[#f3d28a] bg-[#342816] text-[#f8d98f]"
                      : "border-white/10 bg-white/5 text-[#d8cbb8] hover:border-[#f3d28a]/45"
                  }`}
                  key={item.cacheKey}
                  onClick={() => applyResearchQueueItem(item)}
                  type="button"
                >
                  <span className="block font-semibold text-[#fffaf1]">
                    {item.ageGroup} · {item.audience === "female" ? "여성" : "남성"}
                  </span>
                  <span className="mt-2 block leading-5 text-[#b8aa95]">
                    {item.plan.title}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-5">
            {researchPlan.targets.map((target) => (
              <button
                className={`rounded-md border p-3 text-left text-xs transition ${
                  platform === target.platform
                    ? "border-[#f3d28a] bg-[#342816] text-[#f8d98f]"
                    : "border-white/10 bg-white/5 text-[#d8cbb8] hover:border-[#f3d28a]/45"
                }`}
                key={`${target.platform}-${target.query}`}
                onClick={() => {
                  setPlatform(target.platform);
                  setTitle(`${researchPlan.title} · ${target.label}`);
                }}
                type="button"
              >
                <span className="block font-semibold text-[#fffaf1]">
                  {target.label}
                </span>
                <span className="mt-2 block leading-5 text-[#b8aa95]">
                  {target.query}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8f826f]">
            {researchPlan.rankingRule}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
            근거 URL
            <input
              className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={sourceUrl}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
            confidence
            <input
              className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
              max="1"
              min="0"
              onChange={(event) => setConfidence(event.target.value)}
              step="0.01"
              type="number"
              value={confidence}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
          리서치 제목
          <input
            className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 서울 20-30대 남성 SNS 헤어 트렌드"
            value={title}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
          근거 요약
          <textarea
            className="min-h-24 rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            onChange={(event) => setSummary(event.target.value)}
            placeholder="관측한 스타일, 반복 등장한 컷/펌/컬러, 지역적 특이점, 아직 검증이 필요한 부분을 적습니다."
            value={summary}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
          priority rationale
          <textarea
            className="min-h-20 rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            onChange={(event) => setRationale(event.target.value)}
            placeholder="추천 우선순위에 반영하는 이유를 적습니다."
            value={rationale}
          />
        </label>

        <div className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#fffaf1]">
              우선 추천 스타일
            </p>
            <p className="text-xs text-[#8f826f]">
              선택 {selectedStyleIds.length}개 · 순서는 선택한 순서대로 저장
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {styles.map((style) => {
              const selected = selectedStyleIds.includes(style.id);

              return (
                <button
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-[#f3d28a] bg-[#3a2e18] text-[#f8d98f]"
                      : "border-white/10 bg-white/5 text-[#d8cbb8] hover:border-[#f3d28a]/45"
                  }`}
                  key={style.id}
                  onClick={() => toggleStyle(style.id)}
                  type="button"
                >
                  {selected ? <Check aria-hidden="true" size={14} /> : null}
                  {style.name}
                </button>
              );
            })}
          </div>
          {selectedStyles.length ? (
            <ol className="mt-3 grid gap-1 text-xs leading-5 text-[#b8aa95] sm:grid-cols-2 lg:grid-cols-3">
              {selectedStyles.map((style, index) => (
                <li key={style?.id}>
                  {index + 1}. {style?.name}
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs leading-5 text-[#8f826f]">
            저장 후 추천 API는 Supabase active priority를 우선 읽습니다. 아직 Supabase가
            연결되지 않았다면 기존 국가/성별별 seed가 계속 사용됩니다.
          </p>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 py-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffe0a0] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Sparkles aria-hidden="true" size={16} />
            )}
            트렌드 priority 저장
          </button>
        </div>

        {message ? (
          <p className="rounded-md border border-[#f3d28a]/22 bg-[#2b2112] px-3 py-2 text-sm leading-6 text-[#f3d28a]">
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
