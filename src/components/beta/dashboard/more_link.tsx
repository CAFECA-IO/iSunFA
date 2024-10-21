import Link from 'next/link';

interface MoreLinkProps {
  href: string;
}

const MoreLink = ({ href }: MoreLinkProps) => {
  return (
    <Link
      href={href}
      className="rounded-xs bg-button-surface-strong-primary px-16px py-8px text-sm font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
    >
      More
    </Link>
  );
};

export default MoreLink;
