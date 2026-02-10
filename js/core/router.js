let currentScreen = "launcher";

let currentGame = null;

export function getCurrentScreen() {
    return currentScreen;
}

export function getCurrentGame() {
    return currentGame;
}

export function goToLauncher() {
    currentScreen = "launcher";
    currentGame = null;
}

export function goToGame(game) {
    currentScreen = "game";
    currentGame = game;
}

export function isInGame() {
    return currentScreen === "game" &&
    currentGame !== null;
}

export function reset() {
    currentScreen = "launcher";
    currentGame = null;
}