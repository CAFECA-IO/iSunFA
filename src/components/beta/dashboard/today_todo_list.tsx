import { useCallback, useEffect, useState } from 'react';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import TodayTodoListData from '@/components/beta/dashboard/today_todo_list_data';
import { PiLinkBold } from 'react-icons/pi';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IAccountBook, IAccountBookWithTeam } from '@/interfaces/account_book';
import { ITodoAccountBook } from '@/interfaces/todo';
import { IPaginatedData } from '@/interfaces/pagination';
import loggerFront from '@/lib/utils/logger_front';

const ToDoListNotLink = () => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">
        {t('dashboard:DASHBOARD.TO_DO_LIST')}
      </h3>

      <div className="flex flex-col items-center gap-8px">
        <p className="font-medium text-text-neutral-mute">
          {t('dashboard:DASHBOARD.CALENDAR_NOT_YET_LINKED')}
        </p>
        <button type="button" className="flex items-center gap-8px text-text-neutral-link">
          <PiLinkBold size={16} />
          <p className="font-medium">{t('dashboard:DASHBOARD.LINK_MY_CALENDAR')}</p>
        </button>
      </div>
    </section>
  );
};

interface TodayTodoListProps {
  todayTodoList: ITodoAccountBook[];
}

const TodayTodoList = ({ todayTodoList }: TodayTodoListProps) => {
  const [accountBookList, setAccountBookList] = useState<IAccountBook[]>([]);

  // Info: (20241122 - Liz) 判斷是否有帳本清單
  const isToDoListLink = accountBookList.length > 0;

  const { userAuth } = useUserCtx();

  // Info: (20250306 - Liz) 打 API 取得使用者擁有的帳本清單(原為公司)
  const { trigger: getAccountBookListByUserIdAPI } = APIHandler<
    IPaginatedData<IAccountBookWithTeam[]>
  >(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID);

  const getAccountBookList = useCallback(async () => {
    if (!userAuth) return;

    try {
      const { data, success, code } = await getAccountBookListByUserIdAPI({
        params: { userId: userAuth.id },
        query: { page: 1, pageSize: 999, simple: true },
      });

      const accountBookListData = data?.data ?? []; // Info: (20250306 - Liz) 取出帳本清單

      if (success && accountBookListData && accountBookListData.length > 0) {
        // Info: (20241120 - Liz) 取得使用者擁有的帳本清單成功時設定帳本清單
        setAccountBookList(accountBookListData);
      } else {
        // Info: (20241120 - Liz) 取得使用者擁有的帳本清單失敗時顯示錯誤訊息(原為公司)
        loggerFront.log('取得使用者擁有的帳本清單 failed:', code);
      }
    } catch (error) {
      loggerFront.error('取得使用者擁有的帳本清單 error:', error);
    }
  }, [userAuth]);

  useEffect(() => {
    getAccountBookList();
  }, [getAccountBookList]);

  if (!isToDoListLink) {
    return (
      <DashboardCardLayout>
        <ToDoListNotLink />
      </DashboardCardLayout>
    );
  }

  return (
    <DashboardCardLayout>
      <TodayTodoListData todayTodoList={todayTodoList} />
    </DashboardCardLayout>
  );
};

export default TodayTodoList;
