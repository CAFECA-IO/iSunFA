import { ReactNode } from 'react';
import Header from '@/components/landing_page/header';
import Footer from '@/components/landing_page/footer';

export default function LandingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <div className="flex-grow flex flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}
