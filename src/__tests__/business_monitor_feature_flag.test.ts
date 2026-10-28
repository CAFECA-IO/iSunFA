import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { SystemSettingKey } from "@/constants/system_setting";
import { FEATURE_FLAG } from "@/constants/feature_flag";
import { systemSettingValuesSchema } from "@/validators/system_setting";
import { isModuleVisible } from "@/lib/feature_flag";
// Info: (20261028 - Luphia) jest.mock 會被提升到 import 之前
import { isFeatureEnabled } from "@/services/feature_flag.service";
import {
  runCompanyFinancialFactSync,
  runCompanyObservatoryCycle,
  runCompanyObservatoryPlanner,
} from "@/services/cron/company_observatory.cron";

/**
 * Info: (20261028 - Luphia) 企業觀測站預設隱藏，隱藏時不主動收集企業資料（產品決定 20261028）。
 *
 * 這組測試釘住三件事：開關只有「確定開啟」才算開（讀不到、驗不過簽章都算關）；
 * 設定值只能是 true / false；關閉時三支背景排程連一個對外請求都不發。
 */

const settingGet = jest.fn<(key: string) => Promise<string | undefined>>();
const planDocuments = jest.fn(async () => ({ created: 1, refreshed: 0 }));
const processDownloads = jest.fn(async () => ({}));
const syncFinancialFacts = jest.fn(async () => ({}));

jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: { get: (key: string) => settingGet(key) },
}));
jest.mock("@/services/company_observatory/company_observatory.runtime", () => ({
  buildCompanyObservatoryService: () => ({ planDocuments, processDownloads }),
  buildCompanyObservatoryIndexer: () => ({ indexBatch: async () => ({}) }),
  countObservatoryDocuments: async () => 0,
}));
jest.mock(
  "@/services/company_observatory/financial_facts.sync.service",
  () => ({ syncFinancialFacts: () => syncFinancialFacts() }),
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isFeatureEnabled", () => {
  it.each([
    ["true", true],
    ["false", false],
    [undefined, false],
    ["TRUE", false],
  ])("treats %p as %p", async (value, expected) => {
    settingGet.mockResolvedValue(value);
    expect(await isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR)).toBe(
      expected,
    );
    expect(settingGet).toHaveBeenCalledWith(
      SystemSettingKey.BUSINESS_MONITOR_ENABLED,
    );
  });

  it("fails closed when the settings cannot be trusted or read", async () => {
    settingGet.mockRejectedValue(new Error("IS_SETTING_STATE_UNTRUSTED"));
    expect(await isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR)).toBe(false);
  });
});

describe("BUSINESS_MONITOR_ENABLED setting value", () => {
  it.each(["true", "false", ""])("accepts %p", (value) => {
    expect(
      systemSettingValuesSchema.safeParse({ BUSINESS_MONITOR_ENABLED: value })
        .success,
    ).toBe(true);
  });

  it("rejects anything else, so a typo cannot silently mean 'off'", () => {
    expect(
      systemSettingValuesSchema.safeParse({ BUSINESS_MONITOR_ENABLED: "yes" })
        .success,
    ).toBe(false);
  });
});

describe("isModuleVisible", () => {
  it("hides a gated module until the flag is known to be on", () => {
    expect(isModuleVisible("business_monitor", null)).toBe(false);
    expect(isModuleVisible("business_monitor", {})).toBe(false);
    expect(
      isModuleVisible("business_monitor", { business_monitor: false }),
    ).toBe(false);
    expect(
      isModuleVisible("business_monitor", { business_monitor: true }),
    ).toBe(true);
  });

  it("always shows modules that are not behind a flag", () => {
    expect(isModuleVisible("salary_calculator", null)).toBe(true);
  });
});

describe("observatory worker loops", () => {
  it("collect nothing while the business monitor is disabled", async () => {
    settingGet.mockResolvedValue("false");
    expect(await runCompanyObservatoryPlanner()).toBeNull();
    expect(await runCompanyObservatoryCycle()).toBeNull();
    expect(await runCompanyFinancialFactSync()).toBeNull();
    expect(planDocuments).not.toHaveBeenCalled();
    expect(processDownloads).not.toHaveBeenCalled();
    expect(syncFinancialFacts).not.toHaveBeenCalled();
  });

  it("run the daily jobs once when enabled, then wait until they are due", async () => {
    settingGet.mockResolvedValue("true");
    expect(await runCompanyObservatoryPlanner()).toEqual({
      created: 1,
      refreshed: 0,
    });
    expect(await runCompanyObservatoryPlanner()).toBeNull();
    expect(planDocuments).toHaveBeenCalledTimes(1);

    await runCompanyFinancialFactSync();
    await runCompanyFinancialFactSync();
    expect(syncFinancialFacts).toHaveBeenCalledTimes(1);
  });
});
