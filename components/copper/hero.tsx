import Image from "next/image";
import { Button } from "@/components/ui/button";
import { VoiceDemo } from "@/components/copper/voice-demo";
import { getProducts } from "@/lib/copper/catalog";

// Display copy for the hero cutouts, keyed by product id.
const ALT: Record<string, string> = {
  "copper-home":
    "Copper Home smart speaker with a woven copper-orange fabric dome, a round clock display and a polished copper base",
  "copper-notes":
    "Copper Notes clip-on recorder in brushed copper with a glowing amber ring around its center button",
};

export function Hero() {
  const products = getProducts();
  const home = products.find((p) => p.id === "copper-home");
  const notes = products.find((p) => p.id === "copper-notes");

  return (
    <section
      id="top"
      data-testid="hero"
      className="relative isolate overflow-hidden bg-night text-sand"
    >
      {/* Night sky fading into a desert sunset glow along the bottom edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-linear-to-t from-sunset/25 via-copper/10 to-transparent"
      />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:gap-8 md:py-24">
        <div className="flex flex-col items-start gap-6">
          <p className="text-sm font-semibold tracking-widest text-hardhat uppercase">
            Copper State Labs
          </p>
          <h1 className="text-4xl leading-[1.1] font-bold text-balance text-white sm:text-5xl lg:text-6xl">
            Two smart companions, forged in the desert.
          </h1>
          <p className="font-heading text-xl font-semibold text-sand sm:text-2xl">
            From raw ideas to refined answers.
          </p>
          <p className="max-w-md text-base text-sand/80 sm:text-lg">
            Meet Copper Home and Copper Notes: AI companions built for everyday
            life in Arizona.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-2 h-11 rounded-xl px-6 text-base font-semibold focus-visible:ring-hardhat/60"
          >
            <a href="#products">See products</a>
          </Button>
          <VoiceDemo />
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md md:max-w-none">
          <div
            aria-hidden="true"
            className="absolute inset-[-10%] -z-10 bg-[radial-gradient(circle_at_center,var(--color-copper)_0%,transparent_65%)] opacity-40"
          />
          {home && (
            <Image
              src={home.cutout}
              alt={ALT[home.id] ?? `${home.name} ${home.type}`}
              width={1254}
              height={1254}
              preload
              sizes="(min-width: 768px) 40vw, 80vw"
              className="absolute top-[8%] left-0 h-auto w-[82%] drop-shadow-2xl"
            />
          )}
          {notes && (
            <Image
              src={notes.cutout}
              alt={ALT[notes.id] ?? `${notes.name} ${notes.type}`}
              width={1254}
              height={1254}
              preload
              sizes="(min-width: 768px) 28vw, 55vw"
              className="absolute right-0 bottom-0 z-10 h-auto w-[54%] drop-shadow-2xl"
            />
          )}
        </div>
      </div>
    </section>
  );
}
