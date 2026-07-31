// Info: (20260729 - Tzuhan) 匯出檔名與批次識別碼:檔名以方案代碼開頭,與 CSV Plan Code 一致
import { describe, it, expect } from "@jest/globals";
import { buildExportFileName, buildExportId } from "@/lib/utils/pdf_export";
import { buildPlanCode, buildRouteCode } from "@/constants/logistics";

describe("export codes (PDF/CSV cross-reference)", () => {
  it("方案代碼格式為 R{兩位}-{模式碼}", () => {
    expect(buildRouteCode(0)).toBe("R01");
    expect(buildRouteCode(11)).toBe("R12");
    expect(buildPlanCode(0, "sea")).toBe("R01-SEA");
    expect(buildPlanCode(1, "land")).toBe("R02-LAND");
    expect(buildPlanCode(0, "seaLandAir")).toBe("R01-SLA");
    expect(buildPlanCode(0, "custom")).toBe("R01-CUS");
  });

  it("檔名以方案代碼開頭並含地點與方案後綴", () => {
    const name = buildExportFileName(0, "sea", "台北市", "Shanghai");
    expect(name.startsWith("R01-SEA")).toBe(true);
    expect(name).toContain("台北市-Shanghai");
    expect(name.endsWith("_sea_multimodal.pdf")).toBe(true);
  });

  it("無地點資訊時檔名仍帶方案代碼", () => {
    expect(buildExportFileName(2, "air")).toBe("R03-AIR_air_multimodal.pdf");
  });

  it("匯出批次識別碼為 YYYYMMDD-HHmm(同批 PDF 與 CSV 共用)", () => {
    expect(buildExportId(new Date(2026, 6, 29, 14, 35))).toBe("20260729-1435");
    expect(buildExportId(new Date(2026, 0, 5, 9, 7))).toBe("20260105-0907");
  });
});
