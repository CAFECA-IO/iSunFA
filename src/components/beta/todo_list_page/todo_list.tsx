import { useTranslation } from 'next-i18next';
import { ITodoAccountBook } from '@/interfaces/todo';
import Todo from '@/components/beta/todo_list_page/todo';
import { Dispatch, SetStateAction } from 'react';

interface TodoListProps {
  todoList: ITodoAccountBook[];
  setTodoToUpdate: Dispatch<SetStateAction<ITodoAccountBook | undefined>>;
  setTodoToDelete: Dispatch<SetStateAction<ITodoAccountBook | undefined>>;
}

const TodoList = ({ todoList, setTodoToUpdate, setTodoToDelete }: TodoListProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="w-full overflow-x-auto rounded-md shadow-Dropshadow_XS">
      <div className="w-max overflow-hidden rounded-md border tablet:w-full">
        <section className="flex items-center divide-x divide-stroke-neutral-quaternary border-b border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1">
          <div className="w-120px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
            {t('dashboard:TODO_LIST_PAGE.DEADLINE')}
          </div>

          <div className="min-w-220px grow px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
            {t('dashboard:TODO_LIST_PAGE.EVENT_NAME')}
          </div>

          <div className="w-160px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
            {t('dashboard:TODO_LIST_PAGE.AFFILIATED_COMPANY')}
          </div>

          <div className="w-160px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
            {t('dashboard:TODO_LIST_PAGE.ACTION')}
          </div>
        </section>

        <div className="">
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
    </div>
  );
};

export default TodoList;
