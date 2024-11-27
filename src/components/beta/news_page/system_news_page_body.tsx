import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { JSX, ClassAttributes, HTMLAttributes } from 'react';

// Info: (20241024 - Liz) 在 Markdown 中，單個 Enter 不會換行，必須在行尾加上兩個空格來觸發換行。使用 remarkBreaks 可以實現直接按 Enter 來換行，不再需要在每行末尾加上兩個空格。

interface SystemNewsPageBodyProps {
  newsId: string;
}

const FAKE_NEWS = {
  id: 1,
  title: '這是一篇示範系統訊息，內容純屬虛構',
  type: 'fake',
  createdAt: 0,
  updatedAt: 0,
  imageSrc: '/images/fake_news_system.png',
  content: `iSunFA Version 14.10 Update Notes

Release Date: 2024/08/28 14:00-16:00

Key Features:
Enhanced tax calculation modules for local and international regulations.
Improved user interface for streamlined accounting report generation.
New automation features for daily workflow processes, including expense tracking and ledger updates.
Optimized performance for faster processing speeds in large datasets.

本平台將於 2024/08/28 (三) 下午 2 點 至 4 點 進行平台維護與更新，版本號將更新至 V.14.10，如造成不便敬請見諒。`,
};

// Info: (20241024 - Liz) 因為預設的 ul 樣式不符合需求，所以自定義一個 ul 樣式
const CustomList = (
  props: JSX.IntrinsicAttributes &
    ClassAttributes<HTMLUListElement> &
    HTMLAttributes<HTMLUListElement>
) => {
  return <ul className="list-inside list-disc" {...props} />;
};

const SystemNewsPageBody = ({ newsId }: SystemNewsPageBodyProps) => {
  // ToDo: (20241024 - Liz) 使用 newsId 打 API 取得新聞內容
  // Deprecated: (20241024 - Liz)
  // eslint-disable-next-line no-console
  console.log('newsId:', newsId);

  return (
    <main className="flex min-h-full flex-col gap-40px">
      <Image
        src={FAKE_NEWS.imageSrc}
        width={800}
        height={600}
        alt="news_image"
        className="h-280px w-full rounded-lg object-cover"
      ></Image>

      <h1 className="text-center text-32px font-bold text-surface-brand-secondary">
        {FAKE_NEWS.title}
      </h1>

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          ul: CustomList, // Info: (20241024 - Liz) 使用自定義的 ul 樣式
        }}
      >
        {FAKE_NEWS.content}
      </ReactMarkdown>
    </main>
  );
};

export default SystemNewsPageBody;
