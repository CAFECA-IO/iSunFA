import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { JSX, ClassAttributes, HTMLAttributes, useEffect, useState } from 'react';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { INews } from '@/interfaces/news';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { TbArrowBackUp } from 'react-icons/tb';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerFront from '@/lib/utils/logger_front';

// Info: (20241024 - Liz) 在 Markdown 中，單個 Enter 不會換行，必須在行尾加上兩個空格來觸發換行。使用 remarkBreaks 可以實現直接按 Enter 來換行，不再需要在每行末尾加上兩個空格。

interface SystemNewsPageBodyProps {
  newsId: string;
}

// Info: (20241024 - Liz) 因為預設的 ul 樣式不符合需求，所以自定義一個 ul 樣式
const CustomList = (
  props: JSX.IntrinsicAttributes &
    ClassAttributes<HTMLUListElement> &
    HTMLAttributes<HTMLUListElement>
) => {
  return <ul className="list-inside list-disc text-text-neutral-secondary" {...props} />;
};

const SystemNewsPageBody = ({ newsId }: SystemNewsPageBodyProps) => {
  const { t } = useTranslation(['dashboard']);

  const router = useRouter();
  const goBack = () => router.push(ISUNFA_ROUTE.LATEST_NEWS_PAGE);

  const [news, setNews] = useState<INews | null>(null);

  // Info: (20241128 - Liz) 打 API 取得新聞內容
  const { trigger: getNewsByIdAPI } = APIHandler<INews>(APIName.NEWS_GET_BY_ID);

  useEffect(() => {
    const getNewsById = async () => {
      try {
        const { data, success, code } = await getNewsByIdAPI({
          params: { newsId },
        });

        if (success && data) {
          setNews(data);
        } else {
          loggerFront.log('getNewsByIdAPI failed:', code);
        }
      } catch (error) {
        loggerFront.error(error);
      }
    };

    getNewsById();
  }, [newsId]);

  if (!news) return <div>News not found.</div>;

  // ToDo: (20241128 - Liz) api 提供的 news.imageId 是數字，但 Image component 需要的是 string，不確定要怎麼拿到圖片的 url
  return (
    <main className="flex min-h-full flex-col gap-lv-6 tablet:gap-40px">
      {/* Info: (20250616 - Julian) Mobile title */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('dashboard:LATEST_NEWS_PAGE.SYSTEM_NEWS')}
        </p>
      </div>

      <Image
        src={`${news.imageId}`}
        width={800}
        height={600}
        alt="news_image"
        className="h-280px w-full rounded-lg object-cover"
      />

      <h1 className="text-center text-xl font-bold text-surface-brand-secondary tablet:text-32px">
        {news.title}
      </h1>

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          ul: CustomList, // Info: (20241024 - Liz) 使用自定義的 ul 樣式
        }}
      >
        {news.content}
      </ReactMarkdown>
    </main>
  );
};

export default SystemNewsPageBody;
