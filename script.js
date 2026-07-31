const input = document.getElementById('user-input');
const history = document.getElementById('terminal-history');

/* ── Hard-coded social / profile links ── */
const socialLinks = {
    'github':   "https://github.com/Thisguy217",
    'linkedin': "https://www.linkedin.com/in/teancum-hoopes"
};

/* ── Hosted projects loaded dynamically from projects.json ── */
let hostedProjects = [];

fetch('projects.json')
    .then(res => res.json())
    .then(data => { hostedProjects = data; })
    .catch(() => { console.warn('Could not load projects.json'); });

/* ── GitHub repos loaded dynamically from repos.json ── */
let githubRepos = [];

fetch('repos.json')
    .then(res => res.json())
    .then(data => { githubRepos = data; })
    .catch(() => { console.warn('Could not load repos.json'); });

/* ── Static command responses ── */
const commands = {
    'help': "Available: [about] [projects] [links] [contact] [clear] [theme default/amber/ubuntu/matrix] [history]",
    'about': "I am a Bioinformatician who genuinely just genuinely enjoys learning. " +
        "I earned my Bachelor of Science from BYU in April 2025 with a double major in Bioinformatics and Biochemistry, and a double minor in Computer Science and Mathematics. " +
        "Now I study at ASU, where I am working towards a Master of Science in Computational Life Sciences. Currently, I am working on various projects while between jobs. " +
        "However, the jobs I have worked include areas of Protein Engineering, Simulation Research, IT support/administration, and more. I am always excited about new projects and want to learn more!",
    'contact': "Email: mrteancumhoopes@gmail.com\nLinkedIn: Teancum Hoopes (Load me by typing 'load linkedin'!)",
    'history': "Displaying session command history...",
    'load': "Rerouting...",
    'reboot': "Rebooting..."
};

let commandHistory = [];
let historyIndex = -1;
let currentDraft = "";

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const fullInput = input.value.trim();
        const parts = fullInput.toLowerCase().split(' ');
        const cmd = parts[0];
        const arg = parts[1];

        addLine(`<span class="prompt">guest@dev:~$</span> ${fullInput}`);

        if (fullInput !== "") {
            commandHistory.push(fullInput);
            historyIndex = -1;
        }

        // Handle logic
        if (cmd === 'clear') {
            history.innerHTML = '';
        } else if (cmd === 'theme') {
            handleTheme(arg);
        } else if (cmd === 'history') {
            addLine(`<div class="command-output">${commandHistory.join('\n')}</div>`);
        } else if (cmd === 'projects') {
            handleProjects();
        } else if (cmd === 'links') {
            handleLinks();
        } else if (cmd === 'load') {
            addLine(`<div class="command-output">${commands[cmd]}</div>`);
            handleRedirect(arg);
        } else if (cmd === 'reboot') {
            addLine(`<div class="command-output">${commands[cmd]}</div>`);
            window.location.reload();
        } else if (commands[cmd]) {
            addLine(`<div class="command-output">${commands[cmd]}</div>`);
        } else if (fullInput !== "") {
            addLine(`<div class="command-output">Unknown command. Try 'help'.</div>`);
        }

        input.value = '';
        window.scrollTo(0, document.body.scrollHeight);
    }
    else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
            if (historyIndex === -1) {
                currentDraft = input.value;
                historyIndex = commandHistory.length - 1;
            } else if (historyIndex > 0) {
                historyIndex--;
            }
            input.value = commandHistory[historyIndex];
        }
    }
    else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                input.value = commandHistory[historyIndex];
            } else {
                historyIndex = -1;
                input.value = currentDraft;
            }
        }
    }
});

/* ── Projects command ──
   Dynamically lists hosted projects from projects.json
   and GitHub repos from repos.json. */
function handleProjects() {
    let lines = [];
    let counter = 1;

    // Hosted sub-projects (loaded from projects.json)
    hostedProjects.forEach(p => {
        lines.push(`${counter}. ${p.name} — ${p.description}  [load ${p.key}]`);
        counter++;
    });

    // GitHub repos (loaded from repos.json)
    if (githubRepos.length > 0) {
        lines.push('');
        lines.push('── GitHub Repositories ──');
        githubRepos.forEach(r => {
            lines.push(`${counter}. ${r.name} — ${r.description}  [load ${r.key}]`);
            counter++;
        });
    }

    addLine(`<div class="command-output">${lines.join('\n')}</div>`);
}

/* ── Links command ──
   Shows hard-coded social / profile links. */
function handleLinks() {
    const lines = [
        '── Social & Profile Links ──',
        `GitHub:   ${socialLinks.github}   [load github]`,
        `LinkedIn: ${socialLinks.linkedin}  [load linkedin]`
    ];
    addLine(`<div class="command-output">${lines.join('\n')}</div>`);
}

function handleTheme(theme) {
    if (theme === 'amber') {
        document.body.className = 'theme-amber';
        addLine("Switched to Amber Phosphor theme.");
    } else if (theme === 'default') {
        document.body.className = '';
        addLine("Switched to Default Matrix theme.");
    } else if (theme === 'ubuntu') {
        document.body.className = 'theme-ubuntu';
        addLine("Switched to Ubuntu theme.");
    } else if (theme === 'matrix') {
        document.body.className = 'theme-matrix';
        addLine("Switched to Matrix theme.");
    } else {
        addLine("Usage: theme [default | amber | ubuntu | matrix]");
    }
}

/* ── Redirect handler ──
   Checks hosted projects first, then repos, then social links. */
function handleRedirect(urlLocation) {
    // Check hosted projects from projects.json first
    const hosted = hostedProjects.find(p => p.key === urlLocation);
    if (hosted) {
        window.location.href = hosted.path;
        return;
    }

    // Check GitHub repos from repos.json
    const repo = githubRepos.find(r => r.key === urlLocation);
    if (repo) {
        window.location.href = repo.url;
        return;
    }

    // Fall back to hard-coded social links
    if (socialLinks[urlLocation]) {
        window.location.href = socialLinks[urlLocation];
    } else {
        addLine("Failed to reroute. Try 'projects' or 'links' to see available targets.");
    }
}

function addLine(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    history.appendChild(div);
}
