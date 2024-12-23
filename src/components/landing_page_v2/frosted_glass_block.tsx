import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/common';

const BlockVariants = cva('rounded-sm border-b bg-landing-page-white/30 backdrop-blur-md', {
  variants: {
    variant: {
      default: 'shadow-landing-nav',
      panel: '',
    },
    size: {
      default: 'px-24px py-10px',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface BlockProps
  extends React.ButtonHTMLAttributes<HTMLDivElement>,
    VariantProps<typeof BlockVariants> {}

const FrostedGlassBlock = forwardRef<HTMLDivElement, BlockProps>(
  ({ className, variant, size, ...props }, ref) => {
    const Comp = 'div';
    return (
      <Comp className={cn(BlockVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
FrostedGlassBlock.displayName = 'FrostedGlassBlock';

export { FrostedGlassBlock, BlockVariants };
