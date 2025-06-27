import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoAdd } from 'react-icons/io5';
import { useUserCtx } from '@/contexts/user_context';
import { IAccountBook, IAccountBookWithTeam } from '@/interfaces/account_book';
import { ITodoAccountBook } from '@/interfaces/todo';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import DateTimePicker from '@/components/beta/todo_list_page/date_time_picker';
import { IPaginatedData } from '@/interfaces/pagination';
import loggerFront from '@/lib/utils/logger_front';

interface CreateTodoModalProps {
  toggleModal: () => void;
  getTodoList?: () => Promise<void>;
  defaultTodoName?: string;
  defaultAccountBook?: IAccountBook;
}

const CreateTodoModal = ({
  toggleModal,
  getTodoList,
  defaultTodoName,
  defaultAccountBook,
}: CreateTodoModalProps) => {
  const { t } = useTranslation(['dashboard']);
  const { userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [isLoading, setIsLoading] = useState(false);
  const [todoName, setTodoName] = useState(defaultTodoName || '');
  const [startTimeStamp, setStartTimeStamp] = useState<number>();
  const [endTimeStamp, setEndTimeStamp] = useState<number>();
  const [note, setNote] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accountBook, setAccountBook] = useState<IAccountBook | undefined>(
    defaultAccountBook || undefined
  );

  const [accountBookList, setAccountBookList] = useState<IAccountBookWithTeam[]>([]);
  const [noDataForTodoName, setNoDataForTodoName] = useState(false);
  const [noDataForStartTime, setNoDataForStartTime] = useState(false);
  const [noDataForEndTime, setNoDataForEndTime] = useState(false);

  const closeModal = () => {
    toggleModal();
  };

  // Info: (20241119 - Liz) 建立待辦事項 API
  const { trigger: createTodoAPI } = APIHandler<ITodoAccountBook>(APIName.CREATE_TODO);

  // Info: (20250306 - Liz) 打 API 取得使用者擁有的帳本清單(原為公司)
  const { trigger: getAccountBookListByUserIdAPI } = APIHandler<
    IPaginatedData<IAccountBookWithTeam[]>
  >(APIName.LIST_ACCOUNT_BOOK_BY_USER_ID);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleSubmit = async () => {
    if (!userAuth) return;
    if (isLoading) return;

    // Info: (20241219 - Liz) 檢查是否有未填寫的必填欄位
    if (!todoName || !startTimeStamp || !endTimeStamp) {
      setNoDataForTodoName(!todoName);
      setNoDataForStartTime(!startTimeStamp);
      setNoDataForEndTime(!endTimeStamp);
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: createdTodo,
        success,
        code,
      } = await createTodoAPI({
        params: { userId: userAuth.id },
        body: {
          name: todoName,
          deadline: 0, // Info: (20241219 - Liz) 之後會捨棄 deadline 欄位，先傳 0
          startDate: startTimeStamp,
          endDate: endTimeStamp,
          accountBookId: accountBook?.id,
          note,
        },
      });

      if (success) {
        // Info: (20241119 - Liz) 新增待辦事項成功後關閉 Modal、重新取得待辦事項清單
        closeModal();
        if (getTodoList) await getTodoList();

        loggerFront.log('createTodoAPI success:', createdTodo);
      } else {
        // Info: (20241119 - Liz) 新增待辦事項失敗時顯示錯誤訊息
        toastHandler({
          id: 'create-todo-failed',
          type: ToastType.ERROR,
          content: <p>Create todo failed. Error code: {code}</p>,
          closeable: true,
          position: ToastPosition.TOP_CENTER,
        });
      }
    } catch (error) {
      loggerFront.error('createTodoAPI error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userAuth) return;

    const getAccountBookList = async () => {
      try {
        const { data, success, code } = await getAccountBookListByUserIdAPI({
          params: { userId: userAuth.id },
          query: { page: 1, pageSize: 999, simple: true },
        });

        const accountBookListData = data?.data ?? []; // Info: (20250306 - Liz) 取出帳本清單

        if (success && accountBookListData.length > 0) {
          // Info: (20241120 - Liz) 取得使用者擁有的帳本清單成功時更新帳本清單
          setAccountBookList(accountBookListData);
        } else {
          // Info: (20241120 - Liz) 取得使用者擁有的帳本清單失敗時顯示錯誤訊息
          loggerFront.log('取得使用者擁有的帳本清單 failed:', code);
        }
      } catch (error) {
        loggerFront.error('取得使用者擁有的帳本清單 error:', error);
      }
    };

    getAccountBookList();
  }, [userAuth]);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="w-90vw overflow-hidden rounded-lg tablet:w-auto">
        <header className="flex items-center justify-between bg-surface-neutral-surface-lv2 px-40px pb-24px pt-40px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:TODO_LIST_PAGE.ADD_NEW_EVENT')}
          </h1>
          <button type="button" onClick={closeModal}>
            <IoCloseOutline size={24} />
          </button>
        </header>

        <div className="max-h-65vh overflow-y-auto bg-surface-neutral-surface-lv2 px-40px pb-40px tablet:w-400px">
          <main className="flex flex-col gap-40px">
            <section className="flex flex-col gap-24px">
              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:TODO_LIST_PAGE.EVENT_NAME')}
                  <span className="text-text-state-error"> *</span>
                </h4>
                <input
                  type="text"
                  placeholder={t('dashboard:TODO_LIST_PAGE.ENTER_NAME')}
                  className={`rounded-sm border bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected ${noDataForTodoName ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
                  value={todoName}
                  onChange={(e) => setTodoName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:TODO_LIST_PAGE.START_TIME')}
                  <span className="text-text-state-error"> *</span>
                </h4>
                <DateTimePicker setTimeStamp={setStartTimeStamp} isAlert={noDataForStartTime} />
              </div>

              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:TODO_LIST_PAGE.END_TIME')}
                  <span className="text-text-state-error"> *</span>
                </h4>
                <DateTimePicker setTimeStamp={setEndTimeStamp} isAlert={noDataForEndTime} />
              </div>

              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:TODO_LIST_PAGE.AFFILIATED_COMPANY')}
                </h4>

                <div className="relative flex">
                  <button
                    type="button"
                    className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected disabled:cursor-not-allowed disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
                    onClick={toggleDropdown}
                    disabled={defaultAccountBook !== undefined}
                  >
                    <p className="px-12px py-10px text-base font-medium">
                      {accountBook?.name || t('dashboard:TODO_LIST_PAGE.SELECT_COMPANY')}
                    </p>

                    {defaultAccountBook === undefined && (
                      <div className="px-12px py-10px">
                        {isDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                      </div>
                    )}
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute inset-x-0 top-full z-10 mt-8px">
                      <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
                        {accountBookList.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setAccountBook(item);
                              toggleDropdown();
                            }}
                            className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-8px">
                <h4 className="font-semibold text-input-text-primary">
                  {t('dashboard:TODO_LIST_PAGE.NOTE')}
                </h4>
                <input
                  type="text"
                  placeholder={t('dashboard:TODO_LIST_PAGE.ENTER_TEXT')}
                  className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </section>

            <section className="flex justify-end gap-12px">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
              >
                {t('dashboard:COMMON.CANCEL')}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
              >
                <span>{t('dashboard:COMMON.ADD')}</span>
                <IoAdd size={16} />
              </button>
            </section>
          </main>
        </div>
      </div>
    </main>
  );
};

export default CreateTodoModal;
