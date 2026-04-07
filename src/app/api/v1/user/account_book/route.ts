import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getAccountBooksByUserId,
  createAccountBook,
} from "@/services/account_book.service";
import { teamRepo } from "@/repositories/team.repo";

export async function GET(request: NextRequest) {
  try {
    // Info: (20260308 - Luphia) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const accountBooks = await getAccountBooksByUserId(sessionUser.id);
    return jsonOk(accountBooks);
  } catch (error) {
    console.error("[API] /account_book GET error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const body = await request.json();
    const {
      name,
      country,
      currency,
      rule,
      teamId,
      enterpriseId,
      startYear,
      esgIndustryId,
    } = body;

    if (!name || !country || !currency || !rule || !teamId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing required fields");
    }

    // Info: (20260321 - Luphia) Verify user belongs to the team and has permission
    const teamMember = await teamRepo.getTeamMember(sessionUser.id, teamId);

    if (!teamMember) {
      return jsonFail(ApiCode.FORBIDDEN, "You do not belong to this team");
    }

    const createdAt = startYear
      ? new Date(`${startYear}-01-01T00:00:00.000Z`)
      : undefined;

    const accountBook = await createAccountBook({
      name,
      country,
      currency,
      rule,
      enterpriseId,
      esgIndustryId,
      createdAt,
      team: { connect: { id: teamId } },
    });

    return jsonOk(accountBook);
  } catch (error) {
    console.error("[API] /account_book POST error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
