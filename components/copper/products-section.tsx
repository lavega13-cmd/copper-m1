import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatUsd, getProducts } from "@/lib/copper/catalog";

// Display only: the swatch color for each color name in the catalog.
const SWATCH: Record<string, string> = {
  "Polished Copper": "bg-copper",
  "Brushed Copper": "bg-copper",
  "Patina Teal": "bg-patina",
  "Night Sky": "bg-night",
  "Desert Sand": "bg-sand",
};

const ALT: Record<string, string> = {
  "copper-home":
    "Copper Home smart speaker with a woven copper-orange fabric dome and a round clock display",
  "copper-notes":
    "Copper Notes clip-on recorder in brushed copper with a glowing amber ring",
};

export function ProductsSection() {
  const products = getProducts();

  return (
    <section
      id="products"
      data-testid="products"
      className="scroll-mt-16 bg-background py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-balance sm:text-4xl">
            Meet the Copper family
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One for the house, one for the day. Each is made to keep up with
            life in the desert.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {products.map((product) => (
            <Card
              key={product.id}
              data-testid="product-card"
              data-product={product.id}
              className="h-full scroll-mt-20 gap-0 py-0 shadow-sm transition-shadow"
            >
              <div className="bg-secondary px-6 py-6">
                <Image
                  src={product.cutout}
                  alt={ALT[product.id] ?? `${product.name} ${product.type}`}
                  width={1254}
                  height={1254}
                  sizes="(min-width: 768px) 40vw, 90vw"
                  className="mx-auto h-auto w-full max-w-60 lg:max-w-72"
                />
              </div>
              <CardContent className="flex flex-1 flex-col gap-6 px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">{product.name}</h3>
                    <p className="text-muted-foreground">{product.type}</p>
                  </div>
                  <p className="font-heading text-2xl font-bold">
                    {formatUsd(product.priceUsd)}
                  </p>
                </div>

                <ul className="flex flex-col gap-3">
                  {product.features.map((feature) => (
                    <li key={feature.name} className="text-base">
                      <strong className="font-bold">{feature.name}</strong>
                      <span className="text-muted-foreground">
                        {" "}
                        {feature.description}
                      </span>
                    </li>
                  ))}
                </ul>

                <ul
                  aria-label={`${product.name} colors`}
                  className="mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t pt-5"
                >
                  {product.colors.map((color) => (
                    <li key={color} className="flex items-center gap-2 text-sm">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-5 rounded-full ring-1 ring-foreground/25",
                          SWATCH[color] ?? "bg-muted",
                        )}
                      />
                      {color}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
