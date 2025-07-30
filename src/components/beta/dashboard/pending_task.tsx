import { useEffect, useState } from 'react';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { APIName } from '@/constants/api_connection';
import PendingTaskForAccountBook from '@/components/beta/dashboard/pending_task_for_account_book';
import PendingTaskNoData from '@/components/beta/dashboard/pending_task_no_data';
import { IPaginatedData } from '@/interfaces/pagination';
import PendingTaskForAll from '@/components/beta/dashboard/pending_task_for_all';
import loggerFront from '@/lib/utils/logger_front';

interface PendingTasksProps {
  getTodoList: () => Promise<void>;
}

const PendingTask = ({ getTodoList }: PendingTasksProps) => {
  /* Info: (20241018 - Liz) 元件顯示邏輯
   * 沒有帳本清單 : 顯示 PendingTaskNoData
   * 有帳本清單 且 有連結帳本 : 顯示 PendingTaskForAccountBook
   * 有帳本清單 且 沒有連結帳本 : 顯示 PendingTaskForAll
   */

  const { userAuth, connectedAccountBook } = useUserCtx();
  const isSelectedAccountBook = !!connectedAccountBook; // Info: (20250204 - Liz) 強制轉為布林值
  const [accountBookList, setAccountBookList] = useState<IAccountBookWithTeam[]>([]);
  const hasAccountBookList = accountBookList.length > 0;

  // Info: (20250306 - Liz) 打 API 取得使用者擁有的帳本清單(原為公司)
  const { trigger: getAccountBookListByUserIdAPI } = APIHandler<
    IPaginatedData<IAccountBookWithTeam[]>
  >(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID);

  useEffect(() => {
    const getAccountBookList = async () => {
      if (!userAuth) return;

      try {
        const { data, success, code } = await getAccountBookListByUserIdAPI({
          params: { userId: userAuth.id },
          query: { page: 1, pageSize: 999, simple: true },
        });
        const accountBookListData = data?.data ?? []; // Info: (20250306 - Liz) 取出帳本清單

        if (success && accountBookListData && accountBookListData.length > 0) {
          // Info: (20241127 - Liz) 取得使用者擁有的帳本清單成功
          setAccountBookList(accountBookListData);
        } else {
          // Info: (20241127 - Liz)  取得使用者擁有的帳本清單失敗時顯示錯誤訊息
          loggerFront.log('取得使用者擁有的帳本清單 failed:', code);
        }
      } catch (error) {
        loggerFront.error('取得使用者擁有的帳本清單 error:', error);
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
        <PendingTaskForAccountBook getTodoList={getTodoList} />
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
