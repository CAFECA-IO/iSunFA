import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/common';

// Info: (20240319 - Shirley) 用 cva 來定義 button 的樣式
const buttonVariants = cva(
  '"gap ring-offset-background focus-visible:ring-ring group inline-flex items-center justify-center whitespace-nowrap rounded-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-100 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-button-surface-strong-primary text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:cursor-default disabled:text-button-text-disable',
        tertiary:
          'bg-button-surface-strong-secondary text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:cursor-default disabled:text-button-text-disable',
        tertiaryOutline:
          'border border-button-surface-strong-secondary text-button-surface-strong-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover group-hover:border-button-stroke-primary-hover group-hover:text-button-text-primary-hover disabled:text-button-text-disable disabled:border-button-stroke-disable',
        tertiaryOutlineGrey:
          'border border-button-surface-strong-secondary text-button-surface-strong-secondary bg-button-surface-soft-secondary disabled:text-button-text-disable disabled:border-button-stroke-disable hover:bg-button-surface-soft-secondary-hover',
        secondaryOutline:
          'border border-button-text-secondary text-button-text-secondary hover:border-button-text-primary hover:text-button-text-primary-hover group-hover:border-button-text-primary group-hover:text-button-text-primary-hover disabled:text-button-text-disable disabled:border-button-stroke-disable',
        tertiaryBorderless:
          'border-none border-button-surface-strong-secondary text-button-surface-strong-secondary hover:border-button-text-primary hover:text-button-text-primary-hover group-hover:border-button-text-primary group-hover:text-button-text-primary-hover disabled:text-button-text-disable',
        secondaryBorderless:
          'border-none border-button-text-secondary text-button-text-secondary hover:border-button-text-primary hover:text-button-text-primary-hover group-hover:border-button-text-primary group-hover:text-button-text-primary-hover disabled:text-button-text-disable',
        errorOutline:
          'border border-stroke-state-error text-text-state-error hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover group-hover:border-button-stroke-primary-hover group-hover:text-button-text-primary-hover disabled:text-button-text-disable disabled:border-button-stroke-disable',
        disabledGray: 'border border-button-stroke-disable text-button-text-disable',
        disabledYellow: 'border border-button-stroke-primary text-button-text-primary',
        linkBorderless:
          'border-none text-text-neutral-link hover:text-button-text-primary-hover disabled:text-button-text-disable',
        errorBorderless: 'border-none text-text-state-error  disabled:text-button-text-disable',
        hollowYellow:
          'border border-button-stroke-primary bg-button-surface-soft-primary text-button-text-primary-solid hover:bg-button-surface-soft-primary-hover',
      },
      size: {
        large: 'px-32px py-14px gap-8px', // Info: (20241106 - Liz) 設計稿 Size: Large
        default: 'px-24px py-10px gap-8px', // Info: (20241106 - Liz) 設計稿 Size: Regular
        medium: 'px-5 py-2',
        small: 'px-16px py-8px gap-4px', // Info: (20241106 - Liz) 設計稿 Size: Small
        extraSmall: 'px-2 py-1',
        defaultSquare: 'p-10px w-44px h-44px',
        smallSquare: 'p-10px w-36px h-36px',
        placeholderInput: 'px-12px py-10px', // Info: (20241119 - Liz) 像是 DatePicker 就有用到這個尺寸當作 Input 的尺寸
        noPadding: 'p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

// Info: (20240319 - Shirley) 使用 forwardRef 將引用傳遞給 DOM 元素
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    const Comp = 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
