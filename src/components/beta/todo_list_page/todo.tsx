import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiEdit, FiTrash2, FiShare2 } from 'react-icons/fi';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { ITodoAccountBook } from '@/interfaces/todo';
import { Dispatch, SetStateAction } from 'react';

const formatDateForGoogleCalendar = (date: number) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Info: (20241224 - Liz) months are 0-indexed
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}00`; // Info: (20241224 - Liz) Format: YYYYMMDDTHHMMSS
};

interface TodoProps {
  todo: ITodoAccountBook;
  setTodoToUpdate: Dispatch<SetStateAction<ITodoAccountBook | undefined>>;
  setTodoToDelete: Dispatch<SetStateAction<ITodoAccountBook | undefined>>;
}

const Todo = ({ todo, setTodoToUpdate, setTodoToDelete }: TodoProps) => {
  const { t } = useTranslation('dashboard');
  const unixTimeStamp = Math.floor(todo.endTime / 1000); // Info: (20241218 - Liz) 月曆元件需要 unix timestamp 格式(秒級)

  const openUpdateTodoModal = () => {
    setTodoToUpdate(todo);
  };

  const openDeleteTodoModal = () => {
    setTodoToDelete(todo);
  };

  const shareToGoogleCalendar = () => {
    const startTime = formatDateForGoogleCalendar(todo.startTime);
    const endTime = formatDateForGoogleCalendar(todo.endTime);
    const eventTitle = encodeURIComponent(todo.name);
    const companyName =
      !todo.company || (todo.company && todo.company?.id === 555)
        ? ''
        : (todo.company?.name || '') + ':';
    const eventDetails = encodeURIComponent(companyName + todo.note || '');
    const timeZone = 'Asia/Taipei';

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDetails}&dates=${startTime}/${endTime}&ctz=${timeZone}`;

    // Info: (20241224 - Liz) 在新視窗開啟 Google 日曆新增事件頁面
    window.open(googleCalendarUrl, '_blank');
  };

  return (
    <section className="flex bg-surface-neutral-surface-lv2">
      <div className="flex w-120px items-center justify-center px-16px pb-8px pt-16px">
        <CalendarIcon timestamp={unixTimeStamp} incomplete={false} />
      </div>

      <div className="flex min-w-220px grow items-center truncate px-16px py-8px text-base font-semibold text-surface-brand-secondary">
        <p>{todo.name}</p>
      </div>

      <div className="flex w-160px items-center px-16px py-8px text-xs font-semibold text-text-neutral-primary">
        {!todo.company || (todo.company && todo.company?.id === 555) ? (
          <h5>{t('dashboard:TODO_LIST_PAGE.NO_COMPANY')}</h5>
        ) : (
          <div key={todo.company.id} className="flex items-center justify-start gap-8px truncate">
            <Image
              src={todo.company.imageId}
              width={24}
              height={24}
              alt="company_logo"
              className="rounded-xxs border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2"
            ></Image>
            <h5 className="truncate">{todo.company.name}</h5>
          </div>
        )}
      </div>

      <div className="flex w-160px items-center justify-center gap-12px px-16px py-8px text-xs font-medium text-icon-surface-single-color-primary">
        <button type="button" onClick={openUpdateTodoModal}>
          <FiEdit size={16} />
        </button>
        <button type="button">
          <FiShare2 size={16} onClick={shareToGoogleCalendar} />
        </button>
        <button type="button" onClick={openDeleteTodoModal}>
          <FiTrash2 size={16} />
        </button>
      </div>
    </section>
  );
};

export default Todo;
