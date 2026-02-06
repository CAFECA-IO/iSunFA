'use client';

import Link from 'next/link';
import CookieSettingsTrigger from '@/components/landing_page/cookie_settings_link';

import { useTranslation } from '@/i18n/i18n_context';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-white border-t border-white/10" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-300">iSunFA</h3>
            <p className="text-sm leading-6 text-gray-400 max-w-xs">
              {t('footer.description')}
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-gray-200">{t('footer.quick_links')}</h3>
                <ul className="mt-6 space-y-4">
                  <li>
                    <Link href="/" className="text-sm leading-6 text-gray-400 hover:text-orange-500 transition-colors">
                      {t('footer.home')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="text-sm leading-6 text-gray-400 hover:text-orange-500 transition-colors">
                      {t('footer.pricing')}
                    </Link>
                  </li>

                  <li>
                    <Link href="/privacy" className="text-sm leading-6 text-gray-400 hover:text-orange-500 transition-colors">
                      {t('footer.privacy')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-sm leading-6 text-gray-400 hover:text-orange-500 transition-colors">
                      {t('footer.terms')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/refund" className="text-sm leading-6 text-gray-400 hover:text-orange-500 transition-colors">
                      {t('footer.refund')}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-gray-200">{t('footer.contact_us')}</h3>
                <ul className="mt-6 space-y-4">
                  <li className="text-sm leading-6 text-gray-400">
                    {t('footer.address')}
                  </li>
                  <li>
                    <a href="mailto:contact@isunfa.com" className="text-sm leading-6 text-gray-400 hover:text-orange-500 transition-colors">
                      contact@isunfa.com
                    </a>
                  </li>
                  <li>
                    <a href="tel:+886-2-2546-6225" className="text-sm leading-6 text-gray-400 hover:text-orange-500 transition-colors">
                      +886-2-2546-6225
                    </a>
                  </li>
                  <li className="text-sm leading-6 text-gray-400">
                    {t('footer.hours')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24 md:flex md:items-center md:justify-between">
          <p className="text-xs leading-5 text-gray-500">
            &copy; 2017 - {new Date().getFullYear()} iSunFA. {t('footer.rights_reserved')}
          </p>
          <div className="flex space-x-6 md:order-2 mt-4 md:mt-0 items-center">
            <Link href="/privacy" className="text-xs leading-5 text-gray-500 hover:text-orange-500 transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/terms" className="text-xs leading-5 text-gray-500 hover:text-orange-500 transition-colors">
              {t('footer.terms')}
            </Link>
            <Link href="/refund" className="text-xs leading-5 text-gray-500 hover:text-orange-500 transition-colors">
              {t('footer.refund')}
            </Link>
            <CookieSettingsTrigger />
          </div>
        </div>
      </div>
    </footer>
  );
}
