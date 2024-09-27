import { ICertificateUI } from '@/interfaces/certificate';
import { FaPlus } from 'react-icons/fa6';
import CertificateSelectorThumbnail from './certificate_selector_thumbnail';

interface SelectionPannlProps {
  certificates: ICertificateUI[];
  selectedIds: number[];
  handleSelect: (id: number) => void;
  openUploaderModal: () => void;
}

const SelectionPannl: React.FC<SelectionPannlProps> = ({
  certificates,
  selectedIds,
  handleSelect,
  openUploaderModal,
}: SelectionPannlProps) => {
  return (
    <div className="my-4 h-392px rounded-lg bg-surface-neutral-main-background px-8 py-4">
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-5 place-items-center justify-start gap-2">
          <div className="h-182px py-2">
            <button
              type="button"
              className="flex h-136px w-85px items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary p-2 text-white"
              onClick={openUploaderModal}
            >
              <FaPlus size={24} className="text-stroke-neutral-tertiary" />
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

export default SelectionPannl;
