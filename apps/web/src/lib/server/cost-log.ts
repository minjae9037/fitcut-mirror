// Lightweight, single-line cost telemetry. Each provider call emits one
// `[COST]` line so a single end-to-end run can be measured exactly from the
// Vercel logs (grep "[COST]") without mixing in unrelated traffic. Token /
// image counts come straight from each provider response.
export function logCost(stage: string, data: Record<string, unknown>) {
  try {
    console.info(`[COST] ${stage} ${JSON.stringify(data)}`);
  } catch {
    console.info(`[COST] ${stage}`, data);
  }
}
