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
    isFlapping: false,
};

const MOVE_SPEED = 3;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -7.6;

let pipes = [];
const JUMP_FORCE = -0.4;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_SEPRATION_THRESHOLD = 115;

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
        isFlapping: false,
    };
    pipes = [];
    score = 0;
    pipeSeparation = 0;
    gameState = "Start";
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
        y: topHeight + PIPE_GAP,
        width: PIPE_WIDTH,
        height: canvas.height - (topHeight + PIPE_GAP),
        scored: true,
    });
}

function checkCollision() {
    return (
        bird.x < pipe.x + pipe.width &&
        bird.x + bird.width > pipe.x &&
        bird.y < pipe.y + pipe.height &&
        bird.y + bird.height > pipe.y
    );
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
                gameState = "Play";
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

        if (bird.y <= 0 || bird.y + bird.height >= canvas.height) {
            gameState = "End";
            if (soundDie) soundDie.play();
            const isNewBest = saveBestScore("flappy", score);
            if (isNewBest) {
                bestScore = score;
            }
            return;
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= MOVE_SPEED;

            if (checkCollision(pipe)) {
                gameState = "End";
                if (soundDie) soundDie.play();
                const isNewBest = saveBestScore("flappy", score);
                if (isNewBest) {
                    bestScore = score;
                }
                return;
            }

            if (!pipe.scored && pipe.x + pipe.width < bird.x) {
                pipe.scored = true;
                score ++;
                if (soundPoint) soundPoint.play();
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
    },

    render() {
        if (imagesLoaded && bgImage) {
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        } else {
            const gradient = ctx.createLinearGradient (0, 0, 0, canvas.height);
            gradient.addColorStop(0, "#4EC0CA");
            gradient.addColorStop(0, "#9BE8F5");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        for (let pipe of pipes) {
            ctx.fillStyle = "#2ECC40"
            ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);

            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);

            if (pipe.y === 0){
                ctx.fillStyle = "#27A834";
                ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, pipe.width + 10, 30);
                ctx.strokeRect(pipe.x - 5, pipe.height - 30, pipe.width + 10, 30);
            } else {
                ctx.fillStyle = "#27A834";
                ctx.fillRect(pipe.x - 5,pipe.y, pipe.width + 10, 30);
                ctx.strokeRect(pipe.x - 5, pipe.y, pipe.width + 10, 30);
            }
        }

        if (gameState === "Play" && imagesLoaded) {
            const currentBirdImage = bird.isFlapping ? birdImage2 : birdImage1;
            if (currentBirdImage) {
                ctx.drawImage(
                    currentBirdImage,
                    bird.x,
                    bird.y,
                    bird.width,
                    bird.height,
                );
            } else {
                ctx.fillStyle = "#FFD700";
                ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
            }
        } else if (gameState === "Play") {
            ctx.fillStyle = "#FFD700"
            ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
        }
        
        if (gameState === "Play"){
            ctx.fillStyle = "gold";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.font = "bold 48px Arial";
            ctx.textAlign = "left";
            ctx.strokeText(`Score: ${score}` , 20, 60);
            ctx.fillText(`Score: ${score}`, 20, 60);
        }

        if (gameState === "Start") {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(canvas.width / 2 - 200, canvas.height / 2 - 100, 400, 200);
            ctx.strokeStyle = "#000"
            ctx.lineWidth = 3;
            ctx.strokeRect(canvas.width / 2 - 200, canvas.height / 2 - 100, 400, 200);

            ctx.fillStyle = "#000";
            ctx.font = "bold 32px Arial";
            ctx.textAlign = "center";
            ctx.fillText(
                "Press ENTER to Start",
                canvas.width / 2,
                canvas.height / 2 - 30,
            );

            ctx.font = "24px Arial";
            ctx.fillStyle = "red";
            ctx.fillText("↑", canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillStyle = "#000";
            ctx.fillText(
                "ARROW UP or SPACE to Fly",
                canvas.width / 2,
                canvas.height / 2 + 45,
            );
        }

        if (gameState === "End") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.fillRect(canvas.width / 2 - 200, canvas.height / 2 - 120, 400, 240);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.strokeRect(canvas.width / 2 - 200, canvas.height / 2 - 120, 400, 240);
            
            ctx.fillStyle = "red";
            ctx.font = "bold 48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

            ctx.fillStyle = "#000";
            ctx.font = "32px Arial";
            ctx.fillText(`Score: ${score}`, canvas
                .width / 2, canvas.height / 2 + 10);
        
            ctx.fillText(
                `Best: ${bestScore}`,
                canvas.width / 2,
                canvas.height / 2 + 50,
            );

            ctx.font = "24px Arial";
            ctx.fillText(
                "Press ENTER to Restart",
                canvas.width / 2,
                canvas.height /2 + 100,
            );
        }
    },

    destroy() {
        resetInput();
    }
};