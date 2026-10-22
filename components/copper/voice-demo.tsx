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
import { hasWakePhrase } from "@/lib/copper/concierge";

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

const REPLY_TEXT =
  "Hi, I'm Copper. Tell me what you need, and I'll find your fit.";
const LISTEN_MS = 10_000;
const REPLY_MS = 3_500;
const BARS = [
  { rest: 0.4, fixed: 0.4, dur: "1.1s", delay: "-0.6s", mid: false },
  { rest: 0.3, fixed: 0.7, dur: "0.9s", delay: "-0.45s", mid: false },
  { rest: 0.3, fixed: 1, dur: "1.2s", delay: "-0.3s", mid: true },
  { rest: 0.3, fixed: 0.7, dur: "1s", delay: "-0.15s", mid: false },
  { rest: 0.4, fixed: 0.4, dur: "1.1s", delay: "0s", mid: false },
];

/** Speak the reply with the browser's built-in voice, where it exists. */
function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* no voice available: the text reply still shows */
  }
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
  const recRef = useRef<Recognition | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      try {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const playReply = useCallback((message = "") => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setNote(message);
    setPhase("reply");
    speak(REPLY_TEXT);
    timers.current.push(setTimeout(() => setPhase("done"), REPLY_MS));
  }, []);

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
      rec.onresult = (e) => {
        const text = Array.from(e.results)
          .map((r) => r[0]?.transcript ?? "")
          .join(" ");
        if (!heard && hasWakePhrase(text)) {
          heard = true;
          rec.stop();
          playReply();
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
        {phase === "done" && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPhase("idle")}
            className="h-11 text-sand hover:bg-sand/10 hover:text-white"
          >
            Try again
          </Button>
        )}
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
        <div className="max-w-md rounded-xl border border-copper/50 bg-sand/10 p-4 text-sand">
          <p className="font-semibold text-white">{REPLY_TEXT}</p>
          <a
            href="#plan-finder"
            className="mt-2 inline-flex min-h-11 items-center rounded-md py-1 text-sm font-semibold text-hardhat underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-hardhat/60"
          >
            Find my Copper
          </a>
        </div>
      ) : null}

      <p className="max-w-md text-xs text-sand/65">
        {live
          ? "Demo only. Your browser may send what you say to its own speech service while it listens. Listening stops after 10 seconds."
          : "Demo only. This button plays a scripted reply and never uses your microphone."}
      </p>
    </div>
  );
}
