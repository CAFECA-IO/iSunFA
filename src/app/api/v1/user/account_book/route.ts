import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { getAccountBooksByUserId } from "@/services/account_book.service";

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
