import { useQuery } from "@tanstack/react-query";
import { Mic, MicOff, Volume2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Tab } from "../App";
import type { UserProfile } from "../backend";
import { useActor } from "../hooks/useActor";

const TIER1_MONTHLY_CHAR_LIMIT = 500;

interface VoiceButtonProps {
  profile: UserProfile | null | undefined;
  tier: number;
  activeTab: Tab;
}

interface ActorWithVoice {
  getVoiceUsage(): Promise<{ date: bigint; count: bigint }>;
  getEarningsTotal(): Promise<[number, bigint]>;
  getUpcomingShifts(): Promise<
    Array<{ date: bigint; startTime: string; endTime: string }>
  >;
  incrementVoiceUsage(): Promise<bigint>;
  elevenLabsTextToSpeech(text: string): Promise<Uint8Array>;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEvent extends Event {
  results: SpeechRecognitionResultList;
}

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

export default function VoiceButton({ profile, tier }: VoiceButtonProps) {
  const { actor: rawActor } = useActor();
  const actor = rawActor as (ActorWithVoice & typeof rawActor) | null;
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const statusRef = useRef<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const listening = status === "listening";

  const { data: voiceUsage, refetch: refetchUsage } = useQuery({
    queryKey: ["voiceUsage"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getVoiceUsage();
    },
    enabled: !!actor,
  });

  const voiceEnabled = profile?.voiceEnabled !== false;

  const [localCharCount, setLocalCharCount] = useState<number | null>(null);
  const charCount =
    localCharCount !== null ? localCharCount : Number(voiceUsage?.count ?? 0);

  const atLimit = tier === 1 && charCount >= TIER1_MONTHLY_CHAR_LIMIT;

  /** Stop any currently playing audio and cancel speech synthesis */
  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakWithBrowser = useCallback(
    (text: string) => {
      stopCurrentAudio();
      setStatus("speaking");
      const utter = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utter);
      utter.onend = () => setStatus("idle");
    },
    [stopCurrentAudio],
  );

  const speakWithElevenLabs = useCallback(
    async (text: string) => {
      if (!actor) {
        speakWithBrowser(text);
        return;
      }
      stopCurrentAudio();
      try {
        setStatus("speaking");
        const audioBytes = await actor.elevenLabsTextToSpeech(text);
        const blob = new Blob([new Uint8Array(audioBytes).buffer], {
          type: "audio/mpeg",
        });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setStatus("idle");
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } catch {
        speakWithBrowser(text);
      }
    },
    [actor, speakWithBrowser, stopCurrentAudio],
  );

  const speak = useCallback(
    async (text: string) => {
      if (tier >= 2) {
        await speakWithElevenLabs(text);
      } else {
        speakWithBrowser(text);
      }
    },
    [tier, speakWithElevenLabs, speakWithBrowser],
  );

  const handleCommand = useCallback(
    async (cmd: string) => {
      const lower = cmd.toLowerCase().trim();
      if (!actor) return;
      setStatus("processing");

      if (
        lower.includes("earning") ||
        lower.includes("money") ||
        lower.includes("how much")
      ) {
        const [total, count] = await actor.getEarningsTotal();
        const currency = profile?.currencyCode ?? "ZAR";
        await speak(
          `Your total earnings are ${currency} ${total.toFixed(2)} from ${count} trips.`,
        );
      } else if (
        lower.includes("shift") ||
        lower.includes("schedule") ||
        lower.includes("next")
      ) {
        const shifts = await actor.getUpcomingShifts();
        if (shifts.length === 0) {
          await speak("You have no upcoming shifts scheduled.");
        } else {
          const next = shifts[0];
          await speak(
            `Your next shift is on ${new Date(Number(next.date)).toLocaleDateString()} from ${next.startTime} to ${next.endTime}.`,
          );
        }
      } else if (lower.includes("trip") || lower.includes("log")) {
        await speak(
          "To log a trip, tap the plus button in the bottom navigation.",
        );
      } else if (lower.includes("sale") || lower.includes("product")) {
        await speak("To log a sale, go to the Sales tab.");
      } else if (lower.includes("help")) {
        await speak(
          "You can ask me about your earnings, upcoming shifts, or how to log a trip or sale.",
        );
      } else {
        await speak(
          `I heard: ${cmd}. Try saying my earnings, next shift, or help.`,
        );
      }
    },
    [actor, profile, speak],
  );

  const startListening = useCallback(async () => {
    if (tier === 1 && atLimit) {
      setShowUpgrade(true);
      return;
    }

    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error(
        "Voice recognition not supported in this browser. Try Chrome.",
      );
      return;
    }

    // Stop any currently playing audio before starting new recognition
    stopCurrentAudio();

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = async (ev: SpeechRecognitionResultEvent) => {
      const text = ev.results[0][0].transcript;
      setTranscript(text);
      setStatus("processing");

      if (tier === 1) {
        const textLen = text.length;
        if (charCount + textLen > TIER1_MONTHLY_CHAR_LIMIT) {
          setShowUpgrade(true);
          setStatus("idle");
          setTimeout(() => setTranscript(""), 4000);
          return;
        }
        if (actor) {
          await actor.incrementVoiceUsage();
          setLocalCharCount((prev) => (prev ?? charCount) + textLen);
          refetchUsage();
        }
      }

      await handleCommand(text);
      setTimeout(() => setTranscript(""), 4000);
    };

    recognition.onerror = () => {
      setStatus("idle");
      setTranscript("");
    };

    recognition.onend = () => {
      if (statusRef.current === "listening") {
        statusRef.current = "idle";
        setStatus("idle");
      }
    };

    recognition.start();
    statusRef.current = "listening";
    setStatus("listening");
  }, [
    tier,
    atLimit,
    actor,
    charCount,
    refetchUsage,
    handleCommand,
    stopCurrentAudio,
  ]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    statusRef.current = "idle";
    setStatus("idle");
  }, []);

  if (!voiceEnabled) return null;

  const statusLabel =
    status === "listening"
      ? "Listening..."
      : status === "processing"
        ? "Processing..."
        : status === "speaking"
          ? "Speaking..."
          : "Tap to speak";

  return (
    <>
      {/* Upgrade modal */}
      {showUpgrade && (
        <dialog
          open
          className="fixed inset-0 m-0 bg-black/50 z-50 flex items-center justify-center p-4 w-full h-full max-w-none max-h-none"
          onClick={() => setShowUpgrade(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowUpgrade(false)}
          aria-label="Voice limit reached"
          data-ocid="voice.limit_dialog"
        >
          <div
            className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-voice"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <button
              type="button"
              onClick={() => setShowUpgrade(false)}
              className="float-right text-muted-foreground"
              aria-label="Close"
              data-ocid="voice.limit_dialog.close_button"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold text-xl mb-2">
              Voice Trial Limit Reached
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Your 500-character monthly voice trial has been used. Upgrade to
              Pro (R800/mo) or Premium (R1,100/mo) for unlimited AI voice.
            </p>
          </div>
        </dialog>
      )}

      {/* Transcript bubble */}
      {transcript && (
        <div className="fixed bottom-36 md:bottom-28 right-4 md:right-6 z-40 bg-card rounded-xl shadow-card p-3 max-w-xs border border-border">
          <p className="text-sm text-foreground">"{transcript}"</p>
        </div>
      )}

      {/* Voice button */}
      <div className="fixed bottom-28 md:bottom-20 right-4 md:right-6 z-40 flex flex-col items-end gap-1.5">
        {tier === 1 && (
          <span className="text-xs text-muted-foreground bg-card px-2.5 py-1 rounded-full shadow-xs border border-border">
            {charCount}/{TIER1_MONTHLY_CHAR_LIMIT} chars
          </span>
        )}
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          className={`flex items-center gap-2.5 pl-5 pr-4 py-3.5 rounded-full font-semibold text-white transition-all select-none btn-press ${
            status === "listening"
              ? "bg-red-500 animate-recording-pulse"
              : status === "speaking"
                ? "bg-primary/80 animate-pulse-ring"
                : status === "processing"
                  ? "bg-primary/60 cursor-wait"
                  : "bg-primary hover:opacity-90 shadow-voice"
          }`}
          aria-label={listening ? "Stop listening" : "Start voice command"}
          data-ocid="voice.command.button"
          data-recording={listening ? "true" : undefined}
        >
          {status === "listening" ? (
            <>
              <div className="relative">
                <MicOff className="w-5 h-5" />
                <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              </div>
            </>
          ) : status === "speaking" ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          <span>{statusLabel}</span>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center ml-0.5">
            <Mic className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </>
  );
}
