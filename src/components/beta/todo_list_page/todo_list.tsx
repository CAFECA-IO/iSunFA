import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiEdit, FiTrash2, FiShare2 } from 'react-icons/fi';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { ITodoCompany } from '@/interfaces/todo';

interface TodoProps {
  todo: ITodoCompany;
}

const Todo = ({ todo }: TodoProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex divide-x-2 divide-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
      <div className="flex w-120px items-center justify-center px-16px pb-8px pt-16px">
        <CalendarIcon timestamp={todo.deadline} />
      </div>

      <div className="flex grow items-center truncate px-16px py-8px text-base font-semibold text-surface-brand-secondary">
        <p>{todo.name}</p>
      </div>

      <div className="flex w-160px items-center px-16px py-8px text-xs font-semibold text-text-neutral-primary">
        {todo.company.id === 555 ? (
          <h5>{t('dashboard:TODO_LIST_PAGE.NO_COMPANY')}</h5>
        ) : (
          <div key={todo.company.id} className="flex items-center justify-center gap-8px">
            <Image src={todo.company.imageId} width={24} height={24} alt="company_logo"></Image>
            <h5 className="truncate">{todo.company.name}</h5>
          </div>
        )}
      </div>

      <div className="flex w-160px items-center justify-center gap-12px px-16px py-8px text-xs font-medium text-icon-surface-single-color-primary">
        <button type="button">
          <FiEdit size={16} />
        </button>
        <button type="button">
          <FiShare2 size={16} />
        </button>
        <button type="button">
          <FiTrash2 size={16} />
        </button>
      </div>
    </section>
  );
};

interface TodoListProps {
  todoList: ITodoCompany[];
}

const TodoList = ({ todoList }: TodoListProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="overflow-hidden rounded-md border shadow-Dropshadow_XS">
      <section className="flex items-center divide-x-2 divide-stroke-neutral-quaternary bg-surface-brand-secondary-5">
        <div className="w-120px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          {t('dashboard:TODO_LIST_PAGE.DEADLINE')}
        </div>

        <div className="grow px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          {t('dashboard:TODO_LIST_PAGE.EVENT_NAME')}
        </div>

        <div className="w-160px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          {t('dashboard:TODO_LIST_PAGE.AFFILIATED_COMPANY')}
        </div>

        <div className="w-160px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          {t('dashboard:TODO_LIST_PAGE.ACTION')}
        </div>
      </section>

      <div className="divide-y-2 divide-stroke-neutral-quaternary">
        {todoList.map((todo) => (
          <Todo key={todo.id} todo={todo} />
        ))}
      </div>
    </div>
  );
};

export default TodoList;
