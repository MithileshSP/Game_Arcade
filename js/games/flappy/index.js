import { getCanvas, getContext } from "../../core/canvas.js";
import { isKeyPressed,wasMouseClicked,resetInput } from "../../core/input.js";
import { getBestScore, saveBestScore } from "../../core/storage.js"

const canvas = getCanvas();
const ctx = getContext();

let spriteAtlas = null;
let imagesLoaded = false;

const SPRITES = {
  background: { x: 2, y: 11, width: 237, height: 419 },
  pipe: { x: 2, y: 537, width: 182, height: 264 },
  bird: [
    { x: 147, y: 811, width: 34, height: 24 },
    { x: 96, y: 811, width: 36, height: 23 },
    { x: 193, y: 631, width: 33, height: 24 },
  ],
};

let birdFrame = 0;
let frameTimer = 0;
const FRAME_DURATION = 100;
const BIRD_FRAMES = 3;

let bird = {}
let pipes = [];
let score = 0;
let bestScore = 0;
let gameOver = false;
let gameStarted = false;

const GRAVITY = 0.0005;
const JUMP_FORCE = -0.4;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_SPEED = 0.15;
const BIRD_SIZE = 30;

function loadSprites() {
    return new Promise((resolve) => {
        spriteAtlas = new Image();
        spriteAtlas.onload = () => {
            imagesLoaded = true;
            console.log("Sprite atlas loaded successfully!");
            resolve();
        };
        spriteAtlas.onerror = () => {
            console.log("Sprite atlas not found, using fallback rendering");
            imagesLoaded = false;
            resolve();
        };
        spriteAtlas.src = "./js/games/flappy/assets/flappy-bird-atlas.png";
    });
}

function resetGame() {
    bird = {
        x: canvas.width * 0.25,
        y: canvas.height / 2,
        velocity: 0,
        radius: BIRD_SIZE / 2,
    };

    pipes = [];
    score = 0;
    gameOver = false;
    gameStarted = false;

    for (let i = 0; i < 3; i++) {
        pipes.push(createPipe(canvas.width + i * 250));
    }
}

function createPipe(x) {
    const minHeight = 80;
    const maxHeight = canvas.height - PIPE_GAP - 80;
    const topHeight = minHeight + Math.random() * (maxHeight - minHeight);

    return {
        x: x,
        topHeight: topHeight,
        bottomY: topHeight + PIPE_GAP,
        scored: false,
    };
}

function checkCollision() {
    if (bird.y - bird.radius < 0 || bird.y + bird.radius > canvas.height) {
        return true;
    } 

    for (let pipe of pipes) {
        if (
            bird.x + bird.radius > pipe.x &&
            bird.x - bird.radius < pipe.x + PIPE_WIDTH
        ) {
            if (
                bird.y - bird.radius < pipe.topHeight ||
                bird.y + bird.radius > pipe.bottomY
            ) {
                return true;
            }
        }
    }

    return false;
}

export default {
    meta: {
        id: "flappy",
        name: "Flappy Dash",
        category: "reflex",
    },

    init() {
        bestScore = getBestScore("flappy");
        resetGame();
    },

    update(dt) {
        if(gameOver) {
            if (isKeyPressed("Space") || wasMouseClicked()) {
                resetGame();
                resetInput();
            }
            return;
        }

        if (!gameStarted) {
            if (isKeyPressed("Space") || wasMouseClicked()) {
                gameStarted = true;
                bird.velocity = JUMP_FORCE;
                resetInput();
            }
            return;
        }
        if (isKeyPressed("Space") || wasMouseClicked()) {
            bird.velocity = JUMP_FORCE;
            resetInput();
        }

        bird.velocity += GRAVITY * dt;
        bird.y += bird.velocity * dt;

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= PIPE_SPEED * dt;

            if (!pipes[i].scored && bird.x > pipes[i].x + PIPE_WIDTH) {
                pipes[i].scored = true;
                score++;
            }

            if (pipes[i].x + PIPE_WIDTH < 0) {
                pipes.splice(i, 1);
                pipes.push(createPipe(pipes[pipes.length - 1].x + 250));
            }
        }

        if (checkCollision()) {
            gameOver = true;
            const isNewBest = saveBestScore("flappy" , score);
            if (isNewBest) {
                bestScore = score;
            }
        }
    },

    render() {

        if (spriteAtlas && imagesLoaded) {
            const bg = SPRITES.background;

            ctx.drawImage(
                spriteAtlas,
                bg.x,
                bg.y,
                bg.width,
                bg.height,
                0,
                0,
                canvas.width,
                canvas.height,
            );
        } else {
            const gradient = ctx.createLinearGradient (0, 0, 0, canvas.height);
            gradient.addColorStop(0, "#4EC0CA");
            gradient.addColorStop(0, "#9BE8F5");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (spriteAtlas && imagesLoaded) {
            const pipeSprite = SPRITES.pipe;
            for (let pipe of pipes) {
                ctx.save();
                ctx.translate(pipe.x + PIPE_WIDTH / 2, pipe.topHeight);
                ctx.scale(1, -1);
                ctx.drawImage(
                    spriteAtlas,
                    pipeSprite.x,
                    pipeSprite.y,
                    pipeSprite.width,
                    pipeSprite.height,
                     -PIPE_WIDTH / 2,
                    0,
                    PIPE_WIDTH,
                    pipe.topHeight,

                );
                ctx.restore();
                
                ctx.drawImage(
                    spriteAtlas,
                    pipeSprite.x,
                    pipeSprite.y,
                    pipeSprite.width,
                    pipeSprite.height,
                    pipe.x,
                    pipe.bottomY,
                    PIPE_WIDTH,
                    canvas.height - pipe.bottomY,
                );
            }
        } else {ctx.fillStyle = "#2ECC40";
        for (let pipe of pipes) {
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
            ctx.fillRect(
                pipe.x,
                pipe.bottomY,
                PIPE_WIDTH,
                canvas.height - pipe.bottomY,
            );

            ctx.fillStyle = "#27A834";
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
            ctx.fillRect(pipe.x - 5,pipe.bottomY, PIPE_WIDTH + 10, 20);
            ctx.fillStyle = "#27A834";
        }
    }
        if (spriteAtlas && imagesLoaded) {
            const birdSprite = SPRITES.bird[birdFrame];
            ctx.save();
            ctx.translate(bird.x, bird.y);
            const rotation = Math.min(Math.max(bird.velocity * 0.3, -0.5), 0.5);
            ctx.rotate(rotation);

            ctx.drawImage(
                spriteAtlas,
                birdSprite.x,
                birdSprite.y,
                birdSprite.width,
                birdSprite.height,
                 -BIRD_SIZE / 2,
                 -BIRD_SIZE / 2,
                BIRD_SIZE,
                BIRD_SIZE,
            );

            ctx.restore();
        } else {
            ctx.fillStyle = "#FFD700"
            ctx.beginPath();
            ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(bird.x + 8, bird.y - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.font = "36px Arial";
        ctx.textAlign = "center";
        ctx.fillText(score, canvas.width / 2, 50);
        ctx.font = "18px Arial";
        ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, 80);

        if (!gameStarted && !gameOver) {
            ctx.font = "24px Arial";
            ctx.fillText(
                "Press SPACE or CLICK to start",
                canvas.width / 2,
                canvas.height / 2 + 60,
            );
            ctx.fillText(
                "Keep flying, avoid pipes!!!",
                canvas.width / 2,
                canvas.height / 2 + 90,
            );
        }

        if (gameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff";
            ctx.font = "48px Arial";
            ctx.fillText("GAME OVER", canvas.width / 2,canvas.height / 2 - 40);
            ctx.font = "32px Arial";
            ctx.fillText(`Score: ${score}` , canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText(
                `Best: ${bestScore}`,
                canvas.width / 2,
                canvas.height / 2 + 50,
            );

            ctx.font = "24px Arial";
            ctx.fillText(
                "Press SPACE or CLICK to restart",
                canvas.width / 2,
                canvas.height /2 + 100,
            );
        }
    },

    destroy() {
        resetInput();
    }
};