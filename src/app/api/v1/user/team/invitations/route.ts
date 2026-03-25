import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { prisma } from "@/lib/prisma";

// Info: (20260325 - Agent) List pending invitations for the currently logged-in user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: {
        inviteeAddress: sessionUser.address,
        status: "PENDING"
      },
      include: {
        team: true,
        inviter: {
          select: {
            name: true,
            address: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return jsonOk(invitations);
  } catch (error) {
    console.error("[API] /team/invitations GET error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
