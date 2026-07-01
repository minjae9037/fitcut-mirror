import { HairMoneyRecommendationCost } from "@/lib/mirilook-payments";
import { getHairMoneyWallet } from "@/lib/server/hair-money";
import { getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json(
      {
        balance: 0,
        reason: "not_authenticated",
        recommendationCost: HairMoneyRecommendationCost,
        synced: false,
      },
      { status: 401 },
    );
  }

  const wallet = await getHairMoneyWallet(user.id);

  return Response.json(wallet, {
    status: wallet.synced ? 200 : 503,
  });
}
