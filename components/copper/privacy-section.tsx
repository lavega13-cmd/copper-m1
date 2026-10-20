import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { getPrivacySummary } from "@/lib/copper/catalog";

export function PrivacySection() {
  const privacy = getPrivacySummary();

  return (
    <section
      id="privacy"
      data-testid="privacy-summary"
      className="scroll-mt-16 bg-patina/15 py-16 md:py-24"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-16">
        <div>
          <h2 className="text-3xl font-bold text-balance sm:text-4xl">
            Your privacy, under our {privacy.policy} policy
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-foreground/75">
            Here is plainly how Copper handles what you say. Your wake word is “
            {privacy.wakeWord}”.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {privacy.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-4 rounded-xl border border-patina/60 bg-card p-4 text-base text-card-foreground"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-patina text-night">
                  <CheckIcon aria-hidden="true" className="size-4" />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-xs">
          <div
            aria-hidden="true"
            className="absolute inset-[5%] rounded-full bg-patina/30"
          />
          <Image
            src="/assets/brand/copper-mascot.png"
            alt="Copper, the friendly copper robot mascot in a yellow hard hat, waving hello and holding a clipboard checklist"
            width={1254}
            height={1254}
            sizes="(min-width: 768px) 320px, 80vw"
            className="relative h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
