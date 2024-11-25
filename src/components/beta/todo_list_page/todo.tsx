import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiEdit, FiTrash2, FiShare2 } from 'react-icons/fi';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { ITodoCompany } from '@/interfaces/todo';
import { Dispatch, SetStateAction } from 'react';

interface TodoProps {
  todo: ITodoCompany;
  setTodoToUpdate: Dispatch<SetStateAction<ITodoCompany | undefined>>;
  setTodoToDelete: Dispatch<SetStateAction<ITodoCompany | undefined>>;
}

const Todo = ({ todo, setTodoToUpdate, setTodoToDelete }: TodoProps) => {
  const { t } = useTranslation('dashboard');

  const openUpdateTodoModal = () => {
    setTodoToUpdate(todo);
  };

  const openDeleteTodoModal = () => {
    setTodoToDelete(todo);
  };

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
          <div key={todo.company.id} className="flex items-center justify-start gap-8px truncate">
            <Image src={todo.company.imageId} width={24} height={24} alt="company_logo"></Image>
            <h5 className="truncate">{todo.company.name}</h5>
          </div>
        )}
      </div>

      <div className="flex w-160px items-center justify-center gap-12px px-16px py-8px text-xs font-medium text-icon-surface-single-color-primary">
        <button type="button" onClick={openUpdateTodoModal}>
          <FiEdit size={16} />
        </button>
        <button type="button">
          <FiShare2 size={16} />
        </button>
        <button type="button" onClick={openDeleteTodoModal}>
          <FiTrash2 size={16} />
        </button>
      </div>
    </section>
  );
};

export default Todo;
