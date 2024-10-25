import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { JSX, ClassAttributes, HTMLAttributes } from 'react';

// Info: (20241024 - Liz) 在 Markdown 中，單個 Enter 不會換行，必須在行尾加上兩個空格來觸發換行。使用 remarkBreaks 可以實現直接按 Enter 來換行，不再需要在每行末尾加上兩個空格。

interface MatchNewsPageBodyProps {
  newsId: string;
}

const FAKE_NEWS = {
  id: 1,
  title: '這是一篇示範媒合訊息，內容純屬虛構',
  type: 'fake',
  createdAt: 0,
  updatedAt: 0,
  imageSrc: '/images/fake_news_financial.png',
  content: `跟大家分享一下我最近很喜歡吃漢堡。我覺得漢堡是一種很方便又好吃的食物，而且價格也很親民。我最喜歡的漢堡是麥當勞的雙層牛肉吉事堡，我覺得這款漢堡的肉餡很多，吃起來很過癮。另外，我也很喜歡肯德基的御享雞腿堡，我覺得這款漢堡的麵包很軟，吃起來很好吃。除了這兩家之外，我也很喜歡摩斯漢堡和漢堡王，我覺得這兩家的漢堡也很好吃，價格也很親民。

  我目前最愛的店家是：
  - 麥當勞
  - 肯德基
  - 摩斯漢堡
  - 漢堡王
  
  所以希望可以與上面這些店家合作。
`,
};

// Info: (20241024 - Liz) 因為預設的 ul 樣式不符合需求，所以自定義一個 ul 樣式
const CustomList = (
  props: JSX.IntrinsicAttributes &
    ClassAttributes<HTMLUListElement> &
    HTMLAttributes<HTMLUListElement>
) => {
  return <ul className="list-inside list-disc" {...props} />;
};

const MatchNewsPageBody = ({ newsId }: MatchNewsPageBodyProps) => {
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

export default MatchNewsPageBody;
