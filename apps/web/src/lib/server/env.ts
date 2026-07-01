export function readServerEnv(name: string) {
  const value = cleanEnvValue(process.env[name]);

  if (/SUPABASE.*URL/.test(name) && value.startsWith("ttps://")) {
    return `h${value}`;
  }

  if (/SUPABASE.*KEY/.test(name) && value.startsWith("yJ")) {
    return `e${value}`;
  }

  return value;
}

export function cleanEnvValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/^[^\x20-\x7E]+/, "")
    .trim();
}
