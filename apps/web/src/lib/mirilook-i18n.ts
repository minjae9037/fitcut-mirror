import { mirilookGeneratedTranslations } from "./mirilook-translations.generated";
import type { MirilookRegionId } from "./mirilook-regions";

export type MirilookLocale = "ko" | "zh" | "ja" | "en";

export type MirilookLocaleOption = {
  flag: string;
  id: MirilookLocale;
  label: string;
  lang: string;
  nativeLabel: string;
};

export const mirilookLocaleOptions: MirilookLocaleOption[] = [
  { flag: "🇰🇷", id: "ko", label: "Korea", lang: "ko-KR", nativeLabel: "한국어" },
  { flag: "🇨🇳", id: "zh", label: "China", lang: "zh-CN", nativeLabel: "中文" },
  { flag: "🇯🇵", id: "ja", label: "Japan", lang: "ja-JP", nativeLabel: "日本語" },
  { flag: "🇺🇸", id: "en", label: "America", lang: "en-US", nativeLabel: "English" },
];

export const mirilookLocaleStorageKey = "mirilook_locale";
export const mirilookTranslationCacheVersion = "2026-06-28-generated-dict-2";

type TranslationValue = Record<Exclude<MirilookLocale, "ko">, string>;

const exactEntries: Array<[string, TranslationValue]> = [
  [
    "내 얼굴에 어울리는 헤어스타일을 추천받아보세요.",
    {
      zh: "获取适合你脸型的发型推荐。",
      ja: "あなたの顔に似合うヘアスタイルをおすすめします。",
      en: "Get hairstyle recommendations that suit your face.",
    },
  ],
  [
    "Get personalized hairstyle recommendations for your face.",
    {
      zh: "获取适合你脸型的个性化发型推荐。",
      ja: "あなたの顔に合わせたパーソナルなヘアスタイル提案を受けられます。",
      en: "Get personalized hairstyle recommendations for your face.",
    },
  ],
  [
    "내 사진을 올리고, 헤어스타일을 추천받고, 미용사에게 더 고품질의 서비스를 받아보세요.",
    {
      zh: "上传你的照片，获取发型推荐，并让发型师提供更高质量的服务。",
      ja: "写真をアップロードしてヘアスタイル提案を受け、美容師からより高品質なサービスを受けましょう。",
      en: "Upload your photos, get hairstyle recommendations, and give your stylist a clearer reference.",
    },
  ],
  [
    "Upload your photos, preview your style, and give your stylist a clearer reference.",
    {
      zh: "上传照片、预览造型，并为发型师提供更清晰的参考。",
      ja: "写真をアップロードし、スタイルを確認して、美容師により明確な参考資料を渡せます。",
      en: "Upload your photos, preview your style, and give your stylist a clearer reference.",
    },
  ],
  [
    "사진",
    { zh: "照片", ja: "写真", en: "Photos" },
  ],
  [
    "선호",
    { zh: "偏好", ja: "好み", en: "Preferences" },
  ],
  [
    "추천",
    { zh: "推荐", ja: "おすすめ", en: "Recommendations" },
  ],
  [
    "선택",
    { zh: "选择", ja: "選択", en: "Select" },
  ],
  [
    "상담 보드",
    { zh: "咨询板", ja: "相談ボード", en: "Consultation Board" },
  ],
  [
    "히스토리",
    { zh: "历史", ja: "履歴", en: "History" },
  ],
  [
    "미용실",
    { zh: "美发店", ja: "美容室", en: "Salons" },
  ],
  [
    "커뮤니티",
    { zh: "社区", ja: "コミュニティ", en: "Community" },
  ],
  [
    "투표",
    { zh: "投票", ja: "投票", en: "Votes" },
  ],
  [
    "스토어",
    { zh: "商店", ja: "ストア", en: "Store" },
  ],
  [
    "로그인",
    { zh: "登录", ja: "ログイン", en: "Log In" },
  ],
  [
    "로그아웃",
    { zh: "退出登录", ja: "ログアウト", en: "Log Out" },
  ],
  [
    "마이페이지",
    { zh: "我的页面", ja: "マイページ", en: "My Page" },
  ],
  [
    "좌측면 사진",
    { zh: "左侧照片", ja: "左側写真", en: "Left-side Photo" },
  ],
  [
    "정면 사진",
    { zh: "正面照片", ja: "正面写真", en: "Front Photo" },
  ],
  [
    "우측면 사진",
    { zh: "右侧照片", ja: "右側写真", en: "Right-side Photo" },
  ],
  [
    "파일 선택",
    { zh: "选择文件", ja: "ファイルを選択", en: "Choose File" },
  ],
  [
    "다시 업로드",
    { zh: "重新上传", ja: "再アップロード", en: "Upload Again" },
  ],
  [
    "최소 2장 필요: 좌측면, 정면, 우측면 중 2장을 업로드해 주세요.",
    {
      zh: "至少需要2张：请上传左侧、正面、右侧中的2张。",
      ja: "最低2枚必要：左側・正面・右側のうち2枚をアップロードしてください。",
      en: "At least 2 photos required: upload any 2 of left, front, and right-side photos.",
    },
  ],
  [
    "3장을 모두 올리면 얼굴 방향과 두상 정보를 더 정확하게 반영합니다.",
    {
      zh: "上传3张照片可以更准确地反映面部方向和头型信息。",
      ja: "3枚すべてをアップロードすると、顔の向きと頭の形をより正確に反映できます。",
      en: "Uploading all 3 photos improves face direction and head-shape accuracy.",
    },
  ],
  [
    "원하는 헤어컷",
    { zh: "想要的发型", ja: "希望するヘアカット", en: "Preferred Haircuts" },
  ],
  [
    "원하는 헤어 컬러",
    { zh: "想要的发色", ja: "希望するヘアカラー", en: "Preferred Hair Color" },
  ],
  [
    "원하는 느낌 메모",
    { zh: "想要的氛围备注", ja: "希望イメージのメモ", en: "Style Memo" },
  ],
  [
    "스타일 추천 받기",
    { zh: "获取风格推荐", ja: "スタイル提案を受ける", en: "Get Style Recommendations" },
  ],
  [
    "추천 결과",
    { zh: "推荐结果", ja: "おすすめ結果", en: "Recommendation Results" },
  ],
  [
    "상담용 9장 생성하기",
    { zh: "生成9张咨询用图片", ja: "相談用9枚を生成", en: "Generate 9 Consultation Images" },
  ],
  [
    "코디 추천",
    { zh: "穿搭推荐", ja: "コーデ提案", en: "Outfit Recommendation" },
  ],
  [
    "메이크업 스타일",
    { zh: "妆容风格", ja: "メイクスタイル", en: "Makeup Style" },
  ],
  [
    "내 최근 히스토리",
    { zh: "我的最近历史", ja: "最近の履歴", en: "My Recent History" },
  ],
  [
    "남성",
    { zh: "男性", ja: "男性", en: "Male" },
  ],
  [
    "여성",
    { zh: "女性", ja: "女性", en: "Female" },
  ],
  [
    "남성 모드",
    { zh: "男性模式", ja: "男性モード", en: "Male Mode" },
  ],
  [
    "여성 모드",
    { zh: "女性模式", ja: "女性モード", en: "Female Mode" },
  ],
  [
    "선택한 컷",
    { zh: "已选发型", ja: "選択したカット", en: "Selected Haircuts" },
  ],
  [
    "선택한 것",
    { zh: "已选择", ja: "選択済み", en: "Selected" },
  ],
  [
    "추천 기준",
    { zh: "推荐标准", ja: "おすすめ基準", en: "Recommendation Criteria" },
  ],
  [
    "헤어컷",
    { zh: "发型", ja: "ヘアカット", en: "Haircut" },
  ],
  [
    "헤어 컬러",
    { zh: "发色", ja: "ヘアカラー", en: "Hair Color" },
  ],
  [
    "현재 기장으로 가능한 스타일",
    { zh: "当前长度可实现的风格", ja: "現在の長さで可能なスタイル", en: "Styles Possible With Current Length" },
  ],
  [
    "얼굴에 어울리는 스타일",
    { zh: "适合脸型的风格", ja: "顔に似合うスタイル", en: "Styles That Suit Your Face" },
  ],
  [
    "회원 ID 검색",
    { zh: "会员ID搜索", ja: "会員ID検索", en: "Member ID Search" },
  ],
  [
    "닉네임, ID, 자기소개로 회원을 찾고 바로 DM을 보낼 수 있습니다.",
    {
      zh: "可通过昵称、ID、自我介绍查找会员并直接发送DM。",
      ja: "ニックネーム、ID、自己紹介から会員を探してすぐDMできます。",
      en: "Find members by nickname, ID, or bio and send a DM instantly.",
    },
  ],
  [
    "검색",
    { zh: "搜索", ja: "検索", en: "Search" },
  ],
  [
    "DM 대화함",
    { zh: "DM聊天", ja: "DM受信箱", en: "DM Inbox" },
  ],
  [
    "새로고침",
    { zh: "刷新", ja: "更新", en: "Refresh" },
  ],
  [
    "답장 보내기",
    { zh: "发送回复", ja: "返信を送る", en: "Send Reply" },
  ],
  [
    "DM 보내기",
    { zh: "发送DM", ja: "DMを送る", en: "Send DM" },
  ],
  [
    "메시지 입력",
    { zh: "输入消息", ja: "メッセージを入力", en: "Enter message" },
  ],
  [
    "답장 입력",
    { zh: "输入回复", ja: "返信を入力", en: "Enter reply" },
  ],
  [
    "로그인하면 회원 간 DM 대화함을 사용할 수 있습니다.",
    {
      zh: "登录后可使用会员之间的DM聊天。",
      ja: "ログインすると会員間DMを利用できます。",
      en: "Log in to use member-to-member DMs.",
    },
  ],
  [
    "아직 받은 DM이 없습니다.",
    { zh: "还没有收到DM。", ja: "まだ受信したDMはありません。", en: "No DMs yet." },
  ],
  [
    "스타일 사진 커뮤니티",
    { zh: "风格照片社区", ja: "スタイル写真コミュニティ", en: "Style Photo Community" },
  ],
  [
    "익명 스타일 투표",
    { zh: "匿名风格投票", ja: "匿名スタイル投票", en: "Anonymous Style Votes" },
  ],
  [
    "내 상담 히스토리",
    { zh: "我的咨询历史", ja: "相談履歴", en: "My Consultation History" },
  ],
  [
    "Hair Money 충전",
    { zh: "充值Hair Money", ja: "Hair Moneyをチャージ", en: "Top Up Hair Money" },
  ],
  [
    "로그인하고 충전하기",
    { zh: "登录并充值", ja: "ログインしてチャージ", en: "Log In and Top Up" },
  ],
  [
    "이용약관",
    { zh: "服务条款", ja: "利用規約", en: "Terms" },
  ],
  [
    "개인정보처리방침",
    { zh: "隐私政策", ja: "プライバシーポリシー", en: "Privacy Policy" },
  ],
  [
    "환불정책",
    { zh: "退款政策", ja: "返金ポリシー", en: "Refund Policy" },
  ],
  [
    "국가",
    { zh: "国家", ja: "国", en: "Country" },
  ],
  [
    "좋아요",
    { zh: "喜欢", ja: "いいね", en: "Like" },
  ],
  [
    "싫어요",
    { zh: "不喜欢", ja: "よくない", en: "Dislike" },
  ],
  [
    "공유",
    { zh: "分享", ja: "共有", en: "Share" },
  ],
  [
    "댓글",
    { zh: "评论", ja: "コメント", en: "Comments" },
  ],
  [
    "저장",
    { zh: "保存", ja: "保存", en: "Save" },
  ],
  [
    "삭제",
    { zh: "删除", ja: "削除", en: "Delete" },
  ],
  [
    "다운로드",
    { zh: "下载", ja: "ダウンロード", en: "Download" },
  ],
  [
    "이메일 전송",
    { zh: "发送邮件", ja: "メール送信", en: "Send Email" },
  ],
];

// The generated dictionary covers every Korean UI string in the app (human
// reviewed, full-sentence translations). Curated exactEntries are applied on
// top so any hand-tuned phrase wins over the generated one.
const exactTranslationMap = [...mirilookGeneratedTranslations, ...exactEntries].reduce<
  Record<string, TranslationValue>
>((acc, [source, value]) => {
  acc[normalizeText(source)] = value;
  return acc;
}, {});

const glossary: Record<Exclude<MirilookLocale, "ko">, Array<[string, string]>> = {
  zh: [
    ["미리룩", "Miri Look"],
    ["헤어스타일", "发型"],
    ["헤어 스타일", "发型"],
    ["헤어컷", "发型"],
    ["헤어 컬러", "发色"],
    ["미용사", "发型师"],
    ["미용실", "美发店"],
    ["상담", "咨询"],
    ["추천", "推荐"],
    ["결과", "结果"],
    ["사진", "照片"],
    ["장", "张"],
    ["이미지", "图片"],
    ["업로드", "上传"],
    ["선택", "选择"],
    ["생성", "生成"],
    ["저장", "保存"],
    ["공유", "分享"],
    ["히스토리", "历史"],
    ["커뮤니티", "社区"],
    ["투표", "投票"],
    ["회원", "会员"],
    ["로그인", "登录"],
    ["로그아웃", "退出登录"],
    ["추천받", "获取推荐"],
    ["얼굴", "脸部"],
    ["스타일", "风格"],
    ["컬러", "颜色"],
    ["메이크업", "妆容"],
    ["코디", "穿搭"],
    ["상의", "上衣"],
    ["하의", "下装"],
    ["액세서리", "配饰"],
    ["예약", "预约"],
    ["리뷰", "评价"],
    ["지도", "地图"],
    ["검색", "搜索"],
    ["메시지", "消息"],
    ["답장", "回复"],
    ["가이드라인", "指南"],
    ["닫기", "关闭"],
    ["영상", "视频"],
    ["준비", "准备"],
    ["재생", "播放"],
    ["내", "我的"],
    ["얼굴에 어울리는", "适合脸型的"],
    ["올리고", "上传"],
    ["받고", "获取"],
    ["받아보세요", "试试看"],
    ["고품질", "高质量"],
    ["서비스", "服务"],
    ["여성", "女性"],
    ["남성", "男性"],
    ["회원가입", "注册"],
    ["좌", "左"],
    ["정", "正"],
    ["우", "右"],
    ["다각도", "多角度"],
    ["입력", "输入"],
    ["등록", "注册"],
    ["관리", "管理"],
    ["확인", "确认"],
    ["완료", "完成"],
    ["실패", "失败"],
    ["필요", "需要"],
    ["가능", "可用"],
    ["사용", "使用"],
    ["열기", "打开"],
    ["보내기", "发送"],
    ["남기기", "留下"],
    ["문의", "咨询"],
    ["정책", "政策"],
    ["약관", "条款"],
    ["환불", "退款"],
  ],
  ja: [
    ["미리룩", "Miri Look"],
    ["헤어스타일", "ヘアスタイル"],
    ["헤어 스타일", "ヘアスタイル"],
    ["헤어컷", "ヘアカット"],
    ["헤어 컬러", "ヘアカラー"],
    ["미용사", "美容師"],
    ["미용실", "美容室"],
    ["상담", "相談"],
    ["추천", "おすすめ"],
    ["결과", "結果"],
    ["사진", "写真"],
    ["장", "枚"],
    ["이미지", "画像"],
    ["업로드", "アップロード"],
    ["선택", "選択"],
    ["생성", "生成"],
    ["저장", "保存"],
    ["공유", "共有"],
    ["히스토리", "履歴"],
    ["커뮤니티", "コミュニティ"],
    ["투표", "投票"],
    ["회원", "会員"],
    ["로그인", "ログイン"],
    ["로그아웃", "ログアウト"],
    ["추천받", "提案を受け"],
    ["얼굴", "顔"],
    ["스타일", "スタイル"],
    ["컬러", "カラー"],
    ["메이크업", "メイク"],
    ["코디", "コーデ"],
    ["상의", "トップス"],
    ["하의", "ボトムス"],
    ["액세서리", "アクセサリー"],
    ["예약", "予約"],
    ["리뷰", "レビュー"],
    ["지도", "地図"],
    ["검색", "検索"],
    ["메시지", "メッセージ"],
    ["답장", "返信"],
    ["가이드라인", "ガイドライン"],
    ["닫기", "閉じる"],
    ["영상", "動画"],
    ["준비", "準備"],
    ["재생", "再生"],
    ["내", "私の"],
    ["얼굴에 어울리는", "顔に似合う"],
    ["올리고", "アップロード"],
    ["받고", "受け取り"],
    ["받아보세요", "お試しください"],
    ["고품질", "高品質"],
    ["서비스", "サービス"],
    ["여성", "女性"],
    ["남성", "男性"],
    ["회원가입", "会員登録"],
    ["좌", "左"],
    ["정", "正面"],
    ["우", "右"],
    ["다각도", "多角度"],
    ["입력", "入力"],
    ["등록", "登録"],
    ["관리", "管理"],
    ["확인", "確認"],
    ["완료", "完了"],
    ["실패", "失敗"],
    ["필요", "必要"],
    ["가능", "可能"],
    ["사용", "使用"],
    ["열기", "開く"],
    ["보내기", "送信"],
    ["남기기", "残す"],
    ["문의", "問い合わせ"],
    ["정책", "ポリシー"],
    ["약관", "規約"],
    ["환불", "返金"],
  ],
  en: [
    ["미리룩", "Miri Look"],
    ["헤어스타일", "hairstyle"],
    ["헤어 스타일", "hairstyle"],
    ["헤어컷", "haircut"],
    ["헤어 컬러", "hair color"],
    ["미용사", "stylist"],
    ["미용실", "salon"],
    ["상담", "consultation"],
    ["추천", "recommendation"],
    ["결과", "result"],
    ["사진", "photo"],
    ["장", ""],
    ["이미지", "image"],
    ["업로드", "upload"],
    ["선택", "select"],
    ["생성", "generate"],
    ["저장", "save"],
    ["공유", "share"],
    ["히스토리", "history"],
    ["커뮤니티", "community"],
    ["투표", "vote"],
    ["회원", "member"],
    ["로그인", "log in"],
    ["로그아웃", "log out"],
    ["얼굴", "face"],
    ["스타일", "style"],
    ["컬러", "color"],
    ["메이크업", "makeup"],
    ["코디", "outfit"],
    ["상의", "top"],
    ["하의", "bottom"],
    ["액세서리", "accessory"],
    ["예약", "booking"],
    ["리뷰", "review"],
    ["지도", "map"],
    ["검색", "search"],
    ["메시지", "message"],
    ["답장", "reply"],
    ["가이드라인", "guideline"],
    ["닫기", "close"],
    ["영상", "video"],
    ["준비", "ready"],
    ["재생", "play"],
    ["내", "my"],
    ["얼굴에 어울리는", "that suits your face"],
    ["올리고", "upload"],
    ["받고", "get"],
    ["받아보세요", "try it"],
    ["고품질", "high-quality"],
    ["서비스", "service"],
    ["여성", "female"],
    ["남성", "male"],
    ["회원가입", "sign up"],
    ["좌", "left"],
    ["정", "front"],
    ["우", "right"],
    ["다각도", "multi-angle"],
    ["입력", "input"],
    ["등록", "register"],
    ["관리", "manage"],
    ["확인", "confirm"],
    ["완료", "complete"],
    ["실패", "failed"],
    ["필요", "required"],
    ["가능", "available"],
    ["사용", "use"],
    ["열기", "open"],
    ["보내기", "send"],
    ["남기기", "leave"],
    ["문의", "inquiry"],
    ["정책", "policy"],
    ["약관", "terms"],
    ["환불", "refund"],
  ],
};

const koreanPattern = /[\u3131-\u318e\uac00-\ud7a3]/;

export function getMirilookLocaleOption(locale: MirilookLocale) {
  return (
    mirilookLocaleOptions.find((option) => option.id === locale) ??
    mirilookLocaleOptions[0]
  );
}

export function getMirilookRegionFromLocale(
  locale: MirilookLocale,
): MirilookRegionId {
  switch (locale) {
    case "zh":
      return "china";
    case "ja":
      return "japan";
    case "en":
      return "america";
    default:
      return "korea";
  }
}

export function isMirilookLocale(value: string | null): value is MirilookLocale {
  return value === "ko" || value === "zh" || value === "ja" || value === "en";
}

export function translateMirilookText(text: string, locale: MirilookLocale) {
  if (locale === "ko" || !text.trim()) {
    return text;
  }

  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = text.slice(leading.length, text.length - trailing.length);
  const normalized = normalizeText(core);
  const exact = exactTranslationMap[normalized]?.[locale];

  if (exact) {
    return `${leading}${exact}${trailing}`;
  }

  if (!hasTranslatableContent(core)) {
    return text;
  }

  // Fallback for strings not in the dictionary (e.g. user-generated/dynamic
  // content). Apply the glossary for known words and keep any remaining Korean
  // intact — readable source text is better than garbled placeholder output.
  return `${leading}${applyGlossary(core, locale)}${trailing}`;
}

function applyGlossary(text: string, locale: Exclude<MirilookLocale, "ko">) {
  return glossary[locale].reduce(
    (current, [source, target]) => current.split(source).join(target),
    text,
  );
}

function hasTranslatableContent(text: string) {
  return koreanPattern.test(text) || exactTranslationMap[normalizeText(text)];
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
