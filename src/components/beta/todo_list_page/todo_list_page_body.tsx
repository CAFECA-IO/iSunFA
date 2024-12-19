import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { FiSearch } from 'react-icons/fi';
import { IoAdd } from 'react-icons/io5';
import { Button } from '@/components/button/button';
import CreateTodoModal from '@/components/beta/todo_list_page/create_todo_modal';
import UpdateTodoModal from '@/components/beta/todo_list_page/update_todo_modal';
import TodoList from '@/components/beta/todo_list_page/todo_list';
import { ITodoCompany } from '@/interfaces/todo';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';

const NoData = () => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex flex-auto flex-col items-center justify-center gap-16px">
      <Image src={'/images/empty.svg'} alt="no_data" width={120} height={134.787}></Image>

      <p>{t('dashboard:TODO_LIST_PAGE.NO_PENDING_TASKS')}</p>
    </div>
  );
};

const TodoListPageBody = () => {
  const { t } = useTranslation('dashboard');
  const { userAuth } = useUserCtx();
  const [todoList, setTodoList] = useState<ITodoCompany[]>([]);
  const [isCreateTodoModalOpen, setIsCreateTodoModalOpen] = useState(false);
  const [todoToUpdate, setTodoToUpdate] = useState<ITodoCompany | undefined>(undefined);
  const [todoToDelete, setTodoToDelete] = useState<ITodoCompany | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const userId = userAuth?.id;
  const isNoData = todoList.length === 0;
  const toggleCreateTodoModal = () => setIsCreateTodoModalOpen((prev) => !prev);

  const closeDeleteModal = () => {
    setTodoToDelete(undefined);
  };

  // Info: (20241125 - Liz) 刪除待辦事項 API
  const { trigger: deleteTodoAPI } = APIHandler<ITodoCompany>(APIName.DELETE_TODO);

  // Info: (20241121 - Liz) 打 API 取得待辦事項列表
  const { trigger: listUserTodoAPI } = APIHandler<ITodoCompany[]>(APIName.TODO_LIST);

  const getTodoList = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: userTodoList, success } = await listUserTodoAPI({ params: { userId } });

      if (success && userTodoList) {
        userTodoList.sort((a, b) => a.endTime - b.endTime);

        setTodoList(userTodoList);
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
  }, [userId]);

  useEffect(() => {
    getTodoList();
  }, [getTodoList]);

  const deleteTodo = async () => {
    if (!todoToDelete) return;
    if (isLoading) return;

    setIsLoading(true);

    try {
      const { data: deletedTodo, success } = await deleteTodoAPI({
        params: { todoId: todoToDelete.id },
      });

      if (success && deletedTodo) {
        closeDeleteModal();
        getTodoList();
      }
    } catch (error) {
      // Deprecated: (20241125 - Liz)
      // eslint-disable-next-line no-console
      console.log('刪除待辦事項失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const messageModalData: IMessageModal = {
    title: t('dashboard:TODO_LIST_PAGE.DELETE_MESSAGE_TITLE'),
    content: t('dashboard:TODO_LIST_PAGE.DELETE_MESSAGE_CONTENT'),
    submitBtnStr: t('dashboard:COMMON.DELETE'),
    submitBtnFunction: deleteTodo,
    messageType: MessageType.WARNING,
    backBtnFunction: closeDeleteModal,
    backBtnStr: t('dashboard:COMMON.CANCEL'),
  };

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="flex items-center gap-40px">
        <div className="flex flex-auto items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="text"
            placeholder="Search"
            className="grow rounded-l-sm bg-transparent px-12px py-10px outline-none"
          />

          <button type="button" className="px-12px py-10px">
            <FiSearch size={20} />
          </button>
        </div>

        <Button variant="tertiary" size="default" onClick={toggleCreateTodoModal}>
          <IoAdd size={20} />
          <p>{t('dashboard:TODO_LIST_PAGE.NEW_EVENT')}</p>
        </Button>
      </section>

      <section className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <Image src={'/icons/event_list.svg'} width={16} height={16} alt="event_list"></Image>
          <h3>{t('dashboard:TODO_LIST_PAGE.UPCOMING_EVENTS')}</h3>
        </div>

        <div className="h-1px grow bg-divider-stroke-lv-1"></div>
      </section>

      {isNoData ? (
        <NoData />
      ) : (
        <TodoList
          todoList={todoList}
          setTodoToUpdate={setTodoToUpdate}
          setTodoToDelete={setTodoToDelete}
        />
      )}

      {/* Modals */}

      {isCreateTodoModalOpen && (
        <CreateTodoModal toggleModal={toggleCreateTodoModal} getTodoList={getTodoList} />
      )}

      {todoToUpdate && (
        <UpdateTodoModal
          todoToUpdate={todoToUpdate}
          setTodoToUpdate={setTodoToUpdate}
          getTodoList={getTodoList}
        />
      )}

      {todoToDelete && (
        <MessageModal
          messageModalData={messageModalData}
          isModalVisible={!!todoToDelete}
          modalVisibilityHandler={closeDeleteModal}
        />
      )}
    </main>
  );
};

export default TodoListPageBody;
