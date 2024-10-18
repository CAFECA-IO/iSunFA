import { PiArrowUUpLeftBold } from 'react-icons/pi';
import Link from 'next/link';

interface PageTitleProps {
  pageTitle?: string;
  goBackUrl?: string;
}

// Info: (20241015 - Liz) 頁面標題元件所需要的參數有: 頁面標題、返回按鈕的路徑，預設都是空字串。

const PageTitle = ({ pageTitle = '', goBackUrl = '' }: PageTitleProps) => {
  return (
    <div className="flex flex-auto items-center gap-8px">
      {
        // Info: (20241017 - Liz) 返回按鈕的路徑是空字串時，不顯示返回按鈕。
        goBackUrl && (
          <Link href={goBackUrl}>
            <button
              type="button"
              className="p-10px text-button-text-secondary hover:text-button-text-primary-hover"
            >
              <PiArrowUUpLeftBold size={24} />
            </button>
          </Link>
        )
      }

      <h1 className="text-xl font-bold leading-32px text-text-neutral-secondary">{pageTitle}</h1>
    </div>
  );
};

export default PageTitle;
