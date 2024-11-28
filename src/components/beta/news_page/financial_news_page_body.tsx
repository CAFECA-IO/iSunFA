import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { JSX, ClassAttributes, HTMLAttributes } from 'react';

// Info: (20241024 - Liz) 在 Markdown 中，單個 Enter 不會換行，必須在行尾加上兩個空格來觸發換行。使用 remarkBreaks 可以實現直接按 Enter 來換行，不再需要在每行末尾加上兩個空格。

interface FinancialNewsPageBodyProps {
  newsId: string;
}

const FAKE_NEWS = {
  id: 1,
  title: '這是一篇示範新聞，內容純屬虛構',
  type: 'fake',
  createdAt: 0,
  updatedAt: 0,
  imageSrc: '/images/fake_news_financial.png',
  content: `關於「薯條」大家都不陌生，但你知道薯條的起源嗎？薯條的發明地點是在比利時，而非美國。在第一次世界大戰期間，美國士兵在比利時看到當地人吃炸薯條，覺得很好吃，於是帶回美國，並在美國開始流行。薯條的原料是馬鈴薯，經過切片、油炸後，撒上鹽巴，就是我們熟悉的薯條了。
  
  這裡提供一個簡單的薯條製作方法，讓你在家也能輕鬆做出美味的薯條。首先，將馬鈴薯去皮切條，然後用清水浸泡去除多餘澱粉。接著，將馬鈴薯條瀝乾水分，放入 180 度的油鍋中炸至金黃色，撈起瀝油，撒上鹽巴即可。
  
  _大家最喜歡的薯條是哪一家店的呢？_
  
  最後介紹一句成語給大家認識：「能者多勞」，意思是，**厲害的人就該多吃麥當勞**。`,
};

// Info: (20241024 - Liz) 因為預設的 ul 樣式不符合需求，所以自定義一個 ul 樣式
const CustomList = (
  props: JSX.IntrinsicAttributes &
    ClassAttributes<HTMLUListElement> &
    HTMLAttributes<HTMLUListElement>
) => {
  return <ul className="list-inside list-disc" {...props} />;
};

const FinancialNewsPageBody = ({ newsId }: FinancialNewsPageBodyProps) => {
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

export default FinancialNewsPageBody;
