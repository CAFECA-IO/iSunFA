import Hero from "@/components/landing_page/hero";
import SimulationWorkflow from "@/components/landing_page/simulation_workflow";
import NetZeroPathway from "@/components/landing_page/net_zero_pathway";
import Features from "@/components/landing_page/features";
import TechSpecs from "@/components/landing_page/tech_specs";
import Acknowledgement from "@/components/landing_page/acknowledgement";
import AIConsultationSection from "@/components/landing_page/ai_consultation_section";
import DPPUrbanMining from "@/components/landing_page/dpp_urban_mining";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Hero />
      <SimulationWorkflow />
      <Features />
      <NetZeroPathway />
      <AIConsultationSection />
      <DPPUrbanMining />
      <TechSpecs />
      <Acknowledgement />
    </main>
  );
}
