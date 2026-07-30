# BifrostOS — Terminal Portfolio

> _A retro-terminal personal website, because clicking buttons is overrated._

**[Live Site → thisguy217.github.io](https://thisguy217.github.io)**

---

## What Is This?

This is my personal portfolio website, disguised as a command-line interface. Instead of scrolling through a traditional page, visitors interact with a fully functional terminal emulator — complete with commands, themes, CRT scanlines, and ASCII art.

Type `help` and start exploring.

## Features

- **Interactive terminal UI** — navigate the entire site by typing commands
- **Dynamic project listing** — projects are loaded from a JSON config, so adding new work is as simple as updating one file
- **Multiple themes** — switch between `default`, `amber`, `ubuntu`, and `matrix` color schemes on the fly
- **Command history** — arrow keys cycle through previous commands, just like a real shell
- **CRT scanline overlay** — subtle retro visual effect for that authentic terminal feel
- **Responsive design** — works on mobile (ASCII art gracefully hides on small screens)
- **GitHub Pages ready** — static files, zero build step, deploys instantly

## Tech Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Structure | HTML5                         |
| Styling   | Vanilla CSS (CSS Variables)   |
| Logic     | Vanilla JavaScript (ES6+)     |
| Data      | JSON (project config)         |
| Hosting   | GitHub Pages                  |

No frameworks. No bundlers. No dependencies. Just the fundamentals.

## Project Structure

```
.
├── index.html          # Terminal shell UI
├── style.css           # Themes & CRT effects
├── script.js           # Command parser & terminal logic
├── projects.json       # Dynamic project registry
├── liveq/              # LiveQ — live Q&A presentation tool
├── monster_architect/  # Monster Architect — D&D creature builder
└── deck/               # Deck of Many Things Simulator
```

## ⌨️ Available Commands

| Command                          | Description                              |
|----------------------------------|------------------------------------------|
| `help`                           | List all available commands               |
| `about`                          | Learn about me                           |
| `projects`                       | Browse my projects                       |
| `contact`                        | Get my contact info                      |
| `load <project>`                 | Open a project or external link          |
| `theme <name>`                   | Switch themes (`default` / `amber` / `ubuntu` / `matrix`) |
| `history`                        | View command history for the session     |
| `clear`                          | Clear the terminal                       |
| `reboot`                         | Reload the page                          |

## Adding a New Project

Hosted sub-projects are driven entirely by `projects.json`. To add one:

1. Drop your project folder into the repo root
2. Add an entry to `projects.json`:

```json
{
  "name": "My New Project",
  "key": "my_project",
  "description": "A short blurb about what it does.",
  "path": "/my_project/"
}
```

3. Push to `main` — GitHub Pages handles the rest.

External links (repos, profiles, etc.) can be added to the `urlMap` object in `script.js`.

## About Me

I'm a Bioinformatician with a BS from BYU (Bioinformatics + Biochemistry, minors in CS and Math) currently pursuing an MS in Computational Life Sciences at ASU. I've worked across protein engineering, simulation research, and IT — and I'm always chasing the next interesting problem.

## Contact

- **Email:** mrteancumhoopes@gmail.com
- **LinkedIn:** [Teancum Hoopes](https://www.linkedin.com/in/teancum-hoopes)
- **GitHub:** [Thisguy217](https://github.com/Thisguy217)

## License

This project is open source. Feel free to fork it and make it your own — just swap out my info for yours.

---

<p align="center"><code>guest@dev:~$ load readme</code></p>
<p align="center"><sub>Built because I have an unreasonable fondness for terminals.</sub></p>
