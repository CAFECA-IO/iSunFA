import { cn } from '@/lib/utils/common';

interface ISkeletonProps {
  width: number;
  height: number;
  rounded?: boolean;
  className?: string;
}

interface ISkeletonListProps {
  count: number;
}

const Skeleton = ({ width, height, rounded, className }: ISkeletonProps) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-darkBlue3',
        rounded ? 'rounded-full' : 'rounded-lg'
      )}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <span
        className={cn(
          'absolute left-0 top-0 w-full animate-loading bg-[#D5D8DD] blur-xl',
          className
        )}
        style={{ height: `${height}px` }}
      ></span>
    </div>
  );
};

export const SkeletonList = ({ count }: ISkeletonListProps) => {
  return (
    <div role="status" className="space-y-2 rounded p-4 md:p-6">
      {' '}
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${index !== 0 ? `pt-4` : ``}`}>
          {/* Info: Desktop */}
          <div className="hidden items-center justify-between lg:flex">
            <Skeleton width={800} height={30} />
          </div>
          {/* Info: Mobile */}
          <div className="flex items-center justify-between lg:hidden">
            <Skeleton width={300} height={30} />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Skeleton;
