import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  CoefficientCategory,
  ICoefficient,
  ICoefficientInput,
} from "@/interfaces/coefficient";
import { Prisma } from "@/generated/client";
import { TRUE_COEFFICIENT_DATA_PART_1, TRUE_COEFFICIENT_DATA_PART_2, TRUE_COEFFICIENT_DATA_PART_3, TRUE_COEFFICIENT_DATA_PART_4, TRUE_COEFFICIENT_DATA_PART_5, TRUE_COEFFICIENT_DATA_DEFRA_PART_1, TRUE_COEFFICIENT_DATA_DEFRA_PART_2, TRUE_COEFFICIENT_DATA_DEFRA_PART_3, TRUE_COEFFICIENT_DATA_DEFRA_PART_4, TRUE_COEFFICIENT_DATA_DEFRA_PART_5, TRUE_COEFFICIENT_DATA_DEFRA_PART_6, TRUE_COEFFICIENT_DATA_TAIWAN } from "@/constants/true_esg_coefficients";

/**
 * Info: (20260413 - Julian) 新增自訂係數
 * POST /api/v1/user/account_book/:account_book_id/esg/coefficient
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260413 - Julian) 新增自訂公式
    const body = await request.json();
    const { input }: { input: ICoefficientInput } = body;

    // Info: (20260413 - Julian) 驗證 coefficient 參數
    if (!input || !input.name) {
      console.error("Missing coefficient or coefficient name");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Coefficient is required");
    }

    // Info: (20260413 - Julian) 建立自訂公式
    const newCoefficient = await esgRepo.createEsgCoefficient({
      name: input.name,
      description: input.description,
      emissionFactor: input.emissionFactor,
      unit: input.unit,
      source: accountBook.name,
      accountBook: { connect: { id: accountBook.id } },
    });

    return jsonOk({ coefficientId: newCoefficient.id });
  } catch (error) {
    console.error("Error creating esg coefficient:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to create esg coefficient",
    );
  }
}

/**
 * Info: (20260312 - Julian) 取得全部或指定範圍的自訂公式
 * GET /api/v1/user/account_book/:account_book_id/esg/coefficient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const { searchParams } = new URL(request.url);
    const tabParam = searchParams.get("tab");
    const searchParam = searchParams.get("search");
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : undefined;
    // Info: (20260416 - Julian) 單位參數，用於 Esg Detail Modal 篩選
    const unitParam = searchParams.get("unit");

    // Info: (20260414 - Julian) 篩選條件
    const andConditions: Prisma.CoefficientWhereInput[] = [];

    // Info: (20260413 - Julian) 排除已刪除的係數
    andConditions.push({ deletedAt: null });

    // Info: (20260414 - Julian) 依據 tab 篩選係數
    if (tabParam === CoefficientCategory.STANDARD) {
      // Info: (20260414 - Julian) 無 accountBookId => 標準係數
      andConditions.push({ accountBookId: null });
    } else if (tabParam === CoefficientCategory.CUSTOM) {
      // Info: (20260414 - Julian) 有 accountBookId => 自訂係數
      andConditions.push({ accountBookId: { not: null } });
    }

    // Info: (20260414 - Julian) 搜尋字串過濾邏輯（名稱、描述的模糊搜尋）
    if (searchParam) {
      andConditions.push({
        OR: [
          { name: { contains: searchParam, mode: "insensitive" } },
          { description: { contains: searchParam, mode: "insensitive" } },
        ],
      });
    }

    // Info: (20260416 - Julian) 單位參數過濾邏輯（完全匹配）
    if (unitParam) {
      andConditions.push({ unit: unitParam });
    }

    // const [coefficients, totalCount] = await Promise.all([
    //   esgRepo.getEsgCoefficients({
    //     where: { AND: andConditions },
    //     // Info: (20260413 - Julian) 分頁邏輯
    //     ...(page && pageSize
    //       ? { skip: (page - 1) * pageSize, take: pageSize }
    //       : {}),
    //     // Info: (20260413 - Julian) 排序邏輯：將標準係數排在前面，並依據更新時間倒序排列
    //     orderBy: [{ accountBookId: "desc" }, { updatedAt: "desc" }],
    //   }),
    //   esgRepo.countEsgCoefficients({ AND: andConditions }),
    // ]);
    //
    // const result: ICoefficient[] = coefficients.map((coefficient) => ({
    //   id: coefficient.id,
    //   name: coefficient.name,
    //   description: coefficient.description,
    //   emissionFactor: Number(coefficient.emissionFactor),
    //   unit: coefficient.unit,
    //   source: coefficient.source,
    //   category: !!coefficient.accountBookId
    //     ? CoefficientCategory.CUSTOM
    //     : CoefficientCategory.STANDARD,
    //   createdAt: new Date(coefficient.createdAt).getTime() / 1000,
    //   updatedAt: new Date(coefficient.updatedAt).getTime() / 1000,
    // }));

    let filteredStaticData = [...TRUE_COEFFICIENT_DATA_PART_1, ...TRUE_COEFFICIENT_DATA_PART_2, ...TRUE_COEFFICIENT_DATA_PART_3, ...TRUE_COEFFICIENT_DATA_PART_4, ...TRUE_COEFFICIENT_DATA_PART_5, ...TRUE_COEFFICIENT_DATA_DEFRA_PART_1, ...TRUE_COEFFICIENT_DATA_DEFRA_PART_2, ...TRUE_COEFFICIENT_DATA_DEFRA_PART_3, ...TRUE_COEFFICIENT_DATA_DEFRA_PART_4, ...TRUE_COEFFICIENT_DATA_DEFRA_PART_5, ...TRUE_COEFFICIENT_DATA_DEFRA_PART_6, ...TRUE_COEFFICIENT_DATA_TAIWAN];

    if (tabParam === CoefficientCategory.CUSTOM) {
      filteredStaticData = [];
    }

    if (searchParam) {
      const lowerSearch = searchParam.toLowerCase();
      filteredStaticData = filteredStaticData.filter(
        c => c.name.toLowerCase().includes(lowerSearch) || c.description.toLowerCase().includes(lowerSearch)
      );
    }

    if (unitParam) {
      filteredStaticData = filteredStaticData.filter(c => c.unit === unitParam);
    }

    const totalCount = filteredStaticData.length;
    let paginatedData = filteredStaticData;

    if (page && pageSize) {
      paginatedData = paginatedData.slice((page - 1) * pageSize, page * pageSize);
    }

    const result: ICoefficient[] = paginatedData.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      emissionFactor: Number(c.emissionFactor),
      unit: c.unit,
      source: c.source,
      category: CoefficientCategory.STANDARD,
      createdAt: Number(c.createdAt),
      updatedAt: Number(c.updatedAt),
    }));

    return jsonOk({ items: result, total: totalCount });
  } catch (error) {
    console.error("Error fetching esg coefficients:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch esg coefficients",
    );
  }
}
