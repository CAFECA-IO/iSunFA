import { useTranslation } from 'next-i18next';
import MoreLink from '@/components/beta/dashboard/more_link';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { ISUNFA_ROUTE } from '@/constants/url';
import { ITodoAccountBook } from '@/interfaces/todo';
import { useEffect, useState } from 'react';
import { MILLISECONDS_IN_A_MINUTE } from '@/constants/display';
import TodayTodoListNoData from '@/components/beta/dashboard/today_todo_list_no_data';

const getTimeFromTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp); // Info: (20241219 - Liz) 將毫秒級時間戳記轉換為 Date 物件
  const hours = date.getHours().toString().padStart(2, '0'); // Info: (20241219 - Liz) 獲取小時，並補零
  const minutes = date.getMinutes().toString().padStart(2, '0'); // Info: (20241219 - Liz) 獲取分鐘，並補零
  return `${hours}:${minutes}`; // Info: (20241219 - Liz) 格式化為 "HH:mm"
};

interface TodayTodoListDataProps {
  todayTodoList: ITodoAccountBook[];
}

const TodayTodoListData = ({ todayTodoList }: TodayTodoListDataProps) => {
  const { t } = useTranslation('dashboard');
  const [filterTodoList, setFilterTodoList] = useState<ITodoAccountBook[]>([]);

  // Info: (20241122 - Liz) 判斷是否有待辦事項
  const isToDoListHasPlan = filterTodoList.length > 0;

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
        <div className="flex w-64px shrink-0 justify-center pt-5px">
          <CalendarIcon timestamp={Date.now() / 1000} incomplete={false} />
        </div>

        <div className="flex flex-auto items-center gap-10px overflow-x-auto py-5px">
          {filterTodoList.map((todo, index) => {
            const timeOfStartTime = getTimeFromTimestamp(todo.startTime);
            const timeOfEndTime = getTimeFromTimestamp(todo.endTime);
            const isSameTime = timeOfStartTime === timeOfEndTime;
            const time = isSameTime ? timeOfEndTime : `${timeOfStartTime}-${timeOfEndTime}`;

            return (
              <div key={todo.id} className="flex gap-16px">
                <div
                  className={`w-10px rounded-xs ${index === 0 ? 'bg-surface-brand-secondary-moderate' : 'bg-surface-brand-primary-soft'}`}
                ></div>

                <div className="w-100px space-y-8px">
                  <p className="truncate font-medium text-text-neutral-primary">{todo.name}</p>
                  <p className="font-medium text-text-neutral-primary">{time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TodayTodoListData;
