import { describe, it, expect } from "@jest/globals";
import {
  buildSalaryRecordCsv,
  SALARY_CSV_COLUMN_COUNT,
} from "@/lib/utils/salary_record_csv";
import { parseCsvLine } from "@/lib/utils/csv";
import {
  defaultSalaryCalculatorResult,
  ISalaryCalculatorOptions,
  ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";
import { ISalaryRecordDetail } from "@/interfaces/salary_record";
import {
  PAY_SLIP_CSV_IDENTITY_LABELS,
  PAY_SLIP_FIELD_LABELS,
} from "@/constants/pay_slip_labels";
import { calculator as zhTw } from "@/i18n/locales/zh_tw/calculator";

/**
 * Info: (20260904 - Julian) 薪資紀錄的 CSV 匯出。
 *
 * 這份檔案會被開進 Excel、拿去對帳與申報、匯進其他系統。它的失敗模式
 * **全部是安靜的** —— 檔案打得開、格式正確，只是內容錯了：
 *
 * 1. 公式注入：姓名以 `=` 開頭 → 在別人的 Excel 裡變成可執行的東西
 * 2. 沒有 BOM → 中文全成亂碼，而問題在開啟端，回報起來變成「你們的檔案壞了」
 * 3. 欄位錯位：標題與取值分成兩份維護，插一欄只改一邊 → 從那一欄起每格都錯
 * 4. 千分位進到 CSV → 數字被當成文字或被拆成兩欄
 * 5. 比率欄走金額格式 → 0.002 變成 0，而報表看起來完全正常
 */

const RECORD_ID = "33333333-3333-4333-8333-333333333333";

const recordOf = (
  overrides: Partial<ISalaryRecordDetail> = {},
): ISalaryRecordDetail => ({
  id: RECORD_ID,
  year: 2026,
  month: 9,
  employee: { id: "e1", name: "王小明", number: "A001", hireDate: null },
  /**
   * Info: (20260908 - Julian) 本薪與「這個月生效的本薪異動」（計劃書 §15）。
   *
   * 預設 `null` = 這個月沒有調薪。要測有調薪的案例時由 overrides 帶進來 ——
   * 預設就給一筆的話，每一條案例都會意外帶著一個 `+1,000`。
   */
  baseSalary: 30000,
  // Info: (20260908 - Julian) 預設沒有前一筆可比（計劃書 §16）；要測差額的案例由 overrides 帶
  baseSalaryDelta: null,
  baseSalaryChange: null,
  totalPayment: 41234,
  totalSalaryTaxable: 32000,
  totalEmployerCost: 45678,
  calculatorVersion: "2026.1",
  createdAt: 1_756_000_000,
  updatedAt: 1_756_000_000,
  lastSentAt: null,
  lastSentTo: null,
  input: { year: 2026, month: 9 } as unknown as ISalaryCalculatorOptions,
  result: defaultSalaryCalculatorResult as ISalaryCalculatorUI,
  ...overrides,
});

// Info: (20260904 - Julian) 拆掉 BOM 與結尾換行，回傳每一列的欄位陣列
const rowsOf = (csv: string): string[][] =>
  csv.replace(/^﻿/, "").trimEnd().split("\r\n").map(parseCsvLine);

describe("CSV 的結構", () => {
  it("第一列是表頭，之後一筆紀錄一列", () => {
    const rows = rowsOf(buildSalaryRecordCsv([recordOf(), recordOf()]));

    expect(rows).toHaveLength(3);
  });

  /**
   * Info: (20260904 - Julian) 每一列的欄位數都要與表頭相同。
   *
   * 這是「標題與取值成對維護」那個設計的實際保證：分成兩份陣列的話，
   * 中間插一欄只改其中一邊，整份檔案會從那一欄開始每一格都錯位 ——
   * 而它仍然是一份格式正確、打得開的 CSV。
   */
  it("每一列的欄位數與表頭一致", () => {
    const rows = rowsOf(buildSalaryRecordCsv([recordOf(), recordOf()]));

    expect(rows[0]).toHaveLength(SALARY_CSV_COLUMN_COUNT);
    rows.forEach((row) => expect(row).toHaveLength(rows[0].length));
  });

  it("沒有任何紀錄時只有表頭，不是空檔案", () => {
    const rows = rowsOf(buildSalaryRecordCsv([]));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(SALARY_CSV_COLUMN_COUNT);
  });

  /**
   * Info: (20260904 - Julian) 沒有 BOM，Excel 會用系統預設編碼開啟，
   * 中文姓名與欄位名全成亂碼 —— 而檔案本身是好的。
   */
  it("以 UTF-8 BOM 開頭，並用 CRLF 換行", () => {
    const csv = buildSalaryRecordCsv([recordOf()]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});

describe("CSV 的欄位內容", () => {
  it("身分欄位帶著期間、姓名與編號", () => {
    const [, row] = rowsOf(buildSalaryRecordCsv([recordOf()]));

    expect(row[0]).toBe("2026-09");
    expect(row[1]).toBe("王小明");
    expect(row[2]).toBe("A001");
  });

  it("月份補零，排序才對得起來", () => {
    const [, row] = rowsOf(
      buildSalaryRecordCsv([recordOf({ year: 2026, month: 3 })]),
    );

    expect(row[0]).toBe("2026-03");
  });

  /**
   * Info: (20260904 - Julian) 畫面上有 `1,234,567`，CSV 裡不能有 ——
   * 帶逗號的數字進了試算表要嘛被當成文字（後續全部算不了），
   * 要嘛在某些地區設定下被拆成兩欄。
   */
  it("金額不帶千分位", () => {
    const csv = buildSalaryRecordCsv([
      recordOf({
        result: {
          ...defaultSalaryCalculatorResult,
          monthlySalary: {
            ...defaultSalaryCalculatorResult.monthlySalary,
            baseSalaryWithTax: 1234567,
          },
        } as ISalaryCalculatorUI,
      }),
    ]);

    expect(csv).toContain("1234567");
    expect(csv).not.toContain("1,234,567");
  });

  /**
   * Info: (20260904 - Julian) 職災行業別費率是比率不是金額。
   * 走金額格式會四捨五入成 0，而報表看起來完全正常 ——
   * 與 `pay_slip_html.ts` 的 `formatRate` 是同一個判斷。
   */
  it("職災行業別費率不被四捨五入成 0", () => {
    const csv = buildSalaryRecordCsv([
      recordOf({
        result: {
          ...defaultSalaryCalculatorResult,
          insuredSalary: {
            ...defaultSalaryCalculatorResult.insuredSalary,
            occupationalInjuryIndustryRate: 0.002,
          },
        } as ISalaryCalculatorUI,
      }),
    ]);

    expect(csv).toContain("0.002");
  });

  it("未寄出的寄出日留空，不是「未寄出」四個字", () => {
    const [header, row] = rowsOf(buildSalaryRecordCsv([recordOf()]));
    const index = header.indexOf("薪資單寄出日");

    expect(index).toBeGreaterThan(-1);
    expect(row[index]).toBe("");
  });

  /**
   * Info: (20260904 - Julian) 寄出日輸出 UTC 的 `YYYY-MM-DD`。
   * 隨開檔者所在時區浮動的話，兩個人對同一份檔案會得到差一天的答案。
   */
  it("寄出日輸出 YYYY-MM-DD", () => {
    const [header, row] = rowsOf(
      buildSalaryRecordCsv([
        recordOf({
          lastSentAt: Date.parse("2026-09-15T08:30:00Z") / 1000,
          lastSentTo: "ming@example.com",
        }),
      ]),
    );

    expect(row[header.indexOf("薪資單寄出日")]).toBe("2026-09-15");
    expect(row[header.indexOf("寄送信箱")]).toBe("ming@example.com");
  });
});

describe("CSV 的注入與跳脫", () => {
  /**
   * Info: (20260904 - Julian) **本檔最重要的一組。**
   *
   * 試算表會把 `=` `+` `-` `@` 開頭的欄位當公式求值。員工姓名是人打的 ——
   * 一個叫 `=HYPERLINK("http://…","點我")` 的員工，會讓這份薪資報表
   * 在會計的 Excel 裡變成一個可點的連結。
   */
  const TRIGGERS = ["=", "+", "-", "@"];

  it.each(TRIGGERS)("以 %s 開頭的姓名被中和成文字", (trigger) => {
    const csv = buildSalaryRecordCsv([
      recordOf({
        employee: {
          id: "e1",
          name: `${trigger}HYPERLINK("x")`,
          number: "A001",
          hireDate: null,
        },
      }),
    ]);

    // Info: (20260904 - Julian) 中和的方式是前面補一個單引號（試算表的「這是文字」標記）
    expect(csv).toContain(`'${trigger}HYPERLINK`);
  });

  it("TAB 與 CR 開頭同樣被中和", () => {
    const csv = buildSalaryRecordCsv([
      recordOf({
        employee: { id: "e1", name: "\t=1+1", number: "A001", hireDate: null },
      }),
    ]);

    expect(csv).toContain("'\t=1+1");
  });

  /**
   * Info: (20260904 - Julian) 順序不可對調：先加引號的話 `=1+1,x` 會變成
   * `"=1+1,x"`，引號跑到最前面，單引號就補不到真正的開頭 ——
   * 中和完全失效而檔案看起來一切正常。
   */
  it("同時需要中和與加引號時，單引號在引號**裡面**", () => {
    const csv = buildSalaryRecordCsv([
      recordOf({
        employee: { id: "e1", name: "=1+1,x", number: "A001", hireDate: null },
      }),
    ]);

    expect(csv).toContain(`"'=1+1,x"`);
    expect(csv).not.toContain(`'"=1+1,x"`);
  });

  it("含逗號的姓名整欄加引號，不會讓後面每一格錯位", () => {
    const [, row] = rowsOf(
      buildSalaryRecordCsv([
        recordOf({
          employee: {
            id: "e1",
            name: "王, 小明",
            number: "A001",
            hireDate: null,
          },
        }),
      ]),
    );

    expect(row[1]).toBe("王, 小明");
    expect(row[2]).toBe("A001");
  });

  it("含雙引號的姓名把引號加倍", () => {
    const [, row] = rowsOf(
      buildSalaryRecordCsv([
        recordOf({
          employee: {
            id: "e1",
            name: '王"小明',
            number: "A001",
            hireDate: null,
          },
        }),
      ]),
    );

    expect(row[1]).toBe('王"小明');
  });

  it("含換行的姓名不會把一列拆成兩列", () => {
    const rows = rowsOf(
      buildSalaryRecordCsv([
        recordOf({
          employee: {
            id: "e1",
            name: "王\n小明",
            number: "A001",
            hireDate: null,
          },
        }),
      ]),
    );

    // Info: (20260904 - Julian) 換行在引號內，`split("\r\n")` 不該把它切開
    expect(rows).toHaveLength(2);
  });

  it("一般姓名不被加上多餘的引號或單引號", () => {
    const [, row] = rowsOf(buildSalaryRecordCsv([recordOf()]));

    expect(row[1]).toBe("王小明");
  });
});

describe("欄位名與薪資單、與畫面字典一致", () => {
  /**
   * Info: (20260904 - Julian) 使用者會把 PDF 與 CSV 並排對帳。
   * 一邊寫「本薪（應稅）」另一邊寫「應稅本薪」，他得先確認那是不是同一欄。
   *
   * 兩者現在共用 `PAY_SLIP_FIELD_LABELS`，所以這裡驗的是**那份共用的標籤
   * 真的被用進表頭**，而不是 CSV 自己另抄了一份。
   */
  const SPOT_CHECKS = [
    PAY_SLIP_FIELD_LABELS.baseSalaryWithTax,
    PAY_SLIP_FIELD_LABELS.mealAllowanceWithoutTax,
    PAY_SLIP_FIELD_LABELS.occupationalInjuryIndustryRate,
    PAY_SLIP_FIELD_LABELS.totalEmployerCost,
    PAY_SLIP_FIELD_LABELS.paid,
  ];

  it.each(SPOT_CHECKS)("表頭含「%s」", (label) => {
    const [header] = rowsOf(buildSalaryRecordCsv([]));

    expect(header).toContain(label);
  });

  /**
   * Info: (20260904 - Julian) 共用標籤與 zh_tw 字典的對拍。
   *
   * `salary_pay_slip_html.test.ts` 已經對拍過同一組，但那支驗的是
   * 「HTML 裡有這些字」。標籤抽成共用常數之後，值本身該在這裡也釘一次 ——
   * 兩支都紅才代表是字典改了，只有一支紅代表某一邊接線斷了。
   */
  it("共用標籤與 zh_tw 字典逐字相同", () => {
    expect(PAY_SLIP_FIELD_LABELS.baseSalaryWithTax).toBe(
      zhTw.result.base_salary_with_tax,
    );
    expect(PAY_SLIP_FIELD_LABELS.totalEmployerCost).toBe(
      zhTw.result.total_employer_cost,
    );
    expect(PAY_SLIP_FIELD_LABELS.paid).toBe(zhTw.result.paid);
  });

  /**
   * Info: (20260904 - Julian) 表頭不得有重名欄位。
   *
   * 重名的 CSV 在多數試算表與匯入工具裡會靜默保留其中一欄、丟掉另一欄 ——
   * 而丟掉的是哪一個由工具決定。33 個薪資欄位裡有好幾組字很像
   * （「加班費（應稅）」與「加班費（免稅）」），加一欄時撞名並不難。
   */
  it("表頭沒有重複的欄位名", () => {
    const [header] = rowsOf(buildSalaryRecordCsv([]));

    expect(new Set(header).size).toBe(header.length);
  });
});

describe("本薪與它的變動（計劃書 §18）", () => {
  const ID = PAY_SLIP_CSV_IDENTITY_LABELS;

  const columnIndex = (label: string): number => {
    const [header] = rowsOf(buildSalaryRecordCsv([recordOf()]));
    const index = header.indexOf(label);
    // Info: (20260908 - Julian) 找不到就直接失敗，不要讓後面用 -1 去取值
    expect(index).toBeGreaterThanOrEqual(0);
    return index;
  };

  const changeOf = (patch = {}) => ({
    before: 54000,
    after: 44000,
    delta: -10000,
    count: 1,
    reason: "年度調整",
    changedBy: { id: "user-7", name: "會計小林" },
    recordedAt: Math.floor(
      new Date("2026-08-28T01:00:00.000Z").getTime() / 1000,
    ),
    ...patch,
  });

  const deltaOf = (patch = {}) => ({
    previousYear: 2026,
    previousMonth: 8,
    previous: 54000,
    delta: -10000,
    ...patch,
  });

  /**
   * Info: (20260908 - Julian) **這一條是這一組的重點。**
   *
   * `FORMULA_TRIGGER` 包含 `-`（試算表會把 `-` 開頭的欄位當公式），
   * 而「本薪較上一筆差額」是這份 CSV 第一個可能為負的欄位。
   *
   * 中和之後 `-10000` 會變成 `'-10000` —— 在 Excel 裡那是一格**文字**：
   * 整欄加總不起來、排序變成字典序。而檔案打得開、看起來完全正常，
   * 只有拿去算的人會發現，而他多半會以為是自己的公式寫錯。
   *
   * 在 20260908 之前所有金額都非負，所以這個坑一直沒有出現。
   */
  it("減薪的差額是數字，沒有被中和成文字", () => {
    const index = columnIndex(ID.baseSalaryDelta);
    const [, row] = rowsOf(
      buildSalaryRecordCsv([recordOf({ baseSalaryDelta: deltaOf() })]),
    );

    expect(row[index]).toBe("-10000");
    expect(row[index].startsWith("'")).toBe(false);
  });

  /**
   * Info: (20260908 - Julian) 放寬 `-` 不能連帶放寬公式注入。
   *
   * 這一條是上一條的配對：`numeric` 是 opt-out，預設仍然中和，
   * 所以使用者輸入的欄位（姓名、異動原因）照樣被擋。
   * 沒有它的話，「把 `-` 放行」很容易在下一次重構時變成「整列都放行」。
   */
  it("使用者輸入的欄位仍然被中和（姓名與異動原因）", () => {
    const nameIndex = columnIndex(ID.employeeName);
    const reasonIndex = columnIndex(ID.profileChangeReason);

    const [, row] = rowsOf(
      buildSalaryRecordCsv([
        recordOf({
          employee: { id: "e-1", name: "=1+1", number: "A001", hireDate: null },
          baseSalaryChange: changeOf({ reason: "=HYPERLINK(1)" }),
        }),
      ]),
    );

    expect(row[nameIndex]).toBe("'=1+1");
    expect(row[reasonIndex]).toBe("'=HYPERLINK(1)");
  });

  it("有異動紀錄時，兩組欄位都填上", () => {
    const [, row] = rowsOf(
      buildSalaryRecordCsv([
        recordOf({
          baseSalary: 44000,
          baseSalaryDelta: deltaOf(),
          baseSalaryChange: changeOf(),
        }),
      ]),
    );
    const at = (label: string) => row[columnIndex(label)];

    expect(at(ID.baseSalarySetting)).toBe("44000");
    expect(at(ID.baseSalaryPrevPeriod)).toBe("2026-08");
    expect(at(ID.baseSalaryDelta)).toBe("-10000");
    expect(at(ID.profileChangeBefore)).toBe("54000");
    expect(at(ID.profileChangeAfter)).toBe("44000");
    expect(at(ID.profileChangeReason)).toBe("年度調整");
    expect(at(ID.profileChangeBy)).toBe("會計小林");
    expect(at(ID.profileChangeAt)).toBe("2026-08-28");
  });

  /**
   * Info: (20260908 - Julian) **差額有值、異動欄位空著** —— 這是最常見的一列。
   *
   * 在計算機上改了本薪、選了「只存這一次」的話，員工檔沒被改、
   * 沒有異動紀錄，但兩個月的本薪確實不同。
   *
   * 兩組欄位因此不能合併：合併的話，收到 CSV 的人會把
   * 「沒有異動紀錄」讀成「沒有調薪」。
   */
  it("只有差額、沒有異動紀錄時，異動那五欄留空而差額仍有值", () => {
    const [, row] = rowsOf(
      buildSalaryRecordCsv([
        recordOf({ baseSalaryDelta: deltaOf(), baseSalaryChange: null }),
      ]),
    );
    const at = (label: string) => row[columnIndex(label)];

    expect(at(ID.baseSalaryDelta)).toBe("-10000");
    expect(at(ID.profileChangeBefore)).toBe("");
    expect(at(ID.profileChangeAfter)).toBe("");
    expect(at(ID.profileChangeReason)).toBe("");
    expect(at(ID.profileChangeBy)).toBe("");
    expect(at(ID.profileChangeAt)).toBe("");
  });

  /**
   * Info: (20260908 - Julian) 沒有值一律留**空字串**，不是「0」也不是「無」。
   *
   * 「0」會被加總 —— 一份把「最早那一筆」算成「差額 0」的報表，
   * 在統計調薪幅度時會把分母算大。「無」會讓那一欄變成混合型別，排不了序。
   */
  it("最早的一筆（沒有上一筆）差額欄留空，不是 0", () => {
    const index = columnIndex(ID.baseSalaryDelta);
    const [, row] = rowsOf(
      buildSalaryRecordCsv([recordOf({ baseSalaryDelta: null })]),
    );

    expect(row[index]).toBe("");
  });

  /**
   * Info: (20260908 - Julian) 「月本薪（設定）」與「本薪（應稅）」是**兩欄**。
   *
   * 前者是這個人這個月的本薪設定，後者是實際計入的金額 ——
   * 月中到職的人那兩個數字不一樣，而那個差異正是對帳要看的。
   * 合成一欄的話，比例計算過的金額會被當成他的月薪。
   */
  it("月本薪（設定）與本薪（應稅）各自一欄", () => {
    const [header] = rowsOf(buildSalaryRecordCsv([recordOf()]));

    expect(header).toContain(ID.baseSalarySetting);
    expect(header).toContain(PAY_SLIP_FIELD_LABELS.baseSalaryWithTax);
    expect(ID.baseSalarySetting).not.toBe(
      PAY_SLIP_FIELD_LABELS.baseSalaryWithTax,
    );
  });
});
