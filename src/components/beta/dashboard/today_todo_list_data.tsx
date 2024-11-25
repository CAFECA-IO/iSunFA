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

const NoData = () => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-24px">
      <div className="flex justify-between">
        <h3 className="text-xl font-bold text-text-neutral-secondary">
          {t('dashboard:DASHBOARD.TO_DO_LIST')}
        </h3>
        <MoreLink href={ISUNFA_ROUTE.TODO_LIST_PAGE} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex w-64px justify-center pt-5px">
          <CalendarIcon timestamp={Date.now() / 1000} />
        </div>

        <p className="text-base font-medium text-text-neutral-mute">
          {t('dashboard:DASHBOARD.NO_SCHEDULE_FOR_TODAY')}
        </p>
      </div>
    </section>
  );
};

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
          // Deprecated: (20241125 - Liz)
          // eslint-disable-next-line no-console
          console.log('取得所有待辦事項列表成功:', userTodoList);

          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0); // ToDo: (20241122 - Liz) 設定今天的開始時間 (00:00:00)

          const todayEnd = new Date(todayStart);
          todayEnd.setHours(23, 59, 59, 999); // ToDo: (20241122 - Liz) 設定今天的結束時間 (23:59:59)

          const todayStartTimeStamps = todayStart.getTime(); // ToDo: (20241122 - Liz) 今天開始時間的時間戳
          const todayEndTimeStamps = todayEnd.getTime(); // ToDo: (20241122 - Liz) 今天結束時間的時間戳

          // Info: (20241123 - Liz) 篩選出今天的待辦事項
          const todayTodoListData = userTodoList.filter((todo) => {
            // ToDo: (20241122 - Liz) 預期之後回傳的 todo 會有 startTime (13 位數豪秒級時間戳)，就可以直接改用這段程式碼，而不用 deadline
            // const startTime = todo.startTime;
            // const isToday = startTime >= todayStartTimeStamps && startTime <= todayEndTimeStamps;

            const deadlineTimeStamps = todo.deadline * 1000;
            const isToday =
              deadlineTimeStamps >= todayStartTimeStamps &&
              deadlineTimeStamps <= todayEndTimeStamps;
            return isToday;
          });

          // Info: (20241122 - Liz) 依照 deadline 升冪排序
          todayTodoListData.sort((a, b) => a.deadline - b.deadline);

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
      const now = Date.now(); // 當前時間(毫秒級時間戳)

      // Info: (20241122 - Liz) 篩選出未過期的 todo
      const notExpiredTodoList = todayTodoList.filter((todo) => {
        // ToDo: (20241122 - Liz) 預期之後回傳的 todo 會有 endTime (13 位數 豪秒級時間戳) 就可以直接改用這段程式碼
        // const endTime = todo.endTime;
        // const isNotExpired = endTime >= now; // 未過期
        // return isNotExpired && isToday;

        const deadlineTimeStamps = todo.deadline * 1000;
        const isNotExpired = deadlineTimeStamps >= now;
        return isNotExpired;
      });

      setFilterTodoList(notExpiredTodoList);
    };

    const timer = setInterval(refreshTodoList, MILLISECONDS_IN_A_MINUTE);

    return () => {
      if (timer) clearTimeout(timer);
    };
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

  if (!isToDoListHasPlan) return <NoData />;

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
