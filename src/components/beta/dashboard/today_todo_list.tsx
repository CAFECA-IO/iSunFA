import { useCallback, useEffect, useState } from 'react';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import TodayTodoListData from '@/components/beta/dashboard/today_todo_list_data';
import { PiLinkBold } from 'react-icons/pi';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IAccountBookForUser } from '@/interfaces/company';
import { ITodoCompany } from '@/interfaces/todo';

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
  todayTodoList: ITodoCompany[];
}

const TodayTodoList = ({ todayTodoList }: TodayTodoListProps) => {
  const [companyList, setCompanyList] = useState<IAccountBookForUser[]>([]);

  // Info: (20241122 - Liz) 判斷是否有公司列表
  const isToDoListLink = companyList.length > 0;

  const { userAuth } = useUserCtx();

  // Info: (20241122 - Liz) 打 API 取得使用者擁有的公司列表 (simple version)
  const { trigger: listUserCompanyAPI } = APIHandler<IAccountBookForUser[]>(
    APIName.LIST_USER_COMPANY
  );

  const getCompanyList = useCallback(async () => {
    if (!userAuth) return;

    try {
      const {
        data: userCompanyList,
        success,
        code,
      } = await listUserCompanyAPI({
        params: { userId: userAuth.id },
        query: { simple: true },
      });

      if (success && userCompanyList && userCompanyList.length > 0) {
        // Info: (20241120 - Liz) 取得使用者擁有的公司列表成功時更新公司列表
        setCompanyList(userCompanyList);
      } else {
        // Info: (20241120 - Liz) 取得使用者擁有的公司列表失敗時顯示錯誤訊息
        // Deprecated: (20241120 - Liz)
        // eslint-disable-next-line no-console
        console.log('listUserCompanyAPI(Simple) failed:', code);
      }
    } catch (error) {
      // Deprecated: (20241120 - Liz)
      // eslint-disable-next-line no-console
      console.error('listUserCompanyAPI(Simple) error:', error);
    }
  }, [userAuth]);

  useEffect(() => {
    getCompanyList();
  }, [getCompanyList]);

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
