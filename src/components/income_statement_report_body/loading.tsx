import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';

const Loading = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  );
};

export default Loading;
