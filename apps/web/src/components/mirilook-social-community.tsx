/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Camera,
  Copy,
  Flag,
  Hash,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Search,
  Send,
  Share2,
  Sparkles,
  ThumbsDown,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  normalizeHashtags,
  type MirilookSocialComment,
  type MirilookSocialPost,
  type MirilookSocialProfile,
} from "@/lib/mirilook-social";
import {
  getSupabaseAccessToken,
  getSupabaseBrowserClient,
  getSupabaseHistoryOwnerId,
} from "@/lib/supabase-browser";
import { useSearchParams } from "next/navigation";

type HairMoneyRewardResult = {
  alreadyRewarded?: boolean;
  amount?: number;
  applied?: boolean;
  balance?: number | null;
};

type SocialPostResult = {
  accepted?: boolean;
  hairMoneyReward?: HairMoneyRewardResult;
  post?: MirilookSocialPost;
  reason?: string;
};

function buildShareSuccessMessage(reward?: HairMoneyRewardResult) {
  const base = "커뮤니티 피드에 사진이 올라갔습니다.";

  if (reward?.applied && reward.amount) {
    return `${base} Hair Money ${reward.amount}개가 적립되었어요.`;
  }

  return base;
}

type SimpleApiResult = {
  accepted?: boolean;
  reason?: string;
};

type SocialPostMutationResult = SimpleApiResult & {
  deleted?: boolean;
  post?: Partial<MirilookSocialPost> & { id?: string };
  postId?: string;
};

type SocialDmMessage = {
  attachmentUrls?: string[];
  body: string;
  contact?: string;
  createdAt: string;
  hasUnreadReceipt?: boolean;
  id: string;
  isMine: boolean;
  readAt?: string | null;
  senderDisplayName: string;
  senderProfileId?: string | null;
};

type SocialDmThread = {
  conversationKey: string;
  lastMessageAt: string;
  messages: SocialDmMessage[];
  partner: MirilookSocialProfile;
  postId?: string | null;
  postSummary: string;
  unreadCount?: number;
};

type SocialMemberSearchResult = SimpleApiResult & {
  profiles?: MirilookSocialProfile[];
};

type SocialDmThreadsResult = SimpleApiResult & {
  threads?: SocialDmThread[];
};

type SocialDmSendResult = SimpleApiResult & {
  conversationKey?: string;
  degraded?: boolean;
  message?: SocialDmMessage;
  thread?: SocialDmThread;
};

type SocialDmRealtimeStatus = "idle" | "connecting" | "live" | "fallback";

type ShareApiResult = SimpleApiResult & {
  shareCount?: number | null;
};

type ReactionApiResult = SimpleApiResult & {
  dislikeCount?: number;
  likeCount?: number;
};

type CommentApiResult = SimpleApiResult & {
  comment?: MirilookSocialComment;
  commentCount?: number | null;
};

type ReportApiResult = SimpleApiResult & {
  reportId?: string;
};

type PendingUploadImage = {
  file: File;
  id: string;
  previewUrl: string;
};

const maxUploadImageCount = 6;
const maxDmAttachmentCount = 3;

export function MirilookSocialCommunity({
  connected,
  posts,
  profiles,
}: {
  connected: boolean;
  posts: MirilookSocialPost[];
  profiles: MirilookSocialProfile[];
}) {
  const searchParams = useSearchParams();
  const focusedPostId = searchParams.get("post") ?? "";
  const [postItems, setPostItems] = useState(posts);
  const [currentProfileId, setCurrentProfileId] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFeedOpen, setIsFeedOpen] = useState(true);
  const [isMemberSearchDialogOpen, setIsMemberSearchDialogOpen] = useState(false);
  const [isDmInboxDialogOpen, setIsDmInboxDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [hashtagText, setHashtagText] = useState("");
  const [dmPolicy, setDmPolicy] = useState<"allow" | "deny">("allow");
  const [uploadImages, setUploadImages] = useState<PendingUploadImage[]>([]);
  const uploadPreviewUrlsRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberResults, setMemberResults] = useState<MirilookSocialProfile[]>([]);
  const [memberSearchStatus, setMemberSearchStatus] = useState("");
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [dmThreads, setDmThreads] = useState<SocialDmThread[]>([]);
  const [activeThreadKey, setActiveThreadKey] = useState("");
  const [isDmThreadPanelOpen, setIsDmThreadPanelOpen] = useState(true);
  const [directRecipient, setDirectRecipient] = useState<MirilookSocialProfile | null>(null);
  const [directBody, setDirectBody] = useState("");
  const [directAttachments, setDirectAttachments] = useState<PendingUploadImage[]>([]);
  const [directStatus, setDirectStatus] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<PendingUploadImage[]>([]);
  const [dmInboxStatus, setDmInboxStatus] = useState("");
  const [dmRealtimeStatus, setDmRealtimeStatus] =
    useState<SocialDmRealtimeStatus>(connected ? "fallback" : "idle");
  const [isLoadingDmThreads, setIsLoadingDmThreads] = useState(false);
  const [isSendingDirectDm, setIsSendingDirectDm] = useState(false);
  const [isSendingThreadMessage, setIsSendingThreadMessage] = useState(false);
  const dmPreviewUrlsRef = useRef<Set<string>>(new Set());
  const dmRealtimeReloadTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      uploadPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      uploadPreviewUrlsRef.current.clear();
      dmPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      dmPreviewUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    void getSupabaseHistoryOwnerId().then((ownerId) => {
      setCurrentProfileId(ownerId === "anonymous" ? "" : ownerId);
    });
  }, []);

  const filteredProfiles = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return profiles.slice(0, 8);
    }

    return profiles
      .filter((profile) =>
        [profile.displayName, profile.handle, profile.bio]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 8);
  }, [profiles, query]);

  const visibleProfiles = memberResults.length ? memberResults : filteredProfiles;
  const activeDmThread = useMemo(
    () => dmThreads.find((thread) => thread.conversationKey === activeThreadKey) ?? null,
    [activeThreadKey, dmThreads],
  );

  const recommendedPosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const sorted = [...postItems]
      .filter((post) => {
        if (focusedPostId && post.id === focusedPostId) {
          return true;
        }

        if (!keyword) {
          return true;
        }

        return [post.body, post.displayName, post.handle, ...post.hashtags]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .sort(compareSocialPostsByNewest);

    if (!focusedPostId) {
      if (!keyword && sorted.every(isPilotSocialPost)) {
        return orderPilotSocialPosts(sorted);
      }

      return sorted;
    }

    const focusedIndex = sorted.findIndex((post) => post.id === focusedPostId);

    if (focusedIndex <= 0) {
      return sorted;
    }

    const focused = sorted[focusedIndex];

    return [
      focused,
      ...sorted.slice(0, focusedIndex),
      ...sorted.slice(focusedIndex + 1),
    ];
  }, [focusedPostId, postItems, query]);

  const loadDmThreads = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const token = await getSupabaseAccessToken();

    if (!token) {
      setDmInboxStatus("로그인하면 회원 간 DM 대화함을 사용할 수 있습니다.");
      setDmThreads([]);
      return;
    }

    if (!silent) {
      setIsLoadingDmThreads(true);
      setDmInboxStatus("");
    }

    try {
      const response = await fetch("/api/community/social-messages/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json().catch(() => ({}))) as SocialDmThreadsResult;

      if (!response.ok || !result.accepted) {
        if (!silent) {
          setDmInboxStatus(mapSocialReason(result.reason));
        }
        return;
      }

      const nextThreads = result.threads ?? [];

      setDmThreads((current) => {
        const merged = mergeDmThreadLists(current, nextThreads);

        return areDmThreadListsEqual(current, merged) ? current : merged;
      });
      setActiveThreadKey((current) =>
        current && nextThreads.some((thread) => thread.conversationKey === current)
          ? current
          : nextThreads[0]?.conversationKey ?? "",
      );
      if (!silent) {
        setDmInboxStatus(nextThreads.length ? "" : "아직 받은 DM이 없습니다.");
      } else if (nextThreads.length) {
        setDmInboxStatus("");
      }
    } catch (error) {
      console.error(error);
      if (!silent) {
        setDmInboxStatus("DM 대화함을 불러오지 못했습니다.");
      }
    } finally {
      if (!silent) {
        setIsLoadingDmThreads(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadDmThreads();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [connected, loadDmThreads]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    if (!currentProfileId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    let isActive = true;

    function scheduleDmThreadRefresh() {
      if (dmRealtimeReloadTimerRef.current) {
        window.clearTimeout(dmRealtimeReloadTimerRef.current);
      }

      dmRealtimeReloadTimerRef.current = window.setTimeout(() => {
        void loadDmThreads({ silent: true });
      }, 180);
    }

    const channel = supabase
      .channel(`social-dm-${currentProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `sender_profile_id=eq.${currentProfileId}`,
          schema: "public",
          table: "social_messages",
        },
        scheduleDmThreadRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `recipient_profile_id=eq.${currentProfileId}`,
          schema: "public",
          table: "social_messages",
        },
        scheduleDmThreadRefresh,
      )
      .subscribe((status) => {
        if (!isActive) {
          return;
        }

        if (status === "SUBSCRIBED") {
          setDmRealtimeStatus("live");
          return;
        }

        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          setDmRealtimeStatus("fallback");
        }
      });

    return () => {
      isActive = false;
      if (dmRealtimeReloadTimerRef.current) {
        window.clearTimeout(dmRealtimeReloadTimerRef.current);
        dmRealtimeReloadTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [connected, currentProfileId, loadDmThreads]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const intervalMs = dmRealtimeStatus === "live" ? 30000 : 3000;
    const timer = window.setInterval(() => {
      void loadDmThreads({ silent: true });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [connected, dmRealtimeStatus, loadDmThreads]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    function refreshVisibleDmThreads() {
      if (document.visibilityState === "visible") {
        void loadDmThreads({ silent: true });
      }
    }

    window.addEventListener("focus", refreshVisibleDmThreads);
    document.addEventListener("visibilitychange", refreshVisibleDmThreads);

    return () => {
      window.removeEventListener("focus", refreshVisibleDmThreads);
      document.removeEventListener("visibilitychange", refreshVisibleDmThreads);
    };
  }, [connected, loadDmThreads]);

  function toggleDmThreadPanel(conversationKey: string) {
    const isSameThread = activeThreadKey === conversationKey;

    setActiveThreadKey(conversationKey);
    setIsDmThreadPanelOpen((current) => (isSameThread ? !current : true));
    setReplyBody("");
    clearDmAttachments("reply");
    setDmInboxStatus("");
  }

  async function markDmThreadRead(conversationKey: string) {
    const token = await getSupabaseAccessToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch("/api/community/social-messages/", {
        body: JSON.stringify({ conversationKey }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json().catch(() => ({}))) as SimpleApiResult;

      if (!response.ok || !result.accepted) {
        return;
      }

      const readAt = new Date().toISOString();
      setDmThreads((current) =>
        current.map((thread) =>
          thread.conversationKey === conversationKey
            ? {
                ...thread,
                messages: thread.messages.map((message) =>
                  message.isMine
                    ? message
                    : {
                        ...message,
                        readAt: message.readAt ?? readAt,
                      },
                ),
                unreadCount: 0,
              }
            : thread,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!isDmThreadPanelOpen) {
      return;
    }

    if (!activeThreadKey) {
      return;
    }

    const activeThread = dmThreads.find(
      (thread) => thread.conversationKey === activeThreadKey,
    );

    if (!activeThread?.unreadCount) {
      return;
    }

    const timer = window.setTimeout(() => {
      void markDmThreadRead(activeThread.conversationKey);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeThreadKey, dmThreads, isDmThreadPanelOpen]);

  async function searchMembers(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    setIsSearchingMembers(true);
    setMemberSearchStatus("");

    try {
      const params = new URLSearchParams();
      const keyword = query.trim();

      if (keyword) {
        params.set("q", keyword);
      }

      const response = await fetch(`/api/community/social-members/?${params.toString()}`);
      const result = (await response.json().catch(() => ({}))) as SocialMemberSearchResult;

      if (!response.ok || !result.accepted) {
        setMemberSearchStatus(mapSocialReason(result.reason));
        return;
      }

      const nextProfiles = result.profiles ?? [];

      setMemberResults(nextProfiles);
      setMemberSearchStatus(
        nextProfiles.length ? `${nextProfiles.length}명을 찾았습니다.` : "검색된 회원이 없습니다.",
      );
    } catch (error) {
      console.error(error);
      setMemberSearchStatus("회원 검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearchingMembers(false);
    }
  }

  async function sendDirectDm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!directRecipient) {
      setDirectStatus("DM을 보낼 회원을 먼저 선택해 주세요.");
      return;
    }

    if (!directBody.trim() && !directAttachments.length) {
      setDirectStatus("보낼 메시지를 입력해 주세요.");
      return;
    }

    const token = await getSupabaseAccessToken();

    if (!token) {
      setDirectStatus("로그인 후 DM을 보낼 수 있습니다.");
      return;
    }

    setIsSendingDirectDm(true);
    setDirectStatus("");

    try {
      const formData = new FormData();
      formData.append("body", directBody);
      formData.append("recipientDisplayName", directRecipient.displayName);
      formData.append("recipientHandle", directRecipient.handle);
      formData.append("recipientProfileId", directRecipient.id);
      directAttachments.forEach((image) => {
        formData.append("attachments", image.file, image.file.name);
      });

      const response = await fetch("/api/community/social-messages/", {
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as SocialDmSendResult;

      if (!response.ok || !result.accepted) {
        setDirectStatus(mapSocialReason(result.reason));
        return;
      }

      setDirectBody("");
      clearDmAttachments("direct");
      setDirectStatus("DM을 보냈습니다. 대화함에서 이어서 대화할 수 있습니다.");
      mergeDmThread(result.thread);
      void loadDmThreads();
      if (result.conversationKey) {
        setActiveThreadKey(result.conversationKey);
        setIsDmThreadPanelOpen(true);
      }
    } catch (error) {
      console.error(error);
      setDirectStatus("DM 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingDirectDm(false);
    }
  }

  async function sendThreadReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeDmThread) {
      setDmInboxStatus("답장할 DM 대화를 먼저 선택해 주세요.");
      return;
    }

    if (!replyBody.trim() && !replyAttachments.length) {
      setDmInboxStatus("답장 내용을 입력해 주세요.");
      return;
    }

    const token = await getSupabaseAccessToken();

    if (!token) {
      setDmInboxStatus("로그인 후 답장할 수 있습니다.");
      return;
    }

    setIsSendingThreadMessage(true);
    setDmInboxStatus("");

    try {
      const formData = new FormData();
      formData.append("body", replyBody);
      formData.append("conversationKey", activeDmThread.conversationKey);
      if (activeDmThread.postId) {
        formData.append("postId", activeDmThread.postId);
      }
      formData.append("recipientDisplayName", activeDmThread.partner.displayName);
      formData.append("recipientHandle", activeDmThread.partner.handle);
      formData.append("recipientProfileId", activeDmThread.partner.id);
      replyAttachments.forEach((image) => {
        formData.append("attachments", image.file, image.file.name);
      });

      const response = await fetch("/api/community/social-messages/", {
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as SocialDmSendResult;

      if (!response.ok || !result.accepted) {
        setDmInboxStatus(mapSocialReason(result.reason));
        return;
      }

      setReplyBody("");
      clearDmAttachments("reply");
      mergeDmThread(result.thread);
      void loadDmThreads();
      if (result.conversationKey) {
        setActiveThreadKey(result.conversationKey);
        setIsDmThreadPanelOpen(true);
      }
    } catch (error) {
      console.error(error);
      setDmInboxStatus("답장 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingThreadMessage(false);
    }
  }

  function addDmAttachments(target: "direct" | "reply", fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((file) =>
      /^image\/(jpeg|png|webp)$/.test(file.type),
    );
    const setMessage = target === "direct" ? setDirectStatus : setDmInboxStatus;
    const setImages = target === "direct" ? setDirectAttachments : setReplyAttachments;

    if (!files.length) {
      setMessage("jpg, png, webp 이미지만 첨부할 수 있습니다.");
      return;
    }

    setImages((current) => {
      const remainingSlots = maxDmAttachmentCount - current.length;
      const selected = files.slice(0, Math.max(0, remainingSlots));

      if (!selected.length) {
        setMessage(`DM 사진은 최대 ${maxDmAttachmentCount}장까지 첨부할 수 있습니다.`);
        return current;
      }

      const nextItems = selected.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        dmPreviewUrlsRef.current.add(previewUrl);

        return {
          file,
          id: crypto.randomUUID(),
          previewUrl,
        };
      });

      if (files.length > selected.length) {
        setMessage(`DM 사진은 최대 ${maxDmAttachmentCount}장까지만 반영했습니다.`);
      } else {
        setMessage("");
      }

      return [...current, ...nextItems];
    });
  }

  function removeDmAttachment(target: "direct" | "reply", id: string) {
    const setImages = target === "direct" ? setDirectAttachments : setReplyAttachments;

    setImages((current) => {
      const item = current.find((image) => image.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        dmPreviewUrlsRef.current.delete(item.previewUrl);
      }

      return current.filter((image) => image.id !== id);
    });
  }

  function clearDmAttachments(target: "direct" | "reply") {
    const setImages = target === "direct" ? setDirectAttachments : setReplyAttachments;

    setImages((current) => {
      current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
        dmPreviewUrlsRef.current.delete(image.previewUrl);
      });

      return [];
    });
  }

  function addUploadImages(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((file) =>
      /^image\/(jpeg|png|webp)$/.test(file.type),
    );

    if (!files.length) {
      setStatus("jpg, png, webp 이미지만 올릴 수 있습니다.");
      return;
    }

    setUploadImages((current) => {
      const remainingSlots = maxUploadImageCount - current.length;
      const selected = files.slice(0, Math.max(0, remainingSlots));

      if (!selected.length) {
        setStatus(`사진은 최대 ${maxUploadImageCount}장까지 올릴 수 있습니다.`);
        return current;
      }

      const nextItems = selected.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        uploadPreviewUrlsRef.current.add(previewUrl);

        return {
          file,
          id: crypto.randomUUID(),
          previewUrl,
        };
      });

      if (files.length > selected.length) {
        setStatus(`사진은 최대 ${maxUploadImageCount}장까지 올릴 수 있어요. 먼저 선택된 순서대로 반영했습니다.`);
      } else {
        setStatus("");
      }

      return [...current, ...nextItems];
    });
  }

  function clearUploadImages() {
    uploadPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    uploadPreviewUrlsRef.current.clear();
    setUploadImages([]);
  }

  function moveUploadImage(index: number, direction: -1 | 1) {
    setUploadImages((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);

      if (!item) {
        return current;
      }

      next.splice(targetIndex, 0, item);

      return next;
    });
  }

  function removeUploadImage(id: string) {
    setUploadImages((current) => {
      const item = current.find((image) => image.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        uploadPreviewUrlsRef.current.delete(item.previewUrl);
      }

      return current.filter((image) => image.id !== id);
    });
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadImages.length) {
      setStatus("사진을 1장 이상 첨부해 주세요.");
      return;
    }

    if (!body.trim()) {
      setStatus("사진과 함께 보여줄 글을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setStatus("로그인 후 커뮤니티에 사진을 올릴 수 있습니다.");
        return;
      }

      const formData = new FormData();
      formData.append("body", body);
      formData.append("dmPolicy", dmPolicy);
      formData.append("hashtags", hashtagText);
      uploadImages.forEach((image) => {
        formData.append("images", image.file, image.file.name);
      });

      const response = await fetch("/api/community/social-posts/", {
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as SocialPostResult;

      if (!response.ok || !result.accepted || !result.post) {
        setStatus(mapSocialReason(result.reason));
        return;
      }

      setPostItems((current) => [result.post as MirilookSocialPost, ...current]);
      setBody("");
      setHashtagText("");
      clearUploadImages();
      setStatus(buildShareSuccessMessage(result.hairMoneyReward));
    } catch (error) {
      console.error(error);
      setStatus("게시물 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updatePost(postId: string, patch: Partial<MirilookSocialPost>) {
    setPostItems((current) =>
      current.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    );
  }

  function removePost(postId: string) {
    setPostItems((current) => current.filter((post) => post.id !== postId));
  }

  function mergeDmThread(thread: SocialDmThread | undefined) {
    if (!thread) {
      return;
    }

    setDmThreads((current) => {
      const existing = current.find(
        (item) => item.conversationKey === thread.conversationKey,
      );
      const mergedMessages = mergeDmMessages(existing?.messages ?? [], thread.messages);
      const nextThread: SocialDmThread = {
        ...thread,
        lastMessageAt: thread.lastMessageAt || existing?.lastMessageAt || new Date().toISOString(),
        messages: mergedMessages,
        unreadCount: existing?.unreadCount ?? thread.unreadCount ?? 0,
      };
      const nextThreads = [
        nextThread,
        ...current.filter((item) => item.conversationKey !== thread.conversationKey),
      ];

      return nextThreads.sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );
    });
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-4">
        {[
          {
            body: "여러 장의 사진을 새 게시물로 올립니다.",
            icon: Camera,
            isActive: isUploadDialogOpen,
            onClick: () => setIsUploadDialogOpen(true),
            title: "사진 피드",
          },
          {
            body: isFeedOpen ? "아래 스타일 피드를 접습니다." : "아래 스타일 피드를 엽니다.",
            icon: Sparkles,
            isActive: isFeedOpen,
            onClick: () => setIsFeedOpen((current) => !current),
            title: "피드 탐색",
          },
          {
            body: "받은 메시지와 답장을 확인합니다.",
            icon: MessageCircle,
            isActive: isDmInboxDialogOpen,
            onClick: () => {
              setIsDmInboxDialogOpen(true);
              void loadDmThreads();
            },
            title: "댓글 / DM",
          },
          {
            body: "@ID로 회원을 찾습니다.",
            icon: Search,
            isActive: isMemberSearchDialogOpen,
            onClick: () => setIsMemberSearchDialogOpen(true),
            title: "ID 검색",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <button
              aria-expanded={item.isActive}
              className={`rounded-md border p-4 text-left transition ${
                item.isActive
                  ? "border-[#f3d28a]/70 bg-[#211b11] shadow-[0_0_0_1px_rgba(243,210,138,0.18)]"
                  : "border-[#2b281f] bg-[#171511]/92 hover:border-[#f3d28a]/55 hover:bg-[#1d1912]"
              }`}
              key={item.title}
              onClick={item.onClick}
              type="button"
            >
              <Icon aria-hidden="true" className="text-[#f3d28a]" size={20} />
              <span className="mt-3 block text-base font-semibold text-[#fffaf1]">
                {item.title}
              </span>
              <span className="mt-2 block text-sm leading-6 text-[#b8aa95]">
                {item.body}
              </span>
            </button>
          );
        })}
      </section>

      <div className="grid gap-5">
        <section className="grid gap-5">
        {isUploadDialogOpen ? (
          <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/72 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-5xl">
              <div className="mb-2 flex justify-end">
                <button
                  aria-label="사진 피드 닫기"
                  className="inline-flex size-10 items-center justify-center rounded-md border border-white/10 bg-[#171511] text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                  onClick={() => setIsUploadDialogOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <form
                className="rounded-lg border border-[#2b281f] bg-[#171511] p-4 shadow-2xl shadow-black/40"
                onSubmit={submitPost}
              >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ImagePlus aria-hidden="true" className="text-[#f3d28a]" size={20} />
                <h2 className="text-lg font-semibold text-[#fffaf1]">
                  사진과 스타일 기록 올리기
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                폰이나 웹에 있는 사진을 첨부하고, 글과 해시태그를 함께 올릴 수
                있습니다.
              </p>
            </div>
            <span
              className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${
                connected
                  ? "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb]"
                  : "border-[#f3d28a]/35 bg-[#30271a] text-[#f3d28a]"
              }`}
            >
              {connected ? "Live feed" : "Pilot preview"}
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#c9a96a]/50 bg-[#0f0e0c]/80 text-center transition hover:border-[#f3d28a] hover:bg-[#17130d]">
              {uploadImages.length ? (
                <span className="relative block h-full min-h-72 w-full overflow-hidden rounded-lg">
                  <img
                    alt="대표 업로드 미리보기"
                    className="h-full max-h-72 w-full object-contain"
                    src={uploadImages[0].previewUrl}
                  />
                  <span className="absolute right-3 top-3 rounded-md bg-black/65 px-2 py-1 text-xs font-bold text-white">
                    1/{uploadImages.length}
                  </span>
                  <span className="absolute inset-x-3 bottom-3 rounded-md bg-black/65 px-3 py-2 text-xs font-semibold text-white">
                    클릭해서 사진 추가
                  </span>
                </span>
              ) : (
                <>
                  <ImagePlus aria-hidden="true" className="text-[#f3d28a]" size={42} />
                  <span className="mt-3 text-base font-semibold text-[#fffaf1]">
                    사진 여러 장 첨부
                  </span>
                  <span className="mt-1 text-sm text-[#b8aa95]">
                    jpg, png, webp · 최대 {maxUploadImageCount}장
                  </span>
                </>
              )}
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                multiple
                onChange={(event) => {
                  addUploadImages(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>

            <div className="grid gap-3">
              <textarea
                className="min-h-32 resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-3 text-sm leading-6 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                onChange={(event) => setBody(event.target.value)}
                placeholder="오늘 받은 헤어 추천, 시술 전 고민, 코디나 메이크업 기록을 적어보세요."
                value={body}
              />
              <label className="grid gap-2 text-sm font-semibold text-[#d8cbb8]">
                <span className="inline-flex items-center gap-2">
                  <Hash aria-hidden="true" className="text-[#f3d28a]" size={15} />
                  해시태그
                </span>
                <input
                  className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  onChange={(event) => setHashtagText(event.target.value)}
                  placeholder="#리프컷 #중단발 #퍼스널컬러"
                  value={hashtagText}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {["커튼펌", "레이어드컷", "애쉬브라운", "소개팅룩"].map((tag) => (
                  <button
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                    key={tag}
                    onClick={() => appendTag(tag)}
                    type="button"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              {uploadImages.length ? (
                <div className="grid gap-2 rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#fffaf1]">
                      사진 순서
                    </p>
                    <button
                      className="text-xs font-semibold text-[#f3d28a] transition hover:text-[#ffdf98]"
                      onClick={clearUploadImages}
                      type="button"
                    >
                      전체 삭제
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {uploadImages.map((image, index) => (
                      <article
                        className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-md border border-white/8 bg-white/[0.03] p-2"
                        key={image.id}
                      >
                        <img
                          alt={`${index + 1}번째 업로드 이미지`}
                          className="size-16 rounded-md bg-black object-contain"
                          src={image.previewUrl}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#fffaf1]">
                            {index + 1}/{uploadImages.length} · {image.file.name}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <button
                              aria-label="앞 순서로 이동"
                              className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:opacity-35"
                              disabled={index === 0}
                              onClick={() => moveUploadImage(index, -1)}
                              type="button"
                            >
                              <ArrowLeft aria-hidden="true" size={14} />
                            </button>
                            <button
                              aria-label="뒤 순서로 이동"
                              className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:opacity-35"
                              disabled={index === uploadImages.length - 1}
                              onClick={() => moveUploadImage(index, 1)}
                              type="button"
                            >
                              <ArrowRight aria-hidden="true" size={14} />
                            </button>
                            <button
                              aria-label="사진 삭제"
                              className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                              onClick={() => removeUploadImage(image.id)}
                              type="button"
                            >
                              <Trash2 aria-hidden="true" size={14} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-md border border-white/10 bg-[#0f0e0c] p-1">
                  {[
                    { label: "DM 허용", value: "allow" },
                    { label: "DM 비허용", value: "deny" },
                  ].map((item) => (
                    <button
                      className={`rounded px-3 py-2 text-sm font-semibold transition ${
                        dmPolicy === item.value
                          ? "bg-[#f3d28a] text-[#171511]"
                          : "text-[#b8aa95] hover:text-[#f3d28a]"
                      }`}
                      key={item.value}
                      onClick={() => setDmPolicy(item.value as "allow" | "deny")}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                  ) : (
                    <Send aria-hidden="true" size={16} />
                  )}
                  피드에 올리기
                </button>
              </div>
              {status ? (
                <p className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm leading-6 text-[#d8cbb8]">
                  {status}
                </p>
              ) : null}
            </div>
          </div>
              </form>
            </div>
          </div>
        ) : null}

        {isFeedOpen ? (
          <section className="rounded-lg border border-[#2b281f] bg-[#171511]/92 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={19} />
                <h2 className="text-lg font-semibold text-[#fffaf1]">
                  스타일 피드
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                해시태그, 반응 수, 최신성을 기준으로 섞어서 보여줍니다.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f826f]"
                size={16}
              />
              <input
                className="h-11 w-full rounded-md border border-white/10 bg-[#0f0e0c] pl-9 pr-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ID, 해시태그, 글 검색"
                value={query}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {popularTags(postItems).map((tag) => (
              <button
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                key={tag}
                onClick={() => setQuery(tag)}
                type="button"
              >
                #{tag}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4">
            {recommendedPosts.map((post) => (
              <SocialPostCard
                currentProfileId={currentProfileId}
                isHighlighted={post.id === focusedPostId}
                key={post.id}
                onDelete={removePost}
                onDmSent={loadDmThreads}
                onUpdate={updatePost}
                post={post}
              />
            ))}
            {!recommendedPosts.length ? (
              <p className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-6 text-center text-sm text-[#b8aa95]">
                검색 결과가 없습니다.
              </p>
            ) : null}
          </div>
          </section>
        ) : null}
      </section>

        {isMemberSearchDialogOpen ? (
          <CommunityDialog
            icon={<AtSign aria-hidden="true" className="text-[#f3d28a]" size={18} />}
            onClose={() => setIsMemberSearchDialogOpen(false)}
            title="회원 ID 검색"
          >
            <p className="text-sm leading-6 text-[#b8aa95]">
              닉네임, ID, 자기소개로 회원을 찾고 바로 DM을 보낼 수 있습니다.
            </p>
            <form className="mt-4 flex gap-2" onSubmit={searchMembers}>
              <input
                className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="@id, 닉네임 검색"
                value={query}
              />
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isSearchingMembers}
                type="submit"
              >
                {isSearchingMembers ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                ) : (
                  <Search aria-hidden="true" size={15} />
                )}
                검색
              </button>
            </form>
            {memberSearchStatus ? (
              <p className="mt-2 text-xs leading-5 text-[#b8aa95]">
                {memberSearchStatus}
              </p>
            ) : null}
            <div className="mt-4 grid gap-3">
              {visibleProfiles.map((profile) => (
                <article
                  className="flex items-start gap-3 rounded-md border border-white/8 bg-[#0f0e0c]/72 p-3"
                  key={profile.id}
                >
                  <img
                    alt=""
                    className="size-10 rounded-full border border-white/10 object-cover"
                    src={profile.avatarUrl}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#fffaf1]">
                      {profile.displayName}
                    </p>
                    <p className="truncate text-xs font-semibold text-[#f3d28a]">
                      @{profile.handle}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#b8aa95]">
                      {profile.bio}
                    </p>
                  </div>
                  <button
                    className="ml-auto shrink-0 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-2 py-1 text-xs font-bold text-[#f3d28a] transition hover:bg-[#3a2e18]"
                    onClick={() => {
                      setDirectRecipient(profile);
                      setDirectStatus("");
                      setDirectBody("");
                      clearDmAttachments("direct");
                    }}
                    type="button"
                  >
                    DM
                  </button>
                </article>
              ))}
            </div>
            {directRecipient ? (
              <form
                className="mt-4 rounded-md border border-[#f3d28a]/20 bg-[#17130d] p-3"
                onSubmit={sendDirectDm}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#fffaf1]">
                      @{directRecipient.handle}에게 DM
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#b8aa95]">
                      상대방 대화함에 바로 표시됩니다.
                    </p>
                  </div>
                  <button
                    className="text-[#8f826f] transition hover:text-[#f3d28a]"
                    onClick={() => {
                      setDirectRecipient(null);
                      clearDmAttachments("direct");
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
                </div>
                <textarea
                  className="mt-3 min-h-20 w-full resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  onChange={(event) => setDirectBody(event.target.value)}
                  placeholder="메시지 입력"
                  value={directBody}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]">
                    <ImagePlus aria-hidden="true" size={14} />
                    사진 첨부
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      multiple
                      onChange={(event) => {
                        addDmAttachments("direct", event.currentTarget.files);
                        event.currentTarget.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  <span className="text-xs font-semibold text-[#8f826f]">
                    {directAttachments.length}/{maxDmAttachmentCount}
                  </span>
                </div>
                <DmAttachmentPreviewList
                  images={directAttachments}
                  onRemove={(id) => removeDmAttachment("direct", id)}
                />
                <button
                  className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={
                    isSendingDirectDm ||
                    (!directBody.trim() && !directAttachments.length)
                  }
                  type="submit"
                >
                  {isSendingDirectDm ? (
                    <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                  ) : (
                    <Send aria-hidden="true" size={15} />
                  )}
                  DM 보내기
                </button>
                {directStatus ? (
                  <p className="mt-2 text-sm leading-6 text-[#d8cbb8]">
                    {directStatus}
                  </p>
                ) : null}
              </form>
            ) : null}
          </CommunityDialog>
        ) : null}

        {isDmInboxDialogOpen ? (
          <CommunityDialog
            icon={
              <MessageCircle aria-hidden="true" className="text-[#f3d28a]" size={18} />
            }
            onClose={() => setIsDmInboxDialogOpen(false)}
            title="DM 대화함"
            wide
          >
            <div className="flex justify-end">
              <button
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                disabled={isLoadingDmThreads}
                onClick={() => void loadDmThreads()}
                type="button"
              >
                새로고침
              </button>
            </div>
            {dmInboxStatus ? (
              <p className="mt-2 text-sm leading-6 text-[#b8aa95]">{dmInboxStatus}</p>
            ) : null}
            {dmThreads.length ? (
              <div className="mt-4 grid gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dmThreads.map((thread) => (
                    <button
                      aria-expanded={
                        activeThreadKey === thread.conversationKey && isDmThreadPanelOpen
                      }
                      className={`relative min-w-36 rounded-md border px-3 py-2 text-left text-xs transition ${
                        activeThreadKey === thread.conversationKey
                          ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
                          : "border-white/10 bg-[#0f0e0c]/72 text-[#b8aa95] hover:border-[#f3d28a]/60"
                      }`}
                      key={thread.conversationKey}
                      onClick={() => toggleDmThreadPanel(thread.conversationKey)}
                      type="button"
                    >
                      <span className="block truncate font-bold">
                        @{thread.partner.handle}
                      </span>
                      <span className="mt-1 block truncate">
                        {getDmThreadPreview(thread)}
                      </span>
                      {thread.unreadCount ? (
                        <span className="absolute right-2 top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#f06f91] px-1.5 py-0.5 text-[10px] font-black text-white">
                          {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {activeDmThread && isDmThreadPanelOpen ? (
                  <div className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
                    <div className="flex items-center gap-3">
                      <img
                        alt=""
                        className="size-9 rounded-full border border-white/10 object-cover"
                        src={activeDmThread.partner.avatarUrl}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#fffaf1]">
                          {activeDmThread.partner.displayName}
                        </p>
                        <p className="truncate text-xs text-[#f3d28a]">
                          @{activeDmThread.partner.handle}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#8f826f]">
                      {activeDmThread.postSummary}
                    </p>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {activeDmThread.messages.map((message) => (
                        <div
                          className={`rounded-md px-3 py-2 text-sm leading-6 ${
                            message.isMine
                              ? "ml-8 bg-[#f3d28a] text-[#171511]"
                              : "mr-8 border border-white/10 bg-[#171511] text-[#d8cbb8]"
                          }`}
                          key={message.id}
                        >
                          <p className="text-[11px] font-bold opacity-75">
                            {message.isMine ? "나" : message.senderDisplayName}
                          </p>
                          <p className="whitespace-pre-line">{message.body}</p>
                          {message.attachmentUrls?.length ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {message.attachmentUrls.map((imageUrl, index) => (
                                <img
                                  alt=""
                                  className="aspect-square rounded-md border border-black/10 object-cover"
                                  key={`${message.id}-${imageUrl}-${index}`}
                                  src={imageUrl}
                                />
                              ))}
                            </div>
                          ) : null}
                          {message.isMine && message.hasUnreadReceipt ? (
                            <span className="mt-1 block text-right text-[11px] font-black text-[#f06f91]">
                              1
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <form className="mt-3 grid gap-2" onSubmit={sendThreadReply}>
                      <textarea
                        className="min-h-16 w-full resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                        onChange={(event) => setReplyBody(event.target.value)}
                        placeholder="답장 입력"
                        value={replyBody}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]">
                          <ImagePlus aria-hidden="true" size={14} />
                          사진 첨부
                          <input
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            multiple
                            onChange={(event) => {
                              addDmAttachments("reply", event.currentTarget.files);
                              event.currentTarget.value = "";
                            }}
                            type="file"
                          />
                        </label>
                        <span className="text-xs font-semibold text-[#8f826f]">
                          {replyAttachments.length}/{maxDmAttachmentCount}
                        </span>
                      </div>
                      <DmAttachmentPreviewList
                        images={replyAttachments}
                        onRemove={(id) => removeDmAttachment("reply", id)}
                      />
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={
                          isSendingThreadMessage ||
                          (!replyBody.trim() && !replyAttachments.length)
                        }
                        type="submit"
                      >
                        {isSendingThreadMessage ? (
                          <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                        ) : (
                          <Send aria-hidden="true" size={15} />
                        )}
                        보내기
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CommunityDialog>
        ) : null}
      </div>
    </>
  );

  function appendTag(tag: string) {
    const tags = normalizeHashtags(`${hashtagText} ${tag}`);
    setHashtagText(tags.map((item) => `#${item}`).join(" "));
  }
}

function CommunityDialog({
  children,
  icon,
  onClose,
  title,
  wide = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/72 px-4 py-6 backdrop-blur-sm">
      <section
        className={`w-full rounded-lg border border-[#2b281f] bg-[#171511] p-4 shadow-2xl shadow-black/40 ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <h2 className="truncate text-lg font-semibold text-[#fffaf1]">
              {title}
            </h2>
          </div>
          <button
            aria-label={`${title} 닫기`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

function mergeDmMessages(
  currentMessages: SocialDmMessage[],
  nextMessages: SocialDmMessage[],
) {
  const messagesById = new Map<string, SocialDmMessage>();

  [...currentMessages, ...nextMessages].forEach((message) => {
    messagesById.set(message.id, message);
  });

  return Array.from(messagesById.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeDmThreadLists(
  currentThreads: SocialDmThread[],
  nextThreads: SocialDmThread[],
) {
  const currentByKey = new Map(
    currentThreads.map((thread) => [thread.conversationKey, thread]),
  );

  return nextThreads
    .map((thread) => {
      const existing = currentByKey.get(thread.conversationKey);

      if (!existing) {
        return thread;
      }

      return {
        ...existing,
        ...thread,
        messages: mergeDmMessages(existing.messages, thread.messages),
        unreadCount: thread.unreadCount ?? existing.unreadCount ?? 0,
      } satisfies SocialDmThread;
    })
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
}

function areDmThreadListsEqual(
  currentThreads: SocialDmThread[],
  nextThreads: SocialDmThread[],
) {
  return (
    createDmThreadListSignature(currentThreads) ===
    createDmThreadListSignature(nextThreads)
  );
}

function createDmThreadListSignature(threads: SocialDmThread[]) {
  return threads
    .map((thread) =>
      [
        thread.conversationKey,
        thread.lastMessageAt,
        thread.unreadCount ?? 0,
        thread.messages
          .map((message) =>
            [
              message.id,
              message.body,
              message.createdAt,
              message.readAt ?? "",
              message.hasUnreadReceipt ? "1" : "0",
              message.attachmentUrls?.join(",") ?? "",
            ].join("~"),
          )
          .join("|"),
      ].join(":"),
    )
    .join("||");
}

function DmAttachmentPreviewList({
  images,
  onRemove,
}: {
  images: PendingUploadImage[];
  onRemove: (id: string) => void;
}) {
  if (!images.length) {
    return null;
  }

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {images.map((image) => (
        <div className="relative overflow-hidden rounded-md border border-white/10" key={image.id}>
          <img
            alt=""
            className="aspect-square w-full object-cover"
            src={image.previewUrl}
          />
          <button
            className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            onClick={() => onRemove(image.id)}
            type="button"
          >
            <X aria-hidden="true" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function SocialPostCard({
  currentProfileId,
  isHighlighted = false,
  onDelete,
  onDmSent,
  onUpdate,
  post,
}: {
  currentProfileId: string;
  isHighlighted?: boolean;
  onDelete: (postId: string) => void;
  onDmSent: () => Promise<void>;
  onUpdate: (postId: string, patch: Partial<MirilookSocialPost>) => void;
  post: MirilookSocialPost;
}) {
  const [isDmOpen, setIsDmOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentDisplayName, setCommentDisplayName] = useState("");
  const [commentStatus, setCommentStatus] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [dmBody, setDmBody] = useState("");
  const [dmContact, setDmContact] = useState("");
  const [dmStatus, setDmStatus] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportBody, setReportBody] = useState("");
  const [reportReason, setReportReason] = useState("부적절한 내용");
  const [reportStatus, setReportStatus] = useState("");
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editHashtagText, setEditHashtagText] = useState(
    post.hashtags.map((tag) => `#${tag}`).join(" "),
  );
  const [editDmPolicy, setEditDmPolicy] = useState<"allow" | "deny">(
    post.dmPolicy,
  );
  const [editStatus, setEditStatus] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState("");
  const imageUrls = getPostImageUrls(post);
  const imageCount = imageUrls.length;
  const safeImageIndex = Math.min(activeImageIndex, imageCount - 1);
  const activeImageUrl = imageUrls[safeImageIndex] ?? post.imageUrl;
  const postAvatarUrl = post.avatarUrl?.trim();
  const shouldShowAvatar = Boolean(postAvatarUrl && brokenAvatarUrl !== postAvatarUrl);
  const canManagePost = Boolean(
    currentProfileId && post.profileId && currentProfileId === post.profileId,
  );

  function movePostImage(direction: -1 | 1) {
    setActiveImageIndex((current) => {
      const next = current + direction;

      if (next < 0) {
        return imageCount - 1;
      }

      if (next >= imageCount) {
        return 0;
      }

      return next;
    });
  }

  function startEditingPost() {
    setEditBody(post.body);
    setEditHashtagText(post.hashtags.map((tag) => `#${tag}`).join(" "));
    setEditDmPolicy(post.dmPolicy);
    setEditStatus("");
    setIsEditing(true);
  }

  async function savePostEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextBody = editBody.trim();

    if (!nextBody) {
      setEditStatus("본문을 입력해 주세요.");
      return;
    }

    setIsSavingEdit(true);
    setEditStatus("");

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setEditStatus("로그인 후 내 글을 수정할 수 있습니다.");
        return;
      }

      const response = await fetch("/api/community/social-posts/", {
        body: JSON.stringify({
          body: nextBody,
          dmPolicy: editDmPolicy,
          hashtags: editHashtagText,
          postId: post.id,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json().catch(() => ({}))) as SocialPostMutationResult;

      if (!response.ok || !result.accepted) {
        setEditStatus(mapSocialReason(result.reason));
        return;
      }

      onUpdate(post.id, {
        body: String(result.post?.body ?? nextBody),
        dmPolicy:
          result.post?.dmPolicy === "deny" || result.post?.dmPolicy === "allow"
            ? result.post.dmPolicy
            : editDmPolicy,
        hashtags: Array.isArray(result.post?.hashtags)
          ? result.post.hashtags
          : normalizeHashtags(editHashtagText),
        recommendationScore:
          typeof result.post?.recommendationScore === "number"
            ? result.post.recommendationScore
            : post.recommendationScore,
      });
      setIsEditing(false);
      setEditStatus("");
    } catch (error) {
      console.error(error);
      setEditStatus("글 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deleteOwnPost() {
    const confirmed = window.confirm("이 스타일 피드 글을 삭제할까요?");

    if (!confirmed) {
      return;
    }

    setIsDeletingPost(true);
    setEditStatus("");

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setEditStatus("로그인 후 내 글을 삭제할 수 있습니다.");
        return;
      }

      const response = await fetch("/api/community/social-posts/", {
        body: JSON.stringify({
          postId: post.id,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      const result = (await response.json().catch(() => ({}))) as SocialPostMutationResult;

      if (!response.ok || !result.accepted || !result.deleted) {
        setEditStatus(mapSocialReason(result.reason));
        return;
      }

      onDelete(post.id);
    } catch (error) {
      console.error(error);
      setEditStatus("글 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeletingPost(false);
    }
  }

  async function react(reactionType: "like" | "dislike") {
    onUpdate(post.id, {
      dislikeCount:
        reactionType === "dislike" ? post.dislikeCount + 1 : post.dislikeCount,
      likeCount: reactionType === "like" ? post.likeCount + 1 : post.likeCount,
    });

    if (!isUuid(post.id)) {
      return;
    }

    const token = await getSupabaseAccessToken();
    const response = await fetch("/api/community/social-reactions/", {
      body: JSON.stringify({
        postId: post.id,
        reactionType,
        sessionKey: getReactionSessionKey(),
      }),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method: "POST",
    }).catch((error) => console.error(error));
    const result = response
      ? ((await response.json().catch(() => ({}))) as ReactionApiResult)
      : {};

    if (
      response?.ok &&
      result.accepted &&
      typeof result.likeCount === "number" &&
      typeof result.dislikeCount === "number"
    ) {
      onUpdate(post.id, {
        dislikeCount: result.dislikeCount,
        likeCount: result.likeCount,
      });
    }
  }

  async function submitShareEvent(channel: string, recipientHandle?: string) {
    setIsSharing(true);

    try {
      if (!isUuid(post.id)) {
        onUpdate(post.id, { shareCount: post.shareCount + 1 });

        return true;
      }

      const token = await getSupabaseAccessToken();
      const response = await fetch("/api/community/social-shares/", {
        body: JSON.stringify({
          channel,
          postId: post.id,
          recipientHandle,
          sessionKey: getReactionSessionKey(),
        }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as ShareApiResult;

      if (!response.ok || !result.accepted) {
        setShareStatus(mapSocialReason(result.reason));

        return false;
      }

      if (typeof result.shareCount === "number") {
        onUpdate(post.id, { shareCount: result.shareCount });
      } else {
        onUpdate(post.id, { shareCount: post.shareCount + 1 });
      }

      return true;
    } catch (error) {
      console.error(error);
      setShareStatus("공유 처리 중 오류가 발생했습니다.");

      return false;
    } finally {
      setIsSharing(false);
    }
  }

  async function copyShareLink() {
    const url = getPostShareUrl(post.id);

    try {
      await copyTextToClipboard(url);

      if (await submitShareEvent("copy_link")) {
        setShareStatus("게시물 링크를 복사했습니다.");
      }
    } catch (error) {
      console.error(error);
      setShareStatus("링크 복사 권한을 확인해 주세요.");
    }
  }

  async function shareToKakao() {
    const url = getPostShareUrl(post.id);
    const text = `${post.displayName}님의 미리룩 스타일 피드`;

    try {
      const canUseNativeShare =
        "share" in navigator && typeof navigator.share === "function";

      if (canUseNativeShare) {
        await navigator.share({
          text: `${text}\n카카오톡을 선택해 공유할 수 있습니다.`,
          title: "Miri Look Community",
          url,
        });

        if (await submitShareEvent("kakao_share")) {
          setShareStatus("공유 창을 열었습니다. 카카오톡을 선택해 전달할 수 있습니다.");
        }
      } else {
        await copyTextToClipboard(url);

        if (await submitShareEvent("kakao_copy_fallback")) {
          setShareStatus("공유 창을 열 수 없어 링크를 복사했습니다.");
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        setShareStatus("공유를 취소했습니다.");
      } else {
        console.error(error);
        setShareStatus("카카오톡 공유를 시작하지 못했습니다.");
      }
    }
  }

  async function shareInsideMirilook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const recipient = shareRecipient.trim().replace(/^@+/, "");

    if (!recipient) {
      setShareStatus("공유할 미리룩 ID를 입력해 주세요.");
      return;
    }

    if (!isUuid(post.id)) {
      await copyTextToClipboard(getPostShareUrl(post.id));
      await submitShareEvent("mirilook_sample_copy");
      setShareStatus("샘플 게시물이라 링크를 복사했습니다. 실제 게시물은 미리룩 알림으로 공유됩니다.");

      return;
    }

    if (await submitShareEvent("mirilook_direct", recipient)) {
      setShareRecipient("");
      setShareStatus(`@${recipient}님에게 미리룩 공유 알림을 보냈습니다.`);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = commentBody.trim();

    if (!body) {
      setCommentStatus("댓글 내용을 입력해 주세요.");
      return;
    }

    const fallbackComment: MirilookSocialComment = {
      body,
      createdAt: new Date().toISOString(),
      displayName: commentDisplayName.trim() || "미리룩 방문자",
      handle: commentDisplayName.trim()
        ? commentDisplayName.trim().replace(/^@/, "")
        : undefined,
      id: crypto.randomUUID(),
    };

    if (!isUuid(post.id)) {
      onUpdate(post.id, {
        commentCount: post.commentCount + 1,
        comments: [...post.comments, fallbackComment],
      });
      setCommentBody("");
      setCommentStatus("파일럿 게시물에 댓글이 추가되었습니다.");
      setIsCommentsOpen(true);
      return;
    }

    setIsSubmittingComment(true);
    setCommentStatus("");

    try {
      const token = await getSupabaseAccessToken();
      const response = await fetch("/api/community/social-comments/", {
        body: JSON.stringify({
          body,
          displayName: commentDisplayName,
          postId: post.id,
          sessionKey: getReactionSessionKey(),
        }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as CommentApiResult;

      if (!response.ok || !result.accepted || !result.comment) {
        setCommentStatus(mapSocialReason(result.reason));
        return;
      }

      onUpdate(post.id, {
        commentCount: result.commentCount ?? post.commentCount + 1,
        comments: [...post.comments, result.comment],
      });
      setCommentBody("");
      setCommentStatus("댓글이 등록되었습니다.");
      setIsCommentsOpen(true);
    } catch (error) {
      console.error(error);
      setCommentStatus("댓글 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function submitDm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dmBody.trim()) {
      setDmStatus("보낼 메시지를 입력해 주세요.");
      return;
    }

    if (!isUuid(post.id)) {
      setDmStatus("파일럿 게시물은 실제 DM 저장 없이 화면에서만 확인됩니다.");
      return;
    }

    setIsSendingDm(true);
    setDmStatus("");

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setDmStatus("로그인 후 DM을 보낼 수 있습니다.");
        return;
      }

      const response = await fetch("/api/community/social-messages/", {
        body: JSON.stringify({
          body: dmBody,
          contact: dmContact,
          postId: post.id,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as SocialDmSendResult;

      if (!response.ok || !result.accepted) {
        setDmStatus(mapSocialReason(result.reason));
        return;
      }

      setDmBody("");
      setDmContact("");
      setDmStatus("DM 요청이 접수되었습니다.");
      setDmStatus("DM을 보냈습니다. 우측 대화함에서 이어서 대화할 수 있습니다.");
      await onDmSent();
      await onDmSent();
    } catch (error) {
      console.error(error);
      setDmStatus("DM 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingDm(false);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isUuid(post.id)) {
      setReportStatus("파일럿 게시물은 실제 신고 저장 없이 화면에서만 확인됩니다.");
      return;
    }

    setIsReporting(true);
    setReportStatus("");

    try {
      const token = await getSupabaseAccessToken();
      const response = await fetch("/api/moderation/reports/", {
        body: JSON.stringify({
          body: reportBody,
          reason: reportReason,
          targetId: post.id,
          targetType: "social_post",
        }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as ReportApiResult;

      if (!response.ok || !result.accepted) {
        setReportStatus(
          response.status === 400
            ? "신고 대상을 확인할 수 없습니다."
            : mapSocialReason(result.reason),
        );
        return;
      }

      setReportBody("");
      setReportReason("부적절한 내용");
      setIsReportOpen(false);
      setReportStatus("신고가 접수되었습니다. 운영자가 확인하겠습니다.");
    } catch (error) {
      console.error(error);
      setReportStatus("신고 접수 중 오류가 발생했습니다.");
    } finally {
      setIsReporting(false);
    }
  }

  const visibleComments = isCommentsOpen ? post.comments : post.comments.slice(-2);

  return (
    <article
      className={`overflow-hidden rounded-lg border bg-[#0f0e0c] ${
        isHighlighted
          ? "border-[#f3d28a] shadow-[0_0_0_1px_rgba(243,210,138,0.25)]"
          : "border-white/10"
      }`}
      id={`post-${post.id}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f3d28a]/35 bg-[#30271a] text-[#f3d28a]">
            {shouldShowAvatar ? (
              <img
                alt=""
                className="size-full object-cover"
                onError={() => setBrokenAvatarUrl(postAvatarUrl ?? "")}
                src={postAvatarUrl}
              />
            ) : (
              <UserRound aria-hidden="true" size={18} />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#fffaf1]">
              {post.displayName}
            </p>
            <p className="truncate text-xs font-semibold text-[#b8aa95]">
              @{post.handle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isHighlighted ? (
            <span className="rounded-md bg-[#f3d28a] px-2 py-1 text-xs font-bold text-[#171511]">
              공유된 게시물
            </span>
          ) : null}
          {canManagePost ? (
            <>
              <button
                aria-label="글 수정"
                className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                onClick={startEditingPost}
                type="button"
              >
                <Pencil aria-hidden="true" size={15} />
              </button>
              <button
                aria-label="글 삭제"
                className="inline-flex size-9 items-center justify-center rounded-md border border-[#ffad9d]/35 bg-[#2a1411] text-[#ffb8aa] transition hover:bg-[#391c17] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isDeletingPost}
                onClick={() => void deleteOwnPost()}
                type="button"
              >
                {isDeletingPost ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                ) : (
                  <Trash2 aria-hidden="true" size={15} />
                )}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="relative aspect-[4/5] bg-black md:aspect-[16/10]">
        <img
          alt={`${post.displayName}님의 커뮤니티 사진 ${safeImageIndex + 1}`}
          className="h-full w-full object-contain"
          src={activeImageUrl}
        />
        {imageCount > 1 ? (
          <>
            <span className="absolute right-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white">
              {safeImageIndex + 1}/{imageCount}
            </span>
            <button
              aria-label="이전 사진"
              className="absolute left-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80"
              onClick={() => movePostImage(-1)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={17} />
            </button>
            <button
              aria-label="다음 사진"
              className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80"
              onClick={() => movePostImage(1)}
              type="button"
            >
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          </>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        {imageCount > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imageUrls.map((imageUrl, index) => (
              <button
                aria-label={`${index + 1}번째 사진 보기`}
                className={`relative size-14 shrink-0 overflow-hidden rounded-md border transition ${
                  index === safeImageIndex
                    ? "border-[#f3d28a]"
                    : "border-white/10 opacity-70 hover:border-[#f3d28a]/60 hover:opacity-100"
                }`}
                key={`${post.id}-${imageUrl}-${index}`}
                onClick={() => setActiveImageIndex(index)}
                type="button"
              >
                <img
                  alt=""
                  className="size-full bg-black object-contain"
                  src={imageUrl}
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={() => void react("like")}
            type="button"
          >
            <Heart aria-hidden="true" size={16} />
            좋아요 {post.likeCount}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={() => void react("dislike")}
            type="button"
          >
            <ThumbsDown aria-hidden="true" size={16} />
            싫어요 {post.dislikeCount}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            aria-expanded={isShareOpen}
            onClick={() => {
              setIsShareOpen((current) => !current);
              setShareStatus("");
            }}
            type="button"
          >
            <Share2 aria-hidden="true" size={16} />
            공유 {post.shareCount}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={() => setIsCommentsOpen((current) => !current)}
            type="button"
          >
            <MessageSquareText aria-hidden="true" size={16} />
            댓글 {post.commentCount}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-3 py-2 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#3a2e18] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={post.dmPolicy === "deny"}
            onClick={() => setIsDmOpen((current) => !current)}
            type="button"
          >
            {isDmOpen ? <X aria-hidden="true" size={16} /> : <MessageCircle aria-hidden="true" size={16} />}
            DM
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={() => setIsReportOpen((current) => !current)}
            type="button"
          >
            <Flag aria-hidden="true" size={16} />
            신고
          </button>
        </div>

        {isShareOpen ? (
          <section className="grid gap-3 rounded-md border border-white/10 bg-[#17130d] p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isSharing}
                onClick={() => void copyShareLink()}
                type="button"
              >
                <Copy aria-hidden="true" size={15} />
                링크 복사
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isSharing}
                onClick={() => void shareToKakao()}
                type="button"
              >
                <MessageCircle aria-hidden="true" size={15} />
                카카오톡 공유
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isSharing}
                onClick={() => {
                  setShareRecipient((current) => current || "");
                  setShareStatus("미리룩 ID를 입력하고 공유를 눌러주세요.");
                }}
                type="button"
              >
                <AtSign aria-hidden="true" size={15} />
                미리룩 공유
              </button>
            </div>
            <form
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_92px]"
              onSubmit={shareInsideMirilook}
            >
              <input
                className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                onChange={(event) => setShareRecipient(event.target.value)}
                placeholder="@미리룩 ID"
                value={shareRecipient}
              />
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={isSharing}
                type="submit"
              >
                {isSharing ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                ) : (
                  <Send aria-hidden="true" size={15} />
                )}
                공유
              </button>
            </form>
            {shareStatus ? (
              <p className="text-sm leading-6 text-[#d8cbb8]">{shareStatus}</p>
            ) : null}
          </section>
        ) : null}

        {isEditing ? (
          <form
            className="grid gap-3 rounded-md border border-[#f3d28a]/25 bg-[#17130d] p-3"
            onSubmit={savePostEdit}
          >
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#f3d28a]">본문</span>
              <textarea
                className="min-h-28 resize-y rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm leading-6 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                maxLength={1200}
                onChange={(event) => setEditBody(event.target.value)}
                value={editBody}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#f3d28a]">해시태그</span>
              <input
                className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                onChange={(event) => setEditHashtagText(event.target.value)}
                placeholder="#소프트울프컷 #남자헤어"
                value={editHashtagText}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {(["allow", "deny"] as const).map((policy) => (
                <button
                  className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition ${
                    editDmPolicy === policy
                      ? "border-[#f3d28a] bg-[#f3d28a] text-[#171511]"
                      : "border-white/10 bg-white/5 text-[#d8cbb8] hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                  }`}
                  key={policy}
                  onClick={() => setEditDmPolicy(policy)}
                  type="button"
                >
                  {policy === "allow" ? "DM 허용" : "DM 닫기"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {editStatus ? (
                <p className="text-sm leading-6 text-[#ffb8aa]">{editStatus}</p>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 px-3 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                  onClick={() => {
                    setIsEditing(false);
                    setEditStatus("");
                  }}
                  type="button"
                >
                  취소
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isSavingEdit}
                  type="submit"
                >
                  {isSavingEdit ? (
                    <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                  ) : (
                    <Send aria-hidden="true" size={15} />
                  )}
                  저장
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-line text-sm leading-6 text-[#d8cbb8]">{post.body}</p>
        )}

        {post.hashtags.length ? (
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((tag) => (
              <span
                className="rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#f3d28a]"
                key={tag}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <section className="rounded-md border border-white/10 bg-[#17130d] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#fffaf1]">
              댓글 {post.commentCount}
            </p>
            {post.comments.length > 2 ? (
              <button
                className="text-xs font-semibold text-[#f3d28a] transition hover:text-[#ffdf98]"
                onClick={() => setIsCommentsOpen((current) => !current)}
                type="button"
              >
                {isCommentsOpen ? "접기" : "모두 보기"}
              </button>
            ) : null}
          </div>

          {visibleComments.length ? (
            <div className="mt-3 grid gap-2">
              {visibleComments.map((comment) => (
                <article
                  className="rounded-md border border-white/8 bg-[#0f0e0c]/72 px-3 py-2"
                  key={comment.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#fffaf1]">
                      {comment.displayName}
                    </span>
                    {comment.handle ? (
                      <span className="text-xs font-semibold text-[#8f826f]">
                        @{comment.handle}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#d8cbb8]">
                    {comment.body}
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          <form
            className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_80px]"
            onSubmit={submitComment}
          >
            <input
              className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              onChange={(event) => setCommentDisplayName(event.target.value)}
              placeholder="닉네임"
              value={commentDisplayName}
            />
            <input
              className="h-10 min-w-0 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="댓글 달기"
              value={commentBody}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isSubmittingComment}
              type="submit"
            >
              {isSubmittingComment ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <Send aria-hidden="true" size={15} />
              )}
              등록
            </button>
          </form>
          {commentStatus ? (
            <p className="mt-2 text-sm leading-6 text-[#d8cbb8]">
              {commentStatus}
            </p>
          ) : null}
        </section>

        {isDmOpen && post.dmPolicy === "allow" ? (
          <form
            className="rounded-md border border-[#f3d28a]/20 bg-[#17130d] p-3"
            onSubmit={submitDm}
          >
            <p className="text-sm font-semibold text-[#fffaf1]">
              @{post.handle} 님에게 DM 보내기
            </p>
            <input
              className="mt-3 h-10 w-full rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              onChange={(event) => setDmContact(event.target.value)}
              placeholder="연락처 또는 회신 받을 ID 선택 입력"
              value={dmContact}
            />
            <textarea
              className="mt-2 min-h-20 w-full resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              onChange={(event) => setDmBody(event.target.value)}
              placeholder="메시지"
              value={dmBody}
            />
            <button
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isSendingDm}
              type="submit"
            >
              {isSendingDm ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <Send aria-hidden="true" size={15} />
              )}
              DM 보내기
            </button>
            {dmStatus ? (
              <p className="mt-2 text-sm leading-6 text-[#d8cbb8]">{dmStatus}</p>
            ) : null}
          </form>
        ) : null}

        {isReportOpen ? (
          <form
            className="rounded-md border border-[#f3d28a]/20 bg-[#17130d] p-3"
            onSubmit={submitReport}
          >
            <p className="text-sm font-semibold text-[#fffaf1]">
              이 게시물 신고하기
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
              <select
                className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-2 text-sm text-[#fffaf1] outline-none focus:border-[#f3d28a]/70"
                onChange={(event) => setReportReason(event.target.value)}
                value={reportReason}
              >
                <option value="부적절한 내용">부적절한 내용</option>
                <option value="개인정보 노출">개인정보 노출</option>
                <option value="광고/스팸">광고/스팸</option>
                <option value="비방/괴롭힘">비방/괴롭힘</option>
                <option value="저작권/초상권 우려">저작권/초상권 우려</option>
                <option value="기타 운영 확인 필요">기타 운영 확인 필요</option>
              </select>
              <input
                className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                onChange={(event) => setReportBody(event.target.value)}
                placeholder="운영자가 확인할 내용을 간단히 적어주세요"
                value={reportBody}
              />
            </div>
            <button
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#f3d28a]/35 bg-[#2d2414] px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#3a2e18] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isReporting}
              type="submit"
            >
              {isReporting ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <Flag aria-hidden="true" size={15} />
              )}
              신고 접수
            </button>
            {reportStatus ? (
              <p className="mt-2 text-sm leading-6 text-[#d8cbb8]">
                {reportStatus}
              </p>
            ) : null}
          </form>
        ) : reportStatus ? (
          <p className="rounded-md border border-white/10 bg-[#17130d] px-3 py-2 text-sm leading-6 text-[#d8cbb8]">
            {reportStatus}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function getPostImageUrls(post: MirilookSocialPost) {
  const urls = Array.from(
    new Set([...(post.imageUrls ?? []), post.imageUrl].filter(Boolean)),
  );

  return urls.length ? urls : ["/mock/mirilook-result-front.png"];
}

function getDmThreadPreview(thread: SocialDmThread) {
  const lastMessage = thread.messages.at(-1);

  if (lastMessage?.body) {
    return lastMessage.body;
  }

  if (lastMessage?.attachmentUrls?.length) {
    return `사진 ${lastMessage.attachmentUrls.length}장`;
  }

  return thread.postSummary;
}

const pilotSocialFeedOrder = [
  "pilot-social-curtain",
  "pilot-social-women-medium",
  "pilot-social-short",
  "pilot-social-women-angle-board",
  "pilot-social-men-angle-board",
  "pilot-social-women-story",
];

function isPilotSocialPost(post: MirilookSocialPost) {
  return pilotSocialFeedOrder.includes(post.id);
}

function orderPilotSocialPosts(posts: MirilookSocialPost[]) {
  return [...posts].sort(
    (a, b) =>
      pilotSocialFeedOrder.indexOf(a.id) - pilotSocialFeedOrder.indexOf(b.id),
  );
}

function compareSocialPostsByNewest(
  a: MirilookSocialPost,
  b: MirilookSocialPost,
) {
  return getPostTime(b.createdAt) - getPostTime(a.createdAt);
}

function getPostTime(createdAt: string) {
  const time = new Date(createdAt).getTime();

  return Number.isFinite(time) ? time : 0;
}

// Kept only for the pilot fallback copy embedded in older builds.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getPostAudience(post: MirilookSocialPost) {
  if (
    post.id === "pilot-social-curtain" ||
    post.id === "pilot-social-short" ||
    post.id === "pilot-social-men-angle-board"
  ) {
    return "male";
  }

  if (
    post.id === "pilot-social-women-medium" ||
    post.id === "pilot-social-women-angle-board" ||
    post.id === "pilot-social-women-story"
  ) {
    return "female";
  }

  const text = [post.id, post.handle, post.body, ...post.hashtags].join(" ");

  if (/남자|남성|men|male/i.test(text)) {
    return "male";
  }

  if (/여자|여성|women|female/i.test(text)) {
    return "female";
  }

  return "other";
}

function getPostShareUrl(postId: string) {
  const baseUrl =
    typeof window === "undefined" ? "https://mirilook.com" : window.location.origin;

  return `${baseUrl}/community?post=${encodeURIComponent(postId)}`;
}

async function copyTextToClipboard(text: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("clipboard_unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function isAbortError(error: unknown) {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "NotAllowedError")
  );
}

function popularTags(posts: MirilookSocialPost[]) {
  const counts = new Map<string, number>();

  posts.forEach((post) => {
    post.hashtags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });

  const tags = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 12);

  return tags.length ? tags : ["헤어스타일", "코디", "메이크업", "상담전참고"];
}

function getReactionSessionKey() {
  if (typeof window === "undefined") {
    return "";
  }

  const key = "mirilook_social_session";
  const current = window.localStorage.getItem(key);

  if (current) {
    return current;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);

  return next;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapSocialReason(reason: string | undefined) {
  switch (reason) {
    case "auth_required":
      return "로그인 후 이용할 수 있습니다.";
    case "body_required":
      return "게시글 내용을 입력해 주세요.";
    case "comment_required":
      return "댓글 내용을 입력해 주세요.";
    case "dm_schema_update_required":
      return "DM 대화 스키마가 아직 적용되지 않았습니다. Supabase migration 적용이 필요합니다.";
    case "dm_not_allowed":
      return "이 게시물은 DM을 허용하지 않습니다.";
    case "image_required":
      return "사진을 첨부해 주세요.";
    case "invalid_message":
      return "메시지 내용을 확인해 주세요.";
    case "image_paths_migration_required":
      return "여러 장 업로드를 저장하려면 Supabase image_paths migration 적용이 필요합니다.";
    case "invalid_recipient":
      return "공유할 미리룩 ID를 다시 확인해 주세요.";
    case "member_search_failed":
      return "회원 검색 중 오류가 발생했습니다.";
    case "post_not_available":
      return "게시물을 찾을 수 없거나 비공개 상태입니다.";
    case "profile_lookup_failed":
      return "내 프로필 정보를 확인하지 못했습니다. 다시 로그인해 주세요.";
    case "recipient_not_found":
      return "해당 미리룩 ID를 찾지 못했습니다.";
    case "recipient_lookup_failed":
      return "공유 대상 조회 중 오류가 발생했습니다.";
    case "session_required":
      return "브라우저 세션을 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.";
    case "post_required":
      return "게시글을 확인하지 못했습니다.";
    case "post_not_found":
      return "이미 삭제되었거나 찾을 수 없는 게시글입니다.";
    case "not_owner":
      return "내가 작성한 글만 수정하거나 삭제할 수 있습니다.";
    case "supabase_update_failed":
      return "글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    case "supabase_delete_failed":
      return "글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    case "supabase_lookup_failed":
      return "게시글 권한 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    case "self_dm_not_allowed":
      return "본인에게는 DM을 보낼 수 없습니다.";
    case "storage_upload_failed":
      return "사진 업로드에 실패했습니다. Storage 버킷 설정을 확인해 주세요.";
    case "supabase_insert_failed":
      return "저장에 실패했습니다. Supabase social community 테이블 적용 여부를 확인해 주세요.";
    case "supabase_not_configured":
      return "Supabase 연결 후 실제 저장할 수 있습니다.";
    case "too_many_images":
      return `사진은 최대 ${maxUploadImageCount}장까지 올릴 수 있습니다.`;
    case "unsupported_image_type":
      return "jpg, png, webp 이미지만 올릴 수 있습니다.";
    default:
      return "요청을 처리하지 못했습니다.";
  }
}
