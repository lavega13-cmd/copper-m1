import Image from "next/image";
import { cn } from "@/lib/utils";
import { getProducts } from "@/lib/copper/catalog";

// Display copy and real pixel sizes for each lifestyle photo, keyed by path.
const PHOTOS: Record<
  string,
  {
    width: number;
    height: number;
    alt: string;
    heading: string;
    caption: string;
  }
> = {
  "/assets/lifestyle/copper-home-desert-light.png": {
    width: 1672,
    height: 941,
    alt: "Copper Home speaker on a sunlit stone counter, with a desert sunset and saguaro cacti through the window",
    heading: "Golden hour, handled",
    caption: "Copper Home keeps the house in step as the desert sun goes down.",
  },
  "/assets/lifestyle/copper-notes-stone-desk.png": {
    width: 1672,
    height: 941,
    alt: "Copper Notes recorder standing on a stone desk beside a copper charging puck, with desert hills in the window",
    heading: "Always within reach",
    caption: "Copper Notes sits on your desk, ready when the meeting starts.",
  },
  "/assets/lifestyle/copper-notes-golden-hour.png": {
    width: 1536,
    height: 1024,
    alt: "A man in a cream linen shirt writing in a notebook, with a Copper Notes recorder clipped to his shirt pocket",
    heading: "Clip it on and focus",
    caption:
      "Clipped to a pocket, Copper Notes catches the details so you don't have to.",
  },
};

export function ShowcaseSection() {
  const photos = getProducts().flatMap((product) =>
    product.lifestyle.map((src) => ({ product, src })),
  );

  return (
    <section
      id="showcase"
      data-testid="showcase"
      className="scroll-mt-16 bg-background py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <h2 className="text-3xl font-bold text-balance sm:text-4xl">
            Made for Arizona living
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From sunlit kitchens to busy desks, see how Copper fits into the
            day.
          </p>
        </div>

        <div className="flex flex-col gap-16 md:gap-24">
          {photos.map(({ product, src }, index) => {
            const photo = PHOTOS[src] ?? {
              width: 1672,
              height: 941,
              alt: `${product.name} in everyday life`,
              heading: product.name,
              caption: `${product.name} at home in the desert.`,
            };
            return (
              <figure
                key={src}
                className="grid items-center gap-6 md:grid-cols-2 md:gap-12"
              >
                <Image
                  src={src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw"
                  className={cn(
                    "h-auto w-full rounded-2xl shadow-lg",
                    index % 2 === 1 && "md:order-last",
                  )}
                />
                <figcaption className="flex flex-col gap-3">
                  <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
                    {product.name}
                  </p>
                  <h3 className="text-2xl font-bold sm:text-3xl">
                    {photo.heading}
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    {photo.caption}
                  </p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
