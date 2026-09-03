"use client";

import { useState, useMemo, Fragment, FC, ChangeEvent } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { ChevronDown, Search } from "lucide-react";
import SalaryCalculatorShell from "@/components/salary_calculator/salary_calculator_shell";
import ReceivedTab from "@/components/salary_calculator/pay_slip_received_tab";
import SentTab from "@/components/salary_calculator/pay_slip_sent_tab";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { dummyReceivedData, dummySentData } from "@/interfaces/pay_slip";
import { SortOrder } from "@/constants/sort";
import { timestampToString } from "@/lib/utils/common";

const FilterSection: FC<{
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}> = ({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  searchQuery,
  setSearchQuery,
}) => {
  const { t } = useTranslation();
  const { yearOptions: defaultYearOptions, monthOptions: defaultMonthOptions } =
    useCalculatorCtx();

  const yearOptions = ["All", ...defaultYearOptions];
  const monthOptions = [
    "All",
    ...defaultMonthOptions.map((month) => month.name),
  ];

  const yearStr = (val: string) =>
    val === yearOptions[0] ? t("calculator.my_pay_slip.all") : val;
  const monthStr = (val: string) =>
    val === "All"
      ? t("calculator.my_pay_slip.all")
      : t(`date.month_name.${val.slice(0, 3).toLowerCase()}`);

  const changeSearchQuery = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="grid grid-cols-2 items-center gap-[24px]">
      <div className="grid grid-cols-2 items-center gap-[12px]">
        {/* Info: (20250722 - Julian) Year Selection */}
        <Listbox value={selectedYear} onChange={setSelectedYear}>
          <div className="relative">
            <ListboxButton className="border-input-stroke-input bg-input-surface-input-background hover:border-input-stroke-input-hover hover:divide-input-stroke-input-hover data-open:border-input-stroke-input-hover data-open:divide-input-stroke-input-hover flex w-full items-center divide-x rounded-lg border transition-colors focus:outline-none">
              <div className="text-input-text-input-placeholder px-[12px] py-[10px] text-base font-medium">
                {t("calculator.basic_info_form.year")}
              </div>
              <div className="text-input-text-input-filled flex flex-1 items-center py-[10px] text-right text-base font-medium">
                <div className="flex-1 px-[12px]">{yearStr(selectedYear)}</div>
                <div className="text-icon-surface-single-color-primary px-[12px]">
                  <ChevronDown size={16} />
                </div>
              </div>
            </ListboxButton>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ListboxOptions className="border-input-stroke-input bg-input-surface-input-background text-input-text-input-filled shadow-Dropshadow_XS absolute z-10 mt-1 flex w-full flex-col overflow-auto rounded-lg border focus:outline-none">
                {yearOptions.map((year, index) => (
                  <ListboxOption
                    key={year}
                    value={year}
                    className="hover:bg-input-surface-input-hover cursor-pointer px-[12px] py-[10px] text-base font-medium transition-colors data-selected:bg-orange-50 data-selected:text-orange-900"
                  >
                    {index === 0 ? t("calculator.my_pay_slip.all") : year}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Transition>
          </div>
        </Listbox>

        {/* Info: (20250722 - Julian) Month Selection */}
        <Listbox value={selectedMonth} onChange={setSelectedMonth}>
          <div className="relative">
            <ListboxButton className="border-input-stroke-input bg-input-surface-input-background hover:border-input-stroke-input-hover hover:divide-input-stroke-input-hover data-open:border-input-stroke-input-hover data-open:divide-input-stroke-input-hover flex w-full items-center divide-x rounded-lg border transition-colors focus:outline-none">
              <div className="text-input-text-input-placeholder px-[12px] py-[10px] text-base font-medium">
                {t("calculator.basic_info_form.month")}
              </div>
              <div className="text-input-text-input-filled flex flex-1 items-center py-[10px] text-right text-base font-medium">
                <div className="flex-1 px-[12px]">
                  {monthStr(selectedMonth)}
                </div>
                <div className="text-icon-surface-single-color-primary px-[12px]">
                  <ChevronDown size={16} />
                </div>
              </div>
            </ListboxButton>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ListboxOptions className="border-input-stroke-input bg-input-surface-input-background text-input-text-input-filled shadow-Dropshadow_XS absolute z-10 mt-1 flex w-full flex-col overflow-auto rounded-lg border focus:outline-none">
                {monthOptions.map((month) => (
                  <ListboxOption
                    key={month}
                    value={month}
                    className="hover:bg-input-surface-input-hover cursor-pointer px-[12px] py-[10px] text-base font-medium transition-colors data-selected:bg-orange-50 data-selected:text-orange-900"
                  >
                    {month === "All"
                      ? t("calculator.my_pay_slip.all")
                      : t(`date.month_name.${month.slice(0, 3).toLowerCase()}`)}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Transition>
          </div>
        </Listbox>
      </div>

      {/* Info: (20250722 - Julian) Search bar */}
      <div className="border-input-stroke-input bg-input-surface-input-background flex flex-1 items-center rounded-lg border">
        <div className="text-icon-surface-single-color-primary px-[12px] py-[10px]">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={changeSearchQuery}
          aria-label={t("calculator.my_pay_slip.search_placeholder")}
          placeholder={t("calculator.my_pay_slip.search_placeholder")}
          className="placeholder:text-input-text-input-placeholder flex-1 bg-transparent px-[12px] py-[10px] text-base font-medium outline-none"
        />
      </div>
    </div>
  );
};

interface IMyPaySlipPageBodyProps {
  // Info: (20260831 - Julian) 薪資單頁只存在於帳本版，因此這裡不可為 null（計劃書 §2.4）
  accountBookId: string;
}

const MyPaySlipPageBody: FC<IMyPaySlipPageBodyProps> = ({ accountBookId }) => {
  const { t } = useTranslation();

  // ToDo: (20260225 - Julian) should replace with real data
  const receivedRecords = dummyReceivedData;
  const sentRecords = dummySentData;

  const [currentTab, setCurrentTab] = useState<"received" | "sent">("received");

  // Info: (20250723 - Julian) 查詢條件
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Info: (20250724 - Julian) 排序
  const [receivedPayPeriodSortOrder, setReceivedPayPeriodSortOrder] =
    useState<null | SortOrder>(null);
  const [receivedNetPaySortOrder, setReceivedNetPaySortOrder] =
    useState<null | SortOrder>(null);
  const [sentPayPeriodSortOrder, setSentPayPeriodSortOrder] =
    useState<null | SortOrder>(null);
  const [sentIssuedDateSortOrder, setSentIssuedDateSortOrder] =
    useState<null | SortOrder>(null);

  // Info: (20260225 - Julian) 將排序與搜尋邏輯封裝在 useMemo 中，根據原始資料和排序/搜尋條件直接計算出顯示列表
  const filteredSortedReceived = useMemo(() => {
    let result = [...receivedRecords];

    // Info: (20260225 - Julian) 搜尋與篩選
    if (selectedYear !== "All") {
      result = result.filter(
        (r) => timestampToString(r.payPeriod).year === selectedYear,
      );
    }
    if (selectedMonth !== "All") {
      result = result.filter(
        (r) => timestampToString(r.payPeriod).monthName === selectedMonth,
      );
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.fromEmail.toLowerCase().includes(query));
    }

    // Info: (20260225 - Julian) 排序
    return result.sort((a, b) => {
      if (receivedPayPeriodSortOrder === SortOrder.ASC)
        return a.payPeriod - b.payPeriod;
      if (receivedPayPeriodSortOrder === SortOrder.DESC)
        return b.payPeriod - a.payPeriod;
      if (receivedNetPaySortOrder === SortOrder.ASC) return a.netPay - b.netPay;
      if (receivedNetPaySortOrder === SortOrder.DESC)
        return b.netPay - a.netPay;
      return 0;
    });
  }, [
    receivedRecords,
    receivedPayPeriodSortOrder,
    receivedNetPaySortOrder,
    selectedYear,
    selectedMonth,
    searchQuery,
  ]);

  const filteredSortedSent = useMemo(() => {
    let result = [...sentRecords];

    // Info: (20260225 - Julian) 搜尋與篩選
    if (selectedYear !== "All") {
      result = result.filter(
        (r) => timestampToString(r.payPeriod).year === selectedYear,
      );
    }
    if (selectedMonth !== "All") {
      result = result.filter(
        (r) => timestampToString(r.payPeriod).monthName === selectedMonth,
      );
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.toEmail.toLowerCase().includes(query));
    }

    // Info: (20260225 - Julian) 排序
    return result.sort((a, b) => {
      if (sentPayPeriodSortOrder === SortOrder.ASC)
        return a.payPeriod - b.payPeriod;
      if (sentPayPeriodSortOrder === SortOrder.DESC)
        return b.payPeriod - a.payPeriod;
      if (sentIssuedDateSortOrder === SortOrder.ASC)
        return a.issuedDate - b.issuedDate;
      if (sentIssuedDateSortOrder === SortOrder.DESC)
        return b.issuedDate - a.issuedDate;
      return 0;
    });
  }, [
    sentRecords,
    sentPayPeriodSortOrder,
    sentIssuedDateSortOrder,
    selectedYear,
    selectedMonth,
    searchQuery,
  ]);

  const receivedStyle =
    currentTab === "received"
      ? "border-tabs-stroke-active text-tabs-text-active"
      : "border-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover";
  const sentStyle =
    currentTab === "sent"
      ? "border-tabs-stroke-active text-tabs-text-active"
      : "border-tabs-stroke-default text-tabs-text-default hover:border-tabs-stroke-hover hover:text-tabs-text-hover";

  const clickReceivedTab = () => setCurrentTab("received");
  const clickSentTab = () => setCurrentTab("sent");

  return (
    <SalaryCalculatorShell accountBookId={accountBookId}>
      {/* Info: (20250718 - Julian) Main Content */}
      <div className="flex flex-col items-stretch gap-[56px] px-[240px] py-[56px]">
        <h1 className="text-text-brand-primary-lv1 text-center text-[32px] font-bold">
          {t("calculator.my_pay_slip.main_title")}
        </h1>

        {/* Info: (20250718 - Julian) Tabs */}
        <div className="grid grid-cols-2 gap-[16px]">
          <button
            type="button"
            onClick={clickReceivedTab}
            className={`${receivedStyle} w-full border-b-2 px-[12px] py-[8px]`}
          >
            {t("calculator.my_pay_slip.tab_received")}
          </button>
          <button
            type="button"
            onClick={clickSentTab}
            className={`${sentStyle} w-full border-b-2 px-[12px] py-[8px]`}
          >
            {t("calculator.my_pay_slip.tab_sent")}
          </button>
        </div>

        {/* Info: (20250718 - Julian) List */}
        <div className="flex w-full flex-col gap-[24px]">
          <FilterSection
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          {currentTab === "received" ? (
            <ReceivedTab
              receivedRecords={filteredSortedReceived}
              payPeriodSortOrder={receivedPayPeriodSortOrder}
              setPayPeriodSortOrder={setReceivedPayPeriodSortOrder}
              netPaySortOrder={receivedNetPaySortOrder}
              setNetPaySortOrder={setReceivedNetPaySortOrder}
            />
          ) : (
            <SentTab
              sentRecords={filteredSortedSent}
              payPeriodSortOrder={sentPayPeriodSortOrder}
              setPayPeriodSortOrder={setSentPayPeriodSortOrder}
              issuedDateSortOrder={sentIssuedDateSortOrder}
              setIssuedDateSortOrder={setSentIssuedDateSortOrder}
            />
          )}
        </div>
      </div>
    </SalaryCalculatorShell>
  );
};

export default MyPaySlipPageBody;
