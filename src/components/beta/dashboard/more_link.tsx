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
        'rounded-xs border border-button-stroke-secondary px-16px py-8px text-sm font-medium text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover',
        className,
        {
          'pointer-events-none border-button-stroke-disable text-button-text-disable': disabled,
        }
      )}
    >
      {t('dashboard:DASHBOARD.MORE')}
    </Link>
  );
};

export default MoreLink;
