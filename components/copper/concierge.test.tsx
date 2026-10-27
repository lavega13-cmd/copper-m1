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
    vi.useFakeTimers();
    act(() => {
      made[0].onresult({ results: [[{ transcript: "hey copper" }]] });
    });
    act(() => {
      vi.advanceTimersByTime(3000);
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
    expect(screen.getByRole("status")).toHaveTextContent(
      /microphone unavailable/i,
    );
  });
});

describe("VoiceDemo spoken reply", () => {
  it("plays the recorded voice when it can", () => {
    const play = vi.fn(() => Promise.resolve());
    const made: string[] = [];
    vi.stubGlobal(
      "Audio",
      class {
        constructor(src: string) {
          made.push(src);
        }
        play = play;
        pause = vi.fn();
      },
    );
    render(<VoiceDemo />);
    fireEvent.click(screen.getByRole("button", { name: /tap to try/i }));
    expect(made).toEqual(["/audio/copper-reply.mp3"]);
    expect(play).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("falls back to the browser voice when playback fails", async () => {
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn() });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal(
      "Audio",
      class {
        play = () => Promise.reject(new Error("blocked"));
        pause = vi.fn();
      },
    );
    render(<VoiceDemo />);
    fireEvent.click(screen.getByRole("button", { name: /tap to try/i }));
    await act(async () => {});
    expect(speak).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("Copper commands", () => {
  it("jumps the plan finder to meetings when asked by voice", () => {
    const made: { onresult: (e: unknown) => void }[] = [];
    class Fake {
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
    render(
      <>
        <VoiceDemo />
        <PlanFinder />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /say .hey copper/i }));
    vi.useFakeTimers();
    act(() => {
      made[0].onresult({
        results: [
          [{ transcript: "hey copper I need something for my meetings" }],
        ],
      });
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText(/Copper Notes is the one/)).toBeInTheDocument();
    expect(
      screen.getByText(/how long should copper remember/i),
    ).toBeInTheDocument();
  });

  it("offers the same two commands as buttons", () => {
    render(
      <>
        <VoiceDemo />
        <PlanFinder />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /tap to try/i }));
    fireEvent.click(screen.getByRole("button", { name: /for my home/i }));
    expect(screen.getByText(/start with Copper Home/)).toBeInTheDocument();
    expect(
      screen.getByText(/how long should copper remember/i),
    ).toBeInTheDocument();
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
    expect(result).toHaveTextContent("Free");
    expect(result).not.toHaveTextContent("$0");
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

describe("VoiceDemo listening timeout", () => {
  it("frees the mic button after 10 seconds even if the browser never ends", () => {
    class Fake {
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn();
      stop = vi.fn();
    }
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
      Fake;
    vi.useFakeTimers();
    render(<VoiceDemo />);
    const button = screen.getByRole("button", { name: /say .hey copper/i });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(10_500);
    });
    expect(button).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(/did not catch it/i);
  });
});
