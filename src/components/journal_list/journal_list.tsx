// Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
// import { useState } from 'react';
// import { IJournal } from '@/interfaces/journal';
import { IJournalListItem } from '@/interfaces/journal';
import JournalItem, { JournalItemMobile } from '@/components/journal_item/journal_item';
// Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
// 原代碼：import { DEFAULT_SKELETON_COUNT_FOR_PAGE, checkboxStyle } from '@/constants/display';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import Pagination, { IPaginationProps } from '@/components/pagination/pagination';
import { SkeletonList } from '@/components/skeleton/skeleton';
import Image from 'next/image';
import { JOURNAL_EVENT } from '@/constants/journal';

interface IJournalListProps {
  journals: IJournalListItem[];
  isLoading: boolean | undefined;
  success: boolean | undefined;
  code: string | undefined;
}

const JournalList = ({
  event,
  companyId,
  journalsProps,
  paginationProps,
  onDelete,
}: {
  event: JOURNAL_EVENT;
  companyId: number;
  journalsProps: IJournalListProps;
  paginationProps: IPaginationProps;
  onDelete: (companyId: number, journalId: number) => Promise<void>;
}) => {
  const { journals, isLoading, success, code } = journalsProps;
  const { currentPage, setCurrentPage, totalPages } = paginationProps;
  const { t } = useTranslation(['common', 'journal']);
  // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
  // const [checkedItems, setCheckedItems] = useState<string[]>([]);
  // const [isCheckAll, setIsCheckAll] = useState<boolean>(false);

  // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
  // const checkHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { id, checked } = e.target;
  //   if (checked) {
  //     // Info: (20240517 - Julian) 如果 checked，就把 id 加進 checkedItems
  //     setCheckedItems([...checkedItems, id]);
  //   } else {
  //     // Info: (20240517 - Julian) 如果 unchecked，就把 id 從 checkedItems 移除
  //     setCheckedItems(checkedItems.filter((item) => item !== id));
  //   }
  //   // Info: (20240517 - Julian) 當有任何一個 checkbox 被 checked 或 unchecked，就把 isCheckAll 設為 false
  //   setIsCheckAll(false);
  // };

  // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
  // const checkAllHandler = () => {
  //   setIsCheckAll(!isCheckAll);

  //   if (isCheckAll) {
  //     // Info: (20240517 - Julian) 如果 isCheckAll 是 true，就清空 checkedItems
  //     setCheckedItems([]);
  //     return;
  //   }
  //   // Info: (20240517 - Julian) 反之就把所有 journal 加進 checkedItems
  //   setCheckedItems(journals.map((journal) => `${journal.voucherId}`));
  // };

  const displayedList = journals.map((journal) => (
    <JournalItem
      event={event}
      companyId={companyId}
      journal={journal}
      // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
      // isChecked={checkedItems.includes(`${journal.voucherId}`)}
      // checkHandler={checkHandler}
      onDelete={onDelete}
    />
  ));
  const displayedListMobile = journals.map((journal) => (
    <JournalItemMobile
      event={event}
      companyId={companyId}
      journal={journal}
      // Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊)
      // isChecked={checkedItems.includes(`${journal.voucherId}`)}
      // checkHandler={checkHandler}
      onDelete={onDelete}
    />
  ));

  return success === false && code ? (
    <>
      <p>{t('journal:JOURNAL.FAILED_TO_FETCH_DATA')}</p>
      <p>{code}</p>
    </>
  ) : isLoading === true ? (
    <div className="flex w-full items-center justify-center py-40px">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  ) : journals.length < 1 ? (
    // Info: (20240419 - Julian) No data
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center text-xl font-semibold text-text-neutral-tertiary">
      <Image src={'/icons/empty.svg'} width={48} height={70} alt="empty_icon" />
      <p>{t('common:COMMON.EMPTY')}</p>
    </div>
  ) : (
    <>
      {/* Info: (20240517 - Julian) Desktop */}
      <div className="hidden lg:block">
        <table className="my-20px w-full border border-stroke-neutral-quaternary">
          {/* Info: (20240418 - Julian) Header */}
          <thead>
            <tr className="border border-stroke-neutral-quaternary text-left text-sm text-text-neutral-tertiary">
              {/* Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊) */}
              {/* Info: (20240419 - Julian) 全選 */}
              {/* <th className="flex justify-center py-8px">
                <input
                  type="checkbox"
                  className={checkboxStyle}
                  checked={isCheckAll}
                  onChange={checkAllHandler}
                />
              </th> */}
              <th className="whitespace-nowrap text-center">{t('common:COMMON.DATE')}</th>
              <th className="whitespace-nowrap px-16px">{t('common:COMMON.TYPE')}</th>
              <th className="whitespace-nowrap px-16px">{t('journal:JOURNAL.PARTICULARS')}</th>
              <th className="whitespace-nowrap px-16px">{t('journal:JOURNAL.FROM_TO')}</th>
              <th className="whitespace-nowrap px-16px">{t('journal:JOURNAL.AMOUNT')}</th>
              <th className="whitespace-nowrap px-16px">{t('common:COMMON.PROJECT')}</th>
              {event === JOURNAL_EVENT.UPLOADED && (
                <th className="whitespace-nowrap px-16px text-right">
                  {t('journal:JOURNAL.VOUCHER_NO')}
                </th>
              )}
              {event === JOURNAL_EVENT.UPCOMING && (
                <th className="whitespace-nowrap px-16px text-right">
                  {t('journal:JOURNAL.OPERATIONS')}
                </th>
              )}
            </tr>
          </thead>

          {/* Info: (20240418 - Julian) Body */}
          <tbody>{displayedList}</tbody>
        </table>
      </div>
      {/* Info: (20240517 - Julian) Mobile */}
      <div className="block lg:hidden">
        <table className="my-20px w-full border border-stroke-neutral-quaternary">
          {/* Info: (20240418 - Julian) Header */}
          <thead>
            <tr className="border border-stroke-neutral-quaternary text-left text-sm text-text-neutral-tertiary">
              {/* Info: (20240808 - Anna) Alpha版先隱藏(日記帳頁面的選取方塊) */}
              {/* Info: (20240419 - Julian) 全選 */}
              {/* <th className="flex justify-center py-8px md:w-50px">
                <input
                  type="checkbox"
                  checked={isCheckAll}
                  onChange={checkAllHandler}
                  className="relative h-4 w-4 border border-tertiaryBlue bg-white accent-tertiaryBlue"
                />
              </th> */}
              <th className="whitespace-nowrap text-center">{t('common:COMMON.DATE')}</th>
              <th className="whitespace-nowrap text-center">{t('journal:JOURNAL.INFO')}</th>
              {event === JOURNAL_EVENT.UPLOADED && (
                <th className="whitespace-nowrap px-16px text-right">
                  {t('journal:JOURNAL.VOUCHER_NO')}
                </th>
              )}
              {event === JOURNAL_EVENT.UPCOMING && (
                <th className="whitespace-nowrap px-16px text-right">
                  {t('journal:JOURNAL.OPERATIONS')}
                </th>
              )}
            </tr>
          </thead>

          {/* Info: (20240418 - Julian) Body */}
          <tbody>{displayedListMobile}</tbody>
        </table>
      </div>
      <div className="mx-auto my-40px">
        <Pagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>
    </>
  );
};

export default JournalList;
