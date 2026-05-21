import { describe, it, expect } from "@jest/globals";
import { generateEsgReport } from "@/lib/report/esg_report_generator";
import { IEsgRecordDetail } from "@/interfaces/esg";

describe("generateEsgReport", () => {
  it("should calculate correct ESG scope proportions and handle extreme micro emissions", () => {
    const mockRecords: IEsgRecordDetail[] = [
      {
        id: "esg-1",
        scope: "SCOPE_1",
        activityType: "公務車燃油",
        amount: "100",
        unit: "L",
        emissions: "0.00000000000001",
        coefficient: { emissionFactor: "0.0000000000000001" },
      } as unknown as IEsgRecordDetail,
      {
        id: "esg-2",
        scope: "SCOPE_2",
        activityType: "外購電力",
        amount: "1000",
        unit: "kWh",
        emissions: "500",
        coefficient: { emissionFactor: "0.5" },
      } as unknown as IEsgRecordDetail,
      {
        id: "esg-3",
        scope: "SCOPE_3",
        activityType: "員工通勤",
        amount: "100",
        unit: "km",
        emissions: "499.99999999999999",
        coefficient: null, // Info: (20260520 - Tzuhan) 驗證防漂綠邏輯，null 不會被強制轉為 0
      } as unknown as IEsgRecordDetail,
    ];

    const report = generateEsgReport(mockRecords);

    // Info: (20260520 - Tzuhan) 總和 = 500 + 499.99999999999999 + 0.00000000000001 = 1000
    expect(report.metrics.totalEmissions).toBe("1000");

    // Info: (20260520 - Tzuhan) Scope 1 = 0.00000000000001 / 1000 * 100 = 1e-15
    expect(report.metrics.scope1Proportion).toBe("1e-15");
    // Info: (20260520 - Tzuhan) Scope 2 = 500 / 1000 * 100 = 50
    expect(report.metrics.scope2Proportion).toBe("50");
    // Info: (20260520 - Tzuhan) Scope 3 = 499.99999999999999 / 1000 * 100 = 49.999999999999999
    expect(report.metrics.scope3Proportion).toBe("49.999999999999999");

    // Info: (20260520 - Tzuhan) 懸記紀錄 (Scope 3 員工通勤沒有係數) 不會被抹除
    const scope3Item = report.sections.scope3?.records?.find(
      (r) => r.activityType === "員工通勤",
    );
    expect(scope3Item).toBeDefined();
    expect(scope3Item?.emissions).toBe("499.99999999999999");
    expect(scope3Item?.emissionFactor).toBeNull();
  });

  it("should throw error for invalid scopes, missing activity types, or fake emissions", () => {
    // Info: (20260520 - Tzuhan) 拒絕無法對應範疇的異常碳排紀錄
    expect(() => {
      generateEsgReport([
        {
          id: "bad",
          scope: "SCOPE_4",
          activityType: "Space",
          amount: "10",
          emissions: "1",
          unit: "kg",
        } as unknown as IEsgRecordDetail,
      ]);
    }).toThrow(/發現無法對應範疇的碳排紀錄/);

    // Info: (20260520 - Tzuhan) 拒絕缺少活動名稱的無名碳排
    expect(() => {
      generateEsgReport([
        {
          id: "no-name",
          scope: "SCOPE_2",
          activityType: "",
          amount: "100",
          emissions: "10",
          unit: "kWh",
        } as unknown as IEsgRecordDetail,
      ]);
    }).toThrow(/碳排紀錄缺少活動名稱/);

    // Info: (20260520 - Tzuhan) 攔截「憑空產生」的碳排數據
    expect(() => {
      generateEsgReport([
        {
          id: "fake",
          scope: "SCOPE_1",
          activityType: "Magic",
          amount: "0",
          emissions: "500",
          unit: "kg",
        } as unknown as IEsgRecordDetail,
      ]);
    }).toThrow(/發現憑空產生的碳排數據/);
  });
});
