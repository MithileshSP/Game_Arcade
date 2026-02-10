import games from "./games/register.js";
import { start } from "./core/engine.js";
const launcher = document.getElementById("launcher");

games.forEach(game => {
    const btn = document.createElement("button");
    btn.textContent = game.meta.name;

    btn.addEventListener("click", () => {
        start(game);
    });

    launcher.appendChild(btn);
});

console.log("Game Arcade loaded");