import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import { ITeam } from '@/interfaces/team';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { IPaginatedData } from '@/interfaces/pagination';
import StepOneForm from '@/components/beta/account_books_page/step_one_form';
import { step1FormReducer, createInitialStep1FormState } from '@/constants/account_book';
import { IAccountBookWithTeam } from '@/interfaces/account_book';

interface AccountBookInfoModalProps {
  closeAccountBookInfoModal: () => void;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
  getAccountBookList?: () => void;
  accountBookToEdit?: IAccountBookWithTeam;
}

const AccountBookInfoModal = ({
  closeAccountBookInfoModal,
  setRefreshKey,
  getAccountBookList,
  accountBookToEdit,
}: AccountBookInfoModalProps) => {
  const { t } = useTranslation(['dashboard', 'city_district']);
  const { createAccountBook, updateAccountBook, userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [step1FormState, step1FormDispatch] = useReducer(
    step1FormReducer,
    createInitialStep1FormState(accountBookToEdit)
  );
  const [teamList, setTeamList] = useState<ITeam[]>([]);
  const [isCreateLoading, setIsCreateLoading] = useState<boolean>(false);
  const [isEditLoading, setIsEditLoading] = useState<boolean>(false);

  // Info: (20250303 - Liz) 取得團隊清單 API
  const { trigger: getTeamListAPI } = APIHandler<IPaginatedData<ITeam[]>>(APIName.LIST_TEAM);

  const {
    companyName,
    representativeName,
    taxId,
    taxSerialNumber,
    contactPerson,
    phoneNumber,
    tag,
    team,
    city,
    district,
    enteredAddress,
  } = step1FormState;

  // Info: (20250312 - Liz) 打 API 建立帳本(原為公司)
  const handleSubmit = async () => {
    if (isCreateLoading) return; // Info: (20250312 - Liz) 避免重複點擊
    setIsCreateLoading(true); // Info: (20250312 - Liz) 點擊後進入 loading 狀態
    if (!companyName || !taxId || !tag || !team) return;

    try {
      const { success, code, errorMsg } = await createAccountBook({
        name: companyName,
        taxId,
        tag,
        teamId: team.id, // Info: (20250312 - Liz) 選擇團隊
        fileId: 0,
        representativeName,
        taxSerialNumber,
        contactPerson,
        phoneNumber,
        city: city || '',
        district: district || '',
        enteredAddress,
      });

      if (!success) {
        // Info: (20241114 - Liz) 新增帳本失敗時顯示錯誤訊息
        toastHandler({
          id: 'create-company-failed',
          type: ToastType.ERROR,
          content: (
            <p>
              {`${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.CREATE_ACCOUNT_BOOK_FAILED')}!
              ${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ERROR_CODE')}: ${code}
              ${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ERROR_MESSAGE')}: ${errorMsg}`}
            </p>
          ),
          closeable: true,
          position: ToastPosition.TOP_CENTER,
        });
        return;
      }

      // Info: (20250421 - Liz) 新增帳本成功後清空表單並關閉 modal
      step1FormDispatch({ type: 'RESET' });
      closeAccountBookInfoModal();

      if (getAccountBookList) getAccountBookList(); // Info: (20241209 - Liz) 重新取得帳本清單

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241114 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)
    } catch (error) {
      // Deprecated: (20241104 - Liz)
      // eslint-disable-next-line no-console
      console.log('AccountBookInfoModal handleSubmit error:', error);
    } finally {
      // Info: (20241104 - Liz) API 回傳後解除 loading 狀態
      setIsCreateLoading(false);
    }
  };

  // Info: (20250526 - Liz) 打 API 更新帳本
  const handleEdit = async () => {
    if (!accountBookToEdit) return;
    if (isEditLoading) return; // Info: (20250526 - Liz) 避免重複點擊
    setIsEditLoading(true); // Info: (20250526 - Liz) 點擊後進入 loading 狀態
    if (!companyName || !taxId || !tag || !team) return; // Info: (20250526 - Liz) 確保必填欄位都有填寫

    try {
      const { success, code, errorMsg } = await updateAccountBook({
        accountBookId: `${accountBookToEdit.id}`,
        name: companyName,
        taxId,
        tag,
        fromTeamId: accountBookToEdit.team.id, // Info: (20250526 - Liz) 轉移帳本的原團隊 ID
        toTeamId: team.id, // Info: (20250526 - Liz) 轉移到的團隊 ID
        fileId: 0,
        representativeName,
        taxSerialNumber,
        contactPerson,
        phoneNumber,
        city: city ?? '',
        district: district ?? '',
        enteredAddress,
      });

      if (!success) {
        // Info: (20250526 - Liz) 更新帳本失敗時顯示錯誤訊息
        toastHandler({
          id: 'edit-account-book-failed',
          type: ToastType.ERROR,
          content: (
            <p>
              {`${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.UPDATE_ACCOUNT_BOOK_FAILED')}!
              ${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ERROR_CODE')}: ${code}
              ${t('dashboard:ACCOUNT_BOOK_INFO_MODAL.ERROR_MESSAGE')}: ${errorMsg}`}
            </p>
          ),
          closeable: true,
          position: ToastPosition.TOP_CENTER,
        });
        return;
      }

      // Info: (20250526 - Liz) 更新帳本成功後清空表單並關閉 modal
      step1FormDispatch({ type: 'RESET' });
      closeAccountBookInfoModal();

      if (getAccountBookList) getAccountBookList(); // Info: (20250526 - Liz) 重新取得帳本清單

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20250526 - Liz) This is a workaround to refresh the account book list after editing an account book (if use filterSection)
    } catch (error) {
      // Deprecated: (20250526 - Liz)
      // eslint-disable-next-line no-console
      console.log('AccountBookInfoModal handleEdit error:', error);
    } finally {
      // Info: (20250526 - Liz) API 回傳後解除 loading 狀態
      setIsEditLoading(false);
    }
  };

  // Info: (20250303 - Liz) 打 API 取得使用者的團隊清單
  useEffect(() => {
    if (!userAuth) return;
    const getTeamList = async () => {
      try {
        const { success, data } = await getTeamListAPI({
          params: { userId: userAuth.id },
          query: {
            canCreateAccountBookOnly: true,
            page: 1,
            pageSize: 999,
          },
        });

        if (success) {
          setTeamList(data?.data ?? []);
        }
      } catch (error) {
        // Deprecated: (20250303 - Liz)
        // eslint-disable-next-line no-console
        console.log('AccountBookInfoModal getTeamList error:', error);
      }
    };

    getTeamList();
  }, [userAuth]);

  return (
    <div>
      <StepOneForm
        step1FormState={step1FormState}
        step1FormDispatch={step1FormDispatch}
        teamList={teamList}
        closeAccountBookInfoModal={closeAccountBookInfoModal}
        accountBookToEdit={accountBookToEdit}
        handleSubmit={accountBookToEdit ? handleEdit : handleSubmit}
        disabledSubmit={isCreateLoading || isEditLoading}
      />
    </div>
  );
};

export default AccountBookInfoModal;
