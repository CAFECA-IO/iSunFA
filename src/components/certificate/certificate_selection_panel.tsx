import { ICertificateUI } from '@/interfaces/certificate';
import CertificateSelectorThumbnail from '@/components/certificate/certificate_selector_thumbnail';
import { FaPlus } from 'react-icons/fa6';
import { useEffect, useState } from 'react';

interface CertificateSelectionPanelProps {
  certificates: ICertificateUI[];
  selectedIds: number[];
  handleSelect: (id: number) => void;
  openUploaderModal: () => void;
}

const CertificateSelectionPanel: React.FC<CertificateSelectionPanelProps> = ({
  certificates,
  selectedIds,
  handleSelect,
  openUploaderModal,
}: CertificateSelectionPanelProps) => {
  const [certificatesReOrdered, setCertificatesReOrdered] =
    useState<ICertificateUI[]>(certificates);

  useEffect(() => {
    const incompleteCertificates: ICertificateUI[] = [];
    const readCertificates: ICertificateUI[] = [];
    certificates.forEach((certificate) => {
      if (certificate.incomplete) {
        incompleteCertificates.push(certificate);
      } else {
        readCertificates.push(certificate);
      }
    });
    setCertificatesReOrdered([...incompleteCertificates, ...readCertificates]);
  }, [certificates]);

  return (
    <div className="my-4 h-392px bg-surface-neutral-main-background py-lv-2 tablet:rounded-lg tablet:px-8 tablet:py-4">
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-2 place-items-center justify-start tablet:grid-cols-5 tablet:gap-2">
          <div className="group h-182px py-2">
            <button
              type="button"
              className="flex h-136px w-85px items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary p-2 text-white group-hover:border-stroke-brand-primary"
              onClick={openUploaderModal}
            >
              <FaPlus
                className="text-stroke-neutral-tertiary group-hover:text-stroke-brand-primary"
                size={24}
              />
            </button>
          </div>
          {certificatesReOrdered.map((certificate) => (
            <CertificateSelectorThumbnail
              key={certificate.id}
              isSelected={selectedIds.includes(certificate.id)}
              certificate={certificate}
              handleSelect={handleSelect}
              isDeletable={false}
              isSelectable
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CertificateSelectionPanel;
