import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square } from "lucide-react";

interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
  lang?: string;
}

export function VoiceInput({ onResult, placeholder = "点击麦克风语音输入", lang = "zh-CN" }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) {
        setTranscript(final);
        onResult(final);
        setListening(false);
      } else {
        setTranscript(interim);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, [lang, onResult]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // Already started
      }
    }
  }, [listening]);

  if (!supported) {
    return null; // Hide if not supported
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className={`p-2 rounded-full transition-all ${
          listening
            ? "bg-red-100 text-red-500 animate-pulse"
            : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        }`}
        title={listening ? "停止录音" : "语音输入"}
      >
        {listening ? <Square size={14} /> : <Mic size={14} />}
      </button>
      {transcript ? (
        <p className="text-xs text-[var(--color-foreground)] flex-1">{transcript}</p>
      ) : (
        <p className="text-[10px] text-[var(--color-muted-foreground)] flex-1">
          {listening ? "正在聆听..." : placeholder}
        </p>
      )}
    </div>
  );
}
