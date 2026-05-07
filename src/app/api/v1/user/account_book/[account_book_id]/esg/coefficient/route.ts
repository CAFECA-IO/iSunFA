import { API_ERRORS } from "@/lib/utils/error_dictionary";
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
import {
  TRUE_COEFFICIENT_DATA_PART_1,
  TRUE_COEFFICIENT_DATA_PART_2,
  TRUE_COEFFICIENT_DATA_PART_3,
  TRUE_COEFFICIENT_DATA_PART_4,
  TRUE_COEFFICIENT_DATA_PART_5,
  TRUE_COEFFICIENT_DATA_DEFRA_PART_1,
  TRUE_COEFFICIENT_DATA_DEFRA_PART_2,
  TRUE_COEFFICIENT_DATA_DEFRA_PART_3,
  TRUE_COEFFICIENT_DATA_DEFRA_PART_4,
  TRUE_COEFFICIENT_DATA_DEFRA_PART_5,
  TRUE_COEFFICIENT_DATA_DEFRA_PART_6,
  TRUE_COEFFICIENT_DATA_TAIWAN,
} from "@/constants/true_esg_coefficients";
import { ICoefficientFilterOptions } from "@/interfaces/data_filter_option";

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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260413 - Julian) 新增自訂公式
    const body = await request.json();
    const { input }: { input: ICoefficientInput } = body;

    // Info: (20260413 - Julian) 驗證 coefficient 參數
    if (!input || !input.name) {
      console.error("Missing coefficient or coefficient name");
      return jsonFail({
        code: "VA000099",
        message: "Coefficient is required",
        status: ApiCode.VALIDATION_ERROR,
      });
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

    return jsonOk({ coefficientId: newCoefficient.newId });
  } catch (error) {
    console.error("Error creating esg coefficient:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to create esg coeffi...",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
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
    const options: ICoefficientFilterOptions = {
      accountBookId,
      tab: tabParam,
      keyword: searchParam,
      unit: unitParam,
      page,
      limit: pageSize,
    };

    const [coefficients, totalCount] = await Promise.all([
      esgRepo.getEsgCoefficientsByFilter(options),
      esgRepo.countEsgCoefficientsByFilter(options),
    ]);

    const dataFromDatabase: ICoefficient[] = coefficients;

    let dataFromConstants: ICoefficient[] = [
      ...TRUE_COEFFICIENT_DATA_PART_1,
      ...TRUE_COEFFICIENT_DATA_PART_2,
      ...TRUE_COEFFICIENT_DATA_PART_3,
      ...TRUE_COEFFICIENT_DATA_PART_4,
      ...TRUE_COEFFICIENT_DATA_PART_5,
      ...TRUE_COEFFICIENT_DATA_DEFRA_PART_1,
      ...TRUE_COEFFICIENT_DATA_DEFRA_PART_2,
      ...TRUE_COEFFICIENT_DATA_DEFRA_PART_3,
      ...TRUE_COEFFICIENT_DATA_DEFRA_PART_4,
      ...TRUE_COEFFICIENT_DATA_DEFRA_PART_5,
      ...TRUE_COEFFICIENT_DATA_DEFRA_PART_6,
      ...TRUE_COEFFICIENT_DATA_TAIWAN,
    ];

    if (tabParam === CoefficientCategory.CUSTOM) {
      dataFromConstants = [];
    }

    if (searchParam) {
      const lowerSearch = searchParam.toLowerCase();
      dataFromConstants = dataFromConstants.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerSearch) ||
          c.description.toLowerCase().includes(lowerSearch),
      );
    }

    if (unitParam) {
      dataFromConstants = dataFromConstants.filter((c) => c.unit === unitParam);
    }

    const total = dataFromConstants.length + totalCount;
    let paginatedDataFromConstants = dataFromConstants;

    if (page && pageSize) {
      paginatedDataFromConstants = paginatedDataFromConstants.slice(
        (page - 1) * pageSize,
        page * pageSize,
      );
    }

    const formattedDataFromConstants: ICoefficient[] =
      paginatedDataFromConstants.map((c) => ({
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

    // Info: (20260429 - Julian) 整合標準係數與自訂係數，且依照更新時間倒序排列
    const result: ICoefficient[] = [
      ...formattedDataFromConstants,
      ...dataFromDatabase,
    ].sort((a, b) => b.updatedAt - a.updatedAt);

    return jsonOk({ items: result, total });
  } catch (error) {
    console.error("Error fetching esg coefficients:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to fetch esg coeffic...",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
