import Link from 'next/link';

interface DashboardCardLayoutProps {
  children: React.ReactNode;
}

interface MoreLinkProps {
  href: string;
}

export const MoreLink = ({ href }: MoreLinkProps) => {
  return (
    <Link
      href={href}
      className="rounded-xs bg-button-surface-strong-primary px-16px py-8px text-sm font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
    >
      More
    </Link>
  );
};

const DashboardCardLayout = ({ children }: DashboardCardLayoutProps) => {
  return (
    <div className="flex-auto basis-400px rounded-md bg-surface-neutral-surface-lv2 p-24px shadow-Dropshadow_XS">
      {children}
    </div>
  );
};

export default DashboardCardLayout;
