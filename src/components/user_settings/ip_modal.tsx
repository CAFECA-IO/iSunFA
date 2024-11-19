import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import Pagination from '@/components/pagination/pagination';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { IoCloseOutline } from 'react-icons/io5';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { useModalContext } from '@/contexts/modal_context';
import { IUserActionLog } from '@/interfaces/user_action_log';
import { timestampToString } from '@/lib/utils/common';
import { UserActionLogActionType } from '@/constants/user_action_log';

interface IPModalProps {
  userId: number;
  toggleModal: () => void;
  pageData: IPaginatedData<IUserActionLog[]> | null;
}

const IPModal: React.FC<IPModalProps> = ({ userId, toggleModal, pageData }) => {
  const { t } = useTranslation(['setting', 'common']);
  const { toastHandler } = useModalContext();
  const { trigger: getUserActionLogAPI } = APIHandler<IPaginatedData<IUserActionLog[]>>(
    APIName.USER_ACTION_LOG_LIST
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState(pageData?.page ?? 1);
  const [totalPages, setTotalPages] = useState(pageData?.totalPages ?? 1);
  const [userActionLogs, setUserActionLogs] = useState<IUserActionLog[]>(pageData?.data ?? []);

  const handleAbnormal = () => {
    const warningContent = (
      <div className="flex flex-col items-start gap-2">
        <p className="text-text-state-error">{t('setting:IP.DETECT_DIFFERENT_IP_LOGIN')}</p>
        <p>{t('setting:IP.VERIFY_YOUR_ACCOUNT_SECURITY')}</p>
      </div>
    );

    toastHandler({
      id: ToastId.IP_ABNORMAL,
      type: ToastType.WARNING,
      content: warningContent,
      closeable: true,
    });
  };

  const getUserActions = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const { success, data, code } = await getUserActionLogAPI({
        params: { userId },
        query: { page, actionType: UserActionLogActionType.LOGIN, pageSize: 6 },
      });
      if (success && data) {
        setPage(data.page);
        setTotalPages(data.totalPages);
        setUserActionLogs(data.data);
        const abnormal = data.data.some((d) => d.normal === false);
        if (abnormal) {
          handleAbnormal();
        }
      } else {
        throw new Error(code);
      }
    } catch (error) {
      toastHandler({
        id: ToastId.USER_SETTING_ERROR,
        type: ToastType.ERROR,
        content: (error as Error).message,
        closeable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      getUserActions();
    }
  }, [page]);

  return (
    <main className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="flex max-h-90vh max-w-600px flex-col gap-lv-5 overflow-y-hidden rounded-lg bg-surface-neutral-surface-lv2 p-lv-7">
        <section className="flex items-center justify-between">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('setting:IP.INFO')}
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>
        <section className="flex flex-col gap-lv-5">
          <div id="company-setting-list" className="flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image src="/icons/location.svg" width={16} height={16} alt="company_icon" />
              <p>{t('setting:IP.LIST')}</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
          </div>
          <div className="max-h-400px w-440px overflow-y-auto rounded-sm bg-surface-neutral-surface-lv2 shadow-normal_setting_brand">
            <div className="table">
              <div className="table-header-group w-full rounded-sm text-xs leading-none text-text-neutral-tertiary">
                <div className="table-row w-full">
                  <div className="table-cell min-w-114px border-b border-r border-stroke-neutral-quaternary bg-ipGradient text-center align-middle">
                    <div className="px-lv-4 py-lv-3">{t('setting:IP.TIME')}</div>
                  </div>
                  <div className="table-cell min-w-114px border-b border-r border-stroke-neutral-quaternary bg-ipGradient text-center align-middle">
                    <div className="px-lv-4 py-lv-3">{t('setting:IP.DEVICE')}</div>
                  </div>
                  <div className="table-cell min-w-212px border-b border-stroke-neutral-quaternary bg-ipGradient text-center align-middle">
                    <div className="px-lv-4 py-lv-3">{t('setting:IP.ADDRESS')}</div>
                  </div>
                </div>
              </div>
              <div className="table-row-group">
                {userActionLogs.map((userActionLog, index) => (
                  <div
                    className="group table-row text-center text-xs leading-none text-text-brand-secondary-lv2 hover:bg-surface-brand-primary-10"
                    key={`${userActionLog.userAgent}-${index + 1}`}
                  >
                    <div className="relative table-cell border-b border-r border-stroke-neutral-quaternary align-middle">
                      <div className="px-lv-4 py-lv-3">
                        {timestampToString(userActionLog.actionTime).date}
                      </div>
                    </div>
                    <div className="relative table-cell border-b border-r border-stroke-neutral-quaternary align-middle">
                      <div className="px-lv-4 py-lv-3">{userActionLog.userAgent}</div>
                    </div>
                    <div className="relative table-cell border-b border-stroke-neutral-quaternary">
                      <div
                        className={`px-lv-4 py-lv-3 ${userActionLog.normal === false ? 'text-text-state-error' : ''}`}
                      >
                        {userActionLog.ipAddress}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Pagination
              className="mt-4"
              currentPage={page}
              setCurrentPage={(newPage) => {
                if (newPage !== page) setPage(newPage);
              }}
              totalPages={totalPages}
            />
          </div>
        </section>
      </div>
    </main>
  );
};

export default IPModal;
