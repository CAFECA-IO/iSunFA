import { Dispatch, SetStateAction, useState } from 'react';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { IoCloseOutline } from 'react-icons/io5';
import { PiShareFatBold } from 'react-icons/pi';
import { useTranslation } from 'next-i18next';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ITransferAccountBook } from '@/interfaces/team';
import loggerFront from '@/lib/utils/logger_front';

interface TransferAccountBookModalProps {
  accountBookToTransfer: IAccountBookWithTeam;
  setAccountBookToTransfer: Dispatch<SetStateAction<IAccountBookWithTeam | undefined>>;
  setRefreshKey?: Dispatch<React.SetStateAction<number>>;
  getAccountBookListByTeamId?: () => Promise<void>;
}

const TransferAccountBookModal = ({
  accountBookToTransfer,
  setAccountBookToTransfer,
  setRefreshKey,
  getAccountBookListByTeamId,
}: TransferAccountBookModalProps) => {
  const { t } = useTranslation(['account_book']);
  const [transferToTeamId, setTransferToTeamId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Info: (20250311 - Liz) 轉移帳本 API
  const { trigger: transferAccountBookAPI } = APIHandler<ITransferAccountBook>(
    APIName.REQUEST_TRANSFER_ACCOUNT_BOOK
  );

  const closeTransferAccountBookModal = () => {
    setAccountBookToTransfer(undefined);
  };

  // Info: (20250311 - Liz) 打 API 轉移帳本(原為公司)
  const handleSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { success } = await transferAccountBookAPI({
        params: { accountBookId: accountBookToTransfer.id },
        body: {
          fromTeamId: accountBookToTransfer.team.id,
          toTeamId: Number(transferToTeamId),
        },
      });

      if (!success) {
        loggerFront.log('打 API 轉移帳本失敗');
        return;
      }
      closeTransferAccountBookModal();

      if (setRefreshKey) setRefreshKey((prev) => prev + 1); // Info: (20250314 - Liz) This is a workaround to refresh the account book list after creating a new account book (if use filterSection)

      if (getAccountBookListByTeamId) getAccountBookListByTeamId(); // Info: (20250314 - Liz) 重新取得團隊帳本清單
    } catch (error) {
      loggerFront.error('打 API 轉移帳本失敗 error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex w-90vw flex-col gap-24px rounded-lg bg-surface-neutral-surface-lv2 px-40px py-16px tablet:w-400px tablet:p-lv-7">
        <section className="relative flex items-center justify-center">
          <h1 className="text-center text-xl font-bold text-text-neutral-primary">
            {t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.ACCOUNT_BOOK_TRANSFER')}
          </h1>
          <button
            type="button"
            onClick={closeTransferAccountBookModal}
            className="absolute right-0"
          >
            <IoCloseOutline size={24} />
          </button>
        </section>

        <main className="flex flex-col gap-lv-4 tablet:gap-lv-7">
          <ul className="ml-20px list-disc marker:text-surface-support-strong-maple">
            <li className="text-xs font-normal text-text-neutral-primary tablet:text-base">
              {t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.CONTENT')}
            </li>
          </ul>

          <div className="flex flex-col gap-8px">
            <h4 className="font-semibold text-input-text-primary">
              Team ID <span className="text-text-state-error"> *</span>
            </h4>
            <input
              type="text"
              placeholder="#TeamUID-"
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none"
              value={transferToTeamId}
              onChange={(e) => setTransferToTeamId(e.target.value)}
            />
          </div>

          <section className="flex justify-end gap-12px">
            <button
              type="button"
              onClick={closeTransferAccountBookModal}
              className="rounded-xs px-16px py-8px text-sm font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:text-button-text-disable"
            >
              {t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.CANCEL')}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !transferToTeamId}
              className="flex items-center gap-4px rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-sm font-medium text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <span>{t('account_book:ACCOUNT_BOOK_TRANSFER_MODAL.TRANSFER')}</span>
              <PiShareFatBold size={16} />
            </button>
          </section>
        </main>
      </div>
    </main>
  );
};

export default TransferAccountBookModal;
