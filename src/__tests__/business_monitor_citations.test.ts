import { describe, it, expect } from "@jest/globals";
import {
  buildEvidenceContext,
  IEvidence,
  resolveCitations,
} from "@/lib/business_monitor/citations";
import { IReport } from "@/interfaces/business_monitor";

/**
 * Info: (20261022 - Luphia) AI 諮詢的出處編號比對：對得上的標成 cited，
 * 模型自己編出來的編號從回答移除——留著它，使用者會以為那句話有出處。
 */

function report(id: number, title: string): IReport {
  return {
    id,
    companyName: "臺灣水泥股份有限公司",
    title,
    reportYear: "2024",
    period: "",
    industry: "水泥工業",
    capital: "",
    verificationAgency: "",
    verificationStandards: "",
    assuranceAgency: "",
    assuranceStandards: "",
    isVerifiedByThirdParty: false,
  };
}

const evidence: IEvidence[] = [
  {
    index: 1,
    report: report(10, "2024 年永續報告書"),
    text: "範疇一排放量為 123 公噸",
    pageNumber: 87,
    sourceUrl: "https://esggenplus.twse.com.tw/x",
  },
  {
    index: 2,
    report: report(11, "2024 年溫室氣體盤查揭露"),
    text: "確信機構：某某",
    pageNumber: null,
    sourceUrl: null,
  },
];

describe("resolveCitations", () => {
  it("keeps known markers and flags them as cited", () => {
    const result = resolveCitations("排放量為 123 公噸 [1]。", evidence);
    expect(result.answer).toBe("排放量為 123 公噸 [1]。");
    expect(result.citations.map((c) => [c.index, c.cited])).toEqual([
      [1, true],
      [2, false],
    ]);
  });

  it("removes markers that point to no evidence", () => {
    const result = resolveCitations("排放量為 123 公噸 [1][7]。", evidence);
    expect(result.answer).toBe("排放量為 123 公噸 [1]。");
    expect(result.citations.every((c) => c.index !== 7)).toBe(true);
  });

  it("carries page number and official url through unchanged", () => {
    const [first, second] = resolveCitations("[1][2]", evidence).citations;
    expect(first).toMatchObject({
      reportId: 10,
      pageNumber: 87,
      sourceUrl: "https://esggenplus.twse.com.tw/x",
      cited: true,
    });
    expect(second).toMatchObject({
      reportId: 11,
      pageNumber: null,
      sourceUrl: null,
      cited: true,
    });
  });
});

describe("buildEvidenceContext", () => {
  it("labels each passage with its number, report and page", () => {
    const context = buildEvidenceContext(evidence);
    expect(context).toContain(
      "[1] 臺灣水泥股份有限公司｜2024 年永續報告書｜第 87 頁\n範疇一排放量為 123 公噸",
    );
    // Info: (20261022 - Luphia) 沒有頁碼就不寫頁碼，不補「第 1 頁」
    expect(context).toContain(
      "[2] 臺灣水泥股份有限公司｜2024 年溫室氣體盤查揭露\n確信機構：某某",
    );
  });
});
