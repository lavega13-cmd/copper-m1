import { SiteFooter } from "@/components/copper/site-footer";
import { SiteHeader } from "@/components/copper/site-header";
import { Hero } from "@/components/copper/hero";
import { ProductsSection } from "@/components/copper/products-section";
import { ShowcaseSection } from "@/components/copper/showcase-section";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ProductsSection />
        <ShowcaseSection />
      </main>
      <SiteFooter />
    </>
  );
}
