import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanFinder } from "@/components/copper/plan-finder";
import { VoiceDemo } from "@/components/copper/voice-demo";

afterEach(() => {
  vi.useRealTimers();
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

describe("VoiceDemo without speech support", () => {
  it("shows the tap fallback and plays the reply without throwing", () => {
    render(<VoiceDemo />);
    const button = screen.getByRole("button", { name: /tap to try/i });
    fireEvent.click(button);
    expect(screen.getByText(/I'm Copper/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /find my copper/i }),
    ).toHaveAttribute("href", "#plan-finder");
  });

  it("does not ask for the microphone before a click", () => {
    const start = vi.fn();
    class Fake {
      start = start;
      stop = vi.fn();
    }
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
      Fake;
    render(<VoiceDemo />);
    expect(start).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /say .hey copper/i }),
    ).toBeInTheDocument();
  });
});

describe("VoiceDemo with speech support", () => {
  it("starts listening on click and replies when the wake phrase is heard", () => {
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
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
      Fake;
    render(<VoiceDemo />);
    fireEvent.click(screen.getByRole("button", { name: /say .hey copper/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/listening/i);
    act(() => {
      made[0].onresult({ results: [[{ transcript: "hey copper" }]] });
    });
    expect(screen.getByText(/I'm Copper/)).toBeInTheDocument();
  });

  it("falls back to the scripted reply when the mic is denied", () => {
    const made: { onerror: () => void }[] = [];
    class Fake {
      onresult = null;
      onerror: () => void = () => {};
      onend = null;
      start = vi.fn();
      stop = vi.fn();
      constructor() {
        made.push(this);
      }
    }
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
      Fake;
    render(<VoiceDemo />);
    fireEvent.click(screen.getByRole("button", { name: /say .hey copper/i }));
    act(() => made[0].onerror());
    expect(screen.getByText(/I'm Copper/)).toBeInTheDocument();
  });
});

describe("PlanFinder", () => {
  const tap = (name: RegExp) =>
    fireEvent.click(screen.getByRole("button", { name }));

  it("walks three taps to a recommendation from the catalog", () => {
    render(<PlanFinder />);
    tap(/my meetings/i);
    tap(/about 30 days/i);
    tap(/monthly plan is fine/i);
    const result = screen.getByTestId("plan-result");
    expect(result).toHaveTextContent("Copper Notes + Copper Plus");
    expect(result).toHaveTextContent("$79/year");
    expect(result).toHaveTextContent(/save \$16\.88 a year/i);
  });

  it("toggles monthly and annual prices", () => {
    render(<PlanFinder />);
    tap(/my home/i);
    tap(/up to 12 months/i);
    tap(/monthly plan is fine/i);
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(screen.getByTestId("plan-result")).toHaveTextContent("$7.99/month");
  });

  it("keeps Free for a device-only budget and offers Plus", () => {
    render(<PlanFinder />);
    tap(/my home/i);
    tap(/up to 12 months/i);
    tap(/just the device/i);
    const result = screen.getByTestId("plan-result");
    expect(result).toHaveTextContent("Copper Home + Free");
    expect(result).toHaveTextContent(/add copper plus/i);
    expect(screen.queryByRole("button", { name: "Monthly" })).toBeNull();
  });

  it("can start over and go back", () => {
    render(<PlanFinder />);
    tap(/my home/i);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/what is copper for/i)).toBeInTheDocument();
    tap(/my home/i);
    tap(/about 30 days/i);
    tap(/just the device/i);
    tap(/start over/i);
    expect(screen.getByText(/what is copper for/i)).toBeInTheDocument();
  });

  it("renders without IntersectionObserver and shows no summary bar yet", () => {
    render(<PlanFinder />);
    expect(screen.queryByTestId("plan-summary-bar")).toBeNull();
  });
});
