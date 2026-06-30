import { mockReports, IMockReport } from "@/interfaces/business_monitor";

export const FILE_TO_REPORT_ID_MAP: Record<string, number> = {
  "2024年永續報告書(中)亞泥1102.pdf": 101,
  "2024年永續報告書(中)台泥1101.pdf": 102,
  "2024年永續報告書(中)台積電2330.pdf": 5,
  "2024年永續報告書(中)精誠6214.pdf": 103,
  "2024年永續報告書(中)長榮2603.pdf": 104,
  "台積電財務報告暨會計師核閱報告.pdf": 20,
};

export const mapFileNameToReport = (fileName: string): IMockReport => {
  const mappedId = FILE_TO_REPORT_ID_MAP[fileName];
  if (mappedId !== undefined) {
    const found = mockReports.find((r) => r.id === mappedId);
    if (found) return found;
  }

  // Fallback dynamic creation
  const cleanFileName = fileName.replace(".pdf", "");
  const yearMatch = cleanFileName.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : "2024";

  let company = cleanFileName;
  if (cleanFileName.includes("亞泥")) company = "亞洲水泥股份有限公司";
  else if (cleanFileName.includes("台泥")) company = "台灣水泥股份有限公司";
  else if (cleanFileName.includes("台積電"))
    company = "台灣積體電路製造股份有限公司";
  else if (cleanFileName.includes("精誠")) company = "精誠資訊股份有限公司";
  else if (cleanFileName.includes("長榮")) company = "長榮海運股份有限公司";

  let title = "永續報告書";
  if (cleanFileName.includes("財務報告")) {
    title = "財務報告";
  }

  const id =
    1000 +
    (Math.abs(
      cleanFileName.split("").reduce((acc, b) => {
        const val = (acc << 5) - acc + b.charCodeAt(0);
        return val & val;
      }, 0),
    ) %
      10000);

  return {
    id,
    company,
    title: `${year} 年${title}`,
    reportYear: year,
    period: `${year}/01/01 ~ ${year}/12/31`,
    industry: "其他",
    capital: "100億以上",
    verificationAgency: "無",
    verificationStandards: "參考國際永續標準、準則與規範",
    assuranceAgency: "無",
    assuranceStandards: "無",
    isVerifiedByThirdParty: false,
  };
};
