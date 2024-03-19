import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils/common';

// Info: 用 cva 來定義 button 的樣式 (20240319 - Shirley)
const buttonVariants = cva(
  '"gap ring-offset-background focus-visible:ring-ring group inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primaryYellow text-primary-foreground hover:bg-primaryYellow/50 disabled:bg-lightGray disabled:cursor-default',
        // TODO: add more variants (20240319 - Shirley)
        // outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        // secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
      size: {
        default: 'px-6 py-3',
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
