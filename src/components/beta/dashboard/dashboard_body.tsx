// import Announcement from '@/components/beta/dashboard/announcement'; // ToDo: (20250310 - Liz) 目前沒有跑馬燈功能，故先隱藏
import MyAccountBookList from '@/components/beta/dashboard/my_account_books';
import PendingTask from '@/components/beta/dashboard/pending_task';
import TodayTodoList from '@/components/beta/dashboard/today_todo_list';
import LatestNews from '@/components/beta/dashboard/latest_news';
import { useEffect, useState, useCallback } from 'react';
import { ITodoAccountBook } from '@/interfaces/todo';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

const DashboardBody = () => {
  const { userAuth } = useUserCtx();
  const [todayTodoList, setTodayTodoList] = useState<ITodoAccountBook[]>([]);

  // Info: (20241122 - Liz) 打 API 取得待辦事項清單
  const { trigger: listUserTodoAPI } = APIHandler<ITodoAccountBook[]>(APIName.TODO_LIST);

  const getTodoList = useCallback(async () => {
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
        console.log('取得待辦事項清單失敗');
      }
    } catch (error) {
      // Deprecated: (20241121 - Liz)
      // eslint-disable-next-line no-console
      console.log('取得待辦事項清單失敗');
    }
  }, [userAuth]);

  useEffect(() => {
    getTodoList();
  }, [getTodoList]);

  return (
    <div className="flex w-100% flex-col gap-40px">
      {/* ToDo: (20250401 - Liz) 目前沒有跑馬燈功能，故先隱藏 */}
      {/* <Announcement /> */}
      <MyAccountBookList />

      <div className="flex flex-wrap gap-24px">
        <section className="flex flex-auto flex-col gap-24px">
          <TodayTodoList todayTodoList={todayTodoList} />
          <LatestNews />
        </section>

        <section className="flex flex-auto">
          <PendingTask getTodoList={getTodoList} />
        </section>
      </div>
    </div>
  );
};

export default DashboardBody;
