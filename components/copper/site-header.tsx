import Link from "next/link";
import { Logo } from "@/components/copper/logo";
import { ModeToggle } from "@/components/copper/mode-toggle";

const LINKS = [
  { href: "#products", label: "Products" },
  { href: "#plus", label: "Copper Plus" },
  { href: "#privacy", label: "Privacy" },
];

export function SiteHeader() {
  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label="Copper State Labs home"
          className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo className="w-24 sm:w-40" />
        </Link>
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <nav aria-label="Main" className="flex items-center gap-3 sm:gap-6">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md py-2 text-xs font-medium text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
