"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMemory,
  formatNotesHours,
  formatUsd,
  getPlans,
  getProducts,
} from "@/lib/copper/catalog";
import {
  annualSavings,
  planPrice,
  recommend,
  type Answers,
  type Billing,
  type Purpose,
} from "@/lib/copper/concierge";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string; hint?: string };

/** Act 3: a three-tap plan finder, with a sticky summary once a choice is made. */
export function PlanFinder() {
  const products = useMemo(() => getProducts(), []);
  const plans = useMemo(() => getPlans(), []);
  const free = plans.find((p) => p.id === "free");
  const plus = plans.find((p) => p.id === "copper-plus");

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Partial<Answers>>({});
  const [billing, setBilling] = useState<Billing>("annual");
  const [offscreen, setOffscreen] = useState(false);
  const [footerShowing, setFooterShowing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const touched = useRef(false);

  const steps: {
    key: keyof Answers;
    title: string;
    options: Option<string>[];
  }[] = [
    {
      key: "purpose",
      title: "What is Copper for?",
      options: products.map((p) => ({
        value: p.id,
        label: p.id === "copper-home" ? "My home" : "My meetings",
        hint: p.type,
      })),
    },
    {
      key: "memory",
      title: "How long should Copper remember?",
      options: [
        ...(free
          ? [
              {
                value: "short",
                label: `About ${formatMemory(free.memoryDays)}`,
              },
            ]
          : []),
        ...(plus
          ? [{ value: "long", label: `Up to ${formatMemory(plus.memoryDays)}` }]
          : []),
      ],
    },
    {
      key: "budget",
      title: "What is your budget?",
      options: [
        { value: "free", label: "Just the device", hint: "No monthly plan" },
        { value: "plus", label: "A monthly plan is fine" },
      ],
    },
  ];

  const complete =
    picked.purpose && picked.memory && picked.budget
      ? (picked as Answers)
      : null;
  const result = complete ? recommend(complete, products, plans) : null;

  // The summary bar shows only while the finder is off screen and the footer is not.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const finder = new IntersectionObserver(([e]) =>
      setOffscreen(!e.isIntersecting),
    );
    if (rootRef.current) finder.observe(rootRef.current);
    const footer = document.querySelector('[data-testid="site-footer"]');
    const foot = new IntersectionObserver(([e]) =>
      setFooterShowing(e.isIntersecting),
    );
    if (footer) foot.observe(footer);
    return () => {
      finder.disconnect();
      foot.disconnect();
    };
  }, []);

  const showBar = Boolean(result) && offscreen && !footerShowing && !dismissed;
  useEffect(() => {
    document.body.style.paddingBottom = showBar ? "4.5rem" : "";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [showBar]);

  // Copper's voice can pick the first answer ("a speaker for my home").
  useEffect(() => {
    const onPurpose = (e: Event) => {
      const purpose = (e as CustomEvent<Purpose>).detail;
      setPicked({ purpose });
      setStep(1);
      setDismissed(false);
    };
    window.addEventListener("copper:purpose", onPurpose);
    return () => window.removeEventListener("copper:purpose", onPurpose);
  }, []);

  // Keep keyboard focus inside the finder when the next question replaces the last.
  useEffect(() => {
    if (touched.current && step < 3) {
      fieldsetRef.current?.querySelector("button")?.focus();
    }
  }, [step]);

  function choose(key: keyof Answers, value: string) {
    touched.current = true;
    setPicked((prev) => ({ ...prev, [key]: value }));
    setDismissed(false);
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setStep(steps.length);
      queueMicrotask(() => resultRef.current?.focus());
    }
  }

  function restart() {
    setPicked({});
    setStep(0);
  }

  const savings = result ? annualSavings(result.plan) : 0;
  const price = result ? planPrice(result.plan, billing) : 0;
  const period = billing === "annual" ? "year" : "month";
  const priceLabel = price === 0 ? "Free" : `${formatUsd(price)}/${period}`;
  const current = steps[step];

  return (
    <div
      id="plan-finder"
      data-testid="plan-finder"
      ref={rootRef}
      className="mx-auto mb-12 max-w-4xl scroll-mt-20 rounded-2xl border-2 border-primary/40 bg-card p-5 text-card-foreground shadow-lg sm:p-8"
    >
      <h3 className="text-2xl font-bold">Your Copper, built for you</h3>
      <p className="mt-1 text-muted-foreground">
        Three taps and Copper matches you to a product and a plan.
      </p>

      <div className="mt-6" aria-live="polite">
        {current ? (
          <fieldset ref={fieldsetRef} className="min-w-0">
            <legend className="mb-3 text-lg font-semibold">
              <span className="mr-2 text-sm font-medium text-muted-foreground">
                {step + 1} of {steps.length}
              </span>
              {current.title}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {current.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={picked[current.key] === o.value}
                  onClick={() => choose(current.key, o.value)}
                  className="flex min-h-14 flex-col items-start justify-center rounded-xl border-2 border-border bg-background px-4 py-3 text-left font-semibold outline-none transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-pressed:border-primary aria-pressed:bg-secondary"
                >
                  {o.label}
                  {o.hint && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {o.hint}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="mt-3 h-11"
              >
                Back
              </Button>
            )}
          </fieldset>
        ) : result ? (
          <div
            ref={resultRef}
            tabIndex={-1}
            data-testid="plan-result"
            className="grid items-center gap-6 rounded-xl bg-secondary p-5 text-secondary-foreground outline-none animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none sm:grid-cols-[10rem_1fr]"
          >
            <Image
              src={result.product.cutout}
              alt={`${result.product.name} ${result.product.type}`}
              width={1254}
              height={1254}
              sizes="160px"
              className="mx-auto h-auto w-40"
            />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold tracking-widest text-foreground uppercase">
                Your match
              </p>
              <p className="text-2xl font-bold">
                {result.product.name} + {result.plan.name}
              </p>
              <p>{result.reason}</p>
              <p className="text-sm text-muted-foreground">
                Device {formatUsd(result.product.priceUsd)}. Memory{" "}
                {formatMemory(result.plan.memoryDays)}. Notes{" "}
                {formatNotesHours(result.plan.notesHoursPerMonth)}.
              </p>
              {result.stretched && plus && (
                <p className="text-sm font-medium">
                  Want {formatMemory(plus.memoryDays)} of memory? Add Copper
                  Plus any time.
                </p>
              )}
              {result.plan.monthlyUsd > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    role="group"
                    aria-label="Billing period"
                    className="inline-flex rounded-lg border-2 border-border bg-background p-1"
                  >
                    {(["monthly", "annual"] as Billing[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        aria-pressed={billing === b}
                        onClick={() => setBilling(b)}
                        className={cn(
                          "min-h-11 rounded-md px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          billing === b
                            ? "bg-foreground text-background"
                            : "text-foreground hover:bg-secondary",
                        )}
                      >
                        {b === "monthly" ? "Monthly" : "Annual"}
                      </button>
                    ))}
                  </div>
                  {savings > 0 && (
                    <Badge className="bg-night text-sand">
                      Save {formatUsd(savings)} a year
                    </Badge>
                  )}
                </div>
              )}
              <p className="font-heading text-3xl font-bold">
                {price === 0 ? "Free" : formatUsd(price)}
                {price > 0 && (
                  <span className="text-base font-normal text-muted-foreground">
                    /{period}
                  </span>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={restart}
                className="h-11 self-start"
              >
                Start over
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {showBar && result && (
        <div
          role="region"
          aria-label="Your Copper summary"
          data-testid="plan-summary-bar"
          className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-primary bg-night text-sand shadow-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
            <p className="flex min-w-0 flex-1 items-baseline gap-2 text-sm font-semibold">
              <span className="min-w-0 truncate">
                {result.product.name} + {result.plan.name}
              </span>
              <span className="shrink-0">{priceLabel}</span>
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const el = rootRef.current;
                el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
                resultRef.current?.focus({ preventScroll: true });
              }}
              className="min-h-11"
            >
              View plan
            </Button>
            <button
              type="button"
              aria-label="Dismiss summary"
              onClick={() => setDismissed(true)}
              className="grid size-11 place-items-center rounded-md text-sand outline-none hover:bg-sand/10 focus-visible:ring-3 focus-visible:ring-hardhat/60"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
