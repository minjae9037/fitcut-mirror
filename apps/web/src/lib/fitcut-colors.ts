export type HairColorChoice = {
  id: string;
  name: string;
  prompt: string;
  swatch: string;
};

export const hairColorChoices: HairColorChoice[] = [
  {
    id: "natural-black",
    name: "자연 흑발",
    prompt:
      "Keep a natural Korean black hair color with subtle realistic highlights.",
    swatch: "#161412",
  },
  {
    id: "dark-brown",
    name: "다크 브라운",
    prompt: "Use a deep dark brown hair color, natural and salon-polished.",
    swatch: "#3a241a",
  },
  {
    id: "choco-brown",
    name: "초코 브라운",
    prompt: "Use a warm chocolate brown hair color with soft shine.",
    swatch: "#5a3828",
  },
  {
    id: "ash-brown",
    name: "애쉬 브라운",
    prompt: "Use a muted ash brown hair color with cool salon tones.",
    swatch: "#786f60",
  },
  {
    id: "ash-gray",
    name: "애쉬 그레이",
    prompt:
      "Use an ash gray hair color, cool smoky gray-brown, realistic and not silver-white.",
    swatch: "#9b9a90",
  },
  {
    id: "khaki-brown",
    name: "카키 브라운",
    prompt: "Use a subtle khaki brown hair color with olive undertones.",
    swatch: "#6f6a43",
  },
  {
    id: "blue-black",
    name: "블루 블랙",
    prompt: "Use a blue-black hair color with a restrained cool blue sheen.",
    swatch: "#111827",
  },
  {
    id: "milk-tea",
    name: "밀크티 브라운",
    prompt: "Use a soft milk-tea beige brown hair color, warm and premium.",
    swatch: "#b08b62",
  },
  {
    id: "copper-brown",
    name: "카퍼 브라운",
    prompt: "Use a tasteful copper brown hair color with warm red-brown notes.",
    swatch: "#9d4f32",
  },
  {
    id: "platinum-blond",
    name: "플래티넘 블론드",
    prompt:
      "Use a refined platinum blond hair color, salon-bleached but realistic.",
    swatch: "#d8c9a2",
  },
];

export function getHairColorById(id: string) {
  return hairColorChoices.find((color) => color.id === id);
}
