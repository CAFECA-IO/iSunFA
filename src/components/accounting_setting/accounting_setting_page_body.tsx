import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import { FiCalendar } from 'react-icons/fi';
import { MdOutlineFileDownload } from 'react-icons/md';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { default30DayPeriodInSec } from '@/constants/display';
import { IDatePeriod } from '@/interfaces/date_period';

const AccountingSettingPageBody: React.FC = () => {
  const { t } = useTranslation('common');

  const [fiscalPeriod, setFiscalPeriod] = useState<IDatePeriod>(default30DayPeriodInSec);
  const [reportGenerateDay, setReportGenerateDay] = useState<number>(10);

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
            <div className="flex items-center gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px">
              <div className="flex flex-1 items-center justify-between">
                <p className="text-input-text-input-filled">Taxable</p>
                <p className="text-input-text-input-placeholder">5%</p>
              </div>
              <div className="text-icon-surface-single-color-primary">
                <FaChevronDown />
              </div>
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 消費稅 ===== */}
          <div className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">
              {t('setting:ACCOUNTING.TAX_PURCHASE')}
            </p>
            {/* Info: (20241106 - Julian) ===== 消費稅下拉選單 ===== */}
            <div className="flex items-center gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px">
              <div className="flex flex-1 items-center justify-between">
                <p className="text-input-text-input-filled">Taxable</p>
                <p className="text-input-text-input-placeholder">5%</p>
              </div>
              <div className="text-icon-surface-single-color-primary">
                <FaChevronDown />
              </div>
            </div>
          </div>

          {/* Info: (20241106 - Julian) ===== 稅務申報週期 ===== */}
          <div className="flex flex-col gap-10px">
            <p className="text-sm text-input-text-primary">
              {t('setting:ACCOUNTING.TAX_RETURN_PERIODICITY')}
            </p>
            {/* Info: (20241106 - Julian) ===== 稅務申報週期下拉選單 ===== */}
            <div className="flex items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
              <div className="px-12px py-10px text-input-text-input-placeholder">Every</div>
              <div className="flex flex-1 items-center justify-between px-12px py-10px">
                <p className="text-input-text-input-filled">Month</p>
                <div className="text-icon-surface-single-color-primary">
                  <FaChevronDown />
                </div>
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
          <div className="flex items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
            <div className="px-12px py-10px">
              <Image width={16} height={16} alt="currency_icon" src="/icons/us.svg" />
            </div>
            <div className="flex flex-1 items-center justify-between px-12px py-10px">
              <p className="text-input-text-input-placeholder">USD</p>
              <div className="text-icon-surface-single-color-primary">
                <FaChevronDown />
              </div>
            </div>
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
          <div className="flex items-center gap-10px text-sm font-semibold text-text-neutral-primary">
            <div className="h-8px w-8px rounded-full bg-surface-support-strong-maple"></div>
            <p>{t('setting:ACCOUNTING.PERIOD_SETTINGS_SUBTITLE')}</p>
          </div>
          <div className="flex w-full items-start gap-40px">
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
                disabled
                className="flex items-center gap-4px text-sm text-link-text-primary disabled:text-text-neutral-mute"
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
                disabled
                className="flex items-center gap-4px text-sm text-link-text-primary disabled:text-text-neutral-mute"
              >
                {t('setting:ACCOUNTING.MANUAL_ACCOUNT_OPENING')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingSettingPageBody;
