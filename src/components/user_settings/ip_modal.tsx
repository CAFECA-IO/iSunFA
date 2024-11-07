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
import { SortBy, SortOrder } from '@/constants/sort';

interface IPModalProps {
  userId: number;
  toggleModal: () => void;
}

const dummyData: IPaginatedData<{
  ips: { time: number; device: string; address: string; abnormal: boolean }[];
  detectAbnormal: boolean;
}> = {
  data: {
    ips: [
      {
        time: 1632912000000,
        device: 'Macos Chrome',
        address: 'Taiwan.Taipei 211.22.118.145',
        abnormal: false,
      },
      {
        time: 1632912000000,
        device: 'Macos Chrome',
        address: 'Taiwan.Taipei 211.22.118.145',
        abnormal: false,
      },
      {
        time: 1632912000000,
        device: 'Macos Chrome',
        address: 'Taiwan.Taipei 211.22.118.145',
        abnormal: false,
      },
      {
        time: 1632912000000,
        device: 'Smart Phone',
        address: 'England.London 21.11.22.109',
        abnormal: true,
      },
      {
        time: 1632912000000,
        device: 'Macos Chrome',
        address: 'Taiwan.Taipei 211.22.118.145',
        abnormal: false,
      },
    ],
    detectAbnormal: true,
  },
  totalPages: 1,
  page: 1,
  totalCount: 5,
  pageSize: 5,
  hasNextPage: false,
  hasPreviousPage: false,
  sort: [{ sortBy: SortBy.DATE, sortOrder: SortOrder.DESC }],
};

const IPModal: React.FC<IPModalProps> = ({ userId, toggleModal }) => {
  const { t } = useTranslation(['setting', 'common']);
  const { toastHandler } = useModalContext();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { success, data: resData } = APIHandler<
    IPaginatedData<{
      ips: { time: number; device: string; address: string; abnormal: boolean }[];
      detectAbnormal: boolean;
    }>
  >(APIName.IP_LIST, { params: { userId } }, true);
  const [ips, setIps] = useState<
    { time: number; device: string; address: string; abnormal: boolean }[]
  >([]);

  const warningContent = (
    <div className="flex flex-col items-start gap-2">
      <p className="text-text-state-error">{t('setting:IP.DETECT_DIFFERENT_IP_LOGIN')}</p>
      <p>{t('setting:IP.VERIFY_YOUR_ACCOUNT_SECURITY')}</p>
    </div>
  );

  const handleApiResponse = (
    data: IPaginatedData<{
      ips: { time: number; device: string; address: string; abnormal: boolean }[];
      detectAbnormal: boolean;
    }>
  ) => {
    setTotalPages(data.totalPages);
    setIps(data.data.ips);
    if (data.data.detectAbnormal) {
      toastHandler({
        id: ToastId.IP_ABNORMAL,
        type: ToastType.WARNING,
        content: warningContent,
        closeable: true,
      });
    }
  };

  useEffect(() => {
    /** ToDo: (20241107 - tzuhan) Uncomment this code block after API is ready
    if (success && resData) {
      handleApiResponse(resData);
    }
    */
    handleApiResponse(dummyData);
  }, [success, resData]);

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
                {ips.map((ip, index) => (
                  <div
                    className="group table-row text-center text-xs leading-none text-text-brand-secondary-lv2 hover:bg-surface-brand-primary-10"
                    key={`${ip.device}-${index + 1}`}
                  >
                    <div className="relative table-cell border-b border-r border-stroke-neutral-quaternary align-middle">
                      <div className="px-lv-4 py-lv-3">{ip.time}</div>
                    </div>
                    <div className="relative table-cell border-b border-r border-stroke-neutral-quaternary align-middle">
                      <div className="px-lv-4 py-lv-3">{ip.device}</div>
                    </div>
                    <div className="relative table-cell border-b border-stroke-neutral-quaternary">
                      <div
                        className={`px-lv-4 py-lv-3 ${ip.abnormal ? 'text-text-state-error' : ''}`}
                      >
                        {ip.address}
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
              setCurrentPage={setPage}
              totalPages={totalPages}
            />
          </div>
        </section>
      </div>
    </main>
  );
};

export default IPModal;
