import { NextRequest, NextResponse } from "next/server";
import { mockReports } from "@/interfaces/business_monitor";
import { IAIResponse } from "@/interfaces/business_monitor";

/*
 ** Info:(20260609 - Julian) 用於開發 Business Monitor 的 Mock API，之後會移除
 ** GET /api/v1/mock/reports?query={query}&company={company}&industry={industry}&year={year}&page={page}&pageSize={pageSize}
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("query")?.toLowerCase() || "";
  const company = searchParams.get("company") || "";
  const industry = searchParams.get("industry") || "";
  const year = searchParams.get("year") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "4", 10);

  // Info:(20260609 - Julian) 模擬網路延遲，若有 AI 查詢則模擬 LLM 推理時間
  const delayMs = query ? 1500 : 500;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  let filtered = [...mockReports];
  let aiResponse: IAIResponse | undefined;

  // Info:(20260609 - Julian) 關鍵字與 AI 意圖過濾
  if (query) {
    if (query.includes("離職率") && query.includes("鴻海")) {
      aiResponse = {
        answer:
          "根據 2024 年鴻海永續報告書指出，鴻海精密工業股份有限公司的整體離職率為 5.2%。",
        sourceReportIds: [2],
      };
    } else if (query.includes("碳排放") && query.includes("半導體")) {
      aiResponse = {
        answer:
          "在半導體產業中，台積電 2024 年溫室氣體排放量有顯著降低，聯電亦提出淨零碳排路徑。",
        sourceReportIds: [4, 5],
      };
    } else {
      aiResponse = {
        answer: "在現有報告中找不到相關解答。",
        sourceReportIds: [],
      };
    }

    // Info:(20260609 - Julian) 若為 AI 查詢，強制將列表收斂為只顯示來源報告
    filtered = filtered.filter((r) =>
      aiResponse?.sourceReportIds.includes(r.id),
    );
  } else {
    // Info:(20260609 - Julian) 只有非 AI 查詢時，才套用常規過濾邏輯
    if (company) {
      filtered = filtered.filter(
        (r) => company.includes(r.company) || r.company.includes(company),
      );
    }

    if (industry) {
      filtered = filtered.filter((r) => r.industry === industry);
    }

    if (year) {
      filtered = filtered.filter((r) => r.reportYear === year);
    }
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedReports = filtered.slice(startIndex, startIndex + pageSize);

  return NextResponse.json({
    payload: {
      reports: paginatedReports,
      total,
      totalPages,
      ...(aiResponse && { aiResponse }),
    },
  });
}
