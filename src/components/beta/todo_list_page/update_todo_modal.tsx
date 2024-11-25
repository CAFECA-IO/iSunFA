import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IoCloseOutline, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { useUserCtx } from '@/contexts/user_context';
import { ICompany, ICompanyAndRole } from '@/interfaces/company';
import { ITodoCompany } from '@/interfaces/todo';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';

interface UpdateTodoModalProps {
  todoToUpdate: ITodoCompany;
  isModalOpen: boolean;
  setTodoToUpdate: React.Dispatch<React.SetStateAction<ITodoCompany | undefined>>;
  getTodoList: () => void;
}

const UpdateTodoModal = ({
  todoToUpdate,
  isModalOpen,
  setTodoToUpdate,
  getTodoList,
}: UpdateTodoModalProps) => {
  const { t } = useTranslation(['dashboard']);
  const { userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [isLoading, setIsLoading] = useState(false);
  const [todoName, setTodoName] = useState(todoToUpdate.name);
  const [deadline, setDeadline] = useState<IDatePeriod>({
    startTimeStamp: todoToUpdate.deadline,
    endTimeStamp: todoToUpdate.deadline,
  });
  const [note, setNote] = useState(todoToUpdate.note);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [company, setCompany] = useState<ICompany>(todoToUpdate.company);
  const [companyAndRoleList, setCompanyAndRoleList] = useState<ICompanyAndRole[]>([]);
  const [noDataForTodoName, setNoDataForTodoName] = useState(false);
  const [noDataForDeadline, setNoDataForDeadline] = useState(false);

  const closeUpdateTodoModal = () => {
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

    const isDeadlineSelected = Object.values(deadline).every((value) => value !== 0);
    if (!todoName || !isDeadlineSelected) {
      setNoDataForTodoName(!todoName);
      setNoDataForDeadline(!isDeadlineSelected);
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
          deadline: deadline.startTimeStamp,
          companyId: company?.id,
          note,
        },
      });

      if (success && updatedTodo) {
        setTodoName(updatedTodo.name);
        setDeadline({ startTimeStamp: updatedTodo.deadline, endTimeStamp: updatedTodo.deadline });
        setNote(updatedTodo.note);
        setCompany(updatedTodo.company);
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

  return isModalOpen ? (
    <main className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
      <div className="flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:TODO_LIST_PAGE.EDIT_MY_EVENT')}
          </h1>
          <button type="button" onClick={closeUpdateTodoModal}>
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
              className={`rounded-sm border bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none ${noDataForTodoName ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
              value={todoName}
              onChange={(e) => setTodoName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:TODO_LIST_PAGE.DEADLINE')}
              <span className="text-text-state-error"> *</span>
            </h4>

            <DatePicker
              type={DatePickerType.TEXT_DATE}
              period={deadline}
              setFilteredPeriod={setDeadline}
              btnClassName={`${noDataForDeadline && 'border-input-stroke-error'}`}
            />
          </div>

          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              {t('dashboard:TODO_LIST_PAGE.AFFILIATED_COMPANY')}
            </h4>

            <div className="relative flex">
              <button
                type="button"
                className="flex flex-auto items-center justify-between rounded-sm border border-input-stroke-input bg-input-surface-input-background text-dropdown-text-input-filled shadow-Dropshadow_SM"
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
                <div className="absolute inset-0 top-full z-10 flex h-max w-full translate-y-8px flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_SM">
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
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </section>

        <section className="flex justify-end gap-12px px-20px py-16px">
          <button
            type="button"
            onClick={closeUpdateTodoModal}
            className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
          >
            {t('dashboard:COMMON.CANCEL')}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          >
            {t('dashboard:COMMON.SAVE')}
          </button>
        </section>
      </div>
    </main>
  ) : null;
};

export default UpdateTodoModal;
