import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { VoucherType } from '@/constants/account';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { Button } from '@/components/button/button';
import { IoIosClose } from 'react-icons/io';
import { FaUpload, FaDownload } from 'react-icons/fa';
import { FiRepeat } from 'react-icons/fi';
import Image from 'next/image';
import PrintButton from './print_button';
import DownloadButton from './download_button';

/**
 * Info: (20241106 - Murky)
 * @Anna 新版的interface是 IVoucherForSingleAccount, 在src/interfaces/voucher.ts 386 行
 */
// Info: (20241003 - Anna) temp interface
export interface IVoucherBeta {
  id: number; // Info: (20241106 - Murky) voucherId
  date: number; // Info: (20241106 - Murky) voucherDate
  voucherNo: string;
  voucherType: VoucherType;
  note: string; // Info: (20241106 - Murky) particular
  accounting: string[];
  credit: number[];
  debit: number[];
  counterparty: { code: string; name: string };
  issuer: { avatar: string; name: string };
}

// Info: (20241003 - Anna) voucherType 的邏輯處理
const getVoucherIcon = (voucherType: VoucherType) => {
  switch (voucherType) {
    case VoucherType.RECEIVE:
      return (
        <div className="relative mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
          <FaDownload size={14} className="text-surface-state-error-dark" />
        </div>
      );
    case VoucherType.EXPENSE:
      return (
        <div className="relative mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px">
          <FaUpload size={14} className="text-surface-state-success-dark" />
        </div>
      );
    default:
      return (
        <div className="relative mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px">
          <FiRepeat size={14} className="text-surface-brand-secondary" />
        </div>
      );
  }
};

const BalanceDetailsButton: React.FC = () => {
  const { t } = useTranslation(['common', 'report_401']);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Info: (20241003 - Anna) 切換顯示狀態
  const handleShowModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  // Info: (20241003 - Anna) CSS 樣式
  const tableCellStyles = 'table-cell text-center align-middle';
  const checkboxStyle = 'form-checkbox align-middle ml-4 border-navy-blue-400"';

  // Info: (20241003 - Anna) Dummy 資料
  const displayedVoucherList = [
    {
      id: 1,
      date: 1702511200,
      voucherNo: '20240922-0002',
      voucherType: VoucherType.TRANSFER,
      note: 'Mouse-0001',
      credit: [300],
      debit: [0],
      issuer: {
        avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
        name: 'Anna',
      },
    },
    {
      id: 2,
      date: 1702511200,
      voucherNo: '20240922-0002',
      voucherType: VoucherType.EXPENSE,
      note: 'Mouse-0001',
      credit: [0],
      debit: [1700],
      issuer: {
        avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
        name: 'Anna',
      },
    },
    {
      id: 3,
      date: 1702511200,
      voucherNo: '20240922-0002',
      voucherType: VoucherType.RECEIVE,
      note: 'Mouse-0001',
      credit: [0],
      debit: [1000000],
      issuer: {
        avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
        name: 'Anna',
      },
    },
  ].map((voucher) => (
    <div className="table-row" key={voucher.id}>
      <div className={tableCellStyles}>
        <div className="flex items-center justify-between">
          <div className="ml-4 text-center align-middle">
            <input type="checkbox" className={checkboxStyle} />
          </div>
          <div className="mb-2 mr-6 mt-4">
            {/* Info: (20241003 - Anna) 使用 CalendarIcon 組件顯示日期 */}
            <CalendarIcon timestamp={voucher.date} />
          </div>
        </div>
      </div>
      <div className={`${tableCellStyles} flex items-center`}>
        {getVoucherIcon(voucher.voucherType)}
      </div>
      <div className={tableCellStyles}>{voucher.note}</div>
      {/* Info: (20241029 - Anna) 借方或貸方哪邊有金額就顯示對應的icon */}
      <div className={`${tableCellStyles} pl-6`}>
        {voucher.debit[0] > 0 ? (
          <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-badge-surface-soft-success px-6px py-2px text-badge-text-success-solid">
            <div className="h-6px w-6px rounded border-3px border-badge-text-success-solid"></div>
            <p>{t('journal:JOURNAL.DEBIT')}</p>
          </div>
        ) : (
          <div className="flex w-70px items-center justify-center gap-4px rounded-full bg-badge-surface-soft-error px-6px py-2px text-badge-text-error-solid">
            <div className="h-6px w-6px rounded border-3px border-badge-text-error-solid"></div>
            <p>{t('journal:JOURNAL.CREDIT')}</p>
          </div>
        )}
      </div>
      {/* Info: (20241029 - Anna) 借方或貸方哪邊有金額就顯示 */}
      <div className={`table-cell pr-6 text-end align-middle`}>
        {voucher.debit[0] !== 0
          ? voucher.debit[0].toLocaleString()
          : voucher.credit[0].toLocaleString()}
      </div>
      <div className={`table-cell flex-col justify-end gap-4 text-end align-middle`}>
        <div className="mr-6 font-semibold text-support-baby-600"> {voucher.voucherNo}</div>
        <div className="relative mr-6 flex items-center justify-end gap-4px text-text-neutral-primary">
          <Image
            src={voucher.issuer.avatar}
            alt="avatar"
            width={14}
            height={14}
            className="rounded-full"
          />
          <p>{voucher.issuer.name}</p>
        </div>
      </div>
    </div>
  ));

  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  // Info: (20241003 - Anna) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  return (
    <div>
      <Button
        onClick={handleShowModal}
        className="cursor-pointer bg-transparent px-0 py-0 text-support-baby-600 underline hover:bg-transparent"
      >
        {t('report_401:AUDIT_REPORT.DETAILED_INFORMATION')}
      </Button>

      {/* Info: (20241003 - Anna) 判斷是否顯示 Modal */}
      {isModalVisible && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50">
          <div className="relative w-1000px rounded-lg border border-stroke-neutral-quaternary bg-neutral-50 p-6">
            <div className="flex items-center justify-center">
              <h5 className="text-xl font-bold text-neutral-600">
                透過損益按公允價值衡量之金融資產 - 流動
              </h5>
              <button
                type="button"
                className="absolute right-6 top-6 text-xl text-navy-blue-500"
                onClick={handleShowModal}
              >
                <IoIosClose className="text-neutral-500" size={24} />
              </button>
            </div>
            <div className="my-auto mt-10 flex flex-col justify-end self-stretch">
              <div className="flex justify-end gap-3">
                <DownloadButton onClick={() => {}} />
                <PrintButton onClick={() => {}} disabled={false} />
              </div>
            </div>
            <div className="mt-4 flex justify-center border-stroke-neutral-quaternary">
              {/* Info: (20241003 - Anna) VoucherList 的表格內容 */}
              <div className="table w-full overflow-hidden rounded-lg border border-neutral-100 bg-surface-neutral-surface-lv2 shadow-md">
                {/* Info: (20241003 - Anna) 表頭 */}
                <div className="table-header-group h-60px border-b bg-surface-neutral-surface-lv1 text-sm font-normal text-text-neutral-tertiary">
                  <div className="table-row">
                    <div className={`${tableCellStyles} border-r`}>
                      <div className="flex w-160px items-center">
                        <div className="ml-4 w-32px text-center align-middle">
                          <input type="checkbox" className={checkboxStyle} />
                        </div>
                        {/* Info: (20241003 - Anna) 日期排序按鈕 */}
                        {displayedDate}
                      </div>
                    </div>
                    <div className={`${tableCellStyles} w-80px border-r`}>
                      {t('common:COMMON.TYPE')}
                    </div>
                    <div className={`${tableCellStyles} w-236px border-r`}>
                      {t('journal:VOUCHER.NOTE')}
                    </div>
                    <th className={`${tableCellStyles} w-236px border-r font-normal`} colSpan={2}>
                      {t('report_401:TAX_REPORT.AMOUNT')}
                    </th>
                    <div className={`${tableCellStyles} w-236px`}>
                      {t('journal:VOUCHER.VOUCHER_NO')} & {t('journal:VOUCHER.ISSUER')}
                    </div>
                  </div>
                </div>
                {/* Info: (20241003 - Anna) 表體 */}
                <div className="table-row-group font-normal">{displayedVoucherList}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceDetailsButton;
