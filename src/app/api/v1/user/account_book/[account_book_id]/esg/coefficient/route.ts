import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  CoefficientCategory,
  ICoefficient,
  ICoefficientInput,
} from "@/interfaces/coefficient";
import { Prisma } from "@/generated";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
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
      return jsonFail(API_ERRORS.VA_COEFFICIENT_IS_REQUIRED);
    }

    // Info: (20260413 - Julian) 建立自訂公式
    const newCoefficient = await esgRepo.createEsgCoefficient({
      name: input.name,
      description: input.description,
      emissionFactor: new Prisma.Decimal(String(input.emissionFactor)),
      unit: input.unit,
      source: accountBook.name,
      accountBook: { connect: { id: accountBook.id } },
    });

    return jsonOk({ coefficientId: newCoefficient.newId });
  } catch (error) {
    console.error("Error creating esg coefficient:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_CREATE_ESG_COEFFI);
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

    /**
     * Info: (20260801 - Luphia) 改用 ALL_COEFFICIENTS 而非在此手列各分段。
     *
     * 原本這裡逐一展開 12 個分段,而 TRUE_COEFFICIENT_DATA_MOENV_PART_6 被漏掉 ——
     * 該分段的 6 筆環境部碳足跡排放係數資料庫項目(電力 0.495、自來水、天然氣、
     * 廢棄物焚化與掩埋)因此完全不會出現在係數清單中,使用者查不到也選不到。
     *
     * ALL_COEFFICIENTS 定義在係數檔的末尾、緊接各分段之後,新增分段時漏掉的機會
     * 遠低於在另一個檔案裡維護第二份清單;且該彙總已有 emission_factor.repo、
     * document_sync.repo、esg_parsing、carbon_emission_database/import 四處在用,
     * 此處手抄一份等於讓同一個事實有兩個版本。
     */
    let dataFromConstants: ICoefficient[] = [...ALL_COEFFICIENTS];

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
        emissionFactor: String(c.emissionFactor),
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
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_ESG_COEFFIC);
  }
}
