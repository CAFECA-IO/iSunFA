import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { VoucherType } from '@/constants/account';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import SortingButton from '@/components/voucher/sorting_button';
import { SortBy, SortOrder } from '@/constants/sort';
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
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { useReactToPrint } from 'react-to-print';
import Link from 'next/link';

// Info: (20241107 - Anna) 接收父層傳入的科目名稱作為 prop
interface BalanceDetailsButtonProps {
  accountName: string;
  accountId: number;
  className?: string;
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
          <FiRepeat size={14} className="text-navy-blue-400" />
        </div>
      );
  }
};

const BalanceDetailsButton: React.FC<BalanceDetailsButtonProps> = ({
  accountName,
  accountId,
  className = '',
}) => {
  const { t } = useTranslation(['common', 'reports', 'journal']);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null); // Info: (20241203 - Anna) 引用彈窗內容
  const [shouldFetch, setShouldFetch] = useState(false); // Info: (20241107 - Anna) 控制是否應該請求資料

  const [displayedVoucherList, setDisplayedVoucherList] = useState<IVoucherForSingleAccount[]>([]); // Info: (20241107 - Anna) State for API data

  const [dateSort, setDateSort] = useState<null | SortOrder>(null);

  const { connectedAccountBook } = useUserCtx(); // Info: (20241107 - Anna) 使用 useUserCtx 獲取 connectedAccountBook
  const accountBookId = connectedAccountBook?.id; // Info: (20241107 - Anna) 獲取 accountBookId
  const params = { companyId: accountBookId, accountId }; // Info: (20241107 - Anna) 設定 API 請求的 params // ToDo: (20250429 - Liz) 目前 API 正在大規模調整參數中，會將 companyId 統一改成 accountBookId，屆時可再把 params 調整回原本的寫法 const params = { accountBookId, accountId };

  const handleApiResponse = (resData: IPaginatedData<IVoucherForSingleAccount[]>) => {
    // Info: (20241107 - Anna) 處理 API 回應
    setDisplayedVoucherList(resData.data);
    // Info: (20241107 - Anna) 請求完成後關閉 shouldFetch
    setShouldFetch(false); // Info: (20250113 - Anna) 請求完成後關閉 shouldFetch
  };

  // Info: (20241003 - Anna) 使用 useEffect 在打開 Modal 時記錄 API 請求參數
  useEffect(() => {
    if (isModalVisible && shouldFetch) {
      setShouldFetch(false); // 避免多次觸發 API 請求
    }
  }, [isModalVisible, shouldFetch, params]);

  // Info: (20250114 - Anna) 當 dateSort 變化時重新觸發 API 請求
  useEffect(() => {
    if (isModalVisible && shouldFetch) {
      setShouldFetch(false); // Info: (20250114 - Anna) 避免多次觸發 API 請求
    }
  }, [isModalVisible, shouldFetch, params, dateSort]);

  const handlePrint = useReactToPrint({
    contentRef: modalRef, // Info: (20241203 - Anna) 指定需要打印的內容 Ref
    documentTitle: `${accountName} - 科目餘額表`,
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
  });

  // Info: (20241003 - Anna) 切換顯示狀態
  const handleShowModal = () => {
    setIsModalVisible(!isModalVisible);
    if (!isModalVisible) {
      setDisplayedVoucherList([]); // Info: (20241107 - Anna) 在開啟 Modal 時，將資料重置
      setShouldFetch(true); // Info: (20241107 - Anna) 打開 Modal 時啟動請求
    }
  };

  // Info: (20241003 - Anna) CSS 樣式
  const tableCellStyles = 'table-cell text-center align-middle';

  // Info: (20241003 - Anna) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('reports:REPORTS.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: (newSortOrder) => {
      setDateSort(newSortOrder); // Info: (20250114 - Anna) 更新排序狀態
      setShouldFetch(true); // Info: (20250114 - Anna) 啟動 API 請求
    },
  });

  return (
    <div>
      <Button
        onClick={handleShowModal} // Info: (20241107 - Anna) 點擊時才觸發 handleShowModal，顯示詳細資料的按鈕
        className={`cursor-pointer bg-transparent px-6px py-0 text-support-baby-600 underline hover:bg-transparent ${className || ''}`}
      >
        {t('reports:AUDIT_REPORT.DETAILED_INFORMATION')}
      </Button>

      {/* Info: (20241003 - Anna) 判斷是否顯示 Modal */}
      {isModalVisible && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50">
          <div className="flex max-h-90vh justify-center overflow-hidden rounded-lg">
            <div className="hide-scrollbar relative max-h-90vh w-1000px max-w-9/10 overflow-y-auto rounded-lg border border-stroke-neutral-quaternary bg-neutral-50 p-6 lg:max-w-1000px">
              <div className="flex items-center justify-center">
                <h5 className="text-xl font-bold text-neutral-600">
                  {/* Info: (20241107 - Anna) 使用從父層傳入的科目名稱 */}
                  {t(`reports:ACCOUNTING_ACCOUNT.${accountName}`)}
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
                  <DownloadButton onClick={() => {}} disabled />
                  <PrintButton onClick={handlePrint} disabled={false} />
                </div>
              </div>
              <div className="mt-4 flex justify-center border-stroke-neutral-quaternary">
                {/* Info: (20241003 - Anna) VoucherList 的表格內容 */}
                {shouldFetch && (
                  <div style={{ display: 'none' }}>
                    <FilterSection<IVoucherForSingleAccount[]> // Info: (20241107 - Anna)  加入 FilterSection，用於 API 請求
                      // params={params} // ToDo: (20250429 - Liz) 目前 API 正在大規模調整參數中，會將 companyId 統一改成 accountBookId，屆時可再把 params 調整回原本的寫法
                      params={{ accountBookId, accountId }}
                      apiName={APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2}
                      onApiResponse={handleApiResponse}
                      page={1}
                      pageSize={99999}
                      /* Deprecated: (20250107 - tzuhan) 一次只能有一個排序條件
                    dateSort={dateSort}
                    otherSorts={[]}
                    */
                      sort={dateSort ? { sortBy: SortBy.DATE, sortOrder: dateSort } : undefined} // Info: (20250113 - Anna) 傳遞日期排序參數
                    />
                  </div>
                )}
                {/* Info: (20241107 - Anna) 檢查 displayedVoucherList 是否有數據，顯示 SkeletonList */}
                {displayedVoucherList.length === 0 ? (
                  <SkeletonList count={5} />
                ) : (
                  <div className="hide-scrollbar overflow-x-auto">
                    <div
                      className="table w-full min-w-900px overflow-hidden rounded-lg border border-neutral-100 bg-surface-neutral-surface-lv2 shadow-md"
                      ref={modalRef}
                    >
                      {/* Info: (20241003 - Anna) 表頭 */}
                      <div className="table-header-group h-60px border-b bg-surface-neutral-surface-lv1 text-sm font-normal text-text-neutral-tertiary">
                        <div className="table-row">
                          <div className={`${tableCellStyles} border-r print:border-b`}>
                            <div className="flex w-160px items-center">
                              {/* Info: (20241003 - Anna) 日期排序按鈕 */}
                              {displayedDate}
                            </div>
                          </div>
                          <div className={`${tableCellStyles} w-80px border-r print:border-b`}>
                            {t('common:COMMON.TYPE')}
                          </div>
                          <div className={`${tableCellStyles} w-236px border-r print:border-b`}>
                            {t('reports:REPORTS.NOTE')}
                          </div>
                          <th
                            className={`${tableCellStyles} w-236px border-r font-normal print:border-b`}
                            colSpan={2}
                          >
                            {t('reports:REPORTS.AMOUNT')}
                          </th>
                          <div className={`${tableCellStyles} w-236px print:border-b`}>
                            {t('reports:REPORTS.VOUCHER_NO')} & {t('reports:REPORTS.ISSUER')}
                          </div>
                        </div>
                      </div>
                      {/* Info: (20241003 - Anna) 表體 */}
                      <div className="table-row-group font-normal">
                        {displayedVoucherList.map((voucher) => (
                          <div className="table-row" key={voucher.id}>
                            <div className={tableCellStyles}>
                              <div className="flex items-center justify-center">
                                {/* Info: (20241203 - Anna) 在列印模式下使用 print-center */}
                                <div className="mb-2 mr-6 mt-4">
                                  {/* Info: (20241003 - Anna) 使用 CalendarIcon 組件顯示日期 */}
                                  <CalendarIcon timestamp={voucher.date} incomplete={false} />
                                </div>
                              </div>
                            </div>
                            <div className={`${tableCellStyles} flex items-center`}>
                              {getVoucherIcon(voucher.voucherType)}
                            </div>
                            <div className={tableCellStyles}>
                              {voucher.lineItems.map((lineItem) => (
                                <div key={`${voucher.id}-${lineItem.id}`}>
                                  {lineItem.description}
                                </div>
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
                                  <p>
                                    {t(`reports:REPORTS.${lineItem.debit ? 'DEBIT' : 'CREDIT'}`)}
                                  </p>
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
                              <Link
                                href={`/users/accounting/${voucher.id}?voucherNo=${voucher.voucherNo}`}
                                className="mr-6 font-semibold text-support-baby-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {voucher.voucherNo}
                              </Link>
                              <div className="relative mr-6 flex items-center justify-end gap-4px text-text-neutral-primary">
                                <Image
                                  src={voucher.issuer.avatar}
                                  alt="avatar"
                                  width={14}
                                  height={14}
                                  className="rounded-full print:hidden"
                                />
                                <p>{voucher.issuer.name}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceDetailsButton;
