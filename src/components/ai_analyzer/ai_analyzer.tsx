import Image from 'next/image';
import { Button } from '@/components/button/button';
import { FiArrowRight } from 'react-icons/fi';
import { GrRefresh } from 'react-icons/gr';

interface AIAnalyzerProps {
  isAnalyzing: boolean | undefined;
  isAnalyzSuccess: boolean;
}

const AIAnalyzer: React.FC<AIAnalyzerProps> = ({
  isAnalyzing,
  isAnalyzSuccess,
}: AIAnalyzerProps) => {
  return (
    <div className="mt-4 flex h-120px items-center justify-between overflow-hidden rounded-md bg-surface-brand-primary-moderate px-4 py-2">
      <div className="relative h-20 w-20">
        <Image
          src="/elements/siri.svg"
          alt="AI"
          width={180}
          height={190}
          className="absolute left-1/2 top-14 max-w-180px -translate-x-1/2 -translate-y-1/2 object-cover"
        />
      </div>
      {isAnalyzing === undefined && (
        <p className="text-lg font-normal text-text-neutral-solid-dark">
          Please select the certificates for AI to generate the voucher for you
        </p>
      )}
      {isAnalyzing && (
        <p className="text-lg font-normal text-text-neutral-solid-dark">
          AI is scanning your certificates, please wait...
        </p>
      )}
      {isAnalyzing === false && isAnalyzSuccess && (
        <div className="flex flex-col items-end justify-center space-y-2">
          <p className="text-lg font-normal text-text-neutral-solid-dark">
            AI has done scanning. Click here to allow AI
          </p>
          <Button
            id="upload-image-button"
            type="button"
            variant="tertiary"
            className="px-4 py-2"
            onClick={() => {}}
          >
            <span>Fill up your voucher</span> <FiArrowRight />
          </Button>
        </div>
      )}
      {isAnalyzing === false && !isAnalyzSuccess && (
        <div className="flex flex-col items-end justify-center space-y-2">
          <p className="text-lg font-normal text-text-neutral-solid-dark">
            AI went wrong. Please retry
          </p>
          <Button
            id="upload-image-button"
            type="button"
            variant="tertiary"
            className="px-4 py-2"
            onClick={() => {}}
          >
            <span>Retry</span> <GrRefresh />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AIAnalyzer;
