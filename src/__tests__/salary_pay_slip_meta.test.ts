import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";
import {
  formatPaySlipDate,
  paySlipMetaOf,
  resolveEntityName,
  PAY_SLIP_INSURED_FIELDS,
} from "@/lib/utils/pay_slip_meta";
import { buildPaySlipHtml } from "@/lib/utils/pay_slip_html";
import { defaultSalaryCalculatorResult } from "@/interfaces/salary_calculator";

/**
 * Info: (20260909 - Julian) 薪資單上的到職日與投保狀態（客戶場景 §2）。
 *
 * ## 這一支在守什麼
 *
 * 同一份資訊要出現在兩個**不共用任何程式碼**的地方：畫面上的 `PaySlip`
 * （React，走 i18n）與寄出去的 `pay_slip_html`（伺服端字串，寫死繁中）。
 * 兩邊分岔的症狀是「員工收到的信與畫面上看到的不一樣」——
 * 而那是最難被發現的一種缺陷：兩個人各看一邊，都覺得沒問題。
 *
 * 另一半是**來源**。到職日讀員工檔現值、投保狀態讀那筆紀錄的快照 ——
 * 這個不對稱看起來像不一致，很容易被下一個人「順手統一」掉，
 * 而統一到任何一邊都會錯（理由見 `pay_slip_meta.ts`）。
 *
 * 時區那一半在 `salary_pay_slip_meta.tz.test.ts`。
 */

const read = (relativePath: string): string =>
  readFileSync(path.join(process.cwd(), "src", relativePath), "utf-8");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const paySlip = stripComments(
  read("components/salary_calculator/pay_slip.tsx"),
);
const paySlipHtml = stripComments(read("lib/utils/pay_slip_html.ts"));
const deliveryService = stripComments(
  read("services/salary_pay_slip_delivery.service.ts"),
);
const recordsPage = stripComments(
  read("components/salary_calculator/salary_records_page_body.tsx"),
);
const resultSection = stripComments(
  read("components/salary_calculator/salary_result_section.tsx"),
);
const csvSource = stripComments(read("lib/utils/salary_record_csv.ts"));
const resultBlock = stripComments(
  read("components/salary_calculator/result_block.tsx"),
);

describe("paySlipMetaOf", () => {
  /**
   * Info: (20260909 - Julian) **`undefined` 讀成「未投保」，不是「有投保」。**
   *
   * 引擎輸入的三個布林在型別上是可選的。`toCalculatorOptions` 一律會寫，
   * 但更早的紀錄不保證 —— 而寫成 `?? true`（或忘了處理）的後果是
   * 一張其實沒有勞保費的薪資單上寫著「勞保：投保」。
   *
   * 兩個方向的錯法不對稱：說「未投保」而其實有保，員工會來問；
   * 說「投保」而其實沒保，沒有人會問，直到勞檢。
   */
  it("三個布林缺漏時一律讀成未投保", () => {
    const meta = paySlipMetaOf(null, {}, null);

    expect(meta.isLaborInsured).toBe(false);
    expect(meta.isHealthInsured).toBe(false);
    expect(meta.isPensionInsured).toBe(false);
  });

  it("三個布林各自對應引擎輸入的那一格，不會接錯", () => {
    const meta = paySlipMetaOf(
      null,
      {
        isLaborInsuranceEnrolled: true,
        isHealthInsuranceEnrolled: false,
        isPensionInsuranceEnrolled: true,
      },
      null,
    );

    expect(meta.isLaborInsured).toBe(true);
    expect(meta.isHealthInsured).toBe(false);
    expect(meta.isPensionInsured).toBe(true);
  });

  it("到職日原樣帶過去，null 保持 null", () => {
    const hireDate = Math.floor(Date.UTC(2026, 7, 10) / 1000);

    expect(paySlipMetaOf(hireDate, {}, null).hireDate).toBe(hireDate);
    expect(paySlipMetaOf(null, {}, null).hireDate).toBeNull();
  });

  it("抬頭原樣帶過去（解析在呼叫端，不在這裡）", () => {
    expect(paySlipMetaOf(null, {}, "測試股份有限公司").entityName).toBe(
      "測試股份有限公司",
    );
    expect(paySlipMetaOf(null, {}, null).entityName).toBeNull();
  });
});

/**
 * Info: (20260914 - Julian) 抬頭的解析規則。**守的是一個決定，不是一行 `??`。**
 *
 * 規則本身只有一行，而它為什麼是這一行寫在 `resolveEntityName` 的註解裡。
 * 這裡把那段註解釘成可執行的斷言 —— 註解會過期，測試不會。
 */
describe("resolveEntityName", () => {
  it("有快照就用快照（公司改過名，舊薪資單印當時的名字）", () => {
    expect(resolveEntityName("舊名股份有限公司", "新名股份有限公司")).toBe(
      "舊名股份有限公司",
    );
  });

  /**
   * Info: (20260914 - Julian) 這一條是整組裡最容易被「優化」掉的。
   *
   * 20260914（`entity_name_snapshot` 上線）之前存的紀錄一律沒有快照，
   * 而那不是「漏填」—— 是**當時系統根本不知道公司抬頭**，
   * 沒有任何回填腳本補得出來。現值是唯一拿得到的答案。
   *
   * 少了這一條，把回退改成「一律留白」會全綠，而症狀是
   * 每一張舊薪資單重印出來都少了抬頭。
   */
  it("沒有快照就回退現值，不是留白", () => {
    expect(resolveEntityName(null, "新名股份有限公司")).toBe(
      "新名股份有限公司",
    );
  });

  it("兩邊都沒有就是 null（那張單子不印抬頭）", () => {
    expect(resolveEntityName(null, null)).toBeNull();
  });

  /**
   * Info: (20260914 - Julian) 空字串是**快照**，不是「沒有快照」。
   *
   * 用 `??` 而不是 `||` 的差別就在這一格。今天走不到這裡
   * （zod 的 `min(1)` 擋著空的 `entityName`），但哪天有人放寬那個驗證，
   * `||` 會讓空字串靜靜地掉進回退、印出一個與存檔當下不同的抬頭。
   */
  it("空字串的快照不觸發回退", () => {
    expect(resolveEntityName("", "新名股份有限公司")).toBe("");
  });
});

describe("formatPaySlipDate", () => {
  it("沒有到職日時是「-」，不是 1970 也不是空字串", () => {
    expect(formatPaySlipDate(null)).toBe("-");
  });

  /**
   * Info: (20260909 - Julian) 補零：`2026/8/1` 與 `2026/08/01` 在逐字比對時
   * 是兩個字串，而這一格會被拿去與勞保投保申報表對。
   */
  it("年月日補零，格式是 YYYY-MM-DD", () => {
    expect(formatPaySlipDate(Math.floor(Date.UTC(2026, 0, 5) / 1000))).toBe(
      "2026-01-05",
    );
    expect(formatPaySlipDate(Math.floor(Date.UTC(2026, 7, 10) / 1000))).toBe(
      "2026-08-10",
    );
  });
});

describe("兩個消費端共用同一份投保清單", () => {
  /**
   * Info: (20260909 - Julian) **兩邊都 map `PAY_SLIP_INSURED_FIELDS`。**
   *
   * 各自列三行的話，日後多一種保險（或拿掉一種）只會落在其中一邊 ——
   * 而畫面與信件各少一格、各多一格，兩邊各自看都正常。
   * 那種不一致要等到有人把兩份並排才會發現，而那個人多半是勞檢員。
   */
  it("畫面版與寄出版都走共用的欄位清單", () => {
    expect(paySlip).toContain("PAY_SLIP_INSURED_FIELDS.map");
    expect(paySlipHtml).toContain("PAY_SLIP_INSURED_FIELDS.map");
  });

  /**
   * Info: (20260909 - Julian) 兩邊的**文案表**都綁在 `PaySlipInsuredField` 上。
   *
   * 文案本身無法共用（畫面走 i18n key、寄出的那份寫死繁中，理由見
   * `pay_slip_labels.ts` 的檔頭），所以它必然是兩份 —— 而兩份就會分岔。
   *
   * 擋法是型別：`Record<PaySlipInsuredField, string>` 少一個鍵就編譯失敗。
   * 也就是說「多一種保險而只補了一邊的文案」不會走到執行期。
   * 這一條釘的是那個型別沒有被放寬成 `Record<string, string>` ——
   * 放寬之後兩份會安靜地分岔，而這正是本檔開頭那句話說的那種缺陷。
   */
  it("兩邊的文案表都以欄位清單為型別，不是任意字串鍵", () => {
    expect(paySlip).toContain("Record<PaySlipInsuredField, string>");
    expect(stripComments(read("constants/pay_slip_labels.ts"))).toContain(
      "Record<PaySlipInsuredField, string>",
    );
  });

  it("清單就是那三種，順序與員工檔一致", () => {
    expect([...PAY_SLIP_INSURED_FIELDS]).toEqual([
      "isLaborInsured",
      "isHealthInsured",
      "isPensionInsured",
    ]);
  });
});

describe("三個欄位的來源刻意不同", () => {
  /**
   * Info: (20260909 - Julian) **這是這次最容易被「順手統一」掉的決定。**
   *
   * - 到職日 → 員工檔**現值**：它是「這個人」的事實，只有一個正確答案。
   *   被更正過的話，舊薪資單上該顯示的是更正後那個值。
   * - 投保狀態 → 這筆紀錄的 **input 快照**：它是「這個月」的事實。
   *   八月有保、九月退保是正常的，而那張單子上的勞保費是照當時的狀態算的。
   * - 公司抬頭 → 這筆紀錄的**快照，取不到才回退現值**（20260914 新增）：
   *   它是「這段期間」的事實。公司改名之後，舊薪資單該印當時的名字。
   *
   * 統一到任何一邊都會錯：統一讀員工檔／現值，去年的薪資單會跟著今天的
   * 投保狀態與今天的公司名變；統一讀快照，到職日只有「當月中途到職」的
   * 那幾筆才有值（`toCalculatorOptions` 的 `employeeStartDate` 只在
   * `isJoined` 時才寫），而抬頭在 20260914 之前的紀錄一律沒有。
   *
   * Info: (20260914 - Julian) 判準從「整串字面」改成「各參數位置分別比對」。
   *
   * 原本比的是 `paySlipMetaOf(employee.hireDate, record.input)` 一整串 ——
   * 加第三個參數時它紅了，而那是**對的紅**（來源組合變了要有人重新想過）。
   * 但整串比對也很脆：換行、改個空白都會紅，而那些與「來源是什麼」無關。
   * 所以改成逐位置比對，讓它對格式不敏感、對**來源**敏感。
   */
  it("寄送服務：到職日取員工檔、投保狀態取紀錄快照、抬頭取快照再回退", () => {
    expect(deliveryService).toMatch(
      /paySlipMetaOf\(\s*employee\.hireDate,\s*record\.input,/,
    );
    expect(deliveryService).toContain(
      "resolveEntityName(record.entityNameSnapshot, currentEntityName)",
    );
  });

  it("薪資紀錄檢視：同一組來源", () => {
    expect(recordsPage).toMatch(
      /paySlipMetaOf\(\s*viewing\.employee\.hireDate,\s*viewing\.input,/,
    );
    expect(recordsPage).toContain(
      "resolveEntityName(viewing.entityNameSnapshot, currentEntityName)",
    );
  });

  /**
   * Info: (20260909 - Julian) 計算機那一頁的投保狀態取**當下的輸入**，不是員工檔。
   *
   * 使用者可能剛在這一頁把勞保取消掉還沒儲存，而下面那張薪資單上的金額
   * 已經是照取消之後算出來的。讀員工檔會讓「狀態」與「金額」
   * 在同一張單子上互相矛盾 —— 而使用者會相信狀態那一格。
   */
  it("計算機：投保狀態取計算機當下的輸入", () => {
    expect(resultSection).toMatch(
      /paySlipMetaOf\([\s\S]{0,200}?getSalaryCalculatorOptions\(\)/,
    );
  });

  /**
   * Info: (20260914 - Julian) 計算機那一頁**沒有快照可讀**，所以抬頭一律取現值。
   *
   * 那張薪資單還沒存下去 —— 存的那一刻才會定格（`upsertRecord`）。
   * 這裡若也寫成 `resolveEntityName(...)`，讀的人會以為有快照可回退，
   * 而那個「快照」永遠是 undefined。
   */
  it("計算機：抬頭取公司設定現值，不經過回退", () => {
    expect(resultSection).toContain(
      "companyProfile.isConfigured ? companyProfile.entityName : null",
    );
    expect(resultSection).not.toContain("resolveEntityName");
  });

  /**
   * Info: (20260914 - Julian) CSV 那一支**刻意傳 `null`**：抬頭不是清冊的欄位。
   *
   * 它在工資清冊上的位置是**表頭**（勞動局範本
   * `____公司　工資清冊　__年__月份`），不是每一列重複一次。
   * 少了這一條，把它改成逐列帶抬頭不會有任何紅燈，而清冊會多出一整欄重複值。
   */
  it("CSV：抬頭不進每一列", () => {
    expect(csvSource).toMatch(/paySlipMetaOf\(null, record\.input, null\)/);
  });
});

describe("三個呼叫端都真的傳了 meta", () => {
  /**
   * Info: (20260909 - Julian) `PaySlip` 的 `meta` 是**可選**的
   *（「我的薪資單」那條路徑手上只有計算結果，沒有員工檔）。
   *
   * 代價是「忘了傳」不會有任何症狀 —— 那兩格靜靜地不見，而薪資單
   * 看起來完全正常。這一組就是那個代價的守法。
   */
  it("薪資紀錄檢視與計算機都傳了", () => {
    expect(recordsPage).toContain("meta={paySlipMetaOf(");
    expect(resultSection).toContain("meta={paySlipMeta}");
  });

  /**
   * Info: (20260909 - Julian) 寄出的那一份**沒有可選這個選項**。
   *
   * `IPaySlipHtmlInput.meta` 是必填：做成可選的話，忘了傳的呼叫端會產出
   * 一張少了兩格的薪資單寄給員工，而它看起來完全正常 ——
   * 沒有人會發現，直到勞檢問起。
   */
  it("寄出版的 meta 是必填，沒有預設值", () => {
    expect(paySlipHtml).toMatch(/meta: IPaySlipMeta;/);
    expect(paySlipHtml).not.toMatch(/meta\?: IPaySlipMeta/);
  });
});

describe("投保狀態不是金額", () => {
  /**
   * Info: (20260909 - Julian) 狀態列走 `statusItems`，**不進遮罩**。
   *
   * 遮的是金額（`MaskedAmount`）。把「有沒有投保」也遮掉，換來的是
   * 一張看不出投保狀態的薪資單，而擋不住任何實質資訊 ——
   * 旁邊那個人本來就看得到四個區塊的標題。
   *
   * 反過來，若有人把狀態塞進 `rowItems`，`ResultBlock` 會拿 `numberWithCommas`
   * 去格式化一個布林 —— 畫面上會出現 `NT NaN`。
   */
  it("狀態列與數值列是兩個不同的入口", () => {
    expect(resultBlock).toContain("statusItems");
    expect(paySlip).toContain("statusItems={insuredStatusItems}");
  });

  it("狀態列不經過 MaskedAmount", () => {
    const statusRender = resultBlock.slice(
      resultBlock.indexOf("statusItems.map"),
    );
    const untilRowItems = statusRender.slice(
      0,
      statusRender.indexOf("displayRowItems"),
    );

    expect(untilRowItems).not.toContain("MaskedAmount");
  });
});

describe("到職日的位置", () => {
  /**
   * Info: (20260909 - Julian) 到職日在**身分那一區**，不在投保區塊。
   *
   * 它回答的是「這個人是誰」而不是「這個月怎麼算的」——
   * 勞檢對照投保申報表時看的也是這一區。兩邊放在同一個位置，
   * 是為了讓收到信的員工與看畫面的會計指得到同一格。
   */
  it("兩邊都把它放在姓名與編號之後", () => {
    expect(paySlip).toMatch(
      /showingNumber[\s\S]{0,400}?calculator\.result\.hire_date/,
    );
    expect(paySlipHtml).toMatch(
      /input\.employeeNumber[\s\S]{0,300}?PAY_SLIP_META_LABELS\.hireDate/,
    );
  });
});

/**
 * Info: (20260909 - Julian) 寄出去的那一份**真的印出來了**。
 *
 * 上面幾組掃的是原始碼（本專案的測試不 render React，畫面版只能那樣守）。
 * 但 `buildPaySlipHtml` 是純函式 —— 它的產物驗得到，所以這裡驗產物：
 * 掃描守得住「有沒有接線」，只有產物守得住「印出來對不對」。
 */
describe("寄出的薪資單真的印出這兩格", () => {
  const htmlWith = (
    hireDate: number | null,
    insured: Parameters<typeof paySlipMetaOf>[1],
    entityName: string | null = null,
  ): string =>
    buildPaySlipHtml({
      employeeName: "王小明",
      employeeNumber: "A001",
      year: 2026,
      month: 9,
      result: defaultSalaryCalculatorResult,
      meta: paySlipMetaOf(hireDate, insured, entityName),
    });

  it("到職日印成 YYYY-MM-DD", () => {
    const html = htmlWith(Math.floor(Date.UTC(2026, 7, 10) / 1000), {});

    expect(html).toContain("到職日：2026-08-10");
  });

  it("沒有到職日時印「-」，不是空白也不是 1970", () => {
    const html = htmlWith(null, {});

    expect(html).toContain("到職日：-");
    expect(html).not.toContain("1970");
  });

  /**
   * Info: (20260909 - Julian) 三種保險各自印出自己的狀態。
   *
   * 混成一句「已投保」的話，「勞保有、健保沒有」這種常見情況就說不出來 ——
   * 而那正是勞檢會追的那一種。
   */
  it("三種保險各印一行，狀態各自獨立", () => {
    const html = htmlWith(null, {
      isLaborInsuranceEnrolled: true,
      isHealthInsuranceEnrolled: false,
      isPensionInsuranceEnrolled: true,
    });

    expect(html).toMatch(/勞保<\/td>\s*<td class="value">投保/);
    expect(html).toMatch(/健保<\/td>\s*<td class="value">未投保/);
    expect(html).toMatch(/勞退<\/td>\s*<td class="value">投保/);
  });

  /**
   * Info: (20260909 - Julian) 狀態排在級距**前面**。
   *
   * 未投保時級距是 0，而「勞保投保級距 0」讀起來像資料漏了，
   * 不像「這個人沒有投保」。先講狀態，下面那幾個 0 才有解釋。
   */
  it("狀態排在投保級距之前", () => {
    const html = htmlWith(null, {});

    expect(html.indexOf(">勞保<")).toBeLessThan(html.indexOf("勞保投保級距"));
  });
});
