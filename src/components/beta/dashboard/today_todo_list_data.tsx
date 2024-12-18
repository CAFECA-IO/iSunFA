import { useTranslation } from 'next-i18next';
import MoreLink from '@/components/beta/dashboard/more_link';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ITodoCompany } from '@/interfaces/todo';
import { useEffect, useState } from 'react';
import { MILLISECONDS_IN_A_MINUTE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import TodayTodoListNoData from '@/components/beta/dashboard/today_todo_list_no_data';

const TodayTodoListData = () => {
  const { t } = useTranslation('dashboard');
  const { userAuth } = useUserCtx();
  const [todayTodoList, setTodayTodoList] = useState<ITodoCompany[]>([]);
  const [filterTodoList, setFilterTodoList] = useState<ITodoCompany[]>([]);

  // Info: (20241122 - Liz) 判斷是否有待辦事項
  const isToDoListHasPlan = filterTodoList.length > 0;

  // Info: (20241122 - Liz) 打 API 取得待辦事項列表
  const { trigger: listUserTodoAPI } = APIHandler<ITodoCompany[]>(APIName.TODO_LIST);

  useEffect(() => {
    const getTodoList = async () => {
      if (!userAuth) return;

      try {
        const { data: userTodoList, success } = await listUserTodoAPI({
          params: { userId: userAuth.id },
        });

        if (success && userTodoList && userTodoList.length > 0) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0); // Info: (20241218 - Liz) 設定今天的開始時間 (00:00:00)

          const todayEnd = new Date(todayStart);
          todayEnd.setHours(23, 59, 59, 999); // Info: (20241218 - Liz) 設定今天的結束時間 (23:59:59)

          const todayStartTimeStamps = todayStart.getTime(); // Info: (20241218 - Liz) 今天開始時間的時間戳
          const todayEndTimeStamps = todayEnd.getTime(); // Info: (20241218 - Liz) 今天結束時間的時間戳

          // Info: (20241123 - Liz) 篩選出今天的待辦事項
          const todayTodoListData = userTodoList.filter((todo) => {
            const { endTime } = todo;
            const isToday = endTime >= todayStartTimeStamps && endTime <= todayEndTimeStamps;
            return isToday;
          });

          // Info: (20241122 - Liz) 將今天的待辦事項依照 endTime 升冪排序
          todayTodoListData.sort((a, b) => a.endTime - b.endTime);

          setTodayTodoList(todayTodoListData);
        } else {
          // Deprecated: (20241121 - Liz)
          // eslint-disable-next-line no-console
          console.log('取得待辦事項列表失敗');
        }
      } catch (error) {
        // Deprecated: (20241121 - Liz)
        // eslint-disable-next-line no-console
        console.log('取得待辦事項列表失敗');
      }
    };

    getTodoList();
  }, [userAuth]);

  useEffect(() => {
    const refreshTodoList = () => {
      const now = Date.now();

      // Info: (20241122 - Liz) 篩選出當天尚未過期的 todo
      const notExpiredTodoList = todayTodoList.filter((todo) => todo.endTime >= now);
      setFilterTodoList(notExpiredTodoList);
    };

    // Info: (20241218 - Liz) 初次執行
    refreshTodoList();

    // Info: (20241218 - Liz) 設定定時器，每分鐘更新一次
    const timer = setInterval(refreshTodoList, MILLISECONDS_IN_A_MINUTE);

    // Info: (20241218 - Liz) 清除定時器
    return () => clearInterval(timer);
  }, [todayTodoList]);

  //   const planList = [
  //     {
  //       id: 1,
  //       title: 'Doc Plan 12345678910',
  //       time: '14:00',
  //       color: 'bg-surface-brand-secondary-moderate',
  //     },
  //     {
  //       id: 2,
  //       title: 'Close Meeting',
  //       time: '17:30-18:00',
  //       color: 'bg-surface-brand-primary-soft',
  //     },
  //   ];

  if (!isToDoListHasPlan) return <TodayTodoListNoData />;

  return (
    <section className="flex flex-col gap-24px">
      <div className="flex justify-between">
        <h3 className="text-xl font-bold text-text-neutral-secondary">
          {t('dashboard:DASHBOARD.TO_DO_LIST')}
        </h3>
        <MoreLink href={ISUNFA_ROUTE.TODO_LIST_PAGE} />
      </div>

      <div className="flex items-start gap-10px">
        <div className="flex w-64px flex-none justify-center pt-5px">
          <CalendarIcon timestamp={Date.now() / 1000} />
        </div>

        <div className="flex flex-auto items-center justify-between gap-10px overflow-x-auto py-5px">
          {filterTodoList.map((todo) => (
            <div key={todo.id} className="flex gap-16px">
              <div className={`w-10px rounded-xs bg-surface-brand-secondary-moderate`}></div>

              <div className="w-100px space-y-8px">
                <p className="truncate font-medium text-text-neutral-primary">{todo.name}</p>
                <p className="font-medium text-text-neutral-primary">{todo.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TodayTodoListData;
