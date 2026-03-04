import { getCanvas, getContext } from "../../core/canvas.js";
import { isKeyPressed,wasMouseClicked,resetInput } from "../../core/input.js";
import { getBestScore, saveBestScore } from "../../core/storage.js"

const canvas = getCanvas();
const ctx = getContext();

let bgImage = null;
let birdImage1 = null;
let birdImage2 = null;

let soundPoint = null;
let soundDie = null;

let imagesLoaded = false;

let gameState = "Start";
let score = 0;
let bestScore = 0;


let bird = {
    x: canvas.width * 0.3,
    y: canvas.height * 0.4,
    width: 50,
    height: 40,
    dy: 0,
    rotation: 0,
    isFlapping: false,
};

const BASE_MOVE_SPEED = 3;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -7.6;
const JUMP_FORCE = -0.4;
const PIPE_WIDTH = 60;
const BASE_PIPE_GAP = 180;
const MIN_PIPE_GAP = 130;
const PIPE_SEPRATION_THRESHOLD = 115;

let currentSpeed = BASE_MOVE_SPEED;
let currentGap = BASE_PIPE_GAP;
let difficultyLevel = 1;

let pipes = [];
let pipeSeparation = 0;

let shakeDuration = 0;
const SHAKE_STRENGTH = 7;

let particles = []

const MILESTONES = {
    5: { text: "Nice!", color: "#FFD700"},
    10: {text: "Great!", color: "#FF8C00"},
    20: {text: "Amazing!", color: "#FF4500"},
    30: {text: "Insane!", color: "#DA00FF"},
    50: {text: "LEGENGARY!", color: "#FF0080"},
};

let milestoneText = "";
let milestoneColor = "#FFD700";
let milestoneTimer = 0;

function loadAssets() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalAssets = 3;
        
        const checkAllLoaded = () => {
            loadedCount++;
            if(loadedCount === totalAssets) {
                imagesLoaded = true;
                console.log("Flappy assets loaded successfully!");
                resolve();
            }
        };

        bgImage = new Image();
        bgImage.onload = checkAllLoaded;
        bgImage.onerror = () => {
            console.log("Background image failed to load");
            checkAllLoaded();
        };
        bgImage.src = new URL("./assets/background-img.png", import.meta.url).href;

        birdImage1 = new Image();
        birdImage1.onload = checkAllLoaded;
        birdImage1.onerror = () => {
            console.log("Bird image 1 failed to load");
            checkAllLoaded();
        };
        birdImage1.src = new URL("./assets/Bird.png",import.meta.url).href;

        birdImage2 = new Image();
        birdImage2.onload = checkAllLoaded;
        birdImage2.onerror = () => {
            console.log("Bird image 2 failed to load");
            checkAllLoaded();
        };
        birdImage2.src = new URL("./assets/Bird-2.png",import.meta.url).href;

        try {
            soundPoint = new Audio(
                new URL("./assets/sounds/point.mp3", import.meta.url).href,
            );
            soundDie = new Audio(
                new URL("./assets/sounds/die.mp3", import.meta.url).href,
            );
        } catch (e) {
            console.log("Sounds failed to load:", e);
        }
    });
}

function resetGame() {
    bird = {
        x: canvas.width * 0.3,
        y: canvas.height * 0.4,
        width: 50,
        height: 40,
        dy: 0,
        rotation: 0,
        isFlapping: false,
    };
    pipes = [];
    particles = [];
    score = 0;
    pipeSeparation = 0;
    currentSpeed = BASE_MOVE_SPEED;
    currentGap = BASE_PIPE_GAP;
    difficultyLevel = 1;
    shakeDuration = 0;
    milestoneTimer = 0;
    isNewBest = false;
    gameState = "Start";
}

function updateDifficulty() {
    const tier = Math.floor(score / 5);
    currentSpeed = BASE_MOVE_SPEED + tier * 0.4;
    currentGap = Math.max(MIN_PIPE_GAP, BASE_PIPE_GAP - tier * 8);
    difficultyLevel = tier + 1;
}

function createPipe() {
    const minHeight = 80;
    const maxHeight = canvas.height - PIPE_GAP - 80;
    const topHeight = minHeight + Math.random() * (maxHeight - minHeight);

    pipes.push({
        x: canvas.width,
        y: 0,
        width: PIPE_WIDTH,
        height: topHeight,
        scored: false,
    });

    pipes.push({
        x: canvas.width,
        y: topHeight + currentGap,
        width: PIPE_WIDTH,
        height: canvas.height - (topHeight + currentGap),
        scored: true,
    });
}

function checkCollision(pipe) {
    return (
        bird.x < pipe.x + pipe.width &&
        bird.x + bird.width > pipe.x &&
        bird.y < pipe.y + pipe.height &&
        bird.y + bird.height > pipe.y
    );
}

function spawnScoreParticles(){
    const cx = bird.x + bird.width / 2;
    const cy = bird.y + bird.height / 2;
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const speed = 2 + Math.random() * 3;
        particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            radius: 4 + Math.random() * 3,
            color: Math.random() > 0.5 ? "#FFD700" : "#FFA500"
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1;i >=0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;
        p.vy += 0.1;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function triggerDeath() {
    gameState = "End";
    shakeDuration = 20;
    if (soundDie) soundDie.play();
    const newBest = saveBestScore("flappy", score);
    if (newBest) {
        bestScore = score;
        isNewBest = true;
    }
}

export default {
    meta: {
        id: "flappy",
        name: "Flappy Dash",
        category: "reflex",
    },

    init() {
        bestScore = getBestScore("flappy");
        loadAssets();
        resetGame();
    },

    update(dt) {
        if (gameState === "Start" || gameState === "End") {
            if (isKeyPressed("Enter")) {
                resetGame();
                gameState = "Play";
                resetInput();
            }
            return;
        }

        if (gameState !== "Play") return;

        if (isKeyPressed("ArrowUp") || isKeyPressed("Space") || wasMouseClicked()) {
            bird.dy = JUMP_STRENGTH;
            bird.isFlapping = true;
            resetInput();
        } else {
            bird.isFlapping = false;
        }

        bird.dy += GRAVITY;
        bird.y += bird.dy;

        const targetRotation = Math.min(Math.max(bird.dy * 0.06, -0.45), 1.3);
        bird.rotation += (targetRotation - bird.rotation) * 0.2;

        if (bird.y <= 0 || bird.y + bird.height >= canvas.height) {
            triggerDeath();
            return;
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= currentSpeed;         

            if (checkCollision(pipe)) {
                triggerDeath();
                return;
            }

            if (!pipe.scored && pipe.x + pipe.width < bird.x) {
                pipe.scored = true;
                score ++;
                if (soundPoint) soundPoint.play();
                spawnScoreParticles();
                updateDifficulty();

                if(MILESTONES[score]) {
                    milestoneText = MILESTONES[score].text;
                    milestoneColor = MILESTONES[score].color;
                    milestoneTimer = 90;
                }
            }

            if (pipe.x + pipe.width < 0) {
                pipes.splice(i, 1);
            }
        }

        pipeSeparation++;
        if (pipeSeparation > PIPE_SEPRATION_THRESHOLD) {
            pipeSeparation = 0;
            createPipe();
        }

        updateParticles();
        if (milestoneTimer > 0) milestoneTimer--;
        if (shakeDuration > 0) shakeDuration--;
    },

    render() {

        const shakeX = shakeDuration > 0 ? (Math.random() * 2 - 1) * SHAKE_STRENGTH : 0;
        const shakeY = shakeDuration > 0 ? (Math.random() * 2 - 1) * SHAKE_STRENGTH : 0;
        ctx.save();
        ctx.translate(shakeX,shakeY);

        if (imagesLoaded && bgImage) {
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, "#4EC0CA");
            gradient.addColorStop(1, "#9BE8F5");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        for (const pipe of pipes) {
            ctx.fillStyle = "#2ECC40"
            ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);
            ctx.fillStyle = "#27A834";
            if (pipe.y === 0){
                ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, pipe.width + 10, 30);
                ctx.strokeRect(pipe.x - 5, pipe.height - 30, pipe.width + 10, 30);
            } else {
                ctx.fillRect(pipe.x - 5,pipe.y, pipe.width + 10, 30);
                ctx.strokeRect(pipe.x - 5, pipe.y, pipe.width + 10, 30);
            }
        }

        for (const p of pipes) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if(gameState === "Play") {
            const cx = bird.x + bird.width / 2;
            const cy = bird.y + bird.height / 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(bird.rotation);

            if (imagesLoaded) {
                const img = bird.isFlapping ? birdImage2 : birdImage1;
                if (img) {
                    ctx.drawImage(img, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
                } else {
                    ctx.fillStyle = "#FFD700";
                    ctx.fillRect(-bird.width / 2, -bird.height / 2, bird.width, bird.height);
                }
            } else {
                ctx.fillStyle = "#FFD700"
                ctx.fillRect(-bird.width / 2, -bird.height / 2, bird.width, bird.height);
            }
            ctx.restore();
        }

        
        if (gameState === "Play"){
            ctx.fillStyle = "gold";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.font = "bold 48px Arial";
            ctx.textAlign = "left";
            ctx.strokeText(`Score: ${score}` , 20, 60);
            ctx.fillText(`Score: ${score}`, 20, 60);

            ctx.textAlign = "right";
            ctx.font = "bold 24px Arial";
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.strokeText(`Best: ${bestScore}`, canvas.width - 20, 40);
            ctx.fillText(`Best: ${bestScore}`, canvas.width - 20, 40);

            ctx.font = "bold 20px Arial";
            ctx.fillStyle = difficultyLevel >= 7 ? "#FF0080" : difficultyLevel >= 5 ? "#FF4500" : difficultyLevel >= 3 ? "#FFA500" : "#90EE90";
            ctx.strokeText(`LVL ${difficultyLevel}`, canvas.width - 20, 70);
            ctx.fillText(`LVL ${difficultyLevel}`, canvas.width - 20, 70);

            if (milestoneTimer > 0) {
                const fade = Math.min(1, milestoneTimer / 20);
                const rise = (90 - milestoneTimer) * 0.5;
                ctx.globalAlpha = fade;
                ctx.textAlign = "center";
                ctx.font = "bold 52px Arial";
                ctx.fillStyle = milestoneColor;
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 4;
                ctx.strokeText(milestoneText, canvas.width / 2, canvas.height / 2 - 60 - rise);
                ctx.fillText(milestoneText, canvas.width / 2, canvas.height / 2 - 60 - rise);
                ctx.globalAlpha = 1;
            }
        }

        if (gameState === "Start") {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(canvas.width / 2 - 210, canvas.height / 2 - 115, 420, 240);
            ctx.strokeStyle = "#000"
            ctx.lineWidth = 3;
            ctx.strokeRect(canvas.width / 2 - 210, canvas.height / 2 - 115, 420, 240);

            ctx.fillStyle = "#000";
            ctx.font = "bold 32px Arial";
            ctx.textAlign = "center";
            ctx.fillText(
                "Press ENTER to Start",
                canvas.width / 2,
                canvas.height / 2 - 45,
            );

            ctx.font = "22px Arial";
            ctx.fillStyle = "#C00";
            ctx.fillText("↑ / Space / Click to Fly", canvas.width / 2, canvas.height / 2);

            ctx.fillStyle = "#555";
            ctx.font = "18px Arial";
            ctx.fillText("Speed increases every 5 pts!", canvas.width / 2, canvas.height / 2 + 35);

            if (bestScore > 0) {
                ctx.fillStyle = "gold";
                ctx.font = "bold 22px Arial";
                ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 80);
            }
        }

        if (gameState === "End") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(canvas.width / 2 - 210, canvas.height / 2 - 140, 420, 290);
            ctx.strokeStyle = isNewBest ? "gold" : "#000";
            ctx.lineWidth = isNewBest ? 5 :3;
            ctx.strokeRect(canvas.width / 2 - 210, canvas.height / 2 - 140, 420, 290);
            
            ctx.fillStyle = "red";
            ctx.font = "bold 48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 65);

            ctx.fillStyle = "#000";
            ctx.font = "32px Arial";
            ctx.fillText(`Score: ${score}`, canvas
                .width / 2, canvas.height / 2 - 15);

            if (isNewBest) {
                ctx.fillStyle = "gold";
                ctx.font = "bold 28px Arial";
                ctx.fillText("★ NEW BEST! ★", canvas.width / 2, canvas.height / 2 + 25);
            } else {
                ctx.fillStyle = "#333";
                ctx.font = "28px Arial";
                ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 25);
            }

            ctx.fillStyle = "#555";
            ctx.font = "22px Arial";
            ctx.fillText(
                `Reached Level : ${difficultyLevel}`,
                canvas.width / 2,
                canvas.height / 2 + 68,
            );

            ctx.fillStyle = "#000";
            ctx.font = "24px Arial";
            ctx.fillText(
                "Press ENTER to Restart",
                canvas.width / 2,
                canvas.height /2 + 112,
            );
        }

        ctx.restore();
    },

    destroy() {
        resetInput();
    }
};