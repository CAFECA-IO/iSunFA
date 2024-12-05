import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/common';

const buttonVariants = cva('gap-8px flex items-center transition-all duration-150 ease-in-out', {
  variants: {
    variant: {
      primary:
        'shadow-landing-btn bg-landing-btn hover:text-landing-page-black2 hover:shadow-landing-btn-hover text-landing-page-black rounded-sm border-b border-t border-landing-page-white',
      default: 'text-landing-page-white hover:text-surface-brand-primary-moderate',
    },
    size: {
      default: 'px-24px py-10px',
      square: 'p-10px w-44px h-44px',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const LandingButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    const Comp = 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
LandingButton.displayName = 'LandingButton';

export { LandingButton, buttonVariants };
