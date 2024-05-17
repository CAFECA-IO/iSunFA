import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/common';

// Info: 用 cva 來定義 button 的樣式 (20240319 - Shirley)
const buttonVariants = cva(
  '"gap space-x-2 ring-offset-background focus-visible:ring-ring group inline-flex items-center justify-center whitespace-nowrap rounded-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-100',
  {
    variants: {
      variant: {
        default:
          'bg-primaryYellow text-primary-foreground hover:bg-primaryYellow/70 disabled:bg-lightGray disabled:cursor-default',
        tertiary:
          'bg-button-surface-strong-secondary text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable',
        tertiaryOutline:
          'border border-button-surface-strong-secondary text-button-surface-strong-secondary hover:border-button-text-primary hover:text-button-text-primary group-hover:border-button-text-primary group-hover:text-button-text-primary',
        secondaryOutline:
          'border border-button-text-secondary text-button-text-secondary hover:border-button-text-primary hover:text-button-text-primary group-hover:border-button-text-primary group-hover:text-button-text-primary',
        tertiaryBorderless:
          'border-none border-button-surface-strong-secondary text-button-surface-strong-secondary hover:border-button-text-primary hover:text-button-text-primary group-hover:border-button-text-primary group-hover:text-button-text-primary',
        secondaryBorderless:
          'border-none border-button-text-secondary text-button-text-secondary hover:border-button-text-primary hover:text-button-text-primary group-hover:border-button-text-primary group-hover:text-button-text-primary',
      },
      size: {
        default: 'px-6 py-3',
        medium: 'px-5 py-2',
        small: 'px-4 py-1',
        extraSmall: 'px-2 py-1',
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

// Info: 使用 forwardRef 將引用傳遞給 DOM 元素 (20240319 - Shirley)
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
