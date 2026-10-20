import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export interface HouseholdCtx {
  userId: number;
  householdId: number;
  isAdmin: boolean;
}

// Resolves the current user's household, or returns an error response to send as-is.
// Every query on household data must be scoped by ctx.householdId.
export async function getHouseholdCtx(opts: { admin?: boolean } = {}): Promise<HouseholdCtx | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = session.user.role === "ADMIN";
  if (opts.admin && !isAdmin) {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }
  return {
    userId: parseInt(session.user.id),
    householdId: parseInt(session.user.householdId),
    isAdmin,
  };
}
