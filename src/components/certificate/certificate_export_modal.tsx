import React from 'react';
import { useTranslation } from 'next-i18next';

import FilterSection from '@/components/filter_section/filter_section';
import { ICertificate } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import { Button } from '@/components/button/button';
import { RxCross1 } from 'react-icons/rx';
import { IPaginatedData } from '@/interfaces/pagination';
import { FiDownload } from 'react-icons/fi';

interface CertificateExportModalProps {
  isOpen: boolean;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數
  handleApiResponse: (
    data: IPaginatedData<{
      totalInvoicePrice: number;
      unRead: {
        withVoucher: number;
        withoutVoucher: number;
      };
      currency: string;
      certificates: ICertificate[];
    }>
  ) => void; // Info: (20240926 - tzuhan) 處理 API 回應的回調函數
  handleExport: () => void;
  certificates: ICertificate[];
}

const CertificateExportModal: React.FC<CertificateExportModalProps> = ({
  isOpen,
  onClose,
  handleApiResponse,
  handleExport,
  certificates,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex h-340px w-600px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-4 top-4 text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={32} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex justify-center gap-2 text-xl font-semibold">
          {t('certificate:EXPORT.TITLE')}
        </h2>
        <p className="flex justify-center text-card-text-secondary">
          {t('certificate:EXPORT.CONTENT')}
        </p>
        <div className="mt-4 flex-1">
          <p className="mb-1 p-1 text-input-text-primary">{t('common:COMMON.PERIOD')}</p>
          <FilterSection
            apiName={APIName.CERTIFICATE_LIST_V2}
            page={1}
            pageSize={1000} // Info: (20241022 - tzuhan) @Murky, 這裡需要一次性取得所有證書
            onApiResponse={handleApiResponse}
            enableSearch={false}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            id="upload-image-button"
            type="button"
            variant="secondaryOutline"
            className="gap-x-4px px-4 py-2"
            onClick={onClose}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button
            id="upload-image-button"
            type="button"
            variant="tertiary"
            className="gap-x-4px px-4 py-2"
            onClick={handleExport}
            disabled={!certificates || certificates.length === 0}
          >
            <div>{t('common:SELECTION.EXPORT')}</div>
            <FiDownload />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateExportModal;
