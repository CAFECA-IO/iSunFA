import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IActivityData, mockEmissionSources } from "@/interfaces/emission_source";
import { EsgActivityTypeMapping } from "@/constants/esg_activity_type";
import { EsgScope } from "@/interfaces/esg";

/**
 * Info: (20260420 - Julian) 取得排放源清單
 * GET /api/v1/user/account_book/:account_book_id/esg/emission_sources
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

    // Info: (20260420 - Julian) 解析 Query Parameters
    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get("scope") as EsgScope | null;
    const keyword = searchParams.get("keyword")?.toLowerCase() || "";

    const activeScope = scopeParam || EsgScope.SCOPE_1;

    // TODO: (20260420 - Julian) get data from esgRepo
    let filteredSources = mockEmissionSources.filter(
      (source) => source.activityType.scope === activeScope,
    );

    // Info: (20260420 - Julian) 關鍵字過濾
    if (keyword) {
      filteredSources = filteredSources.filter(
        (source) =>
          source.name.toLowerCase().includes(keyword) ||
          source.id.toLowerCase().includes(keyword),
      );
    }

    // Info: (20260420 - Julian) 將相同的 activityType 的排放源集合成一組
    const activityTypesInScope = EsgActivityTypeMapping.filter(
      (at) => at.scope === activeScope,
    );

    const result: IActivityData[] = activityTypesInScope
      .map((activityType) => {
        const es = filteredSources.filter(
          (source) => source.activityType.key === activityType.key,
        );

        if (es.length === 0) {
          return null;
        }

        return {
          activityType,
          emissionSources: es,
        };
      })
      .filter((group) => group !== null) as IActivityData[];

    return jsonOk(result);
  } catch (error) {
    console.error("Error fetching esg emission sources:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch esg emission sources",
    );
  }
}
