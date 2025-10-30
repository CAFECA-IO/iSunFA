import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { FiSearch } from 'react-icons/fi';
import { IoAdd } from 'react-icons/io5';
import { Button } from '@/components/button/button';
import CreateTodoModal from '@/components/beta/todo_list_page/create_todo_modal';
import UpdateTodoModal from '@/components/beta/todo_list_page/update_todo_modal';
import TodoList from '@/components/beta/todo_list_page/todo_list';
import { ITodoAccountBook } from '@/interfaces/todo';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import MessageModal from '@/components/message_modal/message_modal';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import { TbArrowBackUp } from 'react-icons/tb';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerFront from '@/lib/utils/logger_front';

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
  const router = useRouter();
  const { userAuth } = useUserCtx();
  const [todoList, setTodoList] = useState<ITodoAccountBook[]>([]);
  const [isCreateTodoModalOpen, setIsCreateTodoModalOpen] = useState(false);
  const [todoToUpdate, setTodoToUpdate] = useState<ITodoAccountBook | undefined>(undefined);
  const [todoToDelete, setTodoToDelete] = useState<ITodoAccountBook | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const userId = userAuth?.id;

  // Info: (20241225 - Liz) 篩選出符合搜尋關鍵字的待辦事項
  const filteredTodoList = todoList.filter((todo) =>
    todo.name.toLowerCase().includes(searchKeyword.toLowerCase().trim())
  );

  const isNoData = filteredTodoList.length === 0;
  const toggleCreateTodoModal = () => setIsCreateTodoModalOpen((prev) => !prev);

  const closeDeleteModal = () => {
    setTodoToDelete(undefined);
  };

  const goBack = () => router.push(ISUNFA_ROUTE.DASHBOARD);

  // Info: (20241125 - Liz) 刪除待辦事項 API
  const { trigger: deleteTodoAPI } = APIHandler<ITodoAccountBook>(APIName.DELETE_TODO);

  // Info: (20241121 - Liz) 打 API 取得待辦事項清單
  const { trigger: listUserTodoAPI } = APIHandler<ITodoAccountBook[]>(APIName.TODO_LIST);

  const getTodoList = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: userTodoList, success } = await listUserTodoAPI({ params: { userId } });

      if (success && userTodoList) {
        userTodoList.sort((a, b) => a.endTime - b.endTime);

        setTodoList(userTodoList);
      } else {
        loggerFront.log('取得待辦事項清單失敗');
      }
    } catch (error) {
      (error as Error).message += ' (from getTodoList)';
      loggerFront.error('取得待辦事項清單失敗');
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
      (error as Error).message += ' (from deleteTodo)';
      loggerFront.error('刪除待辦事項失敗');
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
    <main className="flex min-h-full flex-col gap-lv-6 tablet:gap-40px">
      {/* Info: (20250618 - Julian) Mobile back button */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('dashboard:TODO_LIST_PAGE.TODO_LIST_TITLE')}
        </p>
      </div>

      <section className="flex flex-col items-center gap-lv-6 tablet:flex-row tablet:gap-40px">
        <div className="flex w-full flex-auto items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="text"
            placeholder={t('dashboard:HEADER.SEARCH')}
            className="grow rounded-l-sm bg-transparent px-12px py-10px outline-none"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />

          <button type="button" className="px-12px py-10px">
            <FiSearch size={20} />
          </button>
        </div>

        <Button
          variant="tertiary"
          size="default"
          onClick={toggleCreateTodoModal}
          className="w-full tablet:w-fit"
        >
          <IoAdd size={20} />
          <p>{t('dashboard:TODO_LIST_PAGE.NEW_EVENT')}</p>
        </Button>
      </section>

      <section className="flex items-center gap-16px">
        <div className="flex items-center gap-8px text-sm text-divider-text-lv-2">
          <Image src={'/icons/event_list.svg'} width={16} height={16} alt="event_list"></Image>
          <h3>{t('dashboard:TODO_LIST_PAGE.UPCOMING_EVENTS')}</h3>
        </div>

        <div className="h-1px grow bg-divider-stroke-lv-4"></div>
      </section>

      {isNoData ? (
        <NoData />
      ) : (
        <TodoList
          todoList={filteredTodoList}
          setTodoToUpdate={setTodoToUpdate}
          setTodoToDelete={setTodoToDelete}
        />
      )}

      {/* Info: (20241219 - Liz) Modals */}

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
