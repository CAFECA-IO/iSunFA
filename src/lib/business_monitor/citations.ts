import {
  BUSINESS_MONITOR_CITATION_MARKER,
  BUSINESS_MONITOR_EVIDENCE_MAX_CHARS,
} from "@/constants/business_monitor";
import { IAICitation, IReport } from "@/interfaces/business_monitor";

/**
 * Info: (20261022 - Luphia) AI 諮詢的出處編號與比對。純函數。
 *
 * 證據片段依檢索順序編成 [1]、[2]…送進提示詞，模型回答時以同樣的編號標示出處；
 * 回來之後由這裡比對：編號對得上的標成 cited，對不上的（模型自己編出來的 [7]）從回答中移除——
 * 留著它，使用者會以為那句話有出處。
 */

export interface IEvidence {
  index: number;
  report: IReport;
  text: string;
  pageNumber: number | null;
  sourceUrl: string | null;
}

// Info: (20261022 - Luphia) 證據標頭：公司｜報告｜頁碼，讓模型知道每段話出自哪裡
function evidenceHeader(evidence: IEvidence): string {
  const parts = [evidence.report.companyName, evidence.report.title];
  if (evidence.pageNumber !== null) parts.push(`第 ${evidence.pageNumber} 頁`);
  return `[${evidence.index}] ${parts.join("｜")}`;
}

export function buildEvidenceContext(evidence: IEvidence[]): string {
  return evidence
    .map(
      (item) =>
        `${evidenceHeader(item)}\n${item.text.slice(0, BUSINESS_MONITOR_EVIDENCE_MAX_CHARS)}`,
    )
    .join("\n\n---\n\n");
}

export function resolveCitations(
  answer: string,
  evidence: IEvidence[],
): { answer: string; citations: IAICitation[] } {
  const known = new Set(evidence.map((item) => item.index));
  const cited = new Set<number>();
  const cleaned = answer.replace(
    BUSINESS_MONITOR_CITATION_MARKER,
    (marker: string, digits: string) => {
      const index = Number(digits);
      if (!known.has(index)) return "";
      cited.add(index);
      return marker;
    },
  );

  const citations: IAICitation[] = evidence.map((item) => ({
    index: item.index,
    reportId: item.report.id,
    companyName: item.report.companyName,
    title: item.report.title,
    reportYear: item.report.reportYear,
    pageNumber: item.pageNumber,
    sourceUrl: item.sourceUrl,
    cited: cited.has(item.index),
  }));

  return { answer: cleaned, citations };
}
