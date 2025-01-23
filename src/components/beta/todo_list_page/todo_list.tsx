import { useTranslation } from 'next-i18next';
import { ITodoCompany } from '@/interfaces/todo';
import Todo from '@/components/beta/todo_list_page/todo';
import { Dispatch, SetStateAction } from 'react';

interface TodoListProps {
  todoList: ITodoCompany[];
  setTodoToUpdate: Dispatch<SetStateAction<ITodoCompany | undefined>>;
  setTodoToDelete: Dispatch<SetStateAction<ITodoCompany | undefined>>;
}

const TodoList = ({ todoList, setTodoToUpdate, setTodoToDelete }: TodoListProps) => {
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
          <Todo
            key={todo.id}
            todo={todo}
            setTodoToUpdate={setTodoToUpdate}
            setTodoToDelete={setTodoToDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default TodoList;
