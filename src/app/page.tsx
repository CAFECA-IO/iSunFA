import Hero from '@/components/landing_page/hero';
import Features from '@/components/landing_page/features';
import TechSpecs from '@/components/landing_page/tech_specs';
import Acknowledgement from '@/components/landing_page/acknowledgement';
import Footer from '@/components/landing_page/footer';
import Header from '@/components/landing_page/header';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <Hero />
      <Features />
      <TechSpecs />
      <Acknowledgement />
      <Footer />
    </main>
  );
}
