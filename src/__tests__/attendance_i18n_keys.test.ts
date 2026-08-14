import { describe, it, expect } from "@jest/globals";
import { hrManagement as en } from "@/i18n/locales/en/hr_management";
import { hrManagement as ja } from "@/i18n/locales/ja/hr_management";
import { hrManagement as ko } from "@/i18n/locales/ko/hr_management";
import { hrManagement as zhCn } from "@/i18n/locales/zh_cn/hr_management";
import { hrManagement as zhTw } from "@/i18n/locales/zh_tw/hr_management";
import { LEAVE_TYPE_I18N_KEY, LeaveType } from "@/constants/leave";

/**
 * Info: (20260814 - Julian) 常數裡的 i18n 路徑必須真的存在。
 *
 * `i18n_context` 的 `getNestedValue` 找不到就回傳 key 本身，所以缺字典不會報錯，
 * 而是把 `hr_management.leave.type_annual` 這串字直接畫在畫面上 —— 沒有錯誤訊息、
 * 沒有 console 警告，只有使用者看得到。`LEAVE_TYPE_I18N_KEY` 就這樣壞了一整個開發週期。
 */

const DICTIONARIES: Record<string, Record<string, unknown>> = {
  en,
  ja,
  ko,
  zh_cn: zhCn,
  zh_tw: zhTw,
};

// Info: (20260814 - Julian) 比照 `i18n_context` 的查法：逐段往下鑽，中途缺了就是 undefined
const resolve = (dictionary: Record<string, unknown>, path: string): unknown =>
  path
    .split(".")
    .slice(1)
    .reduce<unknown>(
      (value, segment) =>
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      dictionary,
    );

describe("簽到功能引用的 i18n 路徑", () => {
  const paths = Object.values(LeaveType).map((type) => [
    type,
    LEAVE_TYPE_I18N_KEY[type],
  ]);

  it.each(paths)("假別 %s 的字典鍵在五個語系都存在且非空", (_type, path) => {
    const missing = Object.entries(DICTIONARIES)
      .filter(([, dictionary]) => typeof resolve(dictionary, path) !== "string")
      .map(([language]) => language);

    expect({ path, missing }).toEqual({ path, missing: [] });
  });

  // Info: (20260814 - Julian) 路徑一律以 `hr_management.` 開頭，換前綴時上面的 slice(1) 會跟著失效
  it("所有路徑都掛在 hr_management 命名空間下", () => {
    const strays = paths
      .map(([, path]) => path)
      .filter((path) => !path.startsWith("hr_management."));

    expect(strays).toEqual([]);
  });
});
