import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/utils/common';

interface MoreLinkProps {
  href: string;
  disabled?: boolean;
  className?: string;
}

const MoreLink = ({ href, disabled, className }: MoreLinkProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <Link
      href={href}
      className={cn(
        'rounded-xs bg-button-surface-strong-primary px-16px py-8px text-sm font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover',
        className,
        {
          'pointer-events-none bg-button-surface-strong-disable text-button-text-disable': disabled,
        }
      )}
    >
      {t('dashboard:DASHBOARD.MORE')}
    </Link>
  );
};

export default MoreLink;
