import { ICertificateUI } from '@/interfaces/certificate';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa6';

interface SelectionPannlProps {
  certificates: ICertificateUI[];
  handleSelect: (ids: number[], isSelected: boolean) => void;
  openUploaderModal: () => void;
}

const SelectionPannl: React.FC<SelectionPannlProps> = ({
  certificates,
  handleSelect,
  openUploaderModal,
}: SelectionPannlProps) => {
  return (
    <div className="my-4 h-392px rounded-lg bg-surface-neutral-main-background px-8 py-4">
      <div className="flex space-x-4 overflow-x-auto">
        <div>
          <button
            type="button"
            className="mx-4 my-2 flex h-140px w-80px items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary p-2 text-white"
            onClick={openUploaderModal}
          >
            <FaPlus size={24} className="text-stroke-neutral-tertiary" />
          </button>
        </div>
        {certificates.map((certificate) => (
          <div
            key={certificate.id}
            className="flex flex-col items-center"
            onClick={handleSelect.bind(null, [certificate.id], !certificate.isSelected)}
          >
            <Image src={certificate.thumbnailUrl} alt="AI" width={80} height={80} />
            <p className="text-sm font-semibold">{certificate.invoiceName}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectionPannl;
