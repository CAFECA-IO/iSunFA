import { ICertificateUI } from '@/interfaces/certificate';
// import Image from 'next/image';
import CertificateSelectorThumbnail from '@/components/certificate/certificate_selector_thumbnail';
import { FaPlus } from 'react-icons/fa6';

interface CertificateSelectionPannelProps {
  certificates: ICertificateUI[];
  selectedIds: number[];
  handleSelect: (id: number) => void;
  openUploaderModal: () => void;
}

const CertificateSelectionPannel: React.FC<CertificateSelectionPannelProps> = ({
  certificates,
  selectedIds,
  handleSelect,
  openUploaderModal,
}: CertificateSelectionPannelProps) => {
  return (
    <div className="my-4 h-392px rounded-lg bg-surface-neutral-main-background px-8 py-4">
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-5 place-items-center justify-start gap-2">
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
              {/* <Image
                src="/elements/plus.svg"
                alt="plus"
                width={24}
                height={24}
                className="text-stroke-neutral-tertiary group-hover:text-stroke-brand-primary" // Info: (20240927 - tzuhan) shadow-crossBtn 沒有辦法符合設計稿
              /> */}
            </button>
          </div>
          {certificates.map((certificate) => (
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

export default CertificateSelectionPannel;
