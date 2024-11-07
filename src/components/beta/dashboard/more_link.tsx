import Link from 'next/link';
import { useTranslation } from 'next-i18next';

interface MoreLinkProps {
  href: string;
}

const MoreLink = ({ href }: MoreLinkProps) => {
  const { t } = useTranslation('common');

  return (
    <Link
      href={href}
      className="rounded-xs bg-button-surface-strong-primary px-16px py-8px text-sm font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
    >
      {t('common:BETA_DASHBOARD.MORE')}
    </Link>
  );
};

export default MoreLink;
