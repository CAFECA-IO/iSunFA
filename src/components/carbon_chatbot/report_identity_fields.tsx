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

interface IReportIdentityFieldsProps {
  identity?: ICarbonReportIdentity;
  onChange: (patch: ICarbonReportIdentity) => void;
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
    </section>
  );
}
