# jam/: the game jam kit

Everything you need from hour 0 to submitting. **Before any jam:** read that jam's rules about pre-made engines, templates and AI-assisted tools. Most jams allow a public engine you made before the jam; some ask you to disclose AI help. When in doubt, ask the organizers.

| File | When to use it |
|---|---|
| [JAMS.md](JAMS.md) | Weeks before: which jams suit a browser game made with Kindling. |
| [JAM-CHECKLIST.md](JAM-CHECKLIST.md) | The whole jam, hour by hour, for 48-hour and 72-hour jams. |
| [SCOPE-CUTTER.md](SCOPE-CUTTER.md) | Whenever you are behind. Which features to cut, in which order. |
| [SUBMIT-TO-ITCH.md](SUBMIT-TO-ITCH.md) | The last hours: zip, upload, test the page, submit. |
| [POSTMORTEM.md](POSTMORTEM.md) | The day after: a template to learn from what happened. |
| [starter/](starter/) | The game every jam starts from. [Play the preview](https://normansrule.github.io/kindling/jam/preview/). |
| [new-game.sh](new-game.sh) | Makes a new game folder from the starter plus its own engine copy. |
| [zip-game.sh](zip-game.sh) | Zips a game folder the way itch.io wants it. |

## Hour 0 in three commands

```bash
cd ~/projects/kindling && git pull && ./jam/new-game.sh my-jam-game
```

```bash
cd ~/projects/my-jam-game && python3 -m http.server 8000
```

Open <http://localhost:8000/>: a working game. Change `main.js`, refresh, repeat. When you are ready to upload:

```bash
cd ~/projects/kindling && ./jam/zip-game.sh ~/projects/my-jam-game
```

## Why the game carries its own engine

A jam game is uploaded as one zip and must work forever, even if Kindling changes later. So `new-game.sh` copies `engine/` into the game folder, and the game's import map points at `./engine/` ([DECISIONS.md](../docs/DECISIONS.md), D3). The whole engine adds about 60 KB to the zip; itch.io allows far more.

## The starter game

`starter/main.js` is a complete tiny game (dodge the falling blocks) with a title screen, pause (P), mute (M), game over, a best score saved in the browser, sound effects, particles, screen shake, keyboard, gamepad and touch. Keep the parts you need, and replace everything marked **CHANGE ME** with your idea.

To keep the jam game in git too:

```bash
cd ~/projects/my-jam-game && git init && git add -A && git commit -m "Hour 0: starter"
```
