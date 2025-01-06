import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp, IoSaveOutline } from 'react-icons/io5';
import { useUserCtx } from '@/contexts/user_context';
import { ICompany, ICompanyAndRole } from '@/interfaces/company';
import { ITodoCompany } from '@/interfaces/todo';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import DateTimePicker from '@/components/beta/todo_list_page/date_time_picker';

interface UpdateTodoModalProps {
  todoToUpdate: ITodoCompany;
  setTodoToUpdate: React.Dispatch<React.SetStateAction<ITodoCompany | undefined>>;
  getTodoList: () => Promise<void>;
}

const UpdateTodoModal = ({ todoToUpdate, setTodoToUpdate, getTodoList }: UpdateTodoModalProps) => {
  const { t } = useTranslation(['dashboard']);
  const { userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [isLoading, setIsLoading] = useState(false);
  const [todoName, setTodoName] = useState(todoToUpdate.name);
  const [startTimeStamp, setStartTimeStamp] = useState<number | undefined>(todoToUpdate.startTime);
  const [endTimeStamp, setEndTimeStamp] = useState<number | undefined>(todoToUpdate.endTime);
  const [note, setNote] = useState(todoToUpdate.note);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [company, setCompany] = useState<ICompany>(todoToUpdate.company);
  const [companyAndRoleList, setCompanyAndRoleList] = useState<ICompanyAndRole[]>([]);
  const [noDataForTodoName, setNoDataForTodoName] = useState(false);
  const [noDataForStartTime, setNoDataForStartTime] = useState(false);
  const [noDataForEndTime, setNoDataForEndTime] = useState(false);

  const closeModal = () => {
    setTodoToUpdate(undefined);
  };

  // Info: (20241125 - Liz) 更新待辦事項 API
  const { trigger: updateTodoAPI } = APIHandler<ITodoCompany>(APIName.UPDATE_TODO);

  // Info: (20241120 - Liz) 打 API 取得使用者擁有的公司列表 (simple version)
  const { trigger: listUserCompanyAPI } = APIHandler<ICompanyAndRole[]>(APIName.LIST_USER_COMPANY);

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
        data: updatedTodo,
        success,
        code,
      } = await updateTodoAPI({
        params: { todoId: todoToUpdate.id },
        body: {
          name: todoName,
          deadline: 0, // Info: (20241219 - Liz) 之後會捨棄 deadline 欄位，先傳 0
          startTime: startTimeStamp,
          endTime: endTimeStamp,
          companyId: company?.id,
          note,
        },
      });

      if (success && updatedTodo) {
        setTodoToUpdate(undefined); // Info: (20241125 - Liz) 關閉 modal
        getTodoList(); // Info: (20241125 - Liz) 重新取得待辦事項列表

        // Deprecated: (20241125 - Liz)
        // eslint-disable-next-line no-console
        console.log('updateTodoAPI success:', updatedTodo);
      } else {
        // Info: (20241125 - Liz) 更新待辦事項失敗時顯示錯誤訊息
        toastHandler({
          id: 'update-todo-failed',
          type: ToastType.ERROR,
          content: <p>Update todo failed. Error code: {code}</p>,
          closeable: true,
          position: ToastPosition.TOP_CENTER,
        });
      }
    } catch (error) {
      // Deprecated: (20241125 - Liz)
      // eslint-disable-next-line no-console
      console.error('updateTodoAPI error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const getCompanyList = async () => {
      if (!userAuth) return;

      try {
        const {
          data: userCompanyList,
          success,
          code,
        } = await listUserCompanyAPI({
          params: { userId: userAuth.id },
          query: { simple: true },
        });

        if (success && userCompanyList && userCompanyList.length > 0) {
          // Info: (20241120 - Liz) 取得使用者擁有的公司列表成功時更新公司列表
          setCompanyAndRoleList(userCompanyList);
        } else {
          // Info: (20241120 - Liz) 取得使用者擁有的公司列表失敗時顯示錯誤訊息
          // Deprecated: (20241120 - Liz)
          // eslint-disable-next-line no-console
          console.log('listUserCompanyAPI(Simple) failed:', code);
        }
      } catch (error) {
        // Deprecated: (20241120 - Liz)
        // eslint-disable-next-line no-console
        console.error('listUserCompanyAPI(Simple) error:', error);
      }
    };

    getCompanyList();
  }, [userAuth]);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="overflow-hidden rounded-lg">
        <div className="flex max-h-80vh w-400px flex-col overflow-y-auto bg-surface-neutral-surface-lv2">
          <section className="flex items-center justify-between py-16px pl-40px pr-20px">
            <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
              {t('dashboard:TODO_LIST_PAGE.ADD_NEW_EVENT')}
            </h1>
            <button type="button" onClick={closeModal}>
              <IoCloseOutline size={24} />
            </button>
          </section>

          <section className="flex flex-col gap-24px px-40px py-16px">
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
              <DateTimePicker
                setTimeStamp={setStartTimeStamp}
                isAlert={noDataForStartTime}
                defaultTimestamp={startTimeStamp}
              />
            </div>

            <div className="flex flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:TODO_LIST_PAGE.END_TIME')}
                <span className="text-text-state-error"> *</span>
              </h4>
              <DateTimePicker
                setTimeStamp={setEndTimeStamp}
                isAlert={noDataForEndTime}
                defaultTimestamp={endTimeStamp}
              />
            </div>

            <div className="flex flex-col gap-8px">
              <h4 className="font-semibold text-input-text-primary">
                {t('dashboard:TODO_LIST_PAGE.AFFILIATED_COMPANY')}
              </h4>

              <div className="relative flex">
                <button
                  type="button"
                  className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected"
                  onClick={toggleDropdown}
                >
                  <p className="px-12px py-10px text-base font-medium">
                    {company?.name || t('dashboard:TODO_LIST_PAGE.SELECT_COMPANY')}
                  </p>

                  <div className="px-12px py-10px">
                    {isDropdownOpen ? <IoChevronUp size={20} /> : <IoChevronDown size={20} />}
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute inset-x-0 top-full z-10 mt-8px">
                    <div className="mb-20px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_SM">
                      {companyAndRoleList.map((item) => (
                        <button
                          key={item.company.id}
                          type="button"
                          onClick={() => {
                            setCompany(item.company);
                            toggleDropdown();
                          }}
                          className="rounded-xs px-12px py-8px text-left text-sm font-medium text-dropdown-text-input-filled hover:bg-dropdown-surface-item-hover"
                        >
                          {item.company.name}
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

          <section className="flex justify-end gap-12px px-20px py-16px">
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
              <IoSaveOutline size={16} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
};

export default UpdateTodoModal;
