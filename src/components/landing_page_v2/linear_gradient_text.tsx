import React, { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/common';

export enum LinearTextSize {
  XL = 'xl',
  LG = 'lg',
  MD = 'md',
  SM = 'sm',
}

export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

const textVariants = cva(
  'bg-gradient-to-b from-landing-page-white via-landing-page-taupe to-landing-page-taupe2 bg-clip-text font-dm-sans text-transparent',
  {
    variants: {
      size: {
        [LinearTextSize.XL]: 'text-2xl font-black md:text-48px lg:text-80px',
        [LinearTextSize.LG]: 'text-2xl font-bold md:text-48px lg:text-60px',
        [LinearTextSize.MD]: 'text-36px font-bold md:text-44px',
        [LinearTextSize.SM]: 'text-lg font-bold md:text-2xl',
      },
      align: {
        [TextAlign.LEFT]: 'text-left',
        [TextAlign.CENTER]: 'text-center',
        [TextAlign.RIGHT]: 'text-right',
      },
    },
    defaultVariants: {
      size: LinearTextSize.LG,
      align: TextAlign.LEFT,
    },
  }
);

interface TextProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof textVariants> {}

const LinearGradientText = forwardRef<HTMLDivElement, TextProps>(
  ({ size, align, className, ...props }, ref) => {
    const Comp = 'div';

    return <Comp className={cn(textVariants({ size, align, className }))} ref={ref} {...props} />;
  }
);
LinearGradientText.displayName = 'LinearGradientText';

export { LinearGradientText, textVariants };
