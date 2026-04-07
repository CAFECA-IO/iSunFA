export interface ICompanyData {
  taxId: string;
  name: string;
}

const COMMON_ABBREVIATIONS: Record<string, ICompanyData> = {
  台積電: { taxId: "22099131", name: "台灣積體電路製造股份有限公司" },
  聯發科: { taxId: "16093554", name: "聯發科技股份有限公司" },
  鴻海: { taxId: "04541302", name: "鴻海精密工業股份有限公司" },
  大立光: { taxId: "23015546", name: "大立光電股份有限公司" },
  日月光: { taxId: "22099719", name: "日月光半導體製造股份有限公司" },
  台達電: { taxId: "11200164", name: "台達電子工業股份有限公司" },
  聯電: { taxId: "11340156", name: "聯華電子股份有限公司" },
  廣達: { taxId: "22822281", name: "廣達電腦股份有限公司" },
  華碩: { taxId: "23330685", name: "華碩電腦股份有限公司" },
  宏碁: { taxId: "11956108", name: "宏碁股份有限公司" },
  微星: { taxId: "22156844", name: "微星科技股份有限公司" },
  技嘉: { taxId: "22216654", name: "技嘉科技股份有限公司" },
  群創: { taxId: "80281223", name: "群創光電股份有限公司" },
  友達: { taxId: "97177530", name: "友達光電股份有限公司" },
  緯創: { taxId: "70774748", name: "緯創資通股份有限公司" },
  台泥: { taxId: "11909207", name: "台灣水泥股份有限公司" },
  亞泥: { taxId: "03244509", name: "亞洲水泥股份有限公司" },
  中鋼: { taxId: "30414175", name: "中國鋼鐵股份有限公司" },
  統一: { taxId: "73251209", name: "統一企業股份有限公司" },
  富邦金: { taxId: "80328224", name: "富邦金融控股股份有限公司" },
  國泰金: { taxId: "80327715", name: "國泰金融控股股份有限公司" },
  兆豐金: { taxId: "12791629", name: "兆豐金融控股股份有限公司" },
  中信金: { taxId: "12821422", name: "中國信託金融控股股份有限公司" },
  玉山金: { taxId: "12822941", name: "玉山金融控股股份有限公司" },
  長榮: { taxId: "11068407", name: "長榮海運股份有限公司" },
  陽明: { taxId: "11287610", name: "陽明海運股份有限公司" },
  萬海: { taxId: "11211186", name: "萬海航運股份有限公司" },
  中華電: { taxId: "96979933", name: "中華電信股份有限公司" },
  台灣大: { taxId: "97176270", name: "台灣大哥大股份有限公司" },
  遠傳: { taxId: "97178125", name: "遠傳電信股份有限公司" },
};

function lookupByAbbreviation(cleanQuery: string): ICompanyData[] {
  if (COMMON_ABBREVIATIONS[cleanQuery]) {
    return [COMMON_ABBREVIATIONS[cleanQuery]];
  }

  const partialMatches = Object.entries(COMMON_ABBREVIATIONS)
    .filter(
      ([key, val]) =>
        key.includes(cleanQuery) ||
        val.name.includes(cleanQuery) ||
        val.taxId.includes(cleanQuery),
    )
    .map(([, val]) => val);

  return partialMatches.length > 0 ? partialMatches.slice(0, 5) : [];
}

async function lookupByTaxId(taxId: string): Promise<ICompanyData[]> {
  try {
    const url =
      "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6?$format=json&$filter=Business_Accounting_NO eq " +
      taxId;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d) => ({
          taxId: d.Business_Accounting_NO,
          name: d.Company_Name,
        }));
      }
    }
  } catch (e) {
    console.error("Company ID lookup failed:", e);
  }
  return [];
}

async function lookupByDuckDuckGo(keyword: string): Promise<ICompanyData[]> {
  // Info: (20260320 - Tzuhan) "Google-like" Semantic Search via DuckDuckGo HTML
  try {
    const enc = encodeURIComponent(keyword + " 統編 公司");
    const url = "https://html.duckduckgo.com/html/?q=" + enc;
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36)",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (r.ok) {
      const html = await r.text();
      const taxIdMatch =
        html.match(
          /(?:統一編號|統編|Business(?:_| )?Accounting(?:_| )?NO)[\s:：]*(\d{8})/i,
        ) || html.match(/\b(\d{8})\b/);
      const nameMatch = html.match(
        /([^<>\s]*股份有限公司|[^<>\s]*有限公司|[^<>\s]*企業社|[^<>\s]*行|[^<>\s]*廠)/,
      );

      if (taxIdMatch && nameMatch && taxIdMatch[1] && nameMatch[1]) {
        if (nameMatch[1].length >= 3 && nameMatch[1].length <= 30) {
          return [
            {
              taxId: taxIdMatch[1],
              name: nameMatch[1],
            },
          ];
        }
      }
    }
  } catch (e) {
    console.error("DuckDuckGo semantic lookup failed:", e);
  }
  return [];
}

async function lookupByNameGCIS(name: string): Promise<ICompanyData[]> {
  try {
    const url =
      "https://data.gcis.nat.gov.tw/od/data/api/F05D1060-7D57-4763-BDCE-0DAF5975AFE0?$format=json&$filter=Company_Name like " +
      encodeURIComponent(name);
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data
          .slice(0, 10)
          .map(
            (d: { Business_Accounting_NO: string; Company_Name: string }) => ({
              taxId: d.Business_Accounting_NO,
              name: d.Company_Name,
            }),
          );
      }
    }
  } catch (e) {
    console.error("Company name lookup failed:", e);
  }
  return [];
}

export async function lookupCompany(query: string): Promise<ICompanyData[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cleanTrimmed = trimmed.replace(/(股份有限公司|有限公司|公司)$/, "");

  // Info: (20260320 - Tzuhan) 1. Check exact abbreviation or generic substring match
  const abbrResults = lookupByAbbreviation(cleanTrimmed);
  if (abbrResults.length > 0) {
    return abbrResults;
  }

  // Info: (20260320 - Tzuhan) 2. If it's exactly 8 digits, use strict Tax ID lookup
  if (/^\d{8}$/.test(cleanTrimmed)) {
    return await lookupByTaxId(cleanTrimmed);
  }

  // Info: (20260320 - Tzuhan) 3. Fallback 1: DuckDuckGo Semantic Search
  const ddgResults = await lookupByDuckDuckGo(cleanTrimmed);
  if (ddgResults.length > 0) {
    return ddgResults;
  }

  // Info: (20260320 - Tzuhan) 4. Fallback 2: Strict GCIS Name Lookup
  return await lookupByNameGCIS(cleanTrimmed);
}
