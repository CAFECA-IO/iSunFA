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
import { timestampToString } from '@/lib/utils/common';
import { ILoginDevice } from '@/interfaces/login_device';

interface IPModalProps {
  userId: number;
  toggleModal: () => void;
  pageData: IPaginatedData<ILoginDevice[]> | null;
}

export const extractLoginDevice = (userAgent: string): string => {
  // Info: (20241121 - tzuhan) Match for browser name and version
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const browser = browserMatch ? browserMatch[0].split('/')[0] : 'Unknown Browser';

  // Info: (20241121 - tzuhan) Match for operating system
  const osMatch = userAgent.match(/\(([^)]+)\)/);
  const os = osMatch ? osMatch[1].split(';')[0] : 'Unknown OS';

  return `${os} ${browser}`;
};

const IPModal: React.FC<IPModalProps> = ({ userId, toggleModal, pageData }) => {
  const { t } = useTranslation(['settings', 'common']);
  const { toastHandler } = useModalContext();
  const { trigger: listLoginDeviceAPI } = APIHandler<IPaginatedData<ILoginDevice[]>>(
    APIName.LIST_LOGIN_DEVICE
  );
  const { trigger: removeLoginDevice } = APIHandler<void>(APIName.REMOVE_LOGIN_DEVICE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState(pageData?.page ?? 1);
  const [totalPages, setTotalPages] = useState(pageData?.totalPages ?? 1);
  const [loginDevices, setLoginDevices] = useState<ILoginDevice[]>(pageData?.data ?? []);

  const handleAbnormal = () => {
    const warningContent = (
      <div className="flex flex-col items-start gap-2">
        <p className="text-text-state-error">{t('settings:IP.DETECT_DIFFERENT_IP_LOGIN')}</p>
        <p>{t('settings:IP.VERIFY_YOUR_ACCOUNT_SECURITY')}</p>
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
      const { success, data, code } = await listLoginDeviceAPI({
        params: { userId },
        query: { page, pageSize: 6 },
      });
      if (success && data) {
        setPage(data.page);
        setTotalPages(data.totalPages);
        setLoginDevices(data.data);
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

  const handleRemoveLoginDevice = async (deviceId: string) => {
    try {
      const { success, code } = await removeLoginDevice({ params: { deviceId } });
      if (success) {
        toastHandler({
          id: ToastId.USER_SETTING_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('settings:IP.REMOVE_DEVICE_SUCCESS'),
          closeable: true,
        });
        await getUserActions();
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
    }
  };

  useEffect(() => {
    if (!isLoading) {
      getUserActions();
    }
  }, [page]);

  return (
    <main className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="flex max-h-90vh max-w-600px flex-col gap-lv-5 overflow-y-hidden rounded-lg bg-surface-neutral-surface-lv2 p-lv-7">
        <section className="flex items-center justify-between">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('settings:IP.INFO')}
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>
        <section className="flex flex-col gap-lv-5">
          <div id="company-settings-list" className="flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image src="/icons/location.svg" width={16} height={16} alt="company_icon" />
              <p>{t('settings:IP.LIST')}</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
          </div>
          <div className="hide-scrollbar max-h-400px overflow-x-hidden overflow-y-scroll rounded-sm border-l border-r border-t border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
            <div className="table">
              <div className="table-header-group w-full rounded-sm text-xs leading-none text-text-neutral-tertiary">
                <div className="table-row w-full">
                  <div className="table-cell min-w-114px border-b border-r border-stroke-neutral-quaternary bg-ipGradient text-center align-middle">
                    <div className="px-lv-4 py-lv-3">{t('settings:IP.TIME')}</div>
                  </div>
                  <div className="table-cell min-w-114px border-b border-r border-stroke-neutral-quaternary bg-ipGradient text-center align-middle">
                    <div className="px-lv-4 py-lv-3">{t('settings:IP.DEVICE')}</div>
                  </div>
                  <div className="table-cell min-w-212px border-b border-r border-stroke-neutral-quaternary bg-ipGradient text-center align-middle">
                    <div className="px-lv-4 py-lv-3">{t('settings:IP.ADDRESS')}</div>
                  </div>
                  <div className="table-cell min-w-80px border-b border-stroke-neutral-quaternary bg-ipGradient text-center align-middle">
                    <div className="px-lv-4 py-lv-3">{t('settings:IP.ACTION')}</div>
                  </div>
                </div>
              </div>
              <div className="table-row-group">
                {loginDevices.map((loginDevice, index) => (
                  <div
                    className="group table-row text-center text-xs leading-none text-text-brand-secondary-lv2"
                    key={`${loginDevice.userAgent}-${index + 1}`}
                  >
                    <div className="relative table-cell border-b border-r border-stroke-neutral-quaternary align-middle">
                      <div className="px-lv-4 py-lv-3">
                        {timestampToString(Math.floor(loginDevice.actionTime / 1000)).date}
                      </div>
                    </div>
                    <div className="relative table-cell border-b border-r border-stroke-neutral-quaternary align-middle">
                      <div className="px-lv-4 py-lv-3">
                        {extractLoginDevice(loginDevice.userAgent)}
                      </div>
                    </div>
                    <div className="relative table-cell border-b border-r border-stroke-neutral-quaternary align-middle">
                      <div
                        className={`px-lv-4 py-lv-3 ${loginDevice.normal === false ? 'text-text-state-error' : ''}`}
                      >
                        {loginDevice.ipAddress}
                      </div>
                    </div>
                    <div className="relative table-cell border-b border-stroke-neutral-quaternary align-middle">
                      {loginDevice.isCurrent ? (
                        <div className={`px-lv-4 py-lv-3 text-text-brand-secondary-lv2`}>
                          {t('settings:IP.CURRENT')}
                        </div>
                      ) : (
                        <div
                          className={`cursor-pointer px-lv-4 py-lv-3 text-link-text-primary`}
                          onClick={() => handleRemoveLoginDevice(loginDevice.id)}
                        >
                          {t('settings:IP.LOGOUT')}
                        </div>
                      )}
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
