"use client";

import { FormEvent, useState } from "react";
import { Flag, Loader2, MessageCircle, Send, ThumbsUp } from "lucide-react";
import {
  communityVoteTags,
  getGenderLabel,
  type MirilookCommunityPost,
} from "@/lib/mirilook-community";

type ApiResult = {
  accepted?: boolean;
  reason?: string;
};

export function MirilookCommunityBoard({
  connected,
  posts,
}: {
  connected: boolean;
  posts: MirilookCommunityPost[];
}) {
  const [postItems, setPostItems] = useState(posts);

  function updatePost(postId: string, patch: Partial<MirilookCommunityPost>) {
    setPostItems((current) =>
      current.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    );
  }

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ThumbsUp aria-hidden="true" className="text-[#f3d28a]" size={18} />
            <h2 className="text-lg font-semibold text-[#fffaf1]">
              스타일 투표 피드
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
            익명으로 올린 추천 스타일을 투표하고, 댓글 또는 허용된 DM으로 피드백을 남깁니다.
          </p>
        </div>
        <span
          className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${
            connected
              ? "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb]"
              : "border-[#f3d28a]/35 bg-[#30271a] text-[#f3d28a]"
          }`}
        >
          {connected ? "Live community" : "Pilot preview"}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {postItems.map((post) => (
          <CommunityPostCard
            connected={connected}
            key={post.id}
            onUpdate={updatePost}
            post={post}
          />
        ))}
      </div>
    </section>
  );
}

function CommunityPostCard({
  connected,
  onUpdate,
  post,
}: {
  connected: boolean;
  onUpdate: (postId: string, patch: Partial<MirilookCommunityPost>) => void;
  post: MirilookCommunityPost;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [voterGender, setVoterGender] = useState<"female" | "male" | "other">(
    post.targetGender === "male" || post.targetGender === "female"
      ? post.targetGender
      : "other",
  );
  const [voteComment, setVoteComment] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [dmBody, setDmBody] = useState("");
  const [dmContact, setDmContact] = useState("");
  const [senderName, setSenderName] = useState("");
  const [reportBody, setReportBody] = useState("");
  const [reportReason, setReportReason] = useState("부적절한 내용");
  const [status, setStatus] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const disabled = !connected;

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag].slice(0, 3),
    );
  }

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      setStatus("Supabase 연결 후 실제 투표가 저장됩니다.");
      return;
    }

    if (!selectedTags.length) {
      setStatus("투표 태그를 1개 이상 선택해 주세요.");
      return;
    }

    setIsVoting(true);
    setStatus("");

    try {
      const result = await postJson("/api/community/votes/", {
        comment: voteComment,
        postId: post.id,
        tags: selectedTags,
        voterGender,
      });

      if (!result.accepted) {
        setStatus(mapCommunityReason(result.reason));
        return;
      }

      onUpdate(post.id, {
        topTags: Array.from(new Set([...selectedTags, ...post.topTags])).slice(0, 3),
        voteCount: post.voteCount + 1,
      });
      setVoteComment("");
      setStatus("투표가 반영되었습니다.");
    } catch (error) {
      console.error(error);
      setStatus("투표 저장에 실패했습니다.");
    } finally {
      setIsVoting(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      setStatus("Supabase 연결 후 댓글을 저장할 수 있습니다.");
      return;
    }

    if (!commentBody.trim()) {
      setStatus("댓글 내용을 입력해 주세요.");
      return;
    }

    setIsCommenting(true);
    setStatus("");

    try {
      const result = await postJson("/api/community/comments/", {
        body: commentBody,
        postId: post.id,
      });

      if (!result.accepted) {
        setStatus(mapCommunityReason(result.reason));
        return;
      }

      setCommentBody("");
      setStatus("댓글이 접수되었습니다. 운영 확인 후 공개됩니다.");
    } catch (error) {
      console.error(error);
      setStatus("댓글 저장에 실패했습니다.");
    } finally {
      setIsCommenting(false);
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      setStatus("Supabase 연결 후 DM 요청을 저장할 수 있습니다.");
      return;
    }

    if (!dmBody.trim()) {
      setStatus("메시지 내용을 입력해 주세요.");
      return;
    }

    setIsMessaging(true);
    setStatus("");

    try {
      const result = await postJson("/api/community/messages/", {
        body: dmBody,
        contact: dmContact,
        postId: post.id,
        senderName,
      });

      if (!result.accepted) {
        setStatus(mapCommunityReason(result.reason));
        return;
      }

      setDmBody("");
      setDmContact("");
      setSenderName("");
      setStatus("DM 요청이 접수되었습니다. 운영 확인 후 전달됩니다.");
    } catch (error) {
      console.error(error);
      setStatus("DM 요청 저장에 실패했습니다.");
    } finally {
      setIsMessaging(false);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      setStatus("Supabase 연결 후 신고를 접수할 수 있습니다.");
      return;
    }

    setIsReporting(true);
    setStatus("");

    try {
      const result = await postJson("/api/moderation/reports/", {
        body: reportBody,
        reason: reportReason,
        targetId: post.id,
        targetType: "community_post",
      });

      if (!result.accepted) {
        setStatus(mapCommunityReason(result.reason));
        return;
      }

      setReportBody("");
      setReportReason("부적절한 내용");
      setIsReportOpen(false);
      setStatus("신고가 접수되었습니다. 운영자가 확인하겠습니다.");
    } catch (error) {
      console.error(error);
      setStatus("신고 접수 중 오류가 발생했습니다.");
    } finally {
      setIsReporting(false);
    }
  }

  return (
    <article className="rounded-md border border-white/8 bg-[#0f0e0c]/72 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#8f826f]">
            <span>{post.anonymousName}</span>
            <span>{getGenderLabel(post.requesterGender)}</span>
            <span>
              투표 대상{" "}
              {post.targetGender ? getGenderLabel(post.targetGender) : "전체"}
            </span>
            <span>{post.purpose}</span>
            <span>{post.dmPolicy === "allow" ? "DM 허용" : "DM 비허용"}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-[#fffaf1]">
            {post.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#b8aa95]">{post.body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md bg-[#30271a] px-2 py-1 text-[#f3d28a]">
            투표 {post.voteCount}
          </span>
          <span className="rounded-md bg-white/7 px-2 py-1 text-[#b8aa95]">
            댓글 {post.commentCount}
          </span>
          <button
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[#b8aa95] transition hover:border-[#f3d28a]/40 hover:text-[#f3d28a]"
            onClick={() => setIsReportOpen((current) => !current)}
            type="button"
          >
            <Flag aria-hidden="true" size={12} />
            신고
          </button>
        </div>
      </div>

      {post.topTags.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.topTags.map((tag) => (
            <span
              className="rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#d8cbb8]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {isReportOpen ? (
        <form
          className="mt-4 rounded-md border border-[#f3d28a]/20 bg-[#17130d] p-3"
          onSubmit={submitReport}
        >
          <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_96px]">
            <select
              className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-2 text-sm text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
              onChange={(event) => setReportReason(event.target.value)}
              value={reportReason}
            >
              <option value="부적절한 내용">부적절한 내용</option>
              <option value="개인정보 노출">개인정보 노출</option>
              <option value="광고/스팸">광고/스팸</option>
              <option value="비방/괴롭힘">비방/괴롭힘</option>
              <option value="기타 운영 확인 필요">기타 운영 확인 필요</option>
            </select>
            <input
              className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              onChange={(event) => setReportBody(event.target.value)}
              placeholder="운영자가 확인할 내용을 간단히 적어주세요"
              value={reportBody}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#3a2e18] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isReporting}
              type="submit"
            >
              {isReporting ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={14} />
              ) : (
                <Flag aria-hidden="true" size={14} />
              )}
              접수
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
        <form
          className="rounded-md border border-white/8 bg-[#15130f] p-3"
          onSubmit={submitVote}
        >
          <p className="text-sm font-semibold text-[#fffaf1]">투표하기</p>
          <label className="mt-3 grid gap-1 text-xs font-semibold text-[#b8aa95]">
            나는
            <select
              className="h-9 rounded-md border border-white/10 bg-[#0f0e0c] px-2 text-sm text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
              onChange={(event) =>
                setVoterGender(
                  event.target.value === "male" ||
                    event.target.value === "female"
                    ? event.target.value
                    : "other",
                )
              }
              value={voterGender}
            >
              <option value="female">여성</option>
              <option value="male">남성</option>
              <option value="other">기타/비공개</option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {communityVoteTags.map((tag) => {
              const selected = selectedTags.includes(tag);

              return (
                <button
                  className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                    selected
                      ? "border-[#f3d28a] bg-[#30271a] text-[#f3d28a]"
                      : "border-white/10 bg-white/5 text-[#b8aa95] hover:border-[#f3d28a]/45"
                  }`}
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  type="button"
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <input
            className="mt-3 h-10 w-full rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
            onChange={(event) => setVoteComment(event.target.value)}
            placeholder="짧은 의견"
            value={voteComment}
          />
          <button
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isVoting}
            type="submit"
          >
            {isVoting ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <ThumbsUp aria-hidden="true" size={15} />
            )}
            투표 저장
          </button>
        </form>

        <div className="grid gap-3">
          <form
            className="rounded-md border border-white/8 bg-[#15130f] p-3"
            onSubmit={submitComment}
          >
            <p className="text-sm font-semibold text-[#fffaf1]">댓글</p>
            <textarea
              className="mt-3 min-h-20 w-full resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="익명 댓글"
              value={commentBody}
            />
            <button
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isCommenting}
              type="submit"
            >
              {isCommenting ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <MessageCircle aria-hidden="true" size={15} />
              )}
              댓글 접수
            </button>
          </form>

          {post.dmPolicy === "allow" ? (
            <form
              className="rounded-md border border-[#f3d28a]/18 bg-[#19150f] p-3"
              onSubmit={submitMessage}
            >
              <p className="text-sm font-semibold text-[#fffaf1]">DM 요청</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  onChange={(event) => setSenderName(event.target.value)}
                  placeholder="닉네임"
                  value={senderName}
                />
                <input
                  className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  onChange={(event) => setDmContact(event.target.value)}
                  placeholder="연락처 선택"
                  value={dmContact}
                />
              </div>
              <textarea
                className="mt-2 min-h-20 w-full resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                onChange={(event) => setDmBody(event.target.value)}
                placeholder="보낼 메시지"
                value={dmBody}
              />
              <button
                className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#3a2e18] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isMessaging}
                type="submit"
              >
                {isMessaging ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                ) : (
                  <Send aria-hidden="true" size={15} />
                )}
                DM 요청
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {status ? (
        <p className="mt-3 rounded-md border border-white/10 bg-[#15130f] px-3 py-2 text-sm leading-6 text-[#d8cbb8]">
          {status}
        </p>
      ) : null}
    </article>
  );
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResult;

  if (!response.ok) {
    return {
      accepted: false,
      reason: payload.reason ?? `server_${response.status}`,
    };
  }

  return payload;
}

function mapCommunityReason(reason: string | undefined) {
  switch (reason) {
    case "supabase_not_configured":
      return "Supabase 전용 프로젝트 연결 후 저장할 수 있습니다.";
    case "dm_not_allowed":
      return "이 투표 요청은 DM을 허용하지 않았습니다.";
    case "post_not_available":
      return "공개된 투표 요청에만 참여할 수 있습니다.";
    case "post_not_found":
      return "게시글을 찾을 수 없거나 비공개 처리되었습니다.";
    case "target_gender_mismatch":
      return "이 투표는 요청자가 지정한 대상 성별만 참여할 수 있습니다.";
    case "supabase_insert_failed":
      return "저장 중 오류가 발생했습니다. 관리자 화면에서 DB 상태를 확인해 주세요.";
    case "server_400":
      return "신고 대상을 확인할 수 없습니다.";
    default:
      return "요청을 처리하지 못했습니다.";
  }
}
