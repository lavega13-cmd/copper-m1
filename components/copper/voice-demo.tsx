"use client";

import { MicIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import {
  hasWakePhrase,
  parseCommand,
  TOPIC_TARGETS,
  type Command,
  type Topic,
} from "@/lib/copper/concierge";

type Phase = "idle" | "listening" | "reply" | "done";

// Minimal shape of the browser speech API (not in TypeScript's DOM types).
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

// Replies with a recorded voice play it; the rest use the browser voice.
const REPLIES: Record<Topic | "default", { text: string; src?: string }> = {
  default: {
    text: "Hi, I'm Copper. Tell me what you need, and I'll find your fit.",
    src: "/audio/copper-reply.mp3",
  },
  "copper-home": {
    text: "Got it. For your home, I'd start with Copper Home. Let's find your plan.",
    src: "/audio/copper-home.mp3",
  },
  "copper-notes": {
    text: "Got it. For your meetings, Copper Notes is the one. Let's find your plan.",
    src: "/audio/copper-notes.mp3",
  },
  plus: {
    text: "Here are the plans. Free to start, or Copper Plus for a longer memory and unlimited Notes.",
  },
  privacy: {
    text: "Here is exactly how Copper handles what you say.",
  },
  showcase: {
    text: "Here is Copper at home and at work.",
  },
  products: {
    text: "Meet the Copper family: Copper Home and Copper Notes.",
  },
};

// The tap versions of the voice commands, in the order they show.
const COMMANDS: [Command, string][] = [
  [{ topic: "copper-home", purpose: "copper-home" }, "For my home"],
  [{ topic: "copper-notes", purpose: "copper-notes" }, "For my meetings"],
  [{ topic: "plus", purpose: null }, "Show me the plans"],
  [{ topic: "privacy", purpose: null }, "Is it private?"],
];
const HIGHLIGHT_MS = 2_400;
const COMMAND_WAIT_MS = 2500;
const LISTEN_MS = 10_000;
const REPLY_MS = 3_500;
const BARS = [
  { rest: 0.4, fixed: 0.4, dur: "1.1s", delay: "-0.6s", mid: false },
  { rest: 0.3, fixed: 0.7, dur: "0.9s", delay: "-0.45s", mid: false },
  { rest: 0.3, fixed: 1, dur: "1.2s", delay: "-0.3s", mid: true },
  { rest: 0.3, fixed: 0.7, dur: "1s", delay: "-0.15s", mid: false },
  { rest: 0.4, fixed: 0.4, dur: "1.1s", delay: "0s", mid: false },
];

let audio: HTMLAudioElement | null = null;

/** Browser voice, used only if the recorded voice cannot play. */
function speakWithBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  } catch {
    /* no voice available: the text reply still shows */
  }
}

/** Play Copper's recorded voice; fall back to the browser voice. */
function speak(text: string, src?: string) {
  if (typeof window === "undefined") return;
  if (!src) {
    speakWithBrowser(text);
    return;
  }
  try {
    audio?.pause();
    audio = new Audio(src);
    const playing = audio.play();
    if (playing && typeof playing.catch === "function") {
      playing.catch(() => speakWithBrowser(text));
    }
  } catch {
    speakWithBrowser(text);
  }
}

/**
 * Scroll the part of the page that answers `topic` to the top of the screen
 * (below the sticky header, via each target's scroll margin) and outline it
 * briefly. Call it only after React has rendered the reply, or the reply card
 * growing above would push the target out of place mid-scroll.
 */
export function scrollToTopic(topic: Topic): Element | null {
  if (typeof document === "undefined") return null;
  const target = document.querySelector(TOPIC_TARGETS[topic]);
  if (!target) return null;
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView?.({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  });
  target.setAttribute("data-concierge-focus", "");
  setTimeout(
    () => target.removeAttribute("data-concierge-focus"),
    HIGHLIGHT_MS,
  );
  return target;
}

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Act 1: "Say Hey Copper". Real speech in Chrome and Edge, tap fallback elsewhere. */
export function VoiceDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  // Support is only known in the browser: the server snapshot is null (neutral button).
  const supported = useSyncExternalStore(
    () => () => {},
    () => getRecognitionCtor() !== null,
    () => null,
  );
  const [note, setNote] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  // Bumped on every command so asking the same thing twice scrolls again.
  const [jump, setJump] = useState<{ topic: Topic; n: number } | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      try {
        audio?.pause();
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  // Scroll only after the reply has rendered: the reply card above the target
  // changes the page height, so scrolling inside the click lands short.
  useEffect(() => {
    if (jump) scrollToTopic(jump.topic);
  }, [jump]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const playReply = useCallback(
    (message = "", command: Command | null = null) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setNote(message);
      setTopic(command?.topic ?? null);
      setPhase("reply");
      const reply = REPLIES[command?.topic ?? "default"];
      speak(reply.text, reply.src);
      if (command?.purpose) {
        window.dispatchEvent(
          new CustomEvent("copper:purpose", { detail: command.purpose }),
        );
      }
      if (command) {
        setJump((prev) => ({ topic: command.topic, n: (prev?.n ?? 0) + 1 }));
      }
      timers.current.push(setTimeout(() => setPhase("done"), REPLY_MS));
    },
    [],
  );

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    try {
      audio?.pause();
    } catch {
      /* nothing playing */
    }
    setNote("");
    setPhase("idle");
  }

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      playReply();
      return;
    }
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      let heard = false;
      let latest = "";
      rec.onresult = (e) => {
        const text = Array.from(e.results)
          .map((r) => r[0]?.transcript ?? "")
          .join(" ");
        latest = text;
        if (!heard && hasWakePhrase(text)) {
          heard = true;
          // Keep listening briefly so "Hey Copper, I need ..." is heard in full.
          later(() => {
            try {
              rec.stop();
            } catch {
              /* already stopped */
            }
            playReply("", parseCommand(latest));
          }, COMMAND_WAIT_MS);
        }
      };
      rec.onerror = () => {
        if (heard) return;
        heard = true;
        playReply("Microphone unavailable, so here is the tap version.");
      };
      rec.onend = () => {
        if (!heard) setPhase((p) => (p === "listening" ? "idle" : p));
      };
      recRef.current = rec;
      setNote("");
      setPhase("listening");
      rec.start();
      later(() => {
        if (!heard) {
          try {
            rec.stop();
          } catch {
            /* already stopped */
          }
          setNote("Did not catch it. Try again, or tap below.");
          // Do not wait on onend: some browsers never fire it after stop().
          setPhase((p) => (p === "listening" ? "idle" : p));
        }
      }, LISTEN_MS);
    } catch {
      playReply();
    }
  }

  const live = supported === true;
  const label =
    supported === null
      ? "Meet Copper"
      : live
        ? "Say “Hey Copper”"
        : "Tap to try “Hey Copper”";
  const status =
    phase === "listening"
      ? "Listening. Say “Hey Copper”."
      : phase === "reply"
        ? note || "Copper heard you."
        : note;

  return (
    <div
      id="concierge-voice"
      data-testid="concierge-voice"
      data-wave={phase === "idle" || phase === "done" ? "rest" : phase}
      className="flex w-full flex-col items-start gap-4"
    >
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        <div className="relative">
          <span
            aria-hidden="true"
            className="concierge-ring absolute inset-0 rounded-xl bg-hardhat/40"
          />
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={start}
            disabled={phase === "listening" || phase === "reply"}
            className="relative h-11 w-full gap-2 rounded-xl border-sand/40 bg-transparent px-6 text-base font-semibold text-sand hover:bg-sand/10 hover:text-white focus-visible:ring-hardhat/60 sm:w-auto"
          >
            <MicIcon aria-hidden="true" className="size-4" />
            {label}
          </Button>
        </div>
      </div>

      <div aria-hidden="true" className="flex h-10 items-center gap-1">
        {BARS.map((b, i) => (
          <span
            key={i}
            style={
              {
                "--bar-rest": b.rest,
                "--bar-fixed": b.fixed,
                "--bar-dur": b.dur,
                "--bar-delay": b.delay,
              } as React.CSSProperties
            }
            className={`concierge-bar block h-10 w-1 rounded-full ${b.mid ? "bg-hardhat" : "bg-copper"}`}
          />
        ))}
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-6 text-sm text-sand/80"
      >
        {status}
      </p>

      {phase === "reply" || phase === "done" ? (
        <div
          data-testid="concierge-reply"
          className="max-w-md rounded-xl border border-copper/50 bg-sand/10 p-4 text-sand"
        >
          <p className="font-semibold text-white">
            {REPLIES[topic ?? "default"].text}
          </p>
          <a
            href="#plan-finder"
            className="mt-2 inline-flex min-h-11 items-center rounded-md py-1 text-sm font-semibold text-hardhat underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-hardhat/60"
          >
            Find my Copper
          </a>
          <div className="mt-2 flex flex-wrap gap-2">
            {COMMANDS.map(([command, label]) => (
              <Button
                key={command.topic}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => playReply("", command)}
                className="h-11 border-sand/40 bg-transparent text-sand hover:bg-sand/10 hover:text-white"
              >
                {label}
              </Button>
            ))}
          </div>
          {/* Lives inside the reply card so the hero does not grow after a
              scroll and push the answer out of place. */}
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            className="mt-2 h-11 px-2 text-sand hover:bg-sand/10 hover:text-white"
          >
            Try again
          </Button>
        </div>
      ) : null}

      <p className="max-w-md text-xs text-sand/65">
        {live
          ? "Demo only. Try: \u201cHey Copper, I need a speaker for my home,\u201d \u201c\u2026something for work,\u201d \u201c\u2026show me the plans\u201d or \u201c\u2026is my data private?\u201d Your browser may send what you say to its own speech service while it listens. Listening stops after 10 seconds."
          : "Demo only. This button plays a scripted reply and never uses your microphone."}
      </p>
    </div>
  );
}
