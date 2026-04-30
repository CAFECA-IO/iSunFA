import Hero from '@/components/landing_page/hero';
import Features from '@/components/landing_page/features';
import TechSpecs from '@/components/landing_page/tech_specs';
import Acknowledgement from '@/components/landing_page/acknowledgement';
import AIConsultationSection from '@/components/landing_page/ai_consultation_section';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Hero />
      <Features />
      <AIConsultationSection />
      <TechSpecs />
      <Acknowledgement />
    </main>
  );
}
