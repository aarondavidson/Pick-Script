import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { haptics } from "@/utils/haptics";
import { soundFX } from "@/utils/soundEffects";
import { Progress } from "@/components/ui/progress";

type GamePhase = "intro" | "playing" | "won" | "lost";

interface CodeSegment {
  text: string;
  correct: boolean;
}

interface Level {
  name: string;
  prompt: string;
  segments: CodeSegment[];
  timeLimit: number;
  requiredCorrect: number;
}

const LEVELS: Level[] = [
  {
    name: "FIREWALL BYPASS",
    prompt: "Select the code that disables the firewall authentication...",
    segments: [
      { text: "auth.bypass(0xFF)", correct: true },
      { text: "print('hello')", correct: false },
      { text: "fw.disable_check()", correct: true },
      { text: "color = 'blue'", correct: false },
      { text: "net.tunnel(443)", correct: true },
      { text: "sleep(1000)", correct: false },
    ],
    timeLimit: 30,
    requiredCorrect: 2,
  },
  {
    name: "DATABASE ACCESS",
    prompt: "Inject the correct SQL to extract the access records...",
    segments: [
      { text: "SELECT * FROM access_log", correct: true },
      { text: "DROP TABLE users", correct: false },
      { text: "WHERE status='active'", correct: true },
      { text: "INSERT INTO logs", correct: false },
      { text: "JOIN subjects ON id", correct: true },
      { text: "DELETE FROM records", correct: false },
      { text: "ORDER BY threat_level", correct: true },
      { text: "UPDATE salary SET x", correct: false },
    ],
    timeLimit: 25,
    requiredCorrect: 3,
  },
  {
    name: "ENCRYPTION CRACK",
    prompt: "Choose the decryption sequence for the encrypted files...",
    segments: [
      { text: "key = RSA.decode(n,e)", correct: true },
      { text: "rand() % 256", correct: false },
      { text: "cipher.crack(brute)", correct: false },
      { text: "xor(block, iv_vector)", correct: true },
      { text: "hash.reverse(sha256)", correct: false },
      { text: "decrypt(aes_key, data)", correct: true },
      { text: "printf('%s', pwd)", correct: false },
      { text: "verify(signature, pk)", correct: true },
      { text: "rot13(plaintext)", correct: false },
      { text: "derive_key(salt, pwd)", correct: true },
    ],
    timeLimit: 22,
    requiredCorrect: 3,
  },
];

const INTEL_MESSAGES = [
  "📁 Access log recovered: someone has been badging in after hours.",
  "📁 Internal memo: 'Keep the night-shift records off the main server.'",
  "📁 Decrypted archive: the after-hours badge belongs to the night manager.",
];

interface HackingGameProps {
  isOpen: boolean;
  onClose: () => void;
  onWin: () => void;
  alreadyWon: boolean;
}

export const HackingGame = ({ isOpen, onClose, onWin, alreadyWon }: HackingGameProps) => {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [revealedIntel, setRevealedIntel] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const timerRef = useRef<number>(0);

  const level = LEVELS[currentLevel];

  const startGame = useCallback(() => {
    setPhase("playing");
    setCurrentLevel(0);
    setSelected(new Set());
    setAttempts(4);
    setHintUsed(false);
    setRevealedIntel([]);
    setFeedback(null);
    setTimeLeft(LEVELS[0].timeLimit);
    haptics.medium();
    soundFX.click();
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase("lost");
          haptics.error();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, currentLevel]);

  const toggleSegment = (index: number) => {
    if (phase !== "playing") return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    haptics.selection();
  };

  const submitAnswer = () => {
    const selectedSegments = Array.from(selected).map(i => level.segments[i]);
    const correctSelected = selectedSegments.filter(s => s.correct).length;
    const incorrectSelected = selectedSegments.filter(s => !s.correct).length;

    if (correctSelected >= level.requiredCorrect && incorrectSelected <= 1) {
      // Level passed (allow up to 1 wrong pick)
      haptics.success();
      soundFX.success();
      const intel = INTEL_MESSAGES[currentLevel];
      if (intel) setRevealedIntel(prev => [...prev, intel]);

      if (currentLevel >= LEVELS.length - 1) {
        // All levels complete
        clearInterval(timerRef.current);
        setPhase("won");
        onWin();
      } else {
        // Next level
        setFeedback("ACCESS GRANTED ✓");
        const nextLevel = currentLevel + 1;
        setTimeout(() => {
          setCurrentLevel(nextLevel);
          setSelected(new Set());
          setHintUsed(false);
          setFeedback(null);
          setTimeLeft(LEVELS[nextLevel].timeLimit);
        }, 1500);
      }
    } else {
      // Wrong answer — keep correct selections, only clear wrong ones
      haptics.error();
      const keptSelections = new Set<number>();
      selected.forEach(i => {
        if (level.segments[i].correct) keptSelections.add(i);
      });
      setSelected(keptSelections);
      
      const wrongCount = incorrectSelected;
      const missingCount = Math.max(0, level.requiredCorrect - correctSelected);
      let hint = "ACCESS DENIED ✗";
      if (wrongCount > 1) hint += ` — ${wrongCount} wrong picks`;
      else if (missingCount > 0) hint += ` — need ${missingCount} more correct`;
      
      setAttempts(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timerRef.current);
          setPhase("lost");
        }
        return next;
      });
      setFeedback(hint);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const useHint = () => {
    if (hintUsed) return;
    setHintUsed(true);
    haptics.warning();

    // Highlight two correct segments not yet selected (free, no attempt cost)
    const correctIndices = level.segments
      .map((s, i) => (s.correct && !selected.has(i) ? i : -1))
      .filter(i => i >= 0);
    const toReveal = correctIndices.slice(0, 2);
    if (toReveal.length > 0) {
      setSelected(prev => new Set([...prev, ...toReveal]));
    }
  };

  const handleClose = () => {
    clearInterval(timerRef.current);
    setPhase("intro");
    onClose();
  };

  const timePercent = level ? (timeLeft / level.timeLimit) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] bg-[#0a120a] border-2 border-green-900 p-4 max-h-[90vh] overflow-y-auto">
        <div className="space-y-3">
          {phase === "intro" && (
            <div className="text-center space-y-4 py-4">
              <h2 className="pixel-font text-xl text-green-400">💻 SECURE DATABASE</h2>
              <div className="text-left bg-black/50 p-3 rounded border border-green-900 text-xs text-green-300 font-mono space-y-1">
                <p>&gt; CONNECTION ESTABLISHED...</p>
                <p>&gt; TARGET: SECURE_DB_01</p>
                <p>&gt; SECURITY: 3-LAYER ENCRYPTION</p>
                <p>&gt; STATUS: {alreadyWon ? "PREVIOUSLY BREACHED ✓" : "LOCKED 🔒"}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Select the correct code segments to bypass each security layer.
                You have 4 attempts. One free hint per level.
              </p>
              <Button onClick={startGame} className="pixel-font bg-green-700 hover:bg-green-600 text-black">
                {alreadyWon ? "HACK AGAIN" : "BEGIN HACK"}
              </Button>
            </div>
          )}

          {phase === "playing" && (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex justify-between items-center">
                <h3 className="pixel-font text-sm text-green-400">
                  LEVEL {currentLevel + 1}: {level.name}
                </h3>
                <span className="pixel-font text-xs text-red-400">
                  ♥ × {attempts}
                </span>
              </div>

              {/* Timer */}
              <Progress value={timePercent} className="h-2 bg-green-950 [&>div]:bg-green-500" />
              <p className="text-xs text-green-500 font-mono text-right">{timeLeft}s</p>

              {/* Prompt */}
              <p className="text-xs text-green-300 font-mono bg-black/50 p-2 rounded border border-green-900">
                &gt; {level.prompt}
              </p>

              {/* Feedback */}
              {feedback && (
                <p className={`pixel-font text-sm text-center animate-pulse ${
                  feedback.includes("GRANTED") ? "text-green-400" : "text-red-400"
                }`}>
                  {feedback}
                </p>
              )}

              {/* Code segments */}
              <div className="grid grid-cols-2 gap-2">
                {level.segments.map((seg, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSegment(i)}
                    className={`text-left text-xs font-mono p-2 rounded border transition-all ${
                      selected.has(i)
                        ? "bg-green-900/60 border-green-400 text-green-200"
                        : "bg-black/40 border-green-900/50 text-green-500 hover:border-green-600"
                    }`}
                  >
                    {seg.text}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-center">
                <Button onClick={submitAnswer} size="sm" className="pixel-font bg-green-700 hover:bg-green-600 text-black text-xs">
                  EXECUTE
                </Button>
                <Button
                  onClick={useHint}
                  size="sm"
                  variant="outline"
                  disabled={hintUsed}
                  className="pixel-font text-xs border-green-800 text-green-400 hover:bg-green-900/40"
                >
                  💡 HINT (free)
                </Button>
              </div>

              {/* Intel revealed so far */}
              {revealedIntel.length > 0 && (
                <div className="space-y-1 border-t border-green-900 pt-2">
                  <p className="pixel-font text-xs text-green-600">INTEL RECOVERED:</p>
                  {revealedIntel.map((msg, i) => (
                    <p key={i} className="text-xs text-green-400/80 font-mono">{msg}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "won" && (
            <div className="text-center space-y-4 py-4">
              <h2 className="pixel-font text-xl text-green-400">🔓 HACK COMPLETE</h2>
              <div className="text-left bg-black/50 p-3 rounded border border-green-900 text-xs text-green-300 font-mono space-y-2">
                {INTEL_MESSAGES.map((msg, i) => (
                  <p key={i}>{msg}</p>
                ))}
              </div>
              {!alreadyWon && (
                <p className="text-xs text-accent pixel-font animate-pulse">
                  📋 Files acquired! Intel added to journal.
                </p>
              )}
              <Button onClick={handleClose} className="pixel-font">DISCONNECT</Button>
            </div>
          )}

          {phase === "lost" && (
            <div className="text-center space-y-4 py-4">
              <h2 className="pixel-font text-xl text-red-400">⚠️ INTRUSION DETECTED</h2>
              <p className="text-xs text-red-300 font-mono">
                {timeLeft <= 0 ? "Connection timed out. Trace initiated." : "Too many failed attempts. System locked."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={startGame} className="pixel-font bg-green-700 hover:bg-green-600 text-black">
                  RETRY
                </Button>
                <Button onClick={handleClose} variant="outline" className="pixel-font">
                  ABORT
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
