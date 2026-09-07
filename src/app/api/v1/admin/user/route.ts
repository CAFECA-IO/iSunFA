import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { Role } from "@/constants/role";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), {
      fallback: 1,
    });
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: 15,
      max: 100,
    });
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    const result = await webAuthnRepo.findAllUsersForAdmin({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
