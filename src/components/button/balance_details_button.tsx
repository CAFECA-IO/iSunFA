import React, { useState, useEffect } from 'react';
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
import { APIName } from '@/constants/api_connection';
import { IVoucherForSingleAccount } from '@/interfaces/voucher';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useUserCtx } from '@/contexts/user_context';
import FilterSection from '@/components/filter_section/filter_section';
import { IPaginatedData } from '@/interfaces/pagination';
import PrintButton from './print_button';
import DownloadButton from './download_button';

// Info: (20241107 - Anna) 接收父層傳入的科目名稱作為 prop
interface BalanceDetailsButtonProps {
  accountName: string;
  accountId: string;
}

/*
 * Info: (20241106 - Murky)
 * @Anna 新版的interface是 IVoucherForSingleAccount, 在src/interfaces/voucher.ts 386 行
 */

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

const BalanceDetailsButton: React.FC<BalanceDetailsButtonProps> = ({ accountName, accountId }) => {
  const { t } = useTranslation(['common', 'report_401', 'journal']);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false); // Info: (20241107 - Anna) 控制是否應該請求資料

  const [displayedVoucherList, setDisplayedVoucherList] = useState<IVoucherForSingleAccount[]>([]); // Info: (20241107 - Anna) State for API data

  const [dateSort, setDateSort] = useState<null | SortOrder>(null);

  const { selectedCompany } = useUserCtx(); // Info: (20241107 - Anna) 使用 useUserCtx 獲取 selectedCompany
  const companyId = selectedCompany?.id; // Info: (20241107 - Anna) 獲取 companyId
  const params = { companyId, accountId }; // Info: (20241107 - Anna) 設定 API 請求的 params

  const handleApiResponse = (resData: IPaginatedData<IVoucherForSingleAccount[]>) => {
    // Info: (20241107 - Anna) 處理 API 回應
    setDisplayedVoucherList(resData.data);
    // Info: (20241107 - Anna) 請求完成後關閉 shouldFetch
    setShouldFetch(false);
  };

  // Info: (20241003 - Anna) 使用 useEffect 在打開 Modal 時記錄 API 請求參數
  useEffect(() => {
    if (isModalVisible && shouldFetch) {
      // eslint-disable-next-line no-console
      // console.log('傳送 API 請求，參數:', params);
      setShouldFetch(false); // 避免多次觸發 API 請求
    }
  }, [isModalVisible, shouldFetch, params]);

  // Info: (20241003 - Anna) 切換顯示狀態
  const handleShowModal = () => {
    setIsModalVisible(!isModalVisible);
    if (!isModalVisible) {
      setDisplayedVoucherList([]); // Info: (20241107 - Anna) 在開啟 Modal 時，將資料重置
      setShouldFetch(true); // Info: (20241107 - Anna) 打開 Modal 時啟動請求
    }
    // eslint-disable-next-line no-console
    // console.log('渲染的 Voucher List:', displayedVoucherList);
  };

  // Info: (20241003 - Anna) CSS 樣式
  const tableCellStyles = 'table-cell text-center align-middle';
  const checkboxStyle = 'form-checkbox align-middle ml-4 border-navy-blue-400"';

  // Info: (20241003 - Anna) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  return (
    <div>
      <Button
        onClick={handleShowModal} // Info: (20241107 - Anna) 點擊時才觸發 handleShowModal，顯示詳細資料的按鈕
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
                {accountName} {/* Info: (20241107 - Anna) 使用從父層傳入的科目名稱 */}
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
              {shouldFetch && (
                <div style={{ display: 'none' }}>
                  <FilterSection<IVoucherForSingleAccount[]> // Info: (20241107 - Anna)  加入 FilterSection，用於 API 請求
                    params={params}
                    apiName={APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2}
                    onApiResponse={handleApiResponse}
                    page={1}
                    pageSize={10}
                    dateSort={dateSort}
                    otherSorts={[]}
                  />
                </div>
              )}
              {/* Info: (20241107 - Anna) 檢查 displayedVoucherList 是否有數據，顯示 SkeletonList */}
              {displayedVoucherList.length === 0 ? (
                <SkeletonList count={5} />
              ) : (
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
                  <div className="table-row-group font-normal">
                    {displayedVoucherList.map((voucher) => (
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
                        <div className={tableCellStyles}>
                          {voucher.lineItems.map((lineItem) => (
                            <div key={`${voucher.id}-${lineItem.id}`}>{lineItem.description}</div>
                          ))}
                        </div>
                        {/* Info: (20241107 - Anna) Check if the line item is debit or credit and display the corresponding icon */}
                        <div className={`${tableCellStyles} pl-6`}>
                          {voucher.lineItems.map((lineItem) => (
                            <div
                              key={`${voucher.id}-${lineItem.id}`}
                              className={`flex w-70px items-center justify-center gap-4px rounded-full px-6px py-2px ${lineItem.debit ? 'bg-badge-surface-soft-success text-badge-text-success-solid' : 'bg-badge-surface-soft-error text-badge-text-error-solid'}`}
                            >
                              <div
                                className={`h-6px w-6px rounded border-3px ${lineItem.debit ? 'border-badge-text-success-solid' : 'border-badge-text-error-solid'}`}
                              ></div>
                              <p>{t(`journal:JOURNAL.${lineItem.debit ? 'DEBIT' : 'CREDIT'}`)}</p>
                            </div>
                          ))}
                        </div>
                        {/* Info: (20241029 - Anna) 借方或貸方哪邊有金額就顯示 */}
                        <div className={`table-cell pr-6 text-end align-middle`}>
                          {voucher.lineItems.map((lineItem) => (
                            <div key={`${voucher.id}-${lineItem.id}`}>
                              {lineItem.amount.toLocaleString()}
                            </div>
                          ))}
                        </div>
                        <div
                          className={`table-cell flex-col justify-end gap-4 text-end align-middle`}
                        >
                          <div className="mr-6 font-semibold text-support-baby-600">
                            {' '}
                            {voucher.voucherNo}
                          </div>
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceDetailsButton;
