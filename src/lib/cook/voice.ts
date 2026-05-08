/**
 * Tier 1 voice — Phase 2 of the Cook with Marco design spec.
 *
 * Two halves:
 *   1. A thin wrapper around the Web Speech API's SpeechRecognition with
 *      browser-feature detection and the auto-restart dance iOS Safari
 *      needs to fake "continuous listening" (the API auto-stops after a
 *      few seconds of silence).
 *   2. A pure intent parser that maps free-form transcripts to a small set
 *      of discrete VoiceIntent objects the CookMode component can dispatch
 *      against. ~6 commands for v1; the rest of the spec's ~15 land in a
 *      follow-up once we know recognition is reliable in real kitchens.
 *
 * Design rules from the spec:
 * - Tier 1 = no LLM call. Local intent match against the current recipe
 *   context (steps, ingredients, dock).
 * - Activation model = cooking mode toggle (the user explicitly opts in).
 *   This module is platform-agnostic; the toggle lives in CookMode.
 */

// ─── Web Speech API types ─────────────────────────────────────────────────
//
// These aren't in lib.dom.d.ts as standardized types yet; declare what we
// actually use. Keep narrow on purpose — adding the full surface is just
// extra noise.

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string; readonly confidence: number };
}
interface SpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResult>;
}
interface SpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface VoiceCapableWindow extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

// ─── Capability detection ─────────────────────────────────────────────────

export function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as VoiceCapableWindow;
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as VoiceCapableWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ─── Recognition wrapper ──────────────────────────────────────────────────
//
// Gives the caller four callbacks: onTranscript (final transcripts only),
// onInterim (live preview text), onError, onListeningChange. Hides the
// auto-restart loop and the start/stop bookkeeping.

export interface VoiceController {
  start(): void;
  stop(): void;
  /** True between the user toggling on and toggling off, regardless of
   *  whether the underlying API is currently listening this instant. */
  isUserActive(): boolean;
}

export interface VoiceCallbacks {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (err: string) => void;
  onListeningChange?: (listening: boolean) => void;
}

export function createVoiceController(callbacks: VoiceCallbacks): VoiceController | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  let userActive = false;
  let recognition: SpeechRecognitionInstance | null = null;
  // iOS Safari fires onend after each utterance. We restart while the user
  // still wants the mic on. Guard against tight loops: if start() throws
  // synchronously (already running, etc), back off.
  let restarting = false;

  function buildRecognition(): SpeechRecognitionInstance {
    const r = new Ctor!();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";

    r.onstart = () => callbacks.onListeningChange?.(true);
    r.onend = () => {
      callbacks.onListeningChange?.(false);
      if (userActive && !restarting) {
        restarting = true;
        // Tiny gap before restart prevents the "already-running" race
        // some browsers complain about.
        setTimeout(() => {
          restarting = false;
          if (userActive && recognition) {
            try {
              recognition.start();
            } catch {
              // Swallow: usually means it's already running.
            }
          }
        }, 200);
      }
    };
    r.onerror = (e) => {
      // "no-speech" and "aborted" are normal in continuous mode — silence
      // gaps and user-initiated stop. Don't bubble those as errors.
      if (e.error !== "no-speech" && e.error !== "aborted") {
        callbacks.onError?.(e.error || e.message || "speech-error");
      }
    };
    r.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const trimmed = transcript.trim();
          if (trimmed) callbacks.onTranscript(trimmed);
        } else {
          interim += transcript;
        }
      }
      if (interim && callbacks.onInterim) {
        callbacks.onInterim(interim.trim());
      }
    };

    return r;
  }

  function start() {
    if (userActive) return;
    userActive = true;
    if (!recognition) recognition = buildRecognition();
    try {
      recognition.start();
    } catch {
      // Already running — fine.
    }
  }

  function stop() {
    userActive = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Already stopped — fine.
      }
    }
  }

  return { start, stop, isUserActive: () => userActive };
}

// ─── Speech synthesis ─────────────────────────────────────────────────────

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  // Cancel anything currently being spoken so a quick "next, next, next"
  // doesn't queue up overlapping utterances.
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.05;
  utt.pitch = 1.0;
  utt.lang = "en-US";
  window.speechSynthesis.speak(utt);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

// ─── Intent parser ────────────────────────────────────────────────────────

export type VoiceIntent =
  | { type: "next" }
  | { type: "previous" }
  | { type: "repeat" }
  | { type: "set_timer"; seconds: number; label: string }
  | { type: "cancel_timer" }
  | { type: "how_much"; ingredient: string };

const NEXT_RE = /^(next(\s+step)?|continue|move\s+on|go\s+on|done|that's\s+done|finished)$/i;
const PREV_RE = /^(back|previous(\s+step)?|go\s+back|undo)$/i;
const REPEAT_RE = /^(repeat|again|say\s+(it\s+|that\s+)?again|read\s+(it|that)\s+again|what\s+(was|is)\s+(the\s+)?(step|that))$/i;
const CANCEL_TIMER_RE = /^(cancel|stop|kill|clear)\s+(the\s+|a\s+)?timer$/i;

const TIMER_RE = new RegExp(
  [
    "^",
    "(?:set\\s+|start\\s+|begin\\s+)?",                      // optional verb
    "(?:a\\s+|an\\s+)?",
    "(?:timer\\s+(?:for|of)\\s+|timer\\s+)?",                // "timer for"
    "(\\d+(?:\\.\\d+)?)\\s*",                                 // primary number
    "(hours?|hrs?|minutes?|mins?|seconds?|secs?)",            // unit
    "(?:\\s+timer)?",                                         // trailing "timer"
    "$",
  ].join(""),
  "i",
);

const HOW_MUCH_RE = /^how\s+(?:much|many)\s+(.+?)(?:\s+(?:do\s+i\s+need|is\s+there|am\s+i\s+using|again))?$/i;

function unitToSeconds(unit: string, value: number): number {
  const u = unit.toLowerCase();
  if (u.startsWith("h")) return Math.round(value * 3600);
  if (u.startsWith("m")) return Math.round(value * 60);
  return Math.round(value);
}

function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds - h * 3600) / 60);
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function parseIntent(transcript: string): VoiceIntent | null {
  const text = transcript.trim().replace(/[.!?]+$/, "");
  if (!text) return null;

  if (NEXT_RE.test(text)) return { type: "next" };
  if (PREV_RE.test(text)) return { type: "previous" };
  if (REPEAT_RE.test(text)) return { type: "repeat" };
  if (CANCEL_TIMER_RE.test(text)) return { type: "cancel_timer" };

  const timerMatch = text.match(TIMER_RE);
  if (timerMatch) {
    const value = parseFloat(timerMatch[1]);
    const seconds = unitToSeconds(timerMatch[2], value);
    if (seconds > 0) {
      return { type: "set_timer", seconds, label: durationLabel(seconds) };
    }
  }

  const howMuchMatch = text.match(HOW_MUCH_RE);
  if (howMuchMatch) {
    const ingredient = howMuchMatch[1].trim();
    if (ingredient.length >= 2) {
      return { type: "how_much", ingredient };
    }
  }

  return null;
}

// ─── Helpful suggestion text ──────────────────────────────────────────────

export const VOICE_HINTS = ["\"next\"", "\"how much butter\"", "\"set timer 10 minutes\""] as const;
