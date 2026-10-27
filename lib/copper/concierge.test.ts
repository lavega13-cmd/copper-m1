import { describe, expect, it } from "vitest";
import {
  annualSavings,
  hasWakePhrase,
  parseCommand,
  parseIntent,
  planPrice,
  recommend,
  TOPIC_TARGETS,
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

describe("parseIntent", () => {
  it("hears home and meeting requests", () => {
    expect(parseIntent("hey copper I need a speaker for my home")).toBe(
      "copper-home",
    );
    expect(parseIntent("hey copper something for my meetings")).toBe(
      "copper-notes",
    );
    expect(parseIntent("I need to record my lecture")).toBe("copper-notes");
  });
  it("returns null for nothing or a mix", () => {
    expect(parseIntent("hey copper")).toBeNull();
    expect(parseIntent("my home and my meetings")).toBeNull();
  });
});

describe("parseCommand: each spoken request maps to the section that answers it", () => {
  const cases: [string, string, string | null][] = [
    ["hey copper I need a speaker for my home", "copper-home", "copper-home"],
    ["hey copper I need something for work", "copper-notes", "copper-notes"],
    ["hey copper something for my meetings", "copper-notes", "copper-notes"],
    ["hey copper record my lecture", "copper-notes", "copper-notes"],
    ["hey copper show me the plans", "plus", null],
    ["hey copper how much is copper plus", "plus", null],
    ["hey copper what does it cost for my home", "plus", "copper-home"],
    ["hey copper is my data private", "privacy", null],
    ["hey copper is it safe to keep in my house", "privacy", "copper-home"],
    ["hey copper show me photos", "showcase", null],
    ["hey copper what products do you have", "products", null],
  ];
  it.each(cases)("%s -> %s", (said, topic, purpose) => {
    expect(parseCommand(said)).toEqual({ topic, purpose });
  });
  it("returns null when nothing maps to a section", () => {
    expect(parseCommand("hey copper")).toBeNull();
    expect(parseCommand("hey copper my home and my meetings")).toBeNull();
  });
  it("has a page target for every topic", () => {
    expect(Object.keys(TOPIC_TARGETS).sort()).toEqual(
      [
        "copper-home",
        "copper-notes",
        "plus",
        "privacy",
        "products",
        "showcase",
      ].sort(),
    );
  });
});
