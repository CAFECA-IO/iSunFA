import { fetchWithRetry } from "@/lib/utils/http_client";
import { companyRepo } from "@/repositories/company.repo";

interface IOpenApiRecord {
  // Info: (20260402 - Tzuhan) 上市 (sii) 中文欄位
  公司代號?: string;
  公司名稱?: string;
  公司簡稱?: string;
  營利事業統一編號?: string;
  產業別?: string;
  成立日期?: string;
  上市日期?: string;
  英文簡稱?: string;
  // Info: (20260402 - Tzuhan) 上櫃 (otc) 英文欄位
  SecuritiesCompanyCode?: string;
  CompanyName?: string;
  CompanyAbbreviation?: string;
  "UnifiedBusinessNo."?: string;
  SecuritiesIndustryCode?: string;
  DateOfIncorporation?: string;
  DateOfListing?: string;
  Symbol?: string;
  [key: string]:
    | string
    | undefined
    | null
    | number
    | boolean
    | object
    | string[];
}

interface IDataSource {
  name: string;
  marketType: "sii" | "otc";
  url: string;
}

async function main() {
  const sources: IDataSource[] = [
    {
      name: "上市公司",
      marketType: "sii",
      url: "https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
    },
    {
      name: "上櫃公司",
      marketType: "otc",
      url: "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O",
    },
  ];

  for (const source of sources) {
    console.log(`\n⏳ 抓取 ${source.name} 名單...`);
    const response = await fetchWithRetry(source.url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const blockedHtml = await response.text();
      throw new Error(
        `伺服器沒有回傳 JSON，可能被 WAF 阻擋。回傳內容開頭: ${blockedHtml.substring(0, 100)}`,
      );
    }

    const rawData = (await response.json()) as IOpenApiRecord[];

    for (const item of rawData) {
      const stockId = item.公司代號 ?? item.SecuritiesCompanyCode;
      if (!stockId) continue;
      const data = {
        name: item.公司名稱 ?? item.CompanyName ?? "",
        abbreviation: item.公司簡稱 ?? item.CompanyAbbreviation ?? null,
        marketType: source.marketType,
        taxId: item.營利事業統一編號 ?? item["UnifiedBusinessNo."] ?? null,
        industry: item.產業別 ?? item.SecuritiesIndustryCode ?? null,
        incorporationDate: item.成立日期 ?? item.DateOfIncorporation ?? null,
        listingDate: item.上市日期 ?? item.DateOfListing ?? null,
        symbol: item.英文簡稱 ?? item.Symbol ?? null,
        isActive: true,
        metadata: item,
      };

      await companyRepo.upsert({
        where: { stockId },
        update: data,
        create: { stockId, ...data },
      });
    }
    console.log(`\n🎉  ${source.name} 同步完成 (${rawData.length} 筆)`);
  }
}

main().catch(console.error);
