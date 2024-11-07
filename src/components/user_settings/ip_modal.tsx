import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';

import Pagination from '@/components/pagination/pagination';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData } from '@/interfaces/pagination';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { IoCloseOutline } from 'react-icons/io5';

interface IPModalProps {
  userId: number;
  toggleModal: () => void;
}

const IPModal: React.FC<IPModalProps> = ({ userId, toggleModal }) => {
  const { t } = useTranslation(['setting', 'common']);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { success, data: resData } = APIHandler<
    IPaginatedData<{ time: number; device: string; ip: string }[]>
  >(APIName.IP_LIST, { params: { userId } }, true);

  const handleApiResponse = (
    data: IPaginatedData<{ time: number; device: string; ip: string }[]>
  ) => {
    setTotalPages(data.totalPages);
  };

  useEffect(() => {
    if (success && resData) {
      handleApiResponse(resData);
    }
  }, [success, resData]);

  return (
    <main className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="flex max-h-620px w-90vw max-w-480px flex-col rounded-lg bg-surface-neutral-surface-lv2">
        <section className="flex items-center justify-between py-16px pl-40px pr-20px">
          <h1 className="grow text-center text-xl font-bold text-text-neutral-secondary">
            {t('setting:NORMAL.LOGIN_DEVICE_N_IP')}
          </h1>
          <button type="button" onClick={toggleModal}>
            <IoCloseOutline size={24} />
          </button>
        </section>
        <section className="flex flex-col gap-24px px-40px py-16px">
          <div id="company-setting-list" className="mb-lv-7 flex items-center gap-4">
            <hr className="block flex-1 border-divider-stroke-lv-4 md:hidden" />
            <div className="flex items-center gap-2 text-sm text-divider-text-lv-1">
              <Image
                src="/icons/asset_management_icon.svg"
                width={16}
                height={16}
                alt="company_icon"
              />
              <p>{t('setting:NORMAL.LOGIN_DEVICE_N_IP')}</p>
            </div>
            <hr className="flex-1 border-divider-stroke-lv-4" />
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
