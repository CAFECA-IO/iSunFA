import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import FilterSection from '@/components/filter_section/filter_section';
import { ICertificate, ICertificateUI } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import SelectionPanel from '@/components/certificate/certificate_selection_panel';
import { Button } from '@/components/button/button';
import { RxCross1 } from 'react-icons/rx';
import { IPaginatedData } from '@/interfaces/pagination';
import { InvoiceTabs } from '@/constants/certificate';
// import { InvoiceType } from '@/constants/invoice';
import { DEFAULT_MAX_PAGE_LIMIT } from '@/constants/config';
import { InvoiceType } from '@/constants/invoice';

interface CertificateSelectorModalProps {
  isOpen: boolean;
  accountBookId: number;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  onClose: () => void; // Info: (20240924 - tzuhan) 關閉模態框的回調函數

  handleSelect: (ids: number[], isSelected: boolean) => void; // Info: (20240926 - tzuhan) 保存數據的回調函數
  certificates: ICertificateUI[]; // Info: (20240926 - tzuhan) 證書列表
  handleApiResponse: (data: IPaginatedData<ICertificate[]>) => void; // Info: (20240926 - tzuhan) 處理 API 回應的回調函數
  openUploaderModal: () => void; // Info: (20240926 - tzuhan) 打開上傳模態框的回調函數
}

const CertificateSelectorModal: React.FC<CertificateSelectorModalProps> = ({
  isOpen,
  accountBookId,
  onClose,
  handleSelect,
  handleApiResponse,
  certificates,
  selectedIds,
  setSelectedIds,
  openUploaderModal,
}) => {
  const { t } = useTranslation(['certificate', 'common']);
  const [isSelectAll, setIsSelectAll] = useState(false);

  useEffect(() => {
    // Info: (20250304 - Julian) 判斷是否全選
    setIsSelectAll(selectedIds.length === certificates.length);
  }, [selectedIds, certificates]);

  // Info: (20240924 - tzuhan) 不顯示模態框時返回 null
  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (isSelectAll) {
      // Info: (20250312 - Julian) 如果已經全選，則清空 selectedIds，並重置所有 isSelected
      setSelectedIds([]);
      handleSelect(
        certificates.map((item) => item.id),
        false
      );
    } else {
      // Info: (20250312 - Julian) 將所有發票加入 selectedIds，並且將所有 isSelected 設為 true
      setSelectedIds(certificates.map((item) => item.id));
      handleSelect(
        certificates.map((item) => item.id),
        true
      );
    }
  };

  const handleSelectOne = (id: number) => {
    const index = selectedIds.findIndex((item) => item === id);
    if (index === -1) {
      // Info: (20250312 - Julian) 如果該發票還沒有被選取，則加入 selectedIds，並且將 isSelected 設為 true
      setSelectedIds([...selectedIds, id]);
      handleSelect([id], true);
    } else {
      // Info: (20250312 - Julian) 如果該發票已經被選取，則從 selectedIds 移除，並且將 isSelected 設為 false
      setSelectedIds(selectedIds.filter((item) => item !== id));
      handleSelect([id], false);
    }
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-450px w-90vw max-w-800px flex-col rounded-sm bg-surface-neutral-surface-lv2 p-20px md:max-h-90vh">
        {/* Info: (20240924 - tzuhan) 關閉按鈕 */}
        <button
          type="button"
          className="absolute right-20px top-16px text-checkbox-text-primary"
          onClick={onClose}
        >
          <RxCross1 size={24} />
        </button>
        {/* Info: (20240924 - tzuhan) 模態框標題 */}
        <h2 className="flex justify-center gap-2 text-xl font-semibold">
          {t('certificate:SELECT.TITLE')}
        </h2>
        <p className="flex justify-center text-card-text-secondary">
          {t('certificate:SELECT.CONTENT')}
        </p>
        <FilterSection
          apiName={APIName.CERTIFICATE_LIST_V2}
          params={{ companyId: accountBookId }} // ToDo: (20250212 - Liz) 因應設計稿修改將公司改為帳本，後端 API 也需要將 companyId 修改成 accountBookId
          page={1}
          pageSize={DEFAULT_MAX_PAGE_LIMIT} // Info: (20241022 - tzuhan) @Murky, 這裡需要一次性取得所有證書
          tab={InvoiceTabs.WITHOUT_VOUCHER}
          onApiResponse={handleApiResponse}
          types={Object.keys(InvoiceType)}
        />
        <div className="mt-12px px-4">
          <div className="flex items-center justify-between">
            <div className="font-medium text-text-neutral-secondary">
              ({t('certificate:COMMON.SELECT')} {selectedIds.length}/{certificates.length})
            </div>
            <button
              type="button"
              className="text-link-text-primary hover:underline"
              onClick={handleSelectAll}
            >
              {isSelectAll
                ? t('certificate:COMMON.UNSELECT_ALL')
                : t('certificate:COMMON.SELECT_ALL')}
            </button>
          </div>
        </div>
        <SelectionPanel
          certificates={certificates}
          selectedIds={selectedIds}
          handleSelect={handleSelectOne}
          openUploaderModal={openUploaderModal}
        />
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
            onClick={onClose}
          >
            {t('common:COMMON.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateSelectorModal;
