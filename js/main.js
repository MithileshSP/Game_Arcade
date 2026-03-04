import games from "./games/register.js";
import { start,stop } from "./core/engine.js";
import flappy from "./games/flappy/index.js";
import memory from "./games/memory/index.js";

const launcher = document.getElementById("launcher");
const gameView = document.querySelector(".game-view");
const gameTitle = document.getElementById("game-title");
const escHint = document.getElementById("esc-hint");
const backBtn = document.getElementById("back-btn");
const lobby = document.getElementById("lobby");
const browseBtn = document.getElementById("browse-btn");



const gameMetadata = {
    flappy: {
        icon: "fa-dove",
        description: "Navigate through pipes and keep flying! Test your reflexes in this addictive arcade classic",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    memory: {
        icon: "fa-brain",
        description: "Match the fruits cards and train your memory! Find all pairs with the fewest moves.",
        gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
};


function showLauncher() {
    lobby.style.display = "block";
    launcher.style.display = "grid";
    gameView.style.display = "none";
    escHint.style.display = "none";
    document.body.classList.remove("game-active");

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
}

function showGameView() {
    lobby.style.display = "none";
    launcher.style.display = "none";
    gameView.style.display = "block";
    escHint.style.display ="block";
    document.body.classList.add("game-active");

    if (!document.fullscreenElement && gameView?.requestFullscreen) {
        gameView.requestFullscreen().catch(() => {});
    }
}

function isGameActive() {
    return document.body.classList.contains("game-active");
}

if (browseBtn) {
    browseBtn.addEventListener("click", () => {
        const gameSection = document.getElementById("games");
        if (gameSection){
            gameSection.scrollIntoView({ behavior: "smooth" , block: "start" });
        }
    });
}

games.forEach((game) => {
    const metadata = gameMetadata[game.meta.id] || {
        icon: "fa-gamepad",
        description: "An exciting game to play!",
        gradient:"linear-gradient(135deg, #667eea 0%, #764ba2 100%",
    };

    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `
        <div class = "game-thumbnail"
        style = "background: ${metadata.gradient}">
            <i class = "fas ${metadata.icon}"></i>
        </div>
        <div class = "game-info">
            <h3 class = "game-title">${game.meta.name}</h3>
            <span class = "game-category">${game.meta.category}</span>
            <p class = "game-description">${
            metadata.description}</p>
            <button class = "play-btn">
                <i class = "fas fa-play"></i> Play Now
            </button>
        </div>
    `;

    const playBtn = card.querySelector(".play-btn");
    playBtn.addEventListener("click", () => {
        showGameView();
        gameTitle.textContent = game.meta.name;
        start(game);
    });

    launcher.appendChild(card);
});

backBtn.addEventListener("click", () => {
    stop();
    showLauncher();
});

window.addEventListener("keydown", (e) => {
    if (isGameActive()) {
        const scrollKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "PageUp", "PageDown", "Home", "End"];
        if (scrollKeys.includes(e.code)) {
            e.preventDefault();
        }
    }

    if (e.key === "Escape") {
        stop();
        showLauncher();
    }
}, { passive: false });

document.addEventListener("fullscreenchange", () => {
    if (isGameActive() && !document.fullscreenElement) {
        stop();
        showLauncher();
    }
});

showLauncher();

console.log("Flavour Town Arcade loaded!"); 