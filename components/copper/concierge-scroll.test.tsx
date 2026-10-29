import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { TOPIC_TARGETS, type Topic } from "@/lib/copper/concierge";

// Each spoken request must scroll to the section that answers it, and only
// after Copper's reply has rendered (scrolling earlier lands short, because the
// reply card above the target grows the page mid-scroll).

type Call = { target: Element; replyShown: boolean };
let calls: Call[] = [];
const original = Element.prototype.scrollIntoView;

beforeEach(() => {
  calls = [];
  Element.prototype.scrollIntoView = function (this: Element) {
    calls.push({
      target: this,
      replyShown: Boolean(
        document.querySelector('[data-testid="concierge-reply"]'),
      ),
    });
  };
  vi.stubGlobal(
    "Audio",
    class {
      play = () => Promise.resolve();
      pause = vi.fn();
    },
  );
  vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn() });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
});

afterEach(() => {
  Element.prototype.scrollIntoView = original;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

function installSpeech() {
  const made: { onresult: (e: unknown) => void }[] = [];
  class Fake {
    continuous = false;
    interimResults = false;
    lang = "";
    onresult: (e: unknown) => void = () => {};
    onerror = null;
    onend = null;
    start = vi.fn();
    stop = vi.fn();
    constructor() {
      made.push(this);
    }
  }
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition = Fake;
  return made;
}

/** Say a phrase into the real page, the same path the microphone feeds. */
function say(transcript: string) {
  const made = installSpeech();
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /say .hey copper/i }));
  vi.useFakeTimers();
  act(() => {
    made[0].onresult({ results: [[{ transcript }]] });
  });
  act(() => {
    vi.advanceTimersByTime(3000);
  });
}

const PHRASES: [string, Topic][] = [
  ["Hey Copper, I need a speaker for my home", "copper-home"],
  ["Hey Copper, I need something for work", "copper-notes"],
  ["Hey Copper, something for my meetings", "copper-notes"],
  ["Hey Copper, show me the plans", "plus"],
  ["Hey Copper, is my data private?", "privacy"],
  ["Hey Copper, show me photos", "showcase"],
  ["Hey Copper, what products do you have?", "products"],
];

describe("Concierge voice scroll targets", () => {
  it("every topic's target exists exactly once on the real page", () => {
    render(<Home />);
    for (const selector of Object.values(TOPIC_TARGETS)) {
      expect(document.querySelectorAll(selector)).toHaveLength(1);
    }
  });

  it.each(PHRASES)(
    "%s scrolls to %s, after the reply renders",
    (said, topic) => {
      say(said);
      const expected = document.querySelector(TOPIC_TARGETS[topic]);
      expect(expected).not.toBeNull();
      expect(calls).toHaveLength(1);
      expect(calls[0].target).toBe(expected);
      expect(calls[0].replyShown).toBe(true);
      expect(expected).toHaveAttribute("data-concierge-focus");
    },
  );

  it("the wake phrase alone replies without scrolling", () => {
    say("Hey Copper");
    expect(screen.getByText(/I'm Copper/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("the tap commands scroll to the same sections", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /tap to try/i }));
    const taps: [RegExp, Topic][] = [
      [/for my home/i, "copper-home"],
      [/for my meetings/i, "copper-notes"],
      [/show me the plans/i, "plus"],
      [/is it private/i, "privacy"],
    ];
    for (const [name, topic] of taps) {
      calls = [];
      fireEvent.click(screen.getByRole("button", { name }));
      expect(calls.map((c) => c.target)).toEqual([
        document.querySelector(TOPIC_TARGETS[topic]),
      ]);
    }
  });

  it("asking the same thing twice scrolls again", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /tap to try/i }));
    fireEvent.click(screen.getByRole("button", { name: /for my home/i }));
    fireEvent.click(screen.getByRole("button", { name: /for my home/i }));
    expect(calls).toHaveLength(2);
  });
});
