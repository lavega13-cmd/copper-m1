import { describe, expect, it } from "vitest";
import {
  annualSavings,
  hasWakePhrase,
  planPrice,
  recommend,
} from "@/lib/copper/concierge";
import { getPlans, getProducts } from "@/lib/copper/catalog";

describe("hasWakePhrase", () => {
  it("hears the phrase in plain and noisy transcripts", () => {
    expect(hasWakePhrase("hey copper")).toBe(true);
    expect(hasWakePhrase("Hey, Copper!")).toBe(true);
    expect(hasWakePhrase("okay so hey copper what's up")).toBe(true);
    expect(hasWakePhrase("hey cooper")).toBe(true);
  });
  it("ignores other speech", () => {
    expect(hasWakePhrase("")).toBe(false);
    expect(hasWakePhrase("copper pipes are heavy")).toBe(false);
    expect(hasWakePhrase("hey there")).toBe(false);
  });
});

describe("recommend", () => {
  const products = getProducts();
  const plans = getPlans();
  it("matches the product to the purpose", () => {
    const home = recommend(
      { purpose: "copper-home", memory: "short", budget: "free" },
      products,
      plans,
    );
    const notes = recommend(
      { purpose: "copper-notes", memory: "short", budget: "free" },
      products,
      plans,
    );
    expect(home?.product.id).toBe("copper-home");
    expect(notes?.product.id).toBe("copper-notes");
  });
  it("picks Free for short memory on a free budget", () => {
    const r = recommend(
      { purpose: "copper-home", memory: "short", budget: "free" },
      products,
      plans,
    );
    expect(r?.plan.id).toBe("free");
    expect(r?.stretched).toBe(false);
  });
  it("picks Plus when the budget allows it", () => {
    const r = recommend(
      { purpose: "copper-notes", memory: "short", budget: "plus" },
      products,
      plans,
    );
    expect(r?.plan.id).toBe("copper-plus");
    expect(r?.stretched).toBe(false);
  });
  it("keeps Free on a device-only budget and flags the longer memory", () => {
    const r = recommend(
      { purpose: "copper-home", memory: "long", budget: "free" },
      products,
      plans,
    );
    expect(r?.plan.id).toBe("free");
    expect(r?.stretched).toBe(true);
  });
  it("returns null when the catalog lacks the product or plan", () => {
    expect(
      recommend(
        { purpose: "copper-home", memory: "short", budget: "free" },
        [],
        plans,
      ),
    ).toBeNull();
  });
});

describe("pricing helpers", () => {
  const plus = getPlans().find((p) => p.id === "copper-plus")!;
  const free = getPlans().find((p) => p.id === "free")!;
  it("reads the price for the billing period from the plan", () => {
    expect(planPrice(plus, "monthly")).toBe(plus.monthlyUsd);
    expect(planPrice(plus, "annual")).toBe(plus.annualUsd);
  });
  it("computes annual savings from catalog numbers", () => {
    expect(annualSavings(plus)).toBeCloseTo(
      plus.monthlyUsd * 12 - plus.annualUsd,
      2,
    );
    expect(annualSavings(plus)).toBeGreaterThan(0);
    expect(annualSavings(free)).toBe(0);
  });
});
