import Image from 'next/image';

interface AIAnalyzerProps {}

const AIAnalyzer: React.FC<AIAnalyzerProps> = () => {
  return (
    <div className="mt-4 flex items-center justify-between overflow-hidden rounded-md bg-surface-brand-primary-moderate px-4 py-2">
      <div className="relative h-20 w-20">
        <Image
          src="/elements/siri.svg"
          alt="AI"
          width={180}
          height={190}
          className="absolute left-1/2 top-14 max-w-180px -translate-x-1/2 -translate-y-1/2 object-cover"
        />
      </div>
      <p className="text-lg font-medium">
        Please select the certificates for AI to generate the voucher for you
      </p>
    </div>
  );
};

export default AIAnalyzer;
