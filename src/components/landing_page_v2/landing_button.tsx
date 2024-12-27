import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/common';

const buttonVariants = cva('gap-8px flex items-center transition-all duration-150 ease-in-out', {
  variants: {
    variant: {
      primary:
        'enabled:shadow-landing-btn enabled:bg-landing-btn enabled:hover:text-landing-page-black2 enabled:hover:shadow-landing-btn-hover text-landing-page-black disabled:bg-landing-page-black3 disabled:text-landing-page-black2 rounded-sm border-b border-t border-landing-page-white disabled:border-transparent',
      default:
        'disabled:text-landing-page-black2 text-landing-page-white enabled:hover:text-surface-brand-primary-moderate disabled:hover:pointer-not-allowed',
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
