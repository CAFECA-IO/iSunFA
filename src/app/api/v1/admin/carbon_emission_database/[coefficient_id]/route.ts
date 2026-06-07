import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { Role } from "@/constants/role";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ coefficient_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const body = await req.json();
    const {
      name,
      description,
      unit,
      emissionFactor,
      source,
      category,
      versionYear,
      isVerified,
    } = body;

    const { coefficient_id: coefficientId } = await params;

    const updatedCoefficient = await EmissionFactorRepo.updateGlobal(
      coefficientId,
      {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(emissionFactor !== undefined && { emissionFactor }),
        ...(source !== undefined && { source }),
        ...(category !== undefined && { category }),
        ...(versionYear !== undefined && { versionYear }),
        ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
      },
    );

    return jsonOk(updatedCoefficient);
  } catch (error) {
    console.error("Failed to update public emission factor:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ coefficient_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const { coefficient_id: coefficientId } = await params;
    await EmissionFactorRepo.deleteGlobal(coefficientId);

    return jsonOk(null);
  } catch (error) {
    console.error("Failed to delete public emission factor:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
