import Hero from "@/components/landing/Hero";
import FeatureCards from "@/components/landing/FeatureCards";
import ValueProps from "@/components/landing/ValueProps";
import FooterNote from "@/components/landing/FooterNote";

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh]">
      <Hero />
      <FeatureCards />
      <section className="container mx-auto px-4 py-12">
        <ValueProps />
      </section>
      <FooterNote />
    </main>
  );
}
