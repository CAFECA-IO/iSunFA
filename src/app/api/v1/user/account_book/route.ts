import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  getAccountBooksByUserId,
  createAccountBook,
} from "@/services/account_book.service";
import { teamRepo } from "@/repositories/team.repo";
import { CreateAccountBookSchema } from "@/validators";

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
    const parseResult = CreateAccountBookSchema.safeParse(body);

    if (!parseResult.success) {
      return jsonFail({
        ...API_ERRORS.VL_SCHEMA_ERROR,
        message: `Validation Error: ${parseResult.error.errors[0].message} (${parseResult.error.errors[0].path.join(".")})`,
      });
    }

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
    } = parseResult.data;

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
