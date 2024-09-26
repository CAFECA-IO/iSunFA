import Image from 'next/image';
import { Button } from '@/components/button/button';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { FaPlus } from 'react-icons/fa6';
import { ICertificate } from '@/interfaces/certificate';

interface CertificateSelectionProps {
  selectedCertificates: ICertificate[];
  setOpenModal: (open: boolean) => void;
}

const CertificateSelection: React.FC<CertificateSelectionProps> = ({
  selectedCertificates,
  setOpenModal,
}: CertificateSelectionProps) => {
  return (
    <div className="my-8 w-full flex-col items-center">
      <div className="flex h-56 w-full flex-col items-start justify-start rounded-md border border-stroke-neutral-quaternary px-8 pt-6 shadow-inset-lg">
        <div className="flex space-x-4 overflow-x-auto">
          {selectedCertificates.map((certificate) => (
            <div key={certificate.id} className="flex flex-col items-center">
              <Image src={certificate.thumbnailUrl} alt="AI" width={80} height={80} />
              <p className="text-sm font-semibold">{certificate.invoiceName}</p>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="mx-4 my-2 flex h-140px w-80px items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary p-2 text-white"
              onClick={() => setOpenModal(true)}
            >
              <FaPlus size={24} className="text-stroke-neutral-tertiary" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2 w-full text-center">
        <p className="text-text-neutral-tertiary">
          Uploaded {selectedCertificates.length} certificates
        </p>
        <div className="mt-2 flex items-center justify-center space-x-2">
          <Button
            type="button"
            onClick={() => {}}
            variant="secondaryOutline"
            disabled={selectedCertificates.length === 0}
            className="h-40px w-40px p-0"
          >
            <AiOutlineLeft size={16} />
          </Button>
          <Button
            type="button"
            onClick={() => {}}
            variant="secondaryOutline"
            disabled={selectedCertificates.length === 0}
            className="h-40px w-40px p-0"
          >
            <AiOutlineRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateSelection;
