import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { Role } from "@/generated/enums";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");
    }

    const users = await webAuthnRepo.findAllUsersForAdmin();

    return jsonOk(users);
  } catch (error) {
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message);
  }
}
