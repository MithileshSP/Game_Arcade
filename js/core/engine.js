import { clear } from "./canvas.js";

let currentGame = null;
let lastTime = 0;

function loop(time) {
    const delta = time - lastTime;
    lastTime = time;

    clear();

    if (currentGame) {
        currentGame.update(delta);
        currentGame.render();
    }

    requestAnimationFrame(loop);
}

export function start(game) {
    if (currentGame && currentGame.destroy) {
        currentGame.destroy();
    }

    currentGame = game;
    lastTime = 0;

    if (currentGame.init){
        currentGame.init();
    }

    requestAnimationFrame(loop);
}

export function stop(){
    if (currentGame && currentGame.destroy){
        currentGame.destroy();
    }
    currentGame = null;
}