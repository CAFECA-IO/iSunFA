import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import React from 'react';

function App({ Component, pageProps }: AppProps) {
  return (
    <div className="">
      <Component {...pageProps} />
    </div>
  );
}

export default appWithTranslation(App);
