import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { Role } from "@/constants/role";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";

export async function POST(req: Request) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const importedCount = await EmissionFactorRepo.importGlobalCoefficients(
      ALL_COEFFICIENTS,
      user.id,
    );

    return jsonOk({ count: importedCount });
  } catch (error) {
    console.error("Failed to import public emission coefficients:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
