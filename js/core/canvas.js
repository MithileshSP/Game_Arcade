const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

export function getCanvas() {
    return canvas;
}
export function getContext(){
    return ctx;
}

export function clear(){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}