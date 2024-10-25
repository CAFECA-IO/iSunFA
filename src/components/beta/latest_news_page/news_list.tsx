import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';

interface NewsListProps {
  list: {
    id: string;
    title: string;
    type: string;
    date: string;
  }[];
  isPageStyle?: boolean;
}

interface NewsProps {
  news: {
    id: string;
    title: string;
    type: string;
    date: string;
  };
}

const News = ({ news }: NewsProps) => {
  let link = '';

  switch (news.type) {
    case 'financial':
      link = ISUNFA_ROUTE.FINANCIAL_NEWS_PAGE + `/${news.id}`;
      break;

    case 'system':
      link = ISUNFA_ROUTE.SYSTEM_NEWS_PAGE + `/${news.id}`;
      break;

    case 'match':
      link = ISUNFA_ROUTE.MATCH_NEWS_PAGE + `/${news.id}`;
      break;

    default:
      link = '';
      break;
  }

  return (
    <div
      key={news.id}
      className="flex items-center justify-between gap-16px rounded-xs bg-surface-brand-primary-10 p-8px"
    >
      <p className="flex-none text-sm font-normal text-text-neutral-mute">{news.date}</p>

      <p className="flex-auto truncate text-base font-semibold text-surface-brand-secondary">
        {news.title}
      </p>

      <Link href={link} className="flex-none text-sm font-semibold text-link-text-primary">
        See More
      </Link>
    </div>
  );
};

const NewsList = ({ list, isPageStyle }: NewsListProps) => {
  return (
    <section className={`flex flex-col ${isPageStyle ? 'gap-8px' : 'gap-24px'}`}>
      {list.map((news) => (
        <News key={news.id} news={news} />
      ))}
    </section>
  );
};

export default NewsList;
