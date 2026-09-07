/**
 * Info: (20260814 - Emily) 查證識別欄位的填寫介面
 * (`data/issue_drafts/open/24_report_identity_fields.md`)。
 *
 * ## 為什麼是一塊可收合的面板，而不是一個 modal
 *
 * 這四項是**邊看報告邊填**的東西 —— 盤查年度要對照 2.1 節、製作單位要對照 1.4 節。
 * modal 會把報告蓋掉，於是使用者得記著答案再打開來填。
 * 收合的面板貼在工具列下方，開著也還看得到報告。
 *
 * ## 為什麼每一格都有「這一項為什麼不能自動填」的說明
 *
 * 使用者的第一個反應會是「報告裡就有了，為什麼要我打」。
 * 對盤查年度來說那句話是對的（2.1 節確實寫了涵蓋期間）—— 但抽錯的代價是
 * 封面印錯年度，而查證單位會把封面當成事實。說出理由比留一個空格好。
 *
 * ## 逐格即時寫回，沒有「儲存」按鈕
 *
 * 報告本身就是邊改邊存的（`saveStatus` 在工具列上），四個欄位另立一個儲存按鈕
 * 會變成「這裡要按、那裡不用按」的兩套規則。onChange 直接 patch，與正文一致。
 */

import { useTranslation } from "@/i18n/i18n_context";
import {
  CARBON_REPORT_IDENTITY_FIELDS,
  type CarbonReportIdentityField,
  type ICarbonReportIdentity,
} from "@/lib/utils/carbon_report_identity";
import {
  CarbonDisclosureFrameworkEnum,
  FRAMEWORK_DISCLOSURE_LABEL,
} from "@/constants/carbon_report_framework";

interface IReportIdentityFieldsProps {
  identity?: ICarbonReportIdentity;
  onChange: (patch: ICarbonReportIdentity) => void;
  /**
   * Info: (20260903 - Emily) 揭露框架(#6688-A)。
   *
   * ## 為什麼放在這個面板,而它的值又不住在這裡
   *
   * 從使用者的角度,「這份報告要包成哪種框架」與封面上的年度、製作單位是同一件事:
   * 都是**邊看報告邊決定**的識別資訊,所以擺在同一塊面板(理由與上面那段相同)。
   *
   * 但技術上它們**去兩個地方**:上面四格寫進 `reportData.identity`(報告草稿),
   * 這一格寫進 `ICarbonInventoryState.disclosureFramework`(盤查狀態,隨 state E2EE 入庫)。
   * 所以它是獨立的 prop 與獨立的 callback,不併進 `onChange` 的 patch ——
   * 併進去會讓一個 patch 同時要往兩個儲存體寫,而那條路遲早會有一邊漏掉。
   *
   * 兩者都選填:沒有傳就不顯示這一格(既有呼叫端零改動)。
   */
  framework?: CarbonDisclosureFrameworkEnum;
  onChangeFramework?: (framework: CarbonDisclosureFrameworkEnum) => void;
  readOnly?: boolean;
}

/**
 * Info: (20260814 - Emily) 欄位鍵 → i18n 鍵。
 *
 * 寫成明確的對照表而不是把 camelCase 轉 snake_case:
 * 轉換規則看起來省事,但它讓「i18n 少一個鍵」變成執行期才發現的錯 ——
 * 而這張表少一項的話 TypeScript 會當場擋下（`Record` 要求四個鍵都在）。
 */
const LABEL_KEY: Readonly<Record<CarbonReportIdentityField, string>> = {
  inventoryYear: "inventory_year",
  preparedBy: "prepared_by",
  verifiedBy: "verified_by",
  issuedOn: "issued_on",
};

/**
 * Info: (20260814 - Emily) 只有更新日期用 date input。
 *
 * 其餘三項都是自由文字:盤查年度可能是「2023」也可能是「2023 年度」,
 * 製作單位與查證單位是機構名稱。硬套格式驗證會把合法的寫法擋掉,
 * 而這幾格的內容是要逐字印在查證文件上的 —— 使用者知道自己要寫什麼。
 */
const INPUT_TYPE: Readonly<Record<CarbonReportIdentityField, string>> = {
  inventoryYear: "text",
  preparedBy: "text",
  verifiedBy: "text",
  issuedOn: "date",
};

export function ReportIdentityFields({
  identity = undefined,
  onChange,
  framework = undefined,
  onChangeFramework = undefined,
  readOnly = false,
}: IReportIdentityFieldsProps) {
  const { t } = useTranslation();
  const base = "admin_mission_board.pdf_editor.report_identity";

  return (
    <section className="border-b border-gray-200 bg-orange-50/40 px-4 py-3">
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-xs font-bold text-gray-700">
          {t(`${base}.title`)}
        </h3>
        {/* Info: (20260814 - Emily) 說明為什麼要人工填 —— 少了它這塊看起來像多餘的表單 */}
        <p className="min-w-0 truncate text-[11px] text-gray-500">
          {t(`${base}.hint`)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CARBON_REPORT_IDENTITY_FIELDS.map((field) => (
          <label key={field} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-gray-500">
              {t(`${base}.${LABEL_KEY[field]}`)}
            </span>
            <input
              type={INPUT_TYPE[field]}
              value={identity?.[field] ?? ""}
              readOnly={readOnly}
              disabled={readOnly}
              placeholder={t(`${base}.unfilled`)!}
              /**
               * Info: (20260814 - Emily) 逐格 patch 而不是整包覆蓋:
               * 整包覆蓋會讓兩個欄位同時被編輯時後寫的那個蓋掉前一個
               * （React 的 state 更新是非同步的）。
               */
              onChange={(event) => onChange({ [field]: event.target.value })}
              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-[#ff5a00] disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>
        ))}
      </div>
      {/* Info: (20260903 - Emily) 揭露框架(#6688-A):獨立一列,因為它的值去的是盤查狀態而不是報告識別 */}
      {onChangeFramework && (
        <label className="mt-2 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500">
            {t(`${base}.framework_label`)}
          </span>
          <select
            value={framework ?? CarbonDisclosureFrameworkEnum.INVENTORY_ONLY}
            disabled={readOnly}
            /**
             * Info: (20260903 - Emily) 值域是 enum,所以直接轉型而不做字串比對:
             * `<select>` 的 option value 就是 enum 的成員,多一個成員時
             * 下面那個 map 會自動長出選項,不必記得回來改這裡。
             */
            onChange={(event) =>
              onChangeFramework(
                event.target.value as CarbonDisclosureFrameworkEnum,
              )
            }
            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-[#ff5a00] disabled:bg-gray-50 disabled:text-gray-400"
          >
            {Object.values(CarbonDisclosureFrameworkEnum).map((value) => (
              <option key={value} value={value}>
                {value === CarbonDisclosureFrameworkEnum.IFRS_S1_S2
                  ? t(`${base}.framework_ifrs`, {
                      name: FRAMEWORK_DISCLOSURE_LABEL,
                    })
                  : t(`${base}.framework_inventory_only`)}
              </option>
            ))}
          </select>
          {/*
            Info: (20260903 - Emily) 這句提示不是說明文字,是**界線**:
            選了 IFRS 會在報告上印架構對齊聲明,而使用者必須知道那不等於
            「本公司符合 IFRS」—— 後者是金管會適用時程未到就宣告的紅線。
            理由見 constants/carbon_report_framework.ts 的檔頭。
          */}
          {/*
            Info: (20260903 - Emily) 這句提示**刻意不引用**那兩句原文
            (架構對齊聲明與免責句),因為今天沒有任何地方把它們印出來:
            `carbon_framework_view.ts` 的 `shellClaims` 組出來之後**零消費端**
            (2026-09-03 實測:那兩句的字面字串在 src/ 與 documents/ 只有常數定義與測試)。
            第一版寫成「報告上會印『…』與『…』」,那是一個沒有兌現的承諾 ——
            使用者同意的內容與紙面不一致,而那正是這一格存在要防的事。

            現在說的是**今天為真**的部分:選了之後草稿依該架構撰寫
            (`paragraph_draft.service.ts` 的角色句與 guidance 確實會換),
            以及那條界線本身(架構對齊 ≠ 企業合規宣告)。

            #6688-C 把伺服端的印出點做出來之後,這句才該回頭引用
            `FRAMEWORK_ALIGNMENT_PHRASE` / `FRAMEWORK_DISCLAIMER_PHRASE`
            —— 引用的理由是「提示與紙面必須是同一份字串」,而那個理由要等紙面存在才成立。
          */}
          <span className="text-[11px] leading-snug text-gray-500">
            {t(`${base}.framework_hint`, { name: FRAMEWORK_DISCLOSURE_LABEL })}
          </span>
        </label>
      )}
    </section>
  );
}
