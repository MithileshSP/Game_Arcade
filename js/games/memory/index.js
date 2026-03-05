import { getCanvas, getContext } from "../../core/canvas.js";
import { getMousePos, wasMouseClicked, resetInput } from "../../core/input.js";
import { getBestScore, saveBestScore } from "../../core/storage.js";

const canvas = getCanvas();
const ctx = getContext();

// ─── Grid constants ───────────────────────────────────────────────────────────
const ALL_EMOJIS = ["🍎","🍋","🍇","🍓","🍑","🍒","🥝","🍉","🌮","🍕","🎯","🎸","🚀","💎","🦊","🐬"];
const COLS = 4;
const ROWS = 4;
const CARD_W = 90;
const CARD_H = 90;
const GAP = 14;

const GRID_W = COLS * CARD_W + (COLS - 1) * GAP;
const GRID_H = ROWS * CARD_H + (ROWS - 1) * GAP;
const OFFSET_X = (canvas.width - GRID_W)  / 2;
const OFFSET_Y = (canvas.height - GRID_H) / 2 + 20;

// ─── Game state ───────────────────────────────────────────────────────────────
let cards       = [];
let flipped     = [];
let matched     = [];
let moves       = 0;
let bestScore   = 0;       // stored as score (higher = better)
let bestMoves   = 0;       // fewest moves ever (for display)
let lockBoard   = false;
let gameState   = "Start"; // Start | Play | Win
let flipBackTimer = 0;

// ─── Scoring & combos ────────────────────────────────────────────────────────
let score        = 0;
let combo        = 0;       // consecutive correct matches
let maxCombo     = 0;
let isNewBest    = false;
const BASE_SCORE = 1000;

// ─── Timer ───────────────────────────────────────────────────────────────────
let elapsed      = 0;      // ms
let timerRunning = false;

// ─── Particles ───────────────────────────────────────────────────────────────
let particles = [];

// ─── Milestone popup ─────────────────────────────────────────────────────────
let milestoneText  = "";
let milestoneColor = "#FFD700";
let milestoneTimer = 0;

// ─── Card animation state ─────────────────────────────────────────────────────
// Each card stores a `flipAnim` value: 0 = fully closed, 1 = fully open
// It lerps toward its target each frame.

// ─── Hover tracking ──────────────────────────────────────────────────────────
let hoverCardId = -1;


// ─── Build / reset ────────────────────────────────────────────────────────────
function buildCards() {
    // Pick 8 unique emojis and double them
    const chosen = [...ALL_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 8);
    const pairs  = [...chosen, ...chosen];
    // Fisher-Yates shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    cards = pairs.map((emoji, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        return {
            id:       i,
            emoji,
            x:        OFFSET_X + col * (CARD_W + GAP),
            y:        OFFSET_Y + row * (CARD_H + GAP),
            revealed: false,
            flipAnim: 0,    // 0 = back, 1 = face-up
            matchPulse: 0,  // 0-1 pulse intensity after matching
        };
    });
}

function resetGame() {
    flipped       = [];
    matched       = [];
    moves         = 0;
    lockBoard     = false;
    flipBackTimer = 0;
    score         = BASE_SCORE;
    combo         = 0;
    maxCombo      = 0;
    elapsed       = 0;
    timerRunning  = true;
    particles     = [];
    milestoneTimer = 0;
    isNewBest     = false;
    gameState     = "Play";
    buildCards();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getClickedCard(mx, my) {
    return cards.find(c =>
        !c.revealed &&
        !matched.includes(c.id) &&
        mx >= c.x && mx <= c.x + CARD_W &&
        my >= c.y && my <= c.y + CARD_H
    );
}

function drawRoundedRect(x, y, w, h, r, fill, stroke, lineW = 2) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill)   { ctx.fillStyle   = fill;  ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineW; ctx.stroke(); }
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ─── Particles ────────────────────────────────────────────────────────────────
function spawnMatchParticles(cx, cy) {
    const colors = ["#FFD700","#FFA500","#FF6B6B","#7BFF6B","#6BFFF5","#FF6BFF"];
    for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            radius: 3 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x     += p.vx;
        p.y     += p.vy;
        p.vy    += 0.12;        // gravity
        p.alpha -= 0.025;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

// ─── Milestone helper ─────────────────────────────────────────────────────────
function showMilestone(text, color = "#FFD700") {
    milestoneText  = text;
    milestoneColor = color;
    milestoneTimer = 100;
}

// ─── Compute final score ──────────────────────────────────────────────────────
function computeFinalScore() {
    const timePenalty  = Math.floor(elapsed / 1000) * 3;   // -3 per second
    const movePenalty  = moves * 8;                         // -8 per move
    const comboBonus   = maxCombo * 30;                     // +30 per max combo
    return Math.max(0, BASE_SCORE - timePenalty - movePenalty + comboBonus);
}

export default {
    meta: {
        id: "memory",
        name: "Memory Match",
        category: "logic",
    },

    init() {
        bestScore = getBestScore("memory");
        // bestMoves is derived: if bestScore exists we just show it as score
        bestMoves = 0;
        buildCards();
        gameState    = "Start";
        timerRunning = false;
        resetInput();
    },

    update(dt) {
        // ── Animate card flips ──────────────────────────────────────────────
        const FLIP_SPEED = 0.15;
        for (const card of cards) {
            const target = (card.revealed || matched.includes(card.id)) ? 1 : 0;
            card.flipAnim = lerp(card.flipAnim, target, FLIP_SPEED);
            if (card.matchPulse > 0) card.matchPulse -= 0.03;
        }

        // ── Particles & milestone ───────────────────────────────────────────
        updateParticles(dt);
        if (milestoneTimer > 0) milestoneTimer--;

        // ── Timer ───────────────────────────────────────────────────────────
        if (timerRunning) elapsed += dt;

        // ── Hover tracking ──────────────────────────────────────────────────
        const mp = getMousePos();
        const hovered = cards.find(c =>
            !c.revealed && !matched.includes(c.id) &&
            mp.x >= c.x && mp.x <= c.x + CARD_W &&
            mp.y >= c.y && mp.y <= c.y + CARD_H
        );
        hoverCardId = hovered ? hovered.id : -1;

        // ── State: Start ────────────────────────────────────────────────────
        if (gameState === "Start") {
            if (wasMouseClicked()) { resetGame(); resetInput(); }
            return;
        }

        // ── State: Win ──────────────────────────────────────────────────────
        if (gameState === "Win") {
            if (wasMouseClicked()) { resetGame(); resetInput(); }
            return;
        }

        // ── Flip-back delay (mismatch) ──────────────────────────────────────
        if (lockBoard) {
            flipBackTimer -= dt;
            if (flipBackTimer <= 0) {
                flipped.forEach(id => {
                    const c = cards.find(c => c.id === id);
                    if (c) c.revealed = false;
                });
                flipped    = [];
                lockBoard  = false;
            }
            return;
        }

        // ── Click handling ──────────────────────────────────────────────────
        if (wasMouseClicked()) {
            const { x, y } = getMousePos();
            const card = getClickedCard(x, y);
            if (!card || flipped.includes(card.id)) { resetInput(); return; }

            card.revealed = true;
            flipped.push(card.id);

            if (flipped.length === 2) {
                moves++;
                const [a, b] = flipped.map(id => cards.find(c => c.id === id));

                if (a.emoji === b.emoji) {
                    // ── Match! ────────────────────────────────────────────
                    matched.push(a.id, b.id);
                    a.matchPulse = 1;
                    b.matchPulse = 1;
                    combo++;
                    if (combo > maxCombo) maxCombo = combo;

                    // Spawn particles at average center of both cards
                    const cx = ((a.x + b.x) / 2) + CARD_W / 2;
                    const cy = ((a.y + b.y) / 2) + CARD_H / 2;
                    spawnMatchParticles(cx, cy);

                    // Milestone popups
                    const pairs = matched.length / 2;
                    if (pairs === 1) showMilestone("First Match! 🎯", "#7BFF6B");
                    else if (pairs === 4) showMilestone("Halfway! ⚡", "#FF8C00");
                    else if (pairs === 7) showMilestone("One to go! 🔥", "#FF4500");
                    else if (combo >= 3) showMilestone(`🔥 Combo x${combo}!`, "#FF6BFF");

                    flipped = [];

                    if (matched.length === cards.length) {
                        // ── Win ────────────────────────────────────────────
                        timerRunning = false;
                        gameState    = "Win";
                        score        = computeFinalScore();
                        const savedNew = saveBestScore("memory", score);
                        if (savedNew || bestScore === 0) {
                            isNewBest = true;
                            bestScore = score;
                        }
                        // Update bestMoves (lower is better)
                        if (bestMoves === 0 || moves < bestMoves) bestMoves = moves;
                        showMilestone("🎉 PERFECT!", "#FFD700");
                    }
                } else {
                    // ── Mismatch ──────────────────────────────────────────
                    combo     = 0;
                    score     = Math.max(0, score - 20);
                    lockBoard = true;
                    flipBackTimer = 850;
                }
            }
            resetInput();
        }
    },

    render() {
        // ── Background ──────────────────────────────────────────────────────
        const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bg.addColorStop(0, "#1a1a2e");
        bg.addColorStop(1, "#16213e");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ── Start screen ─────────────────────────────────────────────────────
        if (gameState === "Start") {
            ctx.fillStyle = "#ffd700";
            ctx.font      = "bold 52px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.fillText("Memory Match", canvas.width / 2, canvas.height / 2 - 90);

            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.font      = "22px Arial";
            ctx.fillText("Match all pairs of emoji cards!", canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillText("Combos & speed earn bonus points", canvas.width / 2, canvas.height / 2);

            if (bestScore > 0) {
                ctx.fillStyle = "gold";
                ctx.font      = "bold 20px Arial";
                ctx.fillText(`Best Score: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 38);
            }

            // Play button
            const btnGrad = ctx.createLinearGradient(canvas.width / 2 - 110, 0, canvas.width / 2 + 110, 0);
            btnGrad.addColorStop(0, "#ff6b6b");
            btnGrad.addColorStop(1, "#ffd700");
            drawRoundedRect(canvas.width / 2 - 110, canvas.height / 2 + 60, 220, 55, 12, btnGrad, null);
            ctx.fillStyle    = "#000";
            ctx.font         = "bold 22px Arial";
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("▶ PLAY NOW", canvas.width / 2, canvas.height / 2 + 87);
            return;
        }

        // ── Cards ─────────────────────────────────────────────────────────────
        ctx.textBaseline = "middle";
        for (const card of cards) {
            const isMatched = matched.includes(card.id);
            const fa        = card.flipAnim;   // 0..1
            const isHovered = hoverCardId === card.id;

            // Simulate horizontal flip: scale x from 1→0 (first half) then 0→1 (second half)
            const midFlip = fa < 0.5;
            const scaleX  = midFlip ? (1 - fa * 2) : ((fa - 0.5) * 2);
            const cx      = card.x + CARD_W / 2;

            ctx.save();
            ctx.translate(cx, 0);
            ctx.scale(scaleX, 1);
            ctx.translate(-cx, 0);

            // Hover lift (only for unflipped, unmatched, not mid-flip)
            const liftY = (!isMatched && !card.revealed && isHovered && fa < 0.1) ? -5 : 0;

            if (isMatched) {
                // Matched card: green with pulse glow
                const pulse = card.matchPulse;
                if (pulse > 0) {
                    ctx.shadowBlur  = 20 * pulse;
                    ctx.shadowColor = "#7BFF6B";
                }
                drawRoundedRect(card.x, card.y + liftY, CARD_W, CARD_H, 10, "#1a472a", "#2ecc40", 3);
                ctx.shadowBlur = 0;
            } else if (fa >= 0.5) {
                // Face-up side
                drawRoundedRect(card.x, card.y + liftY, CARD_W, CARD_H, 10, "#0d3b66", "#ffd700", 2);
            } else {
                // Back side
                const grad = ctx.createLinearGradient(card.x, card.y, card.x + CARD_W, card.y + CARD_H);
                grad.addColorStop(0, isHovered ? "#3c5080" : "#2c3e70");
                grad.addColorStop(1, isHovered ? "#2a3a60" : "#1a2550");
                drawRoundedRect(card.x, card.y + liftY, CARD_W, CARD_H, 10, grad, isHovered ? "gold" : "rgba(255,215,0,0.4)", isHovered ? 2.5 : 2);
                ctx.fillStyle    = "rgba(255,215,0,0.2)";
                ctx.font         = "36px Arial";
                ctx.textAlign    = "center";
                ctx.fillText("?", card.x + CARD_W / 2, card.y + liftY + CARD_H / 2);
            }

            // Draw emoji on face-up half
            if (fa >= 0.5) {
                ctx.font      = "42px Arial";
                ctx.textAlign = "center";
                ctx.fillText(card.emoji, card.x + CARD_W / 2, card.y + liftY + CARD_H / 2);
            }

            ctx.restore();
        }

        // ── Particles ───────────────────────────────────────────────────────
        for (const p of particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle   = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha  = 1;
        ctx.textBaseline = "alphabetic";

        // ── HUD ─────────────────────────────────────────────────────────────
        if (gameState === "Play") {
            // Moves (top-left)
            ctx.fillStyle = "#ffd700";
            ctx.font      = "bold 22px Arial";
            ctx.textAlign = "left";
            ctx.fillText(`Moves: ${moves}`, 20, 36);

            // Timer (top-center)
            const secs = Math.floor(elapsed / 1000);
            ctx.textAlign = "center";
            ctx.fillStyle = secs > 60 ? "#FF4500" : secs > 30 ? "#FFA500" : "#7BFF6B";
            ctx.fillText(`⏱ ${secs}s`, canvas.width / 2, 36);

            // Best / Combo (top-right)
            ctx.textAlign = "right";
            ctx.fillStyle = "#ffd700";
            ctx.fillText(`Best: ${bestScore === 0 ? "-" : bestScore}`, canvas.width - 20, 36);

            if (combo >= 2) {
                ctx.fillStyle = combo >= 4 ? "#FF6BFF" : combo >= 3 ? "#FF4500" : "#FFA500";
                ctx.font      = "bold 20px Arial";
                ctx.textAlign = "right";
                ctx.fillText(`🔥 Combo x${combo}`, canvas.width - 20, 62);
            }

            // Pair progress bar (bottom)
            const pairsMatched = matched.length / 2;
            const totalPairs   = cards.length / 2;
            const barW = canvas.width - 80;
            const barX = 40;
            const barY = canvas.height - 22;
            const barH = 10;
            ctx.fillStyle   = "rgba(255,255,255,0.15)";
            drawRoundedRect(barX, barY, barW, barH, 5, "rgba(255,255,255,0.15)", null);
            if (pairsMatched > 0) {
                const prog = ctx.createLinearGradient(barX, 0, barX + barW, 0);
                prog.addColorStop(0, "#7BFF6B");
                prog.addColorStop(1, "#FFD700");
                drawRoundedRect(barX, barY, barW * (pairsMatched / totalPairs), barH, 5, prog, null);
            }
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font      = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${pairsMatched} / ${totalPairs} pairs`, canvas.width / 2, barY - 4);

            // Milestone popup
            if (milestoneTimer > 0) {
                const fade = Math.min(1, milestoneTimer / 20);
                const rise = (100 - milestoneTimer) * 0.4;
                ctx.globalAlpha  = fade;
                ctx.textAlign    = "center";
                ctx.font         = "bold 46px Arial";
                ctx.fillStyle    = milestoneColor;
                ctx.strokeStyle  = "#000";
                ctx.lineWidth    = 4;
                ctx.textBaseline = "alphabetic";
                ctx.strokeText(milestoneText, canvas.width / 2, canvas.height / 2 - 50 - rise);
                ctx.fillText(milestoneText,   canvas.width / 2, canvas.height / 2 - 50 - rise);
                ctx.globalAlpha = 1;
            }
        }

        // ── Win screen ────────────────────────────────────────────────────────
        if (gameState === "Win") {
            ctx.fillStyle = "rgba(0,0,0,0.75)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Panel
            const pw = 440, ph = 320;
            const px = canvas.width  / 2 - pw / 2;
            const py = canvas.height / 2 - ph / 2;
            drawRoundedRect(px, py, pw, ph, 16,
                "rgba(20,30,60,0.97)",
                isNewBest ? "gold" : "#ffd700",
                isNewBest ? 5 : 2
            );

            ctx.textAlign    = "center";
            ctx.textBaseline = "alphabetic";

            ctx.fillStyle = "#ffd700";
            ctx.font      = "bold 52px Arial";
            ctx.fillText("🎉 You Won!", canvas.width / 2, py + 68);

            ctx.fillStyle = "#fff";
            ctx.font      = "26px Arial";
            ctx.fillText(`Score: ${score}`, canvas.width / 2, py + 115);

            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.font      = "20px Arial";
            ctx.fillText(`Moves: ${moves}   ·   Time: ${Math.floor(elapsed / 1000)}s   ·   Max combo: ${maxCombo}`, canvas.width / 2, py + 150);

            if (isNewBest) {
                ctx.fillStyle = "gold";
                ctx.font      = "bold 26px Arial";
                ctx.fillText("★ NEW BEST SCORE! ★", canvas.width / 2, py + 190);
            } else {
                ctx.fillStyle = "rgba(255,255,255,0.55)";
                ctx.font      = "20px Arial";
                ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, py + 190);
            }

            // Play Again button
            const btnGrad = ctx.createLinearGradient(canvas.width / 2 - 120, 0, canvas.width / 2 + 120, 0);
            btnGrad.addColorStop(0, "#ff6b6b");
            btnGrad.addColorStop(1, "#ffd700");
            drawRoundedRect(canvas.width / 2 - 120, py + 220, 240, 55, 12, btnGrad, null);
            ctx.fillStyle    = "#000";
            ctx.font         = "bold 22px Arial";
            ctx.textBaseline = "middle";
            ctx.fillText("▶ Play Again", canvas.width / 2, py + 247);

            // Particles still flying
            for (const p of particles) {
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle   = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    },

    destroy() {
        resetInput();
    },
};