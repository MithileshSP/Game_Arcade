import { getCanvas, getContext} from "../../core/canvas.js";
import { getMousePos, wasMouseClicked, resetInput } from "../../core/input.js";
import { getBestScore, saveBestScore } from "../../core/storage.js";

const canvas = getCanvas();
const ctx = getContext();

const ALL_EMOJIS = ["🍎","🍋","🍇","🍓","🍑","🍒","🥝","🍉","🌮","🍕","🎯","🎸","🚀","💎","🦊","🐬"];
const COLS = 4;
const ROWS = 4;
const CARD_W = 90;
const CARD_H = 90;
const GAP = 14;

const GRID_W = COLS * CARD_W + (COLS - 1) * GAP;
const GRID_H = ROWS * CARD_H + (ROWS - 1) * GAP;
const OFFSET_X = (canvas.width - GRID_W) / 2;
const OFFSET_Y = (canvas.height - GRID_H) / 2 + 20;

let cards = [];
let flipped = [];
let matched = [];
let moves = 0;
let bestScore = 0;
let bestMoves = 0;
let lockBoard = false;
let gameState = "Start";
let flipBackTimer = 0;

let score = 0;
let combo = 0;
let maxcombo = 0;
let isNewBest = false;
const BASE_SCORE = 1000;

let elapsed = 0;
let timerRunning = false;

let particles = [];

let milestoneText = "";
let milestoneColor = "#FFD700";
let milestoneTimer = 0;

let hoverCardId = -1;

function buildCards() {
    const chosen = [...ALL_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 8);
    const pairs = [...chosen, ...chosen];

    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    cards = pairs.map((emoji, i) => {
        const col = 1 % COLS;
        const row = Math.floor(i / COLS);
        return{
            id: i,
            emoji,
            x: OFFSET_X + col * (CARD_W + GAP),
            y: OFFSET_Y + row * (CARD_H + GAP),
            revealed : false,
            flipAnim: 0,
            matchPulse : 0,
        };
    });
}

function resetGame() {
    flipped = [];
    matched = [];
    moves = 0;
    lockBoard = false;
    flipBackTimer = 0;
    score = BASE_SCORE;
    combo = 0;
    maxcombo = 0;
    elapsed = 0;
    timerRunning = true;
    particles = [];
    milestoneTimer = 0;
    isNewBest = false;
    gameState = "Play";
    buildCards();
}

function getClickedCard(mx, my) {
    return cards.find(c => 
        !c.revealed &&
        !matched.includes(c.id) &&
        mx >= c.x && mx <= c.x + CARD_W &&
        my >= c.y && my <= c.y + CARD_H
    );
}

function drawRoundedRect(x,y,w,h,r,fill,stroke,lineW = 2) {
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
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineW;
        ctx.stroke();
    }
}

function lerp(a,b,t) { return a + (b - a) * t; }

function spawnMatchParticles(cx,cy) {
    const colors = ["#FFD700","#FFA500","#FF6B6B","#7BFF6B", "#FF6BFF"];
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
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.alpha -= 0.025;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function showMilestone(text, color = "#FFD700") {
    milestoneText = text;
    milestoneColor = color;
    milestoneTimer = 100;
}

function computeFinalScore() {
    const timePenalty = Math.floor(elapsed / 1000) * 3;
    const movePenalty = moves * 8;
    const comboBonus = maxcombo * 30;
    return Math.max(0, BASE_SCORE - timePenalty - movePenalty + comboBonus);
}


export default {
    meta: {
        id: "memory",
        name: "Memory Match",
        category: "logic"
    },
    init() {
        bestScore = getBestScore("memory");
        bestMoves = 0;
        buildCards();
        gameState = "Start";
        timerRunning = false;
        resetInput();
    },

    update(dt) {
        const FLIP_SPEED = 0.15;
        for (const card of cards) {
            const target = (card.revealed || matched.includes(card.id)) ? 1 : 0;
            card.flipAnim = lerp(card.flipAnim, target, FLIP_SPEED);
            if (card.matchPulse > 0) card.matchPulse -= 0.03;
        }

        updateParticles(dt);
        if (milestoneTimer > 0) milestoneTimer--;

        if (timerRunning) elapsed += dt;

        const mp = getMousePos ();
        const hovered = cards.find(c => 
            !c.revealed &&
            !matched.includes(c.id) &&
            mp.x >= c.x && mp.x <= c.x + CARD_W &&
            mp.y >= c.y && mp.y <= c.y + CARD_H
        );
        hoverCardId = hovered ? hovered.id : -1;

        if (gameState === "Start") {
            if (wasMouseClicked()) { resetGame(); resetInput(); }
            return;
        }

        if (gameState === "Win") {
            if (wasMouseClicked()) { resetGame(); resetInput(); }
            return;
        }

        if (lockBoard) {
            flipBackTimer -= dt;
            if (flipBackTimer <= 0) {
                flipped.forEach(id => {
                    const card = cards.find(c => c.id === id);
                    if (card) card.revealed = false;
                });
                flipped = [];
                lockBoard = false;
            }
            return;
        }

        if (wasMouseClicked()) {
            const { x , y } = getMousePos();
            const card = getClickedCard(x , y);
            if (!card || flipped.includes(card.id)) { resetInput(); return; }

            card.revealed = true;
            flipped.push(card.id);

            if (flipped.length === 2) {
                moves++;
                const [a, b] = flipped.map(id => cards.find(c => c.id === id));

                if (a.emoji === b.emoji) {
                    matched.push(a.id, b.id);
                    a.matchPulse = 1;
                    b.matchPulse = 1;
                    combo++;
                    if (combo > maxcombo) maxcombo = combo;

                    const cx = (a.x + b.x + CARD_W) / 2;
                    const cy = (a.y + b.y + CARD_H) / 2;
                    spawnMatchParticles(cx, cy);

                    const pairs = matched.length / 2;
                    if (pairs === 1) showMilestone ("First Match! 🎯", "#7BFF6B");
                    else if (pairs === 4) showMilestone("Halfway! ⚡", "#FF8C00");
                    else if (pairs === 7) showMilestone("One to go! 🔥", "#FF4500");
                    else if (combo >= 3) showMilestone(`🔥 Combo x${combo}!`, "#FF6BFF");

                    flipped = [];

                    if (matched.length === cards.length) {
                        timerRunning = false;
                        gameState = "Win";
                        score = computeFinalScore();
                        const savedNew = saveBestScore("memory", score);
                        if (savedNew || bestScore === 0) {
                            isNewBest = true;
                            bestScore = score;
                        }

                        if (bestMoves === 0 || moves < bestMoves) bestMoves = moves;
                        showMilestone("🎉 PERFECT!", "#FFD700");
                    }
                } else {
                    combo = 0;
                    score = Math.max(0, score - 20);
                    lockBoard = true;
                    flipBackTimer = 850;
                }
            }
            resetInput();
        }
    },

    render() {
        const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bg.addColorStop(0, "#1a1a2e");
        bg.addColorStop(1, "#16213e");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (gameState === "Start") {
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 52px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.fillText("Memory Match", canvas.width / 2, canvas.height / 2 - 90);

            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.font = "22px Arial";
            ctx.fillText("Match all pairs tof emoji cards!", canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillText("Combos & speed earn bonus points", canvas.width / 2, canvas.height / 2);

            if (bestScore > 0){
                ctx.fillStyle = "gold";
                ctx.font = "bold 20px Arial";
                ctx.fillText(`Best Score: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 38);
            }

            const btnGrad = ctx.createLinearGradient(canvas.width / 2 - 110, 0, canvas.width / 2 + 100, 0);
            btnGrad.addColorStop(0, "#ff6b6b");
            btnGrad.addColorStop(1, "#ffd700");
            drawRoundedRect(canvas.width / 2 - 110, canvas.height / 2 + 60, 220, 55, 12, btnGrad, null);
            ctx.fillStyle = "#000";
            ctx.font = "bold 22px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("▶ PLAY NOW", canvas.width / 2, canvas.height / 2 + 87);
            return;
        }

        ctx.textBaseline = "middle";
        for (const card of cards) {
            const isMatched = matched.includes(card.id);
            const fa = card.flipAnim;
            const isHovered = hoverCardId === card.id;

            const midFlip = fa < 0.5;
            const scaleX = midFlip ? (1- fa * 2) : ((fa -0.5) * 2);
            const cx = card.x + CARD_W / 2;

            ctx.save();
            ctx.translate(cx, 0);
            ctx.scale(scaleX, 1);
            ctx.translate(-cx, 0);

            const liftY = (!isMatched && !card.revealed && isHovered && fa < 0.1) ? -5 : 0;

            if (isMatched) {
                const pulse = card.matchPulse;
                if(pulse > 0) {
                    ctx.shadowBlur = 20 * pulse;
                    ctx.shadowColor = "#7BFF6B";
                }
                drawRoundedRect(card.x, card.y + liftY, CARD_W, CARD_H, 10, "#1a472a", "#2ecc40", 3);
                ctx.shadowBlur = 0;
            } else if (fa >= 0.5) {
                drawRoundedRect(card.x, card.y + liftY, CARD_W, CARD_H, 10, "#0d3b66", "#ffd700", 2);  
            } else {
                const grad = ctx.createLinearGradient(card.x , card.y , card.x + CARD_W, card.y + CARD_H);
                grad.addColorStop(0, isHovered ? "#3C5080" : "#2C3E70");
                grad.addColorStop(1, isHovered ? "#2a3a60" : "#1a2550");
                drawRoundedRect(card.x, card.y + liftY, CARD_W, CARD_H, 10, grad, isHovered ? "gold" : "rgba(255,215,0,0.4)" , isHovered ? 2.5 : 2);
                ctx.fillStyle = "rgba(255,215,0,0.2)";
                ctx.font = "36px Arial";
                ctx.textAlign = "center";
                ctx.fillText("?" , card.x + CARD_W / 2, card.y + CARD_H / 2);
            }

            if (fa >= 0.5) {
                ctx.font = "42px Arial";
                ctx.textAlign = "center"
                ctx.fillText(card.emoji, card.x + CARD_W / 2, card.y + CARD_H / 2);
            }

            ctx.restore();
        }
        
    },

    destroy(){
        console.log("Memory destroy");
    }
};