import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { haptics } from "@/utils/haptics";
import { soundFX } from "@/utils/soundEffects";

interface Entity {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  dy: number;
}

const CANVAS_W = 320;
const CANVAS_H = 400;
const PLAYER_W = 24;
const PLAYER_H = 16;
const ENEMY_W = 20;
const ENEMY_H = 16;
const BULLET_W = 3;
const BULLET_H = 8;
const COLS = 8;
const ROWS = 4;
const ENEMY_GAP_X = 32;
const ENEMY_GAP_Y = 28;

type GamePhase = "title" | "playing" | "won" | "lost";

interface PixelInvadersGameProps {
  isOpen: boolean;
  onClose: () => void;
  onWin: () => void;
  alreadyWon: boolean;
}

export const PixelInvadersGame = ({ isOpen, onClose, onWin, alreadyWon }: PixelInvadersGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>("title");
  const gameRef = useRef<{
    player: { x: number };
    enemies: Entity[];
    playerBullets: Bullet[];
    enemyBullets: Bullet[];
    enemyDir: number;
    enemySpeed: number;
    moveTimer: number;
    shootTimer: number;
    score: number;
    lives: number;
    keys: Set<string>;
  } | null>(null);
  const animRef = useRef<number>(0);

  const initGame = useCallback(() => {
    const enemies: Entity[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        enemies.push({
          x: 30 + c * ENEMY_GAP_X,
          y: 40 + r * ENEMY_GAP_Y,
          alive: true,
        });
      }
    }
    gameRef.current = {
      player: { x: CANVAS_W / 2 - PLAYER_W / 2 },
      enemies,
      playerBullets: [],
      enemyBullets: [],
      enemyDir: 1,
      enemySpeed: 0.4,
      moveTimer: 0,
      shootTimer: 0,
      score: 0,
      lives: 3,
      keys: new Set(),
    };
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setPhase("playing");
    haptics.medium();
    soundFX.click();
  }, [initGame]);

  // Key handlers
  useEffect(() => {
    if (phase !== "playing") return;
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d", " ", "arrowup", "w"].includes(k)) {
        e.preventDefault();
        gameRef.current?.keys.add(k);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      gameRef.current?.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [phase]);

  // Game loop
  useEffect(() => {
    if (phase !== "playing" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    let lastShot = 0;

    const loop = () => {
      const g = gameRef.current!;

      // Player movement
      const speed = 3;
      if (g.keys.has("arrowleft") || g.keys.has("a")) g.player.x -= speed;
      if (g.keys.has("arrowright") || g.keys.has("d")) g.player.x += speed;
      g.player.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, g.player.x));

      // Player shooting (throttled)
      const now = performance.now();
      if ((g.keys.has(" ") || g.keys.has("arrowup") || g.keys.has("w")) && now - lastShot > 300) {
        g.playerBullets.push({ x: g.player.x + PLAYER_W / 2 - 1, y: CANVAS_H - 30, dy: -5 });
        lastShot = now;
      }

      // Move player bullets
      g.playerBullets = g.playerBullets.filter(b => {
        b.y += b.dy;
        return b.y > -BULLET_H;
      });

      // Move enemy bullets
      g.enemyBullets = g.enemyBullets.filter(b => {
        b.y += b.dy;
        return b.y < CANVAS_H + BULLET_H;
      });

      // Enemy movement
      g.moveTimer++;
      if (g.moveTimer > 2) {
        g.moveTimer = 0;
        let edgeHit = false;
        for (const e of g.enemies) {
          if (!e.alive) continue;
          e.x += g.enemyDir * g.enemySpeed;
          if (e.x <= 5 || e.x >= CANVAS_W - ENEMY_W - 5) edgeHit = true;
        }
        if (edgeHit) {
          g.enemyDir *= -1;
          for (const e of g.enemies) {
            if (e.alive) e.y += 8;
          }
          g.enemySpeed += 0.05;
        }
      }

      // Enemy shooting
      g.shootTimer++;
      if (g.shootTimer > 60) {
        g.shootTimer = 0;
        const alive = g.enemies.filter(e => e.alive);
        if (alive.length > 0) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          g.enemyBullets.push({ x: shooter.x + ENEMY_W / 2, y: shooter.y + ENEMY_H, dy: 2.5 });
        }
      }

      // Collision: player bullets vs enemies
      for (const b of g.playerBullets) {
        for (const e of g.enemies) {
          if (!e.alive) continue;
          if (b.x >= e.x && b.x <= e.x + ENEMY_W && b.y >= e.y && b.y <= e.y + ENEMY_H) {
            e.alive = false;
            b.y = -100;
            g.score += 10;
            haptics.light();
          }
        }
      }

      // Collision: enemy bullets vs player
      const px = g.player.x;
      const py = CANVAS_H - 24;
      for (const b of g.enemyBullets) {
        if (b.x >= px && b.x <= px + PLAYER_W && b.y >= py && b.y <= py + PLAYER_H) {
          b.y = CANVAS_H + 100;
          g.lives--;
          haptics.error();
          if (g.lives <= 0) {
            setPhase("lost");
            return;
          }
        }
      }

      // Check enemies reached bottom
      for (const e of g.enemies) {
        if (e.alive && e.y + ENEMY_H >= CANVAS_H - 30) {
          setPhase("lost");
          return;
        }
      }

      // Win check
      if (g.enemies.every(e => !e.alive)) {
        setPhase("won");
        haptics.success();
        soundFX.success();
        onWin();
        return;
      }

      // --- DRAW ---
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      ctx.fillStyle = "#334";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 73 + 17) % CANVAS_W;
        const sy = (i * 47 + 31) % CANVAS_H;
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Player ship (pixel art style)
      ctx.fillStyle = "#4ae";
      ctx.fillRect(px + 8, py, 8, 4);
      ctx.fillRect(px + 4, py + 4, 16, 4);
      ctx.fillRect(px, py + 8, 24, 8);
      ctx.fillStyle = "#7cf";
      ctx.fillRect(px + 10, py + 2, 4, 2);

      // Enemies (pixel art invaders)
      for (const e of g.enemies) {
        if (!e.alive) continue;
        const row = g.enemies.indexOf(e) < COLS * 2 ? 0 : 1;
        ctx.fillStyle = row === 0 ? "#e44" : "#ea4";
        // Body
        ctx.fillRect(e.x + 4, e.y, 12, 4);
        ctx.fillRect(e.x, e.y + 4, 20, 4);
        ctx.fillRect(e.x + 2, e.y + 8, 16, 4);
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.fillRect(e.x + 4, e.y + 4, 4, 4);
        ctx.fillRect(e.x + 12, e.y + 4, 4, 4);
        // Legs
        ctx.fillStyle = row === 0 ? "#e44" : "#ea4";
        ctx.fillRect(e.x, e.y + 12, 4, 4);
        ctx.fillRect(e.x + 16, e.y + 12, 4, 4);
      }

      // Player bullets
      ctx.fillStyle = "#4f4";
      for (const b of g.playerBullets) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);

      // Enemy bullets
      ctx.fillStyle = "#f44";
      for (const b of g.enemyBullets) ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);

      // HUD
      ctx.fillStyle = "#4ae";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`SCORE: ${g.score}`, 8, 16);
      ctx.fillText(`LIVES: ${"♥".repeat(g.lives)}`, CANVAS_W - 90, 16);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, onWin]);

  const handleClose = () => {
    cancelAnimationFrame(animRef.current);
    setPhase("title");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[380px] bg-[#0a0a1a] border-2 border-game-border p-4">
        <div className="text-center space-y-3">
          {phase === "title" && (
            <div className="space-y-4 py-6">
              <h2 className="pixel-font text-xl text-[#4ae]">🕹️ PIXEL INVADERS</h2>
              <p className="text-xs text-muted-foreground">
                Arrow keys / WASD to move • Space / W / ↑ to shoot
              </p>
              {alreadyWon && (
                <p className="text-xs text-green-400 pixel-font">✓ Already beaten!</p>
              )}
              <Button onClick={startGame} className="pixel-font bg-[#4ae] hover:bg-[#3ad] text-black">
                {alreadyWon ? "PLAY AGAIN" : "INSERT COIN"}
              </Button>
            </div>
          )}

          {phase === "playing" && (
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="mx-auto border border-[#224] rounded"
              style={{ imageRendering: "pixelated" }}
            />
          )}

          {phase === "won" && (
            <div className="space-y-4 py-6">
              <h2 className="pixel-font text-xl text-green-400">🏆 YOU WIN!</h2>
              <p className="text-sm text-muted-foreground pixel-font">
                Score: {gameRef.current?.score || 0}
              </p>
              {!alreadyWon && (
                <p className="text-xs text-accent pixel-font animate-pulse">
                  🎮 Arcade Token acquired!
                </p>
              )}
              <Button onClick={handleClose} className="pixel-font">COOL!</Button>
            </div>
          )}

          {phase === "lost" && (
            <div className="space-y-4 py-6">
              <h2 className="pixel-font text-xl text-red-400">💀 GAME OVER</h2>
              <p className="text-sm text-muted-foreground pixel-font">
                Score: {gameRef.current?.score || 0}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={startGame} className="pixel-font bg-[#4ae] hover:bg-[#3ad] text-black">
                  TRY AGAIN
                </Button>
                <Button onClick={handleClose} variant="outline" className="pixel-font">
                  QUIT
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
