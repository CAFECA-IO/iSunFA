"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { ChevronDown, Search } from "lucide-react";
import CalculatorNavbar from "@/components/salary_calculator/calculator_navbar";
import ReceivedTab from "@/components/salary_calculator/pay_slip_received_tab";
import SentTab from "@/components/salary_calculator/pay_slip_sent_tab";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import useOuterClick from "@/lib/hooks/use_outer_click";
import { dummyReceivedData, dummySentData } from "@/interfaces/pay_slip";
import { SortOrder } from "@/constants/sort";
import { timestampToString } from "@/lib/utils/common";

const FilterSection: React.FC<{
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

  const {
    targetRef: yearRef,
    componentVisible: isShowYear,
    setComponentVisible: setShowYear,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: monthRef,
    componentVisible: isShowMonth,
    setComponentVisible: setShowMonth,
  } = useOuterClick<HTMLDivElement>(false);

  const yearStr =
    selectedYear === yearOptions[0]
      ? t("calculator.my_pay_slip.all")
      : selectedYear;
  const monthStr = t(
    `date:month_name.${selectedMonth.slice(0, 3).toLowerCase()}`,
  );

  const toggleYearDropdown = () => setShowYear((prev) => !prev);
  const toggleMonthDropdown = () => setShowMonth((prev) => !prev);

  const changeSearchQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const yearDropdown = isShowYear && (
    <div className="absolute top-50px flex w-full flex-col rounded-sm border border-input-stroke-input bg-input-surface-input-background text-input-text-input-filled shadow-Dropshadow_XS">
      {yearOptions.map((year, index) => {
        const str = index === 0 ? t("calculator.my_pay_slip.all") : year;
        const clickHandler = () => {
          setSelectedYear(year);
          setShowYear(false);
        };

        return (
          <button
            key={year}
            type="button"
            onClick={clickHandler}
            className="px-12px py-10px hover:bg-input-surface-input-hover"
          >
            {str}
          </button>
        );
      })}
    </div>
  );

  const monthDropdown = isShowMonth && (
    <div className="absolute top-50px flex w-full flex-col rounded-sm border border-input-stroke-input bg-input-surface-input-background text-input-text-input-filled shadow-Dropshadow_XS">
      {monthOptions.map((month) => {
        const clickHandler = () => {
          setSelectedMonth(month);
          setShowMonth(false);
        };
        return (
          <button
            key={month}
            type="button"
            onClick={clickHandler}
            className="px-12px py-10px hover:bg-input-surface-input-hover"
          >
            {t(`date:month_name.${month.slice(0, 3).toLowerCase()}`)}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-2 items-center gap-24px">
      <div className="grid grid-cols-2 items-center gap-12px">
        {/* Info: (20250722 - Julian) Year Selection */}
        <div ref={yearRef} className="relative">
          <div
            onClick={toggleYearDropdown}
            className={`flex items-center divide-x rounded-sm border bg-input-surface-input-background hover:cursor-pointer hover:divide-input-stroke-input-hover hover:border-input-stroke-input-hover ${isShowYear ? "divide-input-stroke-input-hover border-input-stroke-input-hover" : "divide-input-stroke-input border-input-stroke-input"}`}
          >
            <div className="px-12px py-10px text-base font-medium text-input-text-input-placeholder">
              {t("calculator.basic_info_form.year")}
            </div>
            <div className="flex flex-1 items-center py-10px text-right text-base font-medium text-input-text-input-filled">
              <div className="flex-1 px-12px">{yearStr}</div>
              <div className="px-12px text-icon-surface-single-color-primary">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
          {/* Info: (20250722 - Julian) Year Dropdown */}
          {yearDropdown}
        </div>

        {/* Info: (20250722 - Julian) Month Selection */}
        <div ref={monthRef} className="relative">
          <div
            onClick={toggleMonthDropdown}
            className={`flex items-center divide-x rounded-sm border bg-input-surface-input-background hover:cursor-pointer hover:divide-input-stroke-input-hover hover:border-input-stroke-input-hover ${isShowMonth ? "divide-input-stroke-input-hover border-input-stroke-input-hover" : "divide-input-stroke-input border-input-stroke-input"}`}
          >
            <div className="px-12px py-10px text-base font-medium text-input-text-input-placeholder">
              {t("calculator.basic_info_form.month")}
            </div>
            <div className="flex flex-1 items-center py-10px text-right text-base font-medium text-input-text-input-filled">
              <div className="flex-1 px-12px">{monthStr}</div>
              <div className="px-12px text-icon-surface-single-color-primary">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
          {/* Info: (20250722 - Julian) Month Dropdown */}
          {monthDropdown}
        </div>
      </div>

      {/* Info: (20250722 - Julian) Search bar */}
      <div className="flex flex-1 items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
        <div className="px-12px py-10px text-icon-surface-single-color-primary">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={changeSearchQuery}
          placeholder={t("calculator.my_pay_slip.search_placeholder")}
          className="flex-1 bg-transparent px-12px py-10px text-base font-medium outline-none placeholder:text-input-text-input-placeholder"
        />
      </div>
    </div>
  );
};

const MyPaySlipPageBody: React.FC = () => {
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

    // 搜尋與篩選
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

    // 排序
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

    // 搜尋與篩選
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

    // 排序
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
    <main className="min-h-screen overflow-x-hidden bg-white">
      {/* Info: (20250718 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20250718 - Julian) Main Content */}
      <div className="flex flex-col items-stretch gap-56px px-240px py-56px">
        <h1 className="text-center text-32px font-bold text-text-brand-primary-lv1">
          {t("calculator.my_pay_slip.main_title")}
        </h1>

        {/* Info: (20250718 - Julian) Tabs */}
        <div className="grid grid-cols-2 gap-16px">
          <button
            type="button"
            onClick={clickReceivedTab}
            className={`${receivedStyle} w-full border-b-2 px-12px py-8px`}
          >
            {t("calculator.my_pay_slip.tab_received")}
          </button>
          <button
            type="button"
            onClick={clickSentTab}
            className={`${sentStyle} w-full border-b-2 px-12px py-8px`}
          >
            {t("calculator.my_pay_slip.tab_sent")}
          </button>
        </div>

        {/* Info: (20250718 - Julian) List */}
        <div className="flex w-full flex-col gap-24px">
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
    </main>
  );
};

export default MyPaySlipPageBody;
