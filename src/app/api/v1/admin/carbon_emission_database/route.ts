import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { Role } from "@/constants/role";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";

export async function GET(req: Request) {
  try {
    const user = await getIdentityFromDeWT(req.headers.get("authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), {
      fallback: 1,
    });
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: 15,
      max: 100,
    });
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const isVerifiedParam = searchParams.get("isVerified");
    const isVerified =
      isVerifiedParam !== null ? isVerifiedParam === "true" : undefined;

    const [data, totalElements] = await Promise.all([
      EmissionFactorRepo.findManyGlobal({
        skip,
        limit,
        search,
        category,
        isVerified,
      }),
      EmissionFactorRepo.countGlobal({ search, category, isVerified }),
    ]);

    return jsonOk({
      data,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch public emission factors:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function POST(req: Request) {
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

    if (!name || !unit || emissionFactor === undefined || !source) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const newCoefficient = await EmissionFactorRepo.createGlobal({
      name,
      description: description || "",
      unit,
      emissionFactor,
      source,
      category: category || "STANDARD",
      versionYear: versionYear || undefined,
      isVerified: isVerified !== undefined ? Boolean(isVerified) : true,
      userId: user.id,
    });

    return jsonOk(newCoefficient);
  } catch (error) {
    console.error("Failed to create public emission factor:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
