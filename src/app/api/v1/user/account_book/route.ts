import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
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
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const accountBooks = await getAccountBooksByUserId(sessionUser.id);
    return jsonOk(accountBooks);
  } catch (error) {
    console.error("[API] /account_book GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
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
      parValue,
    } = body;

    if (!name || !country || !currency || !rule || !teamId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260321 - Luphia) Verify user belongs to the team and has permission
    const teamMember = await teamRepo.getTeamMember(sessionUser.id, teamId);

    if (!teamMember) {
      return jsonFail(API_ERRORS.AUTH_NOT_IN_TEAM);
    }

    const createdAt = startYear
      ? new Date(`${startYear}-01-01T00:00:00.000Z`)
      : undefined;

    const accountBook = await createAccountBook({
      name,
      country,
      currency,
      rule,
      teamId,
      enterpriseId,
      esgIndustryId,
      parValue,
      createdAt,
    });

    return jsonOk(accountBook);
  } catch (error) {
    console.error("[API] /account_book POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
