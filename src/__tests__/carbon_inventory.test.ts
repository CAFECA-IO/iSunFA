// Info: (20260716 - Emily) 盤查狀態帳本引擎測試(#6518):merge 去重、組織欄位不覆蓋、狀態機推進、白名單裁決

import { describe, it, expect } from "@jest/globals";
import {
  createEmptyInventoryState,
  mergeInventoryExtraction,
  computeInventoryStep,
  describeInventoryStep,
  CARBON_INVENTORY_MIN_ACTIVITY_RECORDS,
} from "@/lib/carbon_inventory";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import {
  CarbonActivityRecordSchema,
  CarbonInventoryExtractionSchema,
} from "@/validators";
import { IActivityRecord } from "@/types/carbon_chatbot.types";

const electricity = (quantity = "1,200,000"): IActivityRecord => ({
  scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
  sourceName: "外購電力",
  quantity,
  unit: MeasurementUnit.KWH,
});

describe("mergeInventoryExtraction", () => {
  it("should add activities and dedupe identical records across merges", () => {
    const s0 = createEmptyInventoryState();
    const m1 = mergeInventoryExtraction(
      s0,
      { activities: [electricity()] },
      "電費單.pdf",
    );
    expect(m1.addedCount).toBe(1);
    expect(m1.state.activities[0].source).toBe("電費單.pdf");

    // Info: (20260716 - Emily) 同排放源+數量+單位+範疇 = 同一筆；重傳不重複記帳
    const m2 = mergeInventoryExtraction(m1.state, {
      activities: [electricity()],
    });
    expect(m2.addedCount).toBe(0);
    expect(m2.state.activities).toHaveLength(1);

    // Info: (20260716 - Emily) 數量不同 = 不同筆
    const m3 = mergeInventoryExtraction(m2.state, {
      activities: [electricity("800,000")],
    });
    expect(m3.addedCount).toBe(1);
    expect(m3.state.activities).toHaveLength(2);
  });

  it("should fill org fields only when empty (manual confirmation wins)", () => {
    const s0 = createEmptyInventoryState();
    const m1 = mergeInventoryExtraction(s0, {
      company: "CAFECA",
      year: 2025,
      activities: [],
    });
    expect(m1.state.company).toBe("CAFECA");

    const m2 = mergeInventoryExtraction(m1.state, {
      company: "別家公司",
      year: 2020,
      activities: [],
    });
    expect(m2.state.company).toBe("CAFECA");
    expect(m2.state.year).toBe(2025);
  });
});

describe("computeInventoryStep (deterministic state machine)", () => {
  it("should advance strictly in order and never skip on missing prerequisites", () => {
    const s = createEmptyInventoryState();
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ORG_PROFILE);

    s.company = "CAFECA";
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ORG_PROFILE);
    s.year = 2025;
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ORG_BOUNDARY);

    s.boundaryApproach = "operational_control";
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.EMISSION_SOURCES);

    s.activities = [electricity()];
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.ACTIVITY_DATA);

    // Info: (20260716 - Emily) 達到最低筆數門檻 → 推進到係數對應(其出口由 #6519 解鎖)
    s.activities = Array.from(
      { length: CARBON_INVENTORY_MIN_ACTIVITY_RECORDS },
      (_, i) => electricity(`${i + 1}00`),
    );
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.EMISSION_FACTORS);

    // Info: (20260716 - Emily) 全部有係數 → REVIEW(REVIEW 出口由 #6520 質量守恆裁決，現階段不可能 COMPLETED)
    s.activities = s.activities.map((a) => ({ ...a, emissionFactor: "0.495" }));
    expect(computeInventoryStep(s)).toBe(CarbonInventoryStep.REVIEW);
  });

  it("should describe missing prerequisites for the persona", () => {
    const s = createEmptyInventoryState();
    const description = describeInventoryStep(s);
    expect(description).toContain(CarbonInventoryStep.ORG_PROFILE);
    expect(description).toContain("企業名稱");
  });
});

describe("inventory validators (whitelist guardrails)", () => {
  it("should reject activities with units or scopes outside the enums", () => {
    expect(
      CarbonActivityRecordSchema.safeParse({
        scopeCategory: "SCOPE_9_MADE_UP",
        sourceName: "外購電力",
        quantity: "100",
        unit: MeasurementUnit.KWH,
      }).success,
    ).toBe(false);
    expect(
      CarbonActivityRecordSchema.safeParse({
        scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
        sourceName: "外購電力",
        quantity: "100",
        unit: "斤",
      }).success,
    ).toBe(false);
  });

  it("should keep quantity as a raw string and coerce year deterministically", () => {
    const parsed = CarbonInventoryExtractionSchema.safeParse({
      company: "CAFECA",
      year: "2025",
      activities: [electricity("1,234.5")],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.year).toBe(2025);
      expect(parsed.data.activities[0].quantity).toBe("1,234.5");
    }
    // Info: (20260716 - Emily) 年度合理性邊界
    expect(
      CarbonInventoryExtractionSchema.safeParse({ year: "1024" }).success,
    ).toBe(false);
  });
});
