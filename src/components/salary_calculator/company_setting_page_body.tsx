"use client";

import { FC, ReactNode, useEffect, useState } from "react";
import {
  Building2,
  BuildingComplex,
  CalendarRange,
  Hash,
  MapPinned,
  User,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { LeaveYearScheme } from "@/generated";
import { useCompanyProfile } from "@/hooks/use_company_profile";
import {
  LEAVE_YEAR_SCHEMES,
  SCHEME_LABEL_KEY,
} from "@/constants/salary_company_profile";
import SalaryCalculatorShell from "@/components/salary_calculator/salary_calculator_shell";
import LeaveWithoutSavingModal from "@/components/salary_calculator/leave_without_saving_modal";
import { useUnsavedChangesGuard } from "@/hooks/use_unsaved_changes_guard";
import {
  companyProfileFormToPayload,
  isCompanyProfileDirty,
} from "@/lib/utils/company_profile_form";

interface ICompanySettingPageBodyProps {
  accountBookId: string;
}

/**
 * Info: (20260914 - Julian) 選中的那一條**整條**轉亮橘，不只換邊框。
 *
 * 只換邊框的話，橘框裡包著一行 `gray-400` 的說明 —— 對比反而比未選中的
 * 那幾條還差，而那一行正是要讀的內容（各制度的差別就寫在那裡）。
 * 所以邊框、底色、標題、說明四者一起走。
 *
 * 抽成常數而不是寫在兩個地方：「尚未選擇」與三種制度共用同一組樣式，
 * 各寫一份的話日後調色只會改到其中一邊。
 */
const optionBoxStyle = (isActive: boolean): string =>
  isActive
    ? "rounded-lg border-2 border-orange-500 bg-orange-50 transition-colors"
    : "rounded-lg border border-gray-200 transition-colors hover:border-orange-200";

const optionTitleStyle = (isActive: boolean): string =>
  `flex items-center gap-3 px-4 pt-3 text-sm font-semibold ${
    isActive ? "text-orange-700" : "font-medium text-gray-700"
  }`;

const optionHintStyle = (isActive: boolean): string =>
  `px-4 pb-3 pl-11 text-xs ${isActive ? "text-orange-600" : "text-gray-400"}`;

const CompanySettingPageBody: FC<ICompanySettingPageBodyProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();
  const { profile, isLoading, loadFailed, saveProfile } =
    useCompanyProfile(accountBookId);

  const [entityName, setEntityName] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [responsiblePerson, setResponsiblePerson] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [scheme, setScheme] = useState<LeaveYearScheme | null>(null);
  const [startMonth, setStartMonth] = useState<string>("");
  const [startDay, setStartDay] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFailed, setSaveFailed] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Info: (20260914 - Julian) 載回來之後灌進表單；`null` 一律顯示為空字串
  useEffect(() => {
    setEntityName(profile.entityName);
    setTaxId(profile.taxId ?? "");
    setResponsiblePerson(profile.responsiblePerson ?? "");
    setAddress(profile.address ?? "");
    setScheme(profile.leaveYearScheme);
    setStartMonth(
      profile.leaveYearStartMonth === null
        ? ""
        : String(profile.leaveYearStartMonth),
    );
    setStartDay(
      profile.leaveYearStartDay === null
        ? ""
        : String(profile.leaveYearStartDay),
    );
  }, [profile]);

  const isCustom = scheme === LeaveYearScheme.CUSTOM;

  /**
   * Info: (20260914 - Julian) 表單現在的值，收成一份給正規化用。
   *
   * 「送出去的那一份」與「有沒有改過」都是從這裡算出來的 ——
   * 各讀一次那七個 state 的話，兩邊的正規化規則會慢慢走鐘，
   * 而其中一種走法的症狀是**離開時不問，改的東西直接消失**
   * （理由寫在 `company_profile_form.ts`）。
   */
  const form = {
    entityName,
    taxId,
    responsiblePerson,
    address,
    scheme,
    startMonth,
    startDay,
  };

  /**
   * Info: (20260914 - Julian) 有沒有未儲存的變更，比對的是最後一次載入／儲存的那一份。
   *
   * `profile` 在儲存成功之後會被回應覆寫（`useCompanyProfile.saveProfile`），
   * 而那份回應會經由上面的 effect 灌回表單 —— 所以存完就自動乾淨了，
   * 不需要另外記一個「剛存過」的旗標。
   *
   * 讀取中或讀失敗時一律當作乾淨：那時候 `profile` 是 `EMPTY`，
   * 拿它去比會把「還沒載回來」誤判成「使用者清空了公司名稱」，
   * 於是一進頁面就被攔住。
   */
  const isDirty =
    !isLoading && !loadFailed && isCompanyProfileDirty(form, profile);

  const { pendingHref, leave, stay } = useUnsavedChangesGuard(isDirty);

  /**
   * Info: (20260914 - Julian) 送不出去的三種情況，判準與後端 zod 同形。
   *
   * 前端擋是為了讓使用者當下就知道，**不是**為了取代後端驗證 ——
   * 後端那一份才是真的（`AccountBookCompanyProfileSchema` 的 `superRefine`）。
   */
  const isIncomplete =
    entityName.trim() === "" ||
    (isCustom && (startMonth === "" || startDay === ""));
  const isConfirmDisabled = isIncomplete || isSaving || isLoading || loadFailed;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveFailed(false);
    setJustSaved(false);
    try {
      // Info: (20260914 - Julian) 與「有沒有改過」共用同一支正規化，不再自己拼一份
      await saveProfile(companyProfileFormToPayload(form));
      setJustSaved(true);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle =
    "rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none";
  const labelStyle = "text-sm font-medium text-gray-700";

  /**
   * Info: (20260914 - Julian) 收**翻好的字串**，不收鍵名。
   *
   * 上一版收鍵名，於是元件裡寫的是
   * `t(`calculator.company_setting.${labelKey}`)` —— 樣板字串。
   * 而 `i18n_keys.test.ts` 掃的是字面值 `t("ns.key")`，掃不到樣板字串；
   * 反方向的棘輪比的是語系之間，鍵在五個語系都不存在時它們彼此一致。
   * 兩道護欄同時失效，所以「引用了一個不存在的鍵」在這一頁是沒有紅燈的 ——
   * 症狀只是畫面上一格空白。
   *
   * 呼叫端改寫完整的 `t("...")` 字面值之後，既有的護欄就看得到這一頁了。
   *
   * （`SCHEME_LABEL_KEY[option]` 那組維持樣板字串：它是 enum → 鍵的對照表，
   * 三個值都在同一個常數裡看得到，而且少一個會讓畫面少一個選項 ——
   * 那是看得出來的，與這裡「空白」的隱形程度不同。）
   */
  const textField = ({
    id,
    icon,
    label,
    value,
    onChange,
    isRequired = false,
    placeholder,
    hint,
  }: {
    id: string;
    icon: ReactNode;
    label: string;
    value: string;
    onChange: (next: string) => void;
    isRequired?: boolean;
    placeholder?: string;
    hint?: string;
  }) => (
    <div className="flex flex-col gap-1">
      {/**
       * Info: (20260914 - Julian) icon 與文字都是 `label` 的**直接子節點**。
       *
       * 把文字包進 `<span>` 再包一層的話，`jsx-a11y/label-has-associated-control`
       * 會擋下來 —— 那條規則只往下找兩層。這一頁的 radio 已經因為同一件事
       * 被擋過一次（見下面那段註解）。
       */}
      <label htmlFor={id} className={`flex items-center gap-1.5 ${labelStyle}`}>
        {icon}
        {label}
        {isRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full ${inputStyle}`}
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );

  return (
    <SalaryCalculatorShell accountBookId={accountBookId}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("calculator.company_setting.main_title")}
        </h1>

        {loadFailed && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {t("calculator.company_setting.load_failed")}
          </p>
        )}

        {/* Info: (20260914 - Julian) 公司資訊 */}
        <section className="flex flex-col gap-4 rounded-xl bg-white px-8 py-6 shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <BuildingComplex size={20} className="shrink-0 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t("calculator.company_setting.section_identity")}
            </h2>
          </div>

          {/**
           * Info: (20260914 - Julian) **一格，不是「公司名稱」＋「雇主名稱」兩格。**
           *
           * 勞基法 §2① 的「雇主」是涵蓋事業主、負責人、代表事業主處理勞工事務
           * 之人的法律定義，不是一個表單欄位。兩格並排、都必填、長得幾乎一樣，
           * 最可能的結果是有人在其中一格填了負責人姓名 ——
           * 然後那個人的名字印上每一張薪資單。
           *
           * 負責人是下面那個**可空**欄位，而且明說不印在薪資單上。
           */}
          {textField({
            id: "setting-entity-name",
            icon: <Building2 size={14} className="shrink-0" />,
            label: t("calculator.company_setting.entity_name"),
            value: entityName,
            onChange: setEntityName,
            isRequired: true,
            placeholder: t(
              "calculator.company_setting.entity_name_placeholder",
            ),
            hint: t("calculator.company_setting.entity_name_hint"),
          })}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {textField({
              id: "setting-tax-id",
              // Info: (20260914 - Julian) 與員工列表的「員工編號」同一個 icon
              icon: <Hash size={14} className="shrink-0" />,
              label: t("calculator.company_setting.tax_id"),
              value: taxId,
              onChange: setTaxId,
            })}
            {textField({
              id: "setting-responsible-person",
              // Info: (20260914 - Julian) 與員工列表的「員工姓名」同一個 icon
              icon: <User size={14} className="shrink-0" />,
              label: t("calculator.company_setting.responsible_person"),
              value: responsiblePerson,
              onChange: setResponsiblePerson,
            })}
          </div>

          {textField({
            id: "setting-address",
            icon: <MapPinned size={14} className="shrink-0" />,
            label: t("calculator.company_setting.address"),
            value: address,
            onChange: setAddress,
          })}
        </section>

        {/**
         * Info: (20260914 - Julian) 特休年度 —— **這一節才是這一頁的法定理由。**
         *
         * 公司抬頭是實務慣例：工資明細（細則 §14-1）四款全是金額、
         * 工資清冊（本法 §23 II）三項也全是金額，兩邊都不要求雇主名稱。
         *
         * 而特休年度制度是細則 §24 II 明定由勞雇雙方協商的三選一，
         * 也是 §38 V「每年定期以書面通知勞工」算得出年度終結日的前提。
         */}
        <section className="flex flex-col gap-4 rounded-xl bg-white px-8 py-6 shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <CalendarRange size={20} className="shrink-0 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t("calculator.company_setting.section_leave_year")}
            </h2>
          </div>
          <p className="text-xs text-gray-500">
            {t("calculator.company_setting.leave_year_hint")}
          </p>

          {/**
           * Info: (20260914 - Julian) 「尚未選擇」是一個**看得見的選項**，不是預設值。
           *
           * schema 那一欄刻意沒有 `@default`：給了預設值，既有帳本會
           * 「看起來已經設定好」而其實沒有人選過（同 `SalaryRecord.baseSalary`
           * 的 `@default(0)`，部署檢查表 §1.4.1）。選錯會讓每一位員工的
           * 年度終結日整個移位，而畫面上不會有任何異常。
           */}
          <div className="flex flex-col gap-2">
            {/**
             * Info: (20260914 - Julian) 說明文字放在 `label` **外面**。
             *
             * 包進去的話它會被 `jsx-a11y/label-has-associated-control` 擋下 ——
             * 那條規則只往下找兩層文字，而「標題＋說明」堆成兩層 span 之後
             * 標題就在第三層。把標題留在第一層、說明移出去，
             * 無障礙名稱就是那一行標題，而不是標題與說明黏成一段。
             */}
            <div className={optionBoxStyle(scheme === null)}>
              <label
                htmlFor="leave-year-scheme-unset"
                className={optionTitleStyle(scheme === null)}
              >
                <input
                  id="leave-year-scheme-unset"
                  type="radio"
                  name="leave-year-scheme"
                  checked={scheme === null}
                  onChange={() => setScheme(null)}
                  className="shrink-0 accent-orange-500"
                />
                {t("calculator.company_setting.leave_year_unset")}
              </label>
              <p className={optionHintStyle(scheme === null)}>
                {t("calculator.company_setting.leave_year_unset_hint")}
              </p>
            </div>

            {LEAVE_YEAR_SCHEMES.map((option) => (
              <div key={option} className={optionBoxStyle(scheme === option)}>
                <label
                  htmlFor={`leave-year-scheme-${option}`}
                  className={optionTitleStyle(scheme === option)}
                >
                  <input
                    id={`leave-year-scheme-${option}`}
                    type="radio"
                    name="leave-year-scheme"
                    checked={scheme === option}
                    onChange={() => setScheme(option)}
                    className="shrink-0 accent-orange-500"
                  />
                  {t(`calculator.company_setting.${SCHEME_LABEL_KEY[option]}`)}
                </label>
                <p className={optionHintStyle(scheme === option)}>
                  {t(
                    `calculator.company_setting.${SCHEME_LABEL_KEY[option]}_hint`,
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Info: (20260914 - Julian) 起日只有約定年度用得到，另外兩制算得出來 */}
          {isCustom && (
            <div className="flex flex-wrap items-end gap-3">
              <span className={labelStyle}>
                {t("calculator.company_setting.custom_start")}
                <span className="text-red-500">*</span>
              </span>
              <input
                id="setting-leave-year-month"
                type="number"
                min={1}
                max={12}
                value={startMonth}
                aria-label={t("calculator.company_setting.month_unit")}
                onChange={(event) => setStartMonth(event.target.value)}
                className={`w-20 ${inputStyle}`}
              />
              <span className="text-sm text-gray-500">
                {t("calculator.company_setting.month_unit")}
              </span>
              <input
                id="setting-leave-year-day"
                type="number"
                min={1}
                max={31}
                value={startDay}
                aria-label={t("calculator.company_setting.day_unit")}
                onChange={(event) => setStartDay(event.target.value)}
                className={`w-20 ${inputStyle}`}
              />
              <span className="text-sm text-gray-500">
                {t("calculator.company_setting.day_unit")}
              </span>
            </div>
          )}
        </section>

        <div className="flex items-center justify-end gap-3">
          {justSaved && (
            <span className="text-sm font-medium text-green-600">
              {t("calculator.company_setting.saved")}
            </span>
          )}
          {saveFailed && (
            <span className="text-sm font-medium text-red-600">
              {t("calculator.company_setting.save_failed")}
            </span>
          )}
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-base font-bold text-white transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isSaving
              ? t("calculator.company_setting.saving")
              : t("calculator.company_setting.save")}
          </button>
        </div>
      </div>

      {/**
       * Info: (20260914 - Julian) 被攔下來的那一次站內導航。
       *
       * 重新整理／關分頁走的是瀏覽器自己的對話框（`beforeunload`），
       * 不經過這裡。上一頁／下一頁**攔不住**，理由在
       * `lib/utils/unsaved_navigation.ts` 的檔頭。
       */}
      {pendingHref !== null && (
        <LeaveWithoutSavingModal stayHandler={stay} leaveHandler={leave} />
      )}
    </SalaryCalculatorShell>
  );
};

export default CompanySettingPageBody;
