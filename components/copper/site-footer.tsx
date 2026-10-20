import { Logo } from "@/components/copper/logo";

export function SiteFooter() {
  return (
    <footer data-testid="site-footer" className="bg-night text-sand">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo onDark className="w-40" />
        <p className="text-sm text-sand/80">Fictional — for educational use.</p>
      </div>
    </footer>
  );
}
