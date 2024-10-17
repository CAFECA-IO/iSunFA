import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { PiLinkBold } from 'react-icons/pi';

const ToDoListNotLink = () => {
  return (
    <section className="flex flex-col gap-24px">
      <h3 className="text-xl font-bold text-text-neutral-secondary">To-do list</h3>

      <div className="flex flex-col items-center gap-8px">
        <p className="font-medium text-text-neutral-mute">Calendar not yet linked.</p>
        <button type="button" className="flex items-center gap-8px text-text-neutral-link">
          <PiLinkBold size={16} />
          <p className="font-medium">Link My Calendar</p>
        </button>
      </div>
    </section>
  );
};

const ToDoListEmpty = () => {
  return (
    <section className="flex flex-col gap-24px">
      <div className="flex justify-between">
        <h3 className="text-xl font-bold text-text-neutral-secondary">To-do list</h3>
        <MoreLink href={'/'} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex w-64px justify-center pt-5px">
          <CalendarIcon timestamp={1704038400} />
        </div>

        <p className="text-base font-medium text-text-neutral-mute">No schedule for today</p>
      </div>
    </section>
  );
};

const ToDoListHasPlan = () => {
  const planList = [
    {
      id: 1,
      title: 'Doc Plan 12345678910',
      time: '14:00',
      color: 'bg-surface-brand-secondary-moderate',
    },
    {
      id: 2,
      title: 'Close Meeting',
      time: '17:30-18:00',
      color: 'bg-surface-brand-primary-soft',
    },
  ];

  return (
    <section className="flex flex-col gap-24px">
      <div className="flex justify-between">
        <h3 className="text-xl font-bold text-text-neutral-secondary">To-do list</h3>
        <MoreLink href={'/'} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex w-64px flex-none justify-center pt-5px">
          <CalendarIcon timestamp={1704038400} />
        </div>

        {planList.map((plan) => (
          <div key={plan.id} className="flex gap-16px">
            <div className={`w-10px rounded-xs ${plan.color}`}></div>

            <div className="w-120px space-y-8px">
              <p className="truncate font-medium text-text-neutral-primary">{plan.title}</p>
              <p className="font-medium text-text-neutral-primary">{plan.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ToDoList = () => {
  // Info: (20241017 - Liz) 判斷元件顯示流程
  // 1. 如果 isToDoListLink 為 false，顯示 ToDoListNotLink 元件
  // 2. isToDoListLink 為 true，則判斷 toDoList 是否有值，並把判斷結果存在變數 isToDoListHasPlan
  // 3. 如果 isToDoListHasPlan 為 true，顯示 ToDoListHasPlan 元件；如果為 false，顯示 ToDoListEmpty 元件

  /* === Fake Data === */
  // Deprecated: (20241017 - Liz) 這是假資料，等之後串真正資料後再刪除
  const isToDoListLink = false;
  const isToDoListHasPlan = true;

  if (!isToDoListLink) {
    return (
      <DashboardCardLayout>
        <ToDoListNotLink />
      </DashboardCardLayout>
    );
  }

  if (isToDoListHasPlan) {
    return (
      <DashboardCardLayout>
        <ToDoListHasPlan />
      </DashboardCardLayout>
    );
  }

  return (
    <DashboardCardLayout>
      <ToDoListEmpty />
    </DashboardCardLayout>
  );
};

export default ToDoList;
