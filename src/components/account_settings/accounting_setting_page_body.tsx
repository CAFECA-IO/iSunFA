import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';
import { useGlobalCtx } from '@/contexts/global_context';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { FaChevronDown } from 'react-icons/fa6';
import { FiCalendar } from 'react-icons/fi';
import { MdOutlineFileDownload } from 'react-icons/md';
import { RxTriangleDown } from 'react-icons/rx';
import { Button } from '@/components/button/button';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { default30DayPeriodInSec } from '@/constants/display';
import { IDatePeriod } from '@/interfaces/date_period';
import { APIName } from '@/constants/api_connection';
import { FREE_COMPANY_ID } from '@/constants/config';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { ToastType } from '@/interfaces/toastify';

type ITaxType =
  | number
  | 'zeroTax'
  | 'zeroTaxThroughCustoms'
  | 'zeroTaxNotThroughCustoms'
  | 'taxFree';

type ITaxPeriod = 'Month' | 'Week';

enum TaxPeriod {
  Month = 'Month',
  Week = 'Week',
}

interface ICurrency {
  countryName: string;
  currencyName: string;
  iconSrc: string;
}

const dummyCurrencies: ICurrency[] = [
  {
    countryName: 'United States',
    currencyName: 'USD',
    iconSrc: '/icons/us.svg',
  },
  {
    countryName: 'Taiwan',
    currencyName: 'TWD',
    iconSrc: '/icons/tw.svg',
  },
  {
    countryName: 'Eurozone',
    currencyName: 'EUR',
    iconSrc: '/icons/eu.svg',
  },
];

const AccountingSettingPageBody: React.FC = () => {
  const { t } = useTranslation('common');

  const {
    accountingTitleSettingModalVisibilityHandler,
    manualAccountOpeningModalVisibilityHandler,
  } = useGlobalCtx();
  const { toastHandler } = useModalContext();
  const { selectedCompany } = useUserCtx();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;

  // Info: (20241113 - Julian) 取得會計設定資料
  const { trigger: getAccountSetting, data: accountingSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET,
    {
      params: { companyId },
    },
    true
  );

  const {
    trigger: updateSetting,
    data: updatedSettingData,
    isLoading: isUpdating,
  } = APIHandler<IAccountingSetting>(APIName.ACCOUNTING_SETTING_UPDATE, {
    params: { companyId },
  });

  const initialAccountingSetting: IAccountingSetting = {
    id: 0,
    companyId: 0,
    currency: 'USD',
    taxSettings: {
      salesTax: {
        taxable: true,
        rate: 5,
      },
      purchaseTax: {
        taxable: true,
        rate: 5,
      },
      returnPeriodicity: TaxPeriod.Month,
    },
    shortcutList: [],
  };

  const {
    taxSettings: {
      salesTax: initialSalesTax,
      purchaseTax: initialPurchaseTax,
      returnPeriodicity: initialTaxPeriod,
    },
    currency: initialCurrency,
  } = accountingSetting ?? initialAccountingSetting;

  // Info: (20241113 - Julian) Transfer API data to frontend data
  const defaultSalesTax = initialSalesTax.taxable
    ? initialSalesTax.rate !== 0
      ? initialSalesTax.rate
      : 'zeroTax'
    : 'taxFree';

  const defaultPurchaseTax = initialPurchaseTax.taxable
    ? initialPurchaseTax.rate !== 0
      ? initialPurchaseTax.rate
      : 'zeroTax'
    : 'taxFree';

  const defaultCurrency =
    dummyCurrencies.find((currency) => currency.currencyName === initialCurrency) ??
    dummyCurrencies[0];

  // Info: (20241113 - Julian) Form State
  const [currentSalesTax, setCurrentSalesTax] = useState<ITaxType>(defaultSalesTax);
  const [currentPurchaseTax, setCurrentPurchaseTax] = useState<ITaxType>(defaultPurchaseTax);
  const [currentTaxPeriod, setCurrentTaxPeriod] = useState<ITaxPeriod>(
    initialTaxPeriod as ITaxPeriod
  );
  const [currentCurrency, setCurrentCurrency] = useState<ICurrency>(defaultCurrency);
  const [fiscalPeriod, setFiscalPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [reportGenerateDay, setReportGenerateDay] = useState<number>(10);

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

  const {
    targetRef: currencyMenuRef,
    componentVisible: currencyMenuVisible,
    setComponentVisible: setCurrencyMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleSalesTaxMenu = () => setSalesTaxVisible(!salesTaxVisible);
  const togglePurchaseTaxMenu = () => setPurchaseTaxVisible(!purchaseTaxVisible);
  const togglePeriodMenu = () => setPeriodVisible(!periodVisible);
  const toggleCurrencyMenu = () => setCurrencyMenuVisible(!currencyMenuVisible);

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

    const body: IAccountingSetting = {
      id: accountingSetting?.id ?? 0,
      companyId,
      currency: currentCurrency.currencyName,
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
      shortcutList: [],
    };

    updateSetting({
      params: { companyId },
      query: { body },
    });
  };

  useEffect(() => {
    if (updatedSettingData) {
      toastHandler({
        id: 'accounting-setting-updated',
        type: ToastType.SUCCESS,
        content: 'Accounting setting updated successfully!',
        closeable: true,
      });

      getAccountSetting({ params: { companyId } });
    }
  }, [updatedSettingData, isUpdating]);

  // Info: (20241113 - Julian) 文字顯示設定
  const showTaxStr = (taxRate: ITaxType) => {
    switch (taxRate) {
      case 'zeroTax':
        return (
          <div className="flex flex-1 items-center justify-between">
            <p className="text-input-text-input-filled">Zero-tax-rate (None)</p>
            <p className="text-input-text-input-placeholder">0%</p>
          </div>
        );
      case 'zeroTaxThroughCustoms':
        return (
          <div className="flex flex-1 items-center justify-between">
            <p className="text-input-text-input-filled">Zero-tax-rate (Through customs)</p>
            <p className="text-input-text-input-placeholder">0%</p>
          </div>
        );
      case 'zeroTaxNotThroughCustoms':
        return (
          <div className="flex flex-1 items-center justify-between">
            <p className="text-input-text-input-filled">Zero-tax-rate (Not through customs)</p>
            <p className="text-input-text-input-placeholder">0%</p>
          </div>
        );
      case 'taxFree':
        return <p className="flex-1 text-input-text-input-filled">Tax-Free</p>;
      default:
        return (
          <div className="flex flex-1 items-center justify-between">
            <p className="text-input-text-input-filled">Taxable</p>
            <p className="text-input-text-input-placeholder">{taxRate}%</p>
          </div>
        );
    }
  };

  // Info: (20241113 - Julian) 稅率的下拉選單內容
  const getTaxDropdown = (
    dropdownRef: React.RefObject<HTMLDivElement>,
    dropdownVisible: boolean,
    setTaxState: React.Dispatch<React.SetStateAction<ITaxType>>
  ) => {
    const fivePercentClickHandler = () => setTaxState(5);
    const zeroTaxClickHandler = () => setTaxState('zeroTax');
    const zeroTaxThroughCustomsClickHandler = () => setTaxState('zeroTaxThroughCustoms');
    const zeroTaxNotThroughCustomsClickHandler = () => setTaxState('zeroTaxNotThroughCustoms');
    const taxFreeClickHandler = () => setTaxState('taxFree');

    return (
      <div
        ref={dropdownRef}
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
            <p className="text-dropdown-text-primary">Taxable</p>
            <p className="text-dropdown-text-secondary">5%</p>
          </button>
          {/* Info: (20241113 - Julian) 0% */}
          <div className="flex flex-col">
            <div className="flex flex-1 items-center gap-12px px-12px py-8px">
              <p className="text-dropdown-text-primary">Zero-tax-rate</p>
              <p className="text-dropdown-text-secondary">0%</p>
              <RxTriangleDown />
            </div>
            {/* Info: (20241113 - Julian) 子項目 */}
            <div className="flex flex-col px-12px">
              <button
                type="button"
                onClick={zeroTaxClickHandler}
                className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
              >
                <p className="text-dropdown-text-primary">None</p>
              </button>
              <button
                type="button"
                onClick={zeroTaxThroughCustomsClickHandler}
                className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
              >
                <p className="text-dropdown-text-primary">Through Customs</p>
              </button>
              <button
                type="button"
                onClick={zeroTaxNotThroughCustomsClickHandler}
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
            <p className="text-dropdown-text-primary">Tax-Free</p>
          </button>
        </div>
      </div>
    );
  };

  const salesTaxDropdown = getTaxDropdown(salesTaxRef, salesTaxVisible, setCurrentSalesTax);
  const purchaseTaxDropdown = getTaxDropdown(
    purchaseTaxRef,
    purchaseTaxVisible,
    setCurrentPurchaseTax
  );

  // Info: (20241113 - Julian) 會計期間的下拉選單內容
  const periodDropdown = (
    <div
      ref={periodRef}
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
                type="button"
                onClick={periodClickHandler}
                className="flex items-center px-12px py-8px hover:bg-dropdown-surface-item-hover"
              >
                <p className="text-dropdown-text-primary">{period}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Info: (20241113 - Julian) 貨幣的下拉選單內容
  const currencyDropdown = (
    <div
      ref={currencyMenuRef}
      className={`absolute top-50px grid w-full rounded-sm ${
        currencyMenuVisible
          ? 'grid-rows-1 border-dropdown-stroke-menu shadow-dropmenu'
          : 'grid-rows-0 border-transparent'
      } overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col rounded-sm border border-input-stroke-input bg-input-surface-input-background p-8px">
        {dummyCurrencies.map((currency) => {
          const countryClickHandler = () => {
            setCurrentCurrency(currency);
            setCurrencyMenuVisible(false);
          };
          return (
            <div
              key={currency.countryName}
              onClick={countryClickHandler}
              className="flex items-center gap-12px px-12px py-8px text-dropdown-text-primary hover:cursor-pointer hover:bg-dropdown-surface-item-hover"
            >
              <Image src={currency.iconSrc} width={16} height={16} alt="currency_icon" />
              <p>{currency.currencyName}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-40px p-40px">
      {/* Info: (20241106 - Julian) ===== 稅務設定 ===== */}
      <div className="flex w-full flex-col gap-40px">
        {/* Info: (20241106 - Julian) ===== 稅務設定標題 ===== */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/money.svg" width={16} height={16} alt="money_icon" />
            <p>{t('setting:ACCOUNTING.TAX_SETTING_TITLE')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-1" />
        </div>
        {/* Info: (20241106 - Julian) ===== 稅務設定內容 ===== */}
        <div className="grid grid-cols-2 gap-x-40px gap-y-24px">
          {/* Info: (20241106 - Julian) ===== 銷售稅 ===== */}
          <div className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">{t('setting:ACCOUNTING.TAX_SALES')}</p>
            {/* Info: (20241106 - Julian) ===== 銷售稅下拉選單 ===== */}
            <div
              onClick={toggleSalesTaxMenu}
              className="relative flex items-center gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px font-medium hover:cursor-pointer"
            >
              {showTaxStr(currentSalesTax)}
              <div className="text-icon-surface-single-color-primary">
                <FaChevronDown />
              </div>
              {/* Info: (20241113 - Julian) ===== 銷售稅下拉選單內容 ===== */}
              {salesTaxDropdown}
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 消費稅 ===== */}
          <div className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">
              {t('setting:ACCOUNTING.TAX_PURCHASE')}
            </p>
            {/* Info: (20241106 - Julian) ===== 消費稅下拉選單 ===== */}
            <div
              onClick={togglePurchaseTaxMenu}
              className="relative flex items-center gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px font-medium hover:cursor-pointer"
            >
              {showTaxStr(currentPurchaseTax)}
              <div className="text-icon-surface-single-color-primary">
                <FaChevronDown />
              </div>
              {/* Info: (20241113 - Julian) ===== 消費稅下拉選單內容 ===== */}
              {purchaseTaxDropdown}
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 稅務申報週期 ===== */}
          <div className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">
              {t('setting:ACCOUNTING.TAX_RETURN_PERIODICITY')}
            </p>
            {/* Info: (20241106 - Julian) ===== 稅務申報週期下拉選單 ===== */}
            <div className="relative flex items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
              <div className="px-12px py-10px text-input-text-input-placeholder">
                {t('common:DATE_PICKER.EVERY')}
              </div>
              <div
                onClick={togglePeriodMenu}
                className="flex flex-1 items-center justify-between px-12px py-10px font-medium hover:cursor-pointer"
              >
                <p className="text-input-text-input-filled">{currentTaxPeriod}</p>
                <div className="text-icon-surface-single-color-primary">
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/coin.svg" width={16} height={16} alt="coin_icon" />
            <p>{t('setting:ACCOUNTING.CURRENCY_SETTING_TITLE')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-1" />
        </div>
        <div className="grid grid-cols-2">
          {/* Info: (20241106 - Julian) ===== 貨幣下拉選單 ===== */}
          <div
            onClick={toggleCurrencyMenu}
            className="relative flex items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background hover:cursor-pointer"
          >
            <div className="px-12px py-10px">
              <Image width={16} height={16} alt="currency_icon" src={currentCurrency.iconSrc} />
            </div>
            <div className="flex flex-1 items-center justify-between px-12px py-10px">
              <p className="text-input-text-input-filled">{currentCurrency.currencyName}</p>
              <div className="text-icon-surface-single-color-primary">
                <FaChevronDown />
              </div>
            </div>
            {currencyDropdown}
          </div>
        </div>
      </div>

      {/* Info: (20241106 - Julian) ===== 會計設定 ===== */}
      <div className="flex w-full flex-col gap-40px">
        {/* Info: (20241106 - Julian) ===== 會計設定標題 ===== */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
            <Image src="/icons/division_sign.svg" width={16} height={16} alt="division_sign" />
            <p>{t('setting:ACCOUNTING.ACCOUNTING_SETTING_TITLE')}</p>
          </div>
          <hr className="flex-1 border-divider-stroke-lv-1" />
        </div>
        {/* Info: (20241106 - Julian) ===== 會計設定內容 ===== */}
        <div className="flex flex-col gap-40px">
          {/* Info: (20241106 - Julian) ===== 期間設定子標題 ===== */}
          {/* TODO: (20241106 - Julian) 須確認是否保留 */}
          <div className="hidden items-center gap-10px text-sm font-semibold text-text-neutral-primary">
            <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
            <p>{t('setting:ACCOUNTING.PERIOD_SETTINGS_SUBTITLE')}</p>
          </div>
          <div className="hidden w-full items-start gap-40px">
            {/* Info: (20241106 - Julian) ===== 會計年度 ===== */}
            <div className="flex flex-col gap-10px">
              <p className="text-sm text-input-text-primary">
                {t('setting:ACCOUNTING.FISCAL_YEAR')}
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
                  {t('setting:ACCOUNTING.FISCAL_YEAR_PERIOD')}
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
                  <p>{t('setting:ACCOUNTING.GENERATE_REPORT_1')}</p>
                  <input
                    type="number"
                    value={reportGenerateDay}
                    onChange={handleReportGenerateDayChange}
                    onBlur={handleReportGenerateDayBlur}
                    onWheel={(e) => e.currentTarget.blur()} // Info: (20241106 - Julian) 防止滾輪滾動
                    className={`h-44px w-80px rounded-xs border border-input-stroke-input bg-input-surface-input-background p-10px text-input-text-input-filled outline-none transition-all duration-300 ease-in-out disabled:bg-input-surface-input-disable disabled:text-input-text-disable`}
                  />
                  <p>{t('setting:ACCOUNTING.GENERATE_REPORT_2')}</p>
                </div>
                {/* Info: (20241106 - Julian) ===== 年度報告下載 ===== */}
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-4px text-sm text-link-text-primary disabled:text-text-neutral-mute"
                >
                  <MdOutlineFileDownload size={16} /> {t('setting:ACCOUNTING.DOWNLOAD_REPORT')}
                </button>
              </div>
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 會計科目子標題 ===== */}
          <div className="flex items-center gap-10px text-sm font-semibold text-text-neutral-primary">
            <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
            <p>{t('setting:ACCOUNTING.ACCOUNTING_TITLE_SETTINGS_SUBTITLE')}</p>
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
                onClick={accountingTitleSettingModalVisibilityHandler}
              >
                {t('setting:ACCOUNTING.VIEW_ALL_ACCOUNTING')}
              </button>
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 導入會計科目子標題 ===== */}
          <div className="flex items-center gap-10px text-sm font-semibold text-text-neutral-primary">
            <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
            <p>{t('setting:ACCOUNTING.ACCOUNTING_IMPORT_SUBTITLE')}</p>
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
                {t('setting:ACCOUNTING.IMPORT_FILE')}
              </button>
            </div>
            {/* Info: (20241106 - Julian) ===== 手動開戶 ===== */}
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
                {t('setting:ACCOUNTING.MANUAL_ACCOUNT_OPENING')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20241106 - Julian) ===== 儲存按鈕 ===== */}
      <div className="ml-auto flex items-center">
        <Button type="button" variant="tertiary" onClick={saveClickHandler}>
          {t('common:COMMON.SAVE')}
        </Button>
      </div>
    </div>
  );
};

export default AccountingSettingPageBody;
