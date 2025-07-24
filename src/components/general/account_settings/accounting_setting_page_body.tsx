import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';
import { useGlobalCtx } from '@/contexts/global_context';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { FaChevronDown } from 'react-icons/fa6';
import { FiCalendar } from 'react-icons/fi';
import { MdOutlineFileDownload } from 'react-icons/md';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { default30DayPeriodInSec } from '@/constants/display';
import { IDatePeriod } from '@/interfaces/date_period';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import AccountingTitleSettingModal from '@/components/general/account_settings/accounting_title_setting_modal';
import { useCurrencyCtx } from '@/contexts/currency_context';
import CurrencyDropdown from '@/components/dropdown/currency_dropdown';
import { CurrencyType } from '@/constants/currency';

type ITaxTypeForFrontend =
  | number
  | 'zeroTax'
  //  | 'zeroTaxThroughCustoms'
  //  | 'zeroTaxNotThroughCustoms'
  | 'taxFree';

type ITaxPeriod = 'Monthly' | 'Weekly';

enum TaxTypeForFrontend {
  ZERO_TAX = 'zeroTax',
  ZERO_TAX_THROUGH_CUSTOMS = 'zeroTaxThroughCustoms',
  ZERO_TAX_NOT_THROUGH_CUSTOMS = 'zeroTaxNotThroughCustoms',
  TAX_FREE = 'taxFree',
  TAXABLE = 'taxable',
}

enum TaxPeriod {
  MONTH = 'Monthly',
  WEEK = 'Weekly',
}

const AccountingSettingPageBody: React.FC = () => {
  const { t } = useTranslation('common');
  const { refreshCurrency } = useCurrencyCtx();

  const { manualAccountOpeningModalVisibilityHandler } = useGlobalCtx();
  const { toastHandler } = useModalContext();
  const { connectedAccountBook } = useUserCtx();

  const [isAccountingTitleSettingModalVisible, setIsAccountingTitleSettingModalVisible] =
    useState<boolean>(false);

  const openAccountingTitleSettingModal = () => setIsAccountingTitleSettingModalVisible(true);
  const closeAccountingTitleSettingModal = () => setIsAccountingTitleSettingModalVisible(false);

  const accountBookId = connectedAccountBook?.id;

  // Info: (20241113 - Julian) 取得會計設定資料
  const { trigger: getAccountSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET
  );

  const {
    trigger: updateSetting,
    isLoading: isUpdating,
    success: updatedSuccess,
    error: updatedError,
  } = APIHandler<IAccountingSetting>(APIName.ACCOUNTING_SETTING_UPDATE);

  const [accountSettingId, setAccountSettingId] = useState<number>(0);
  // Info: (20241113 - Julian) Form State
  const [currentSalesTax, setCurrentSalesTax] = useState<ITaxTypeForFrontend>(0);
  const [currentPurchaseTax, setCurrentPurchaseTax] = useState<ITaxTypeForFrontend>(0);
  const [currentTaxPeriod, setCurrentTaxPeriod] = useState<ITaxPeriod>(TaxPeriod.MONTH);
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyType | undefined>();
  const [fiscalPeriod, setFiscalPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [reportGenerateDay, setReportGenerateDay] = useState<number>(10);

  // Info: (20250425 - Julian) 儲存變數的當前狀態，以判斷保存按鈕是否禁用
  const [defaultSalesTax, setDefaultSalesTax] = useState<ITaxTypeForFrontend>(0);
  const [defaultPurchaseTax, setDefaultPurchaseTax] = useState<ITaxTypeForFrontend>(0);
  const [defaultTaxPeriod, setDefaultTaxPeriod] = useState<ITaxPeriod>(TaxPeriod.MONTH);
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyType | undefined>();

  const {
    targetRef: salesTaxRef,
    componentVisible: salesTaxVisible,
    setComponentVisible: setSalesTaxVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: purchaseTaxRef,
    componentVisible: purchaseTaxVisible,
    setComponentVisible: setPurchaseTaxVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: periodRef,
    componentVisible: periodVisible,
    setComponentVisible: setPeriodVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250425 - Julian) 判斷保存紐是否禁用: 1. 更新中 2. 用戶沒有修改項目
  const saveDisabled =
    isUpdating ||
    (currentSalesTax === defaultSalesTax &&
      currentPurchaseTax === defaultPurchaseTax &&
      currentTaxPeriod === defaultTaxPeriod &&
      currentCurrency === defaultCurrency);

  const toggleSalesTaxMenu = () => setSalesTaxVisible(!salesTaxVisible);
  const togglePurchaseTaxMenu = () => setPurchaseTaxVisible(!purchaseTaxVisible);
  const togglePeriodMenu = () => setPeriodVisible(!periodVisible);

  // Info: (20250520 - Julian) call API after get connectedAccountBook
  const getAccountData = useCallback(async () => {
    if (accountBookId) {
      // Info: (20250425 - Julian) GET API
      const { data, success } = await getAccountSetting({ params: { accountBookId } });

      // Info: (20250425 - Julian) 將 API 回傳的資料設置到狀態中
      if (success && data) {
        const { salesTax, purchaseTax, returnPeriodicity } = data.taxSettings;

        const salesTaxRate = salesTax.taxable
          ? salesTax.rate === 0 // Info: (20250425 - Julian) 若稅率為 0，則為「零稅率」
            ? TaxTypeForFrontend.ZERO_TAX
            : salesTax.rate
          : TaxTypeForFrontend.TAX_FREE; // Info: (20250425 - Julian) 若 taxable 為 false，則為「免稅」

        const purchaseTaxRate = purchaseTax.taxable
          ? purchaseTax.rate === 0 // Info: (20250425 - Julian) 若稅率為 0，則為「零稅率」
            ? TaxTypeForFrontend.ZERO_TAX
            : purchaseTax.rate
          : TaxTypeForFrontend.TAX_FREE; // Info: (20250425 - Julian) 若 taxable 為 false，則為「免稅」

        setAccountSettingId(data.id); // Info: (20250425 - Julian) 取得會計 ID
        setCurrentSalesTax(salesTaxRate);
        setCurrentPurchaseTax(purchaseTaxRate);
        setCurrentTaxPeriod(returnPeriodicity as ITaxPeriod);
        setCurrentCurrency(data.currency);
      }
    }
  }, [connectedAccountBook]);

  const handleReportGenerateDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value < 1) {
      setReportGenerateDay(1);
    } else if (value > 31) {
      setReportGenerateDay(31);
    } else {
      setReportGenerateDay(value);
    }
  };

  // Info: (20241106 - Julian) 如果輸入的值不是數字，則在聚焦離開時將值設為 10
  const handleReportGenerateDayBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (Number.isNaN(value)) {
      setReportGenerateDay(10);
    }
  };

  const saveClickHandler = async () => {
    const salesTaxRate = typeof currentSalesTax === 'number' ? currentSalesTax : 0;
    const purchaseTaxRate = typeof currentPurchaseTax === 'number' ? currentPurchaseTax : 0;

    // Info: (20250425 - Julian) 儲存變數的當前狀態
    setDefaultSalesTax(currentSalesTax);
    setDefaultPurchaseTax(currentPurchaseTax);
    setDefaultTaxPeriod(currentTaxPeriod);
    setDefaultCurrency(currentCurrency);

    const body = {
      id: accountSettingId,
      companyId: accountBookId,
      currency: currentCurrency,
      taxSettings: {
        salesTax: {
          taxable: currentSalesTax !== 'taxFree',
          rate: salesTaxRate,
        },
        purchaseTax: {
          taxable: currentPurchaseTax !== 'taxFree',
          rate: purchaseTaxRate,
        },
        returnPeriodicity: currentTaxPeriod,
      },
      shortcutList: [], // ToDo: (20250109 - Julian) 自訂快捷鍵功能未實作
    };

    updateSetting({ params: { accountBookId }, body });
  };

  // Info: (20250425 - Julian) 取得會計設定資料
  useEffect(() => {
    getAccountData();
  }, [getAccountData]);

  // Info: (20250425 - Julian) 更新資料
  useEffect(() => {
    if (!isUpdating) {
      // Info: (20241114 - Julian) 更新成功顯示 Toast，並重新取得 Accounting setting 資料
      if (updatedSuccess) {
        toastHandler({
          id: ToastId.ACCOUNTING_SETTING_UPDATE_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('settings:ACCOUNTING.TOAST_UPDATE_SUCCESS'),
          closeable: true,
        });

        getAccountData();
        refreshCurrency(); // Info: (20250606 - Anna) 同步更新 currency_context 的資料
        // ToDo: (20250211 - Liz) 因應設計稿修改將公司改為帳本，後端 API 也需要將 companyId 修改成 accountBookId
      } else if (updatedError) {
        // Info: (20241114 - Julian) 更新失敗顯示 Toast
        toastHandler({
          id: ToastId.ACCOUNTING_SETTING_UPDATE_ERROR,
          type: ToastType.ERROR,
          content: t('settings:ACCOUNTING.TOAST_UPDATE_FAIL'),
          closeable: true,
        });
      }
    }
  }, [updatedSuccess, isUpdating, updatedError]);

  // Info: (20241113 - Julian) 文字顯示設定
  const showTaxStr = (taxRate: ITaxTypeForFrontend) => {
    // Info: (20250520 - Julian) 轉換稅率為百分比字串
    const taxStr = typeof taxRate === 'number' ? taxRate * 100 : taxRate.toString();

    switch (taxRate) {
      case TaxTypeForFrontend.ZERO_TAX:
        return (
          <div className="flex flex-1 items-center justify-between">
            <p className="text-input-text-input-filled">
              {t('settings:ACCOUNTING.TAX_OPTION_ZERO_TAX_RATE')}
            </p>
            <p className="text-input-text-input-placeholder">0%</p>
          </div>
        );
      // ToDo: (20241113 - Julian) 未來有需要再開啟
      // case 'zeroTaxThroughCustoms':
      //   return (
      //     <div className="flex flex-1 items-center justify-between">
      //       <p className="text-input-text-input-filled">Zero-tax-rate (Through customs)</p>
      //       <p className="text-input-text-input-placeholder">0%</p>
      //     </div>
      //   );
      // case 'zeroTaxNotThroughCustoms':
      //   return (
      //     <div className="flex flex-1 items-center justify-between">
      //       <p className="text-input-text-input-filled">Zero-tax-rate (Not through customs)</p>
      //       <p className="text-input-text-input-placeholder">0%</p>
      //     </div>
      //   );
      case TaxTypeForFrontend.TAX_FREE:
        return (
          <p className="flex-1 text-input-text-input-filled">
            {t('settings:ACCOUNTING.TAX_OPTION_TAX_FREE')}
          </p>
        );
      default:
        return (
          <div className="flex flex-1 items-center justify-between">
            <p className="text-input-text-input-filled">
              {t('settings:ACCOUNTING.TAX_OPTION_TAXABLE')}
            </p>
            <p className="text-input-text-input-placeholder">{taxStr}%</p>
          </div>
        );
    }
  };

  // Info: (20241113 - Julian) 稅率的下拉選單內容
  const getTaxDropdown = (
    dropdownVisible: boolean,
    setTaxState: React.Dispatch<React.SetStateAction<ITaxTypeForFrontend>>
  ) => {
    const fivePercentClickHandler = () => setTaxState(0.05);
    const zeroTaxClickHandler = () => setTaxState('zeroTax');
    //  const zeroTaxThroughCustomsClickHandler = () => setTaxState('zeroTaxThroughCustoms');
    //  const zeroTaxNotThroughCustomsClickHandler = () => setTaxState('zeroTaxNotThroughCustoms');
    const taxFreeClickHandler = () => setTaxState('taxFree');

    return (
      <div
        className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${
          dropdownVisible ? 'grid-rows-1 shadow-dropmenu' : 'grid-rows-0'
        } overflow-hidden bg-dropdown-surface-menu-background-primary transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col rounded-sm border border-dropdown-stroke-menu p-8px">
          {/* Info: (20241113 - Julian) 5% */}
          <button
            type="button"
            onClick={fivePercentClickHandler}
            className="flex items-center gap-12px px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <p className="text-dropdown-text-primary">
              {t('settings:ACCOUNTING.TAX_OPTION_TAXABLE')}
            </p>
            <p className="text-dropdown-text-secondary">5%</p>
          </button>
          {/* Info: (20241113 - Julian) 0% */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={zeroTaxClickHandler}
              className="flex flex-1 items-center gap-12px px-12px py-8px hover:bg-dropdown-surface-item-hover"
            >
              <p className="text-dropdown-text-primary">
                {t('settings:ACCOUNTING.TAX_OPTION_ZERO_TAX_RATE')}
              </p>
              <p className="text-dropdown-text-secondary">0%</p>
            </button>
            {/* Info: (20241113 - Julian) 子項目 */}
            {/* ToDo: (20241113 - Julian) 未來有需要再開啟 */}
            <div className="hidden flex-col px-12px">
              <button
                type="button"
                //  onClick={zeroTaxClickHandler}
                className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
              >
                <p className="text-dropdown-text-primary">None</p>
              </button>
              <button
                type="button"
                //  onClick={zeroTaxThroughCustomsClickHandler}
                className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
              >
                <p className="text-dropdown-text-primary">Through Customs</p>
              </button>
              <button
                type="button"
                //  onClick={zeroTaxNotThroughCustomsClickHandler}
                className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
              >
                <p className="text-dropdown-text-primary">Not Trough Customs</p>
              </button>
            </div>
          </div>
          {/* Info: (20241113 - Julian) 免稅 */}
          <button
            type="button"
            onClick={taxFreeClickHandler}
            className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <p className="text-dropdown-text-primary">
              {t('settings:ACCOUNTING.TAX_OPTION_TAX_FREE')}
            </p>
          </button>
        </div>
      </div>
    );
  };

  const salesTaxDropdown = getTaxDropdown(salesTaxVisible, setCurrentSalesTax);
  const purchaseTaxDropdown = getTaxDropdown(purchaseTaxVisible, setCurrentPurchaseTax);

  // Info: (20241113 - Julian) 會計期間的下拉選單內容
  const periodDropdown = (
    <div
      className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${
        periodVisible
          ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
          : 'grid-rows-0 border-transparent'
      } overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col rounded-sm border border-input-stroke-input bg-input-surface-input-background p-8px">
        <div className="flex flex-col gap-8px">
          {Object.values(TaxPeriod).map((period) => {
            const periodClickHandler = () => setCurrentTaxPeriod(period as ITaxPeriod);
            return (
              <button
                key={period}
                type="button"
                onClick={periodClickHandler}
                className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
              >
                <p className="text-dropdown-text-primary">
                  {t(`settings:ACCOUNTING.${period.toUpperCase()}`)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-40px tablet:p-40px">
      <div className="block w-full text-left text-base font-bold text-text-neutral-secondary tablet:hidden">
        {t('settings:ACCOUNTING.TITLE')}
      </div>
      {/* Info: (20241106 - Julian) ===== 稅務設定 ===== */}
      <div className="flex w-full flex-col gap-40px">
        {/* Info: (20241106 - Julian) ===== 稅務設定標題 ===== */}
        <div className="flex items-center gap-lv-4">
          <div className="flex items-center gap-lv-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/money.svg" width={16} height={16} alt="money_icon" />
            <p>{t('settings:ACCOUNTING.TAX_SETTING_TITLE')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-4" />
        </div>
        {/* Info: (20241106 - Julian) ===== 稅務設定內容 ===== */}
        <div className="grid grid-cols-1 gap-x-40px gap-y-24px tablet:grid-cols-2">
          {/* Info: (20241106 - Julian) ===== 銷售稅 ===== */}
          <div ref={salesTaxRef} className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">{t('settings:ACCOUNTING.TAX_SALES')}</p>
            {/* Info: (20241106 - Julian) ===== 銷售稅下拉選單 ===== */}
            <div
              onClick={toggleSalesTaxMenu}
              className="relative flex items-center gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px font-medium hover:cursor-pointer"
            >
              {showTaxStr(currentSalesTax)}
              <div
                className={`text-icon-surface-single-color-primary ${salesTaxVisible ? 'rotate-180' : 'rotate-0'}`}
              >
                <FaChevronDown />
              </div>
              {/* Info: (20241113 - Julian) ===== 銷售稅下拉選單內容 ===== */}
              {salesTaxDropdown}
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 消費稅 ===== */}
          <div ref={purchaseTaxRef} className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">
              {t('settings:ACCOUNTING.TAX_PURCHASE')}
            </p>
            {/* Info: (20241106 - Julian) ===== 消費稅下拉選單 ===== */}
            <div
              onClick={togglePurchaseTaxMenu}
              className="relative flex items-center gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px font-medium hover:cursor-pointer"
            >
              {showTaxStr(currentPurchaseTax)}
              <div
                className={`text-icon-surface-single-color-primary ${purchaseTaxVisible ? 'rotate-180' : 'rotate-0'}`}
              >
                <FaChevronDown />
              </div>
              {/* Info: (20241113 - Julian) ===== 消費稅下拉選單內容 ===== */}
              {purchaseTaxDropdown}
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 稅務申報週期 ===== */}
          <div ref={periodRef} className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">
              {t('settings:ACCOUNTING.TAX_RETURN_PERIODICITY')}
            </p>
            {/* Info: (20241106 - Julian) ===== 稅務申報週期下拉選單 ===== */}
            <div className="relative flex items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
              <div className="px-12px py-10px text-input-text-input-placeholder">
                {t('settings:ACCOUNTING.EVERY')}
              </div>
              <div
                onClick={togglePeriodMenu}
                className="flex flex-1 items-center justify-between px-12px py-10px font-medium hover:cursor-pointer"
              >
                <p className="text-input-text-input-filled">
                  {t(`settings:ACCOUNTING.${currentTaxPeriod.toUpperCase()}`)}
                </p>
                <div
                  className={`text-icon-surface-single-color-primary ${periodVisible ? 'rotate-180' : 'rotate-0'}`}
                >
                  <FaChevronDown />
                </div>
                {periodDropdown}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20241106 - Julian) ===== 貨幣設定 ===== */}
      <div className="flex w-full flex-col gap-40px">
        {/* Info: (20241106 - Julian) ===== 貨幣設定標題 ===== */}
        <div className="flex items-center gap-lv-4">
          <div className="flex items-center gap-lv-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/coin.svg" width={16} height={16} alt="coin_icon" />
            <p>{t('settings:ACCOUNTING.CURRENCY_SETTING_TITLE')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-4" />
        </div>

        <div className="grid grid-cols-1 gap-x-40px gap-y-24px tablet:grid-cols-2">
          {/* Info: (20241106 - Julian) ===== 貨幣下拉選單 ===== */}
          <div>
            <CurrencyDropdown
              currentCurrency={currentCurrency}
              setCurrentCurrency={setCurrentCurrency}
            />
          </div>
        </div>
      </div>

      {/* Info: (20241106 - Julian) ===== 會計設定 ===== */}
      <div className="flex w-full flex-col gap-40px">
        {/* Info: (20241106 - Julian) ===== 會計設定標題 ===== */}
        <div className="flex items-center gap-lv-4">
          <div className="flex items-center gap-lv-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/division_sign.svg" width={16} height={16} alt="division_sign" />
            <p>{t('settings:ACCOUNTING.ACCOUNTING_SETTING_TITLE')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-4" />
        </div>
        {/* Info: (20241106 - Julian) ===== 會計設定內容 ===== */}
        <div className="flex flex-col gap-40px">
          {/* Info: (20241106 - Julian) ===== 期間設定子標題 ===== */}
          {/* TODO: (20241106 - Julian) 須確認是否保留 */}
          <div className="hidden items-center gap-10px text-sm font-semibold text-text-neutral-primary">
            <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
            <p>{t('settings:ACCOUNTING.PERIOD_SETTINGS_SUBTITLE')}</p>
          </div>
          <div className="hidden w-full items-start gap-40px">
            {/* Info: (20241106 - Julian) ===== 會計年度 ===== */}
            <div className="flex flex-col gap-10px">
              <p className="text-sm text-input-text-primary">
                {t('settings:ACCOUNTING.FISCAL_YEAR')}
              </p>
              {/* Info: (20241106 - Julian) ===== 會計年度下拉選單 ===== */}
              <div className="flex w-140px items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
                <div className="px-12px py-10px text-icon-surface-single-color-primary">
                  <FiCalendar />
                </div>
                <div className="flex flex-1 items-center justify-between px-12px py-10px">
                  <p className="text-input-text-input-filled">2024</p>
                  <div className="text-icon-surface-single-color-primary">
                    <FaChevronDown />
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20241106 - Julian) ===== 會計期間 ===== */}
            <div className="flex flex-1 flex-col gap-16px">
              {/* Info: (20241106 - Julian) ===== 會計期間選擇 ===== */}
              <div className="flex w-4/5 flex-col gap-10px">
                <p className="text-sm text-input-text-primary">
                  {t('settings:ACCOUNTING.FISCAL_YEAR_PERIOD')}
                </p>
                <div className="w-full">
                  <DatePicker
                    type={DatePickerType.TEXT_PERIOD}
                    period={fiscalPeriod}
                    setFilteredPeriod={setFiscalPeriod}
                  />
                </div>
              </div>
              {/* Info: (20241106 - Julian) ===== 年度報告 ===== */}
              <div className="flex w-4/5 items-center justify-between">
                {/* Info: (20241106 - Julian) ===== 年度報告設定 ===== */}
                <div className="flex items-center gap-10px whitespace-nowrap text-sm font-semibold text-text-neutral-primary">
                  <p>{t('settings:ACCOUNTING.GENERATE_REPORT_1')}</p>
                  <input
                    type="number"
                    value={reportGenerateDay}
                    onChange={handleReportGenerateDayChange}
                    onBlur={handleReportGenerateDayBlur}
                    onWheel={(e) => e.currentTarget.blur()} // Info: (20241106 - Julian) 防止滾輪滾動
                    className={`h-44px w-80px rounded-xs border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none transition-all duration-300 ease-in-out disabled:bg-input-surface-input-disable disabled:text-input-text-disable`}
                  />
                  <p>{t('settings:ACCOUNTING.GENERATE_REPORT_2')}</p>
                </div>
                {/* Info: (20241106 - Julian) ===== 年度報告下載 ===== */}
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-4px text-sm text-link-text-primary disabled:text-text-neutral-mute"
                >
                  <MdOutlineFileDownload size={16} /> {t('settings:ACCOUNTING.DOWNLOAD_REPORT')}
                </button>
              </div>
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 會計科目子標題 ===== */}
          <div className="flex items-center gap-10px text-sm font-semibold text-text-neutral-primary">
            <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
            <p>{t('settings:ACCOUNTING.ACCOUNTING_TITLE_SETTINGS_SUBTITLE')}</p>
          </div>
          <div className="flex flex-col gap-24px">
            {/* Info: (20241106 - Julian) ===== 查看所有會計科目 ===== */}
            <div className="flex w-full items-center gap-16px">
              <Image
                src="/icons/accounting_title.svg"
                width={16}
                height={16}
                alt="accounting_title_icon"
              />
              <button
                type="button"
                className="flex items-center gap-4px text-sm text-link-text-primary disabled:text-text-neutral-mute"
                onClick={openAccountingTitleSettingModal}
              >
                {t('settings:ACCOUNTING.VIEW_ALL_ACCOUNTING')}
              </button>
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 導入會計科目子標題 ===== */}
          <div className="flex items-center gap-10px text-sm font-semibold text-text-neutral-primary">
            <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
            <p>{t('settings:ACCOUNTING.ACCOUNTING_IMPORT_SUBTITLE')}</p>
          </div>
          <div className="flex flex-col gap-24px">
            {/* Info: (20241106 - Julian) ===== 上傳檔案 ===== */}
            <div className="flex w-full items-center gap-16px">
              <Image src="/icons/paper_clip.svg" width={16} height={16} alt="paper_clip_icon" />
              <button
                type="button"
                disabled
                className="flex items-center gap-4px text-sm text-link-text-primary disabled:text-text-neutral-mute"
              >
                {t('settings:ACCOUNTING.IMPORT_FILE')}
              </button>
            </div>
            {/* Info: (20241106 - Julian) ===== 手動開帳 ===== */}
            <div className="flex w-full items-center gap-16px">
              <Image
                src="/icons/account_opening.svg"
                width={16}
                height={16}
                alt="account_opening_icon"
              />
              <button
                type="button"
                onClick={manualAccountOpeningModalVisibilityHandler}
                className="flex items-center gap-4px text-sm text-link-text-primary disabled:text-text-neutral-mute"
              >
                {t('settings:ACCOUNTING.MANUAL_ACCOUNT_OPENING')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20241106 - Julian) ===== 儲存按鈕 ===== */}
      <div className="order-4 ml-auto flex items-center">
        <Button type="button" variant="tertiary" disabled={saveDisabled} onClick={saveClickHandler}>
          {t('settings:ACCOUNTING.SAVE_BTN')}
        </Button>
      </div>

      {/* Info: (20250519 - Liz) 會計科目設定 Modal */}
      {isAccountingTitleSettingModalVisible && (
        <AccountingTitleSettingModal
          isModalVisible={isAccountingTitleSettingModalVisible}
          modalVisibilityHandler={closeAccountingTitleSettingModal}
        />
      )}
    </div>
  );
};

export default AccountingSettingPageBody;
