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
import StepTwoForm from '@/components/beta/account_books_page/step_two_form';
import {
  initialStep1FormState,
  step1FormReducer,
  initialStep2FormState,
  step2FormReducer,
} from '@/constants/account_book';
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
  const { createAccountBook, userAuth } = useUserCtx();
  const { toastHandler } = useModalContext();

  const [step, setStep] = useState<number>(0);
  const [step1FormState, step1FormDispatch] = useReducer(
    step1FormReducer,
    accountBookToEdit
      ? {
          ...initialStep1FormState,
          companyName: accountBookToEdit.name || '',
          taxId: accountBookToEdit.taxId || '',
          tag: accountBookToEdit.tag || null,
          team: accountBookToEdit.team || null,
          imageId: accountBookToEdit.imageId || '',
          // Info: (20250428 - Liz) 把需要的欄位從 accountBookToEdit 中提取設為預設值
        }
      : initialStep1FormState
  );
  const [step2FormState, step2FormDispatch] = useReducer(step2FormReducer, initialStep2FormState);
  const [teamList, setTeamList] = useState<ITeam[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Info: (20250303 - Liz) 取得團隊清單 API
  const { trigger: getTeamListAPI } = APIHandler<IPaginatedData<ITeam[]>>(APIName.LIST_TEAM);

  // ToDo: (20250421 - Liz) 等新版的建立帳本 API 實作後再改
  const {
    companyName,
    // representativeName,
    taxId,
    // taxSerialNumber,
    // phoneNumber,
    tag,
    team,
    // city,
    // district,
    // districtOptions,
    // enteredAddress,
  } = step1FormState;

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  // Info: (20250312 - Liz) 打 API 建立帳本(原為公司)
  const handleSubmit = async () => {
    if (isLoading) return; // Info: (20250312 - Liz) 避免重複點擊
    setIsLoading(true); // Info: (20250312 - Liz) 點擊後進入 loading 狀態
    if (!companyName || !taxId || !tag || !team) return;

    try {
      const { success, code, errorMsg } = await createAccountBook({
        name: companyName,
        taxId,
        tag,
        teamId: team.id, // Info: (20250312 - Liz) 選擇團隊
        // ToDo: (20250428 - Liz) 等新版的建立帳本 API 實作後再調整參數
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
      step2FormDispatch({ type: 'RESET' });
      closeAccountBookInfoModal();

      if (getAccountBookList) getAccountBookList(); // Info: (20241209 - Liz) 重新取得帳本清單

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20241114 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)
    } catch (error) {
      // Deprecated: (20241104 - Liz)
      // eslint-disable-next-line no-console
      console.log('AccountBookInfoModal handleSubmit error:', error);
    } finally {
      // Info: (20241104 - Liz) API 回傳後解除 loading 狀態
      setIsLoading(false);
    }
  };

  // ToDo: (20250428 - Liz) 打 API 編輯帳本(原為公司) 目前沒有 API
  const handleEdit = async () => {
    // Deprecated: (20250506 - Liz)
    // eslint-disable-next-line no-alert
    window.alert('打 API 編輯帳本！但是目前 API 正在修改中，無法使用');
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
      {step === 0 && (
        <StepOneForm
          handleNext={handleNext}
          step1FormState={step1FormState}
          step1FormDispatch={step1FormDispatch}
          teamList={teamList}
          closeAccountBookInfoModal={closeAccountBookInfoModal}
          accountBookToEdit={accountBookToEdit}
        />
      )}

      {/* Info: (20250418 - Liz) 進入第二步驟的商業稅設定 */}
      {step === 1 && (
        <StepTwoForm
          handleBack={handleBack}
          handleSubmit={accountBookToEdit ? handleEdit : handleSubmit}
          isLoading={isLoading}
          step2FormState={step2FormState}
          step2FormDispatch={step2FormDispatch}
          closeAccountBookInfoModal={closeAccountBookInfoModal}
        />
      )}
    </div>
  );
};

export default AccountBookInfoModal;
