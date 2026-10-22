import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { renderGcisRegistrationText } from "@/services/company_observatory/gcis_registration.downloader";
import { parseRegistrationText } from "@/lib/company_observatory/registration_text";
import {
  gcisCompanyBasicListSchema,
  gcisDirectorListSchema,
} from "@/validators/company_observatory";
import { detectYears, taiVariantsOf } from "@/lib/business_monitor/scope";
import {
  formatAdDate,
  formatRegistrationValue,
  groupThousands,
} from "@/lib/business_monitor/format";

/**
 * Info: (20261022 - Luphia) 企業觀測站公司頁的純函數：登記文字讀回欄位、AI 範疇的年度偵測、顯示格式。
 */

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "src/__tests__/fixtures/company_observatory", name),
      "utf8",
    ),
  );
}

describe("parseRegistrationText", () => {
  // Info: (20261022 - Luphia) 與渲染器來回：渲染器改格式而解析器沒跟上，這裡要紅
  it("reads back what renderGcisRegistrationText wrote", () => {
    const [basic] = gcisCompanyBasicListSchema.parse(
      fixture("gcis_basic_22099131.json"),
    );
    const directors = gcisDirectorListSchema.parse(
      fixture("gcis_directors_22099131.json"),
    );
    const parsed = parseRegistrationText(
      renderGcisRegistrationText(basic, directors),
    );

    expect(parsed.fields[0]).toEqual({
      label: "統一編號",
      value: "22099131",
    });
    expect(parsed.fields.every((field) => field.value !== "")).toBe(true);
    expect(parsed.directors).toHaveLength(directors.length);
    expect(parsed.directors[0]).toEqual({
      position: directors[0].Person_Position_Name,
      name: directors[0].Person_Name,
      representing: directors[0].Juristic_Person_Name || "－",
      shares: directors[0].Person_Shareholding,
    });
  });

  it("skips the table header and the no-data placeholder", () => {
    const parsed = parseRegistrationText(
      "公司登記基本資料（經濟部商業司）\n統一編號：11913502\n\n董監事資料（職稱｜姓名｜所代表法人｜持有股份數(股)）\n（無資料）",
    );
    expect(parsed).toEqual({
      fields: [{ label: "統一編號", value: "11913502" }],
      directors: [],
    });
  });
});

describe("AI scope years", () => {
  it("finds years once each, in order", () => {
    expect(detectYears("台泥 2024 與 2023 年，對比 2024")).toEqual([
      "2024",
      "2023",
    ]);
  });

  it("does not read a year out of a longer number", () => {
    expect(detectYears("營收 120245 元，2025年")).toEqual(["2025"]);
  });
});

describe("company search keywords", () => {
  it("searches both 台 and 臺", () => {
    expect(taiVariantsOf("台灣水泥").sort()).toEqual(
      ["台灣水泥", "臺灣水泥"].sort(),
    );
    expect(taiVariantsOf("2330")).toEqual(["2330"]);
  });
});

describe("display formatting", () => {
  it("groups digits without going through number", () => {
    expect(groupThousands("100000000000")).toBe("100,000,000,000");
    expect(groupThousands("123")).toBe("123");
  });

  it("formats ROC dates only for fields labelled 民國", () => {
    expect(formatRegistrationValue("核准設立日期(民國)", "0360823")).toBe(
      "民國 36 年 8 月 23 日",
    );
    expect(formatRegistrationValue("實收資本額(元)", "77231817420")).toBe(
      "77,231,817,420",
    );
    // Info: (20261022 - Luphia) 識別碼不是數量，不加千分位
    expect(formatRegistrationValue("統一編號", "11913502")).toBe("11913502");
    expect(formatRegistrationValue("公司狀況", "核准設立")).toBe("核准設立");
  });

  it("formats exchange dates and leaves others alone", () => {
    expect(formatAdDate("19620209")).toBe("1962-02-09");
    expect(formatAdDate("1962/02/09")).toBe("1962/02/09");
    expect(formatAdDate(null)).toBe("");
  });
});
