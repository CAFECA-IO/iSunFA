import Link from 'next/link';

interface NewsListProps {
  list: {
    id: string;
    title: string;
    href: string;
    date: string;
  }[];
  isPageStyle?: boolean;
}

const NewsList = ({ list, isPageStyle }: NewsListProps) => {
  return (
    <section className={`flex flex-col ${isPageStyle ? 'gap-8px' : 'gap-24px'}`}>
      {list.map((news) => (
        <div
          key={news.id}
          className="flex items-center justify-between gap-16px rounded-xs bg-surface-brand-primary-10 p-8px"
        >
          <p className="flex-none text-sm font-normal text-text-neutral-mute">{news.date}</p>

          <p className="flex-auto truncate text-base font-semibold text-surface-brand-secondary">
            {news.title}
          </p>

          <Link href={news.href} className="flex-none text-sm font-semibold text-link-text-primary">
            See More
          </Link>
        </div>
      ))}
    </section>
  );
};

export default NewsList;
