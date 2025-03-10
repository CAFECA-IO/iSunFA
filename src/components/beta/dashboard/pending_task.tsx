import { useEffect, useState } from 'react';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';
import { APIName } from '@/constants/api_connection';
import PendingTasksForAccountBook from '@/components/beta/dashboard/pending_task_for_account_book';
import PendingTaskNoData from '@/components/beta/dashboard/pending_task_no_data';
import { IPaginatedData } from '@/interfaces/pagination';
import PendingTaskForAll from '@/components/beta/dashboard/pending_task_for_all';

interface PendingTasksProps {
  getTodoList: () => Promise<void>;
}

const PendingTask = ({ getTodoList }: PendingTasksProps) => {
  /* Info: (20241018 - Liz) 元件顯示邏輯
   * 沒有帳本清單 : 顯示 PendingTaskNoData
   * 有帳本清單 且 有選擇帳本 : 顯示 PendingTasksForAccountBook
   * 有帳本清單 且 沒有選擇帳本 : 顯示 PendingTaskForAll
   */

  const { userAuth, selectedAccountBook } = useUserCtx();
  const isSelectedAccountBook = !!selectedAccountBook; // Info: (20250204 - Liz) 強制轉為布林值
  const [accountBookList, setAccountBookList] = useState<IAccountBookForUserWithTeam[]>([]);
  const hasAccountBookList = accountBookList.length > 0;

  // Info: (20250306 - Liz) 打 API 取得使用者擁有的帳本清單(原為公司)
  const { trigger: getAccountBookListByUserIdAPI } = APIHandler<
    IPaginatedData<IAccountBookForUserWithTeam[]>
  >(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID);

  useEffect(() => {
    const getAccountBookList = async () => {
      if (!userAuth) return;

      try {
        const { data, success, code } = await getAccountBookListByUserIdAPI({
          params: { userId: userAuth.id },
          query: { page: 1, pageSize: 999 },
        });
        const accountBookListData = data?.data ?? []; // Info: (20250306 - Liz) 取出帳本清單

        if (success && accountBookListData && accountBookListData.length > 0) {
          // Info: (20241127 - Liz) 取得使用者擁有的帳本清單成功
          setAccountBookList(accountBookListData);
        } else {
          // Info: (20241127 - Liz)  取得使用者擁有的帳本清單失敗時顯示錯誤訊息
          // Deprecated: (20241127 - Liz)
          // eslint-disable-next-line no-console
          console.log('取得使用者擁有的帳本清單 failed:', code);
        }
      } catch (error) {
        // Deprecated: (20241127 - Liz)
        // eslint-disable-next-line no-console
        console.error('取得使用者擁有的帳本清單 error:', error);
      }
    };

    getAccountBookList();
  }, [userAuth]);

  if (!hasAccountBookList) {
    return (
      <DashboardCardLayout>
        <PendingTaskNoData />
      </DashboardCardLayout>
    );
  }

  if (isSelectedAccountBook) {
    return (
      <DashboardCardLayout>
        <PendingTasksForAccountBook getTodoList={getTodoList} />
      </DashboardCardLayout>
    );
  }

  return (
    <DashboardCardLayout>
      <PendingTaskForAll />
    </DashboardCardLayout>
  );
};

export default PendingTask;
