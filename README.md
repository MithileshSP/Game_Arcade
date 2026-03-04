🎮 Game Arcade

A lightweight browser-based arcade platform built using HTML5, CSS3, and Vanilla JavaScript.
This project provides a modular game engine that allows multiple mini-games to run inside a single arcade environment.

The goal is to create a fun, expandable arcade experience where new games can be plugged into the system without modifying the core engine.

🚀 Current Game
🐦 Flappy Dash

A fast-paced reflex game inspired by the classic Flappy Bird.

Features:

Smooth gravity-based physics

Pipe obstacle generation

Collision detection

Score tracking

Best score persistence using localStorage

Sound effects

Start / Play / Game Over states

🧠 Upcoming Game
🃏 Memory Match (Coming Soon)

A logic-based card matching game that will be integrated into the same arcade engine.

Planned features:

Card flipping mechanics

Move tracking

Timer system

Difficulty levels

The module structure is already prepared and will be implemented in the next update.

🏗 Project Architecture

This project follows a modular plugin-based architecture.

Launcher → Game Registry → Core Engine → Active Game → Canvas Rendering
Core Responsibilities

Engine

Handles the main game loop

Manages game lifecycle (init, update, render, destroy)

Switches between games

Canvas System

Shared rendering surface

Centralized drawing context

Game Modules

Independent game logic

Plug-and-play architecture

Each game follows a standard interface:

init()
update(dt)
render()
destroy()

This ensures that any new game can be added without modifying the engine.

🎯 Features

Pure frontend implementation

Canvas-based rendering

Modular ES6 architecture

Game engine + plugin games

Local score storage

Asset loading system

Clean separation of concerns

🧪 Running the Project

Since ES modules are used, the project must be run through a local server.

Option 1 — VS Code

Use Live Server Extension

Right click index.html → Open with Live Server
Option 2 — Node
npx serve .
Option 3 — Python
python -m http.server

Then open:

http://localhost:8000
🌍 Deployment

The project can be deployed easily using static hosting platforms:

GitHub Pages

Netlify

Vercel

Any static web server

🛠 Future Plans

Planned arcade expansions:

🃏 Memory Match

🎯 Reaction Time

🔨 Whack-a-Mole

🧱 Brick Breaker

🐍 Snake

The engine architecture allows new games to be added easily.

📚 Learning Goals

This project demonstrates:

Game loop design

Canvas rendering

Collision detection

Modular architecture

Frontend state management

Expandable arcade systems

📜 License

This project is open for educational and learning purposes.

⭐ If you like the project, consider giving it a star!
