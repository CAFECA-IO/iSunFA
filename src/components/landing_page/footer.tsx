import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <h3 className="text-2xl font-bold">iSunFA</h3>
            <p className="text-sm leading-6 text-gray-300">
              讓我們解決財務會計大小事，讓您專注於創造企業價值。
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">快速連結</h3>
                <ul className="mt-6 space-y-4">
                  <li>
                    <Link href="/" className="text-sm leading-6 text-gray-300 hover:text-white">
                      首頁
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="text-sm leading-6 text-gray-300 hover:text-white">
                      收費模式
                    </Link>
                  </li>

                  <li>
                    <Link href="/privacy" className="text-sm leading-6 text-gray-300 hover:text-white">
                      隱私權條款
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-sm leading-6 text-gray-300 hover:text-white">
                      服務條款
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">聯絡我們</h3>
                <ul className="mt-6 space-y-4">
                  <li className="text-sm leading-6 text-gray-300">
                    110053 臺北市信義區忠孝東路四段 521 號 14 樓
                  </li>
                  <li>
                    <a href="mailto:contact@isunfa.com" className="text-sm leading-6 text-gray-300 hover:text-white">
                      contact@isunfa.com
                    </a>
                  </li>
                  <li>
                    <a href="tel:+886-2-2700-1979" className="text-sm leading-6 text-gray-300 hover:text-white">
                      +886-2-2700-1979
                    </a>
                  </li>
                  <li className="text-sm leading-6 text-gray-300">
                    週一至週五，10:00 - 17:00 國定假日休業
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24 md:flex md:items-center md:justify-between">
          <p className="text-xs leading-5 text-gray-400">
            &copy; {new Date().getFullYear()} iSunFA. All rights reserved.
          </p>
          <div className="flex space-x-6 md:order-2 mt-4 md:mt-0">
            <Link href="/privacy" className="text-xs leading-5 text-gray-400 hover:text-white">
              隱私權條款
            </Link>
            <Link href="/terms" className="text-xs leading-5 text-gray-400 hover:text-white">
              服務條款
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
