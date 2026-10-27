// Copper Concierge logic: wake-phrase matching and the plan finder rules.
// Pure functions, no prices typed here: callers read prices from the catalog.
import type { Plan, Product, ProductId } from "@/lib/copper/catalog";

export type Purpose = ProductId;
export type Memory = "short" | "long";
export type Budget = "free" | "plus";

export type Answers = {
  purpose: Purpose;
  memory: Memory;
  budget: Budget;
};

export type Recommendation = {
  product: Product;
  plan: Plan;
  /** One plain sentence explaining the match. */
  reason: string;
  /** True when a longer memory was wanted but the budget stays Free. */
  stretched: boolean;
};

export type Billing = "monthly" | "annual";

/** True when a speech transcript contains the wake phrase "Hey Copper". */
export function hasWakePhrase(transcript: string): boolean {
  const text = transcript.toLowerCase().replace(/[^a-z\s]/g, " ");
  return /\b(hey|hay|hi|hello)\s+(copper|copper's|cooper|coppa)\b/.test(text);
}

/** Reads a spoken request ("a speaker for my home") as a purpose, or null. */
export function parseIntent(transcript: string): Purpose | null {
  const text = transcript.toLowerCase();
  const home = /\b(home|house|speaker|kitchen|family|living room)\b/.test(text);
  const notes =
    /\b(meeting|meetings|class|lecture|lectures|notes|record|recorder|work|office|job)\b/.test(
      text,
    );
  if (home === notes) return null;
  return home ? "copper-home" : "copper-notes";
}

/** What a spoken request is about, and so which part of the page answers it. */
export type Topic =
  "copper-home" | "copper-notes" | "plus" | "privacy" | "showcase" | "products";

export type Command = {
  topic: Topic;
  /** Set when the request names one product, so the plan finder can preselect it. */
  purpose: Purpose | null;
};

/**
 * Where each answer lives on the page, as a CSS selector. Products point at
 * their own card; everything else points at its section id.
 */
export const TOPIC_TARGETS: Record<Topic, string> = {
  "copper-home": '[data-testid="product-card"][data-product="copper-home"]',
  "copper-notes": '[data-testid="product-card"][data-product="copper-notes"]',
  plus: "#plus",
  privacy: "#privacy",
  showcase: "#showcase",
  products: "#products",
};

const PRIVACY =
  /\b(privacy|private|secure|security|safe|data|spy|spying|delete)\b/;
const PLANS =
  /\b(plus|plan|plans|price|prices|pricing|cost|costs|subscription|subscribe|monthly|annual|yearly|how much)\b/;
const SHOWCASE =
  /\b(photo|photos|picture|pictures|in action|show me|showcase|look like|looks like)\b/;
const PRODUCTS =
  /\b(products|devices|everything|what do you (sell|make|have))\b/;

/**
 * Reads a whole spoken request ("Hey Copper, is my data private?") as a page
 * topic, or null when nothing in it maps to a section. Privacy and plan
 * questions win over a product mention, because they ask something more
 * specific than the product itself.
 */
export function parseCommand(transcript: string): Command | null {
  const text = transcript.toLowerCase();
  const purpose = parseIntent(text);
  if (PRIVACY.test(text)) return { topic: "privacy", purpose };
  if (PLANS.test(text)) return { topic: "plus", purpose };
  if (purpose) return { topic: purpose, purpose };
  if (SHOWCASE.test(text)) return { topic: "showcase", purpose: null };
  if (PRODUCTS.test(text)) return { topic: "products", purpose: null };
  return null;
}

/**
 * Product follows the purpose. Plus is picked when the budget allows it. A
 * long-memory wish on a device-only budget stays Free, and `stretched` tells
 * the page to add an "add Plus for a longer memory" line.
 */
export function recommend(
  answers: Answers,
  products: Product[],
  plans: Plan[],
): Recommendation | null {
  const product = products.find((p) => p.id === answers.purpose);
  const wantsPlus = answers.budget === "plus";
  const plan = plans.find((p) =>
    wantsPlus ? p.id === "copper-plus" : p.id === "free",
  );
  if (!product || !plan) return null;
  const stretched = answers.memory === "long" && !wantsPlus;
  const forWhat =
    answers.purpose === "copper-home" ? "your home" : "your meetings";
  const reason = wantsPlus
    ? `${product.name} with Copper Plus gives ${forWhat} the most from Copper.`
    : `${product.name} on the Free plan is all ${forWhat} needs to start.`;
  return { product, plan, reason, stretched };
}

/** Price shown for a plan under the chosen billing period. */
export function planPrice(plan: Plan, billing: Billing): number {
  return billing === "annual" ? plan.annualUsd : plan.monthlyUsd;
}

/** Whole dollars saved per year by paying annually, never negative. */
export function annualSavings(plan: Plan): number {
  const saved = plan.monthlyUsd * 12 - plan.annualUsd;
  return saved > 0 ? Math.round(saved * 100) / 100 : 0;
}
