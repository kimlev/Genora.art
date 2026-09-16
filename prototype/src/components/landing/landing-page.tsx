import { AgentsSection } from "@/components/landing/agents-section";
import { ArenaSection } from "@/components/landing/arena-section";
import { BlogPreviewSection } from "@/components/landing/blog-preview-section";
import { CapabilitiesSection } from "@/components/landing/capabilities-section";
import { ChatDemoSection } from "@/components/landing/chat-demo-section";
import { FaqSection } from "@/components/landing/faq-section";
import { HeroSection } from "@/components/landing/hero-section";
import { ImageGenerationSection } from "@/components/landing/image-generation-section";
import { MarqueeSection } from "@/components/landing/marquee-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { SongsSection } from "@/components/landing/songs-section";
import { WhySection } from "@/components/landing/why-section";

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <WhySection />
      <MarqueeSection />
      <ChatDemoSection />
      <AgentsSection />
      <CapabilitiesSection />
      <SongsSection />
      <ArenaSection />
      <ImageGenerationSection />
      <PricingSection />
      <BlogPreviewSection />
      <FaqSection />
    </>
  );
}
