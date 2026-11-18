# Jam checklist

Print it, or keep it open in a second window. Times are from the moment the theme is announced. Tick as you go.

## The week before

- [ ] Read the jam's **rules**: pre-made engines and code, templates, assets, team size, and **AI-assisted tools**. Note whether you must disclose AI help, and where.
- [ ] Make sure Kindling is **public on GitHub before the jam starts** (many jams allow your own public engine; private pre-made code often is not).
- [ ] Do a practice run: `./jam/new-game.sh practice`, change one thing, `./jam/zip-game.sh`, upload to itch.io as a **draft**, and play it there.
- [ ] Do the [design track](../lessons/index.html#design) (about an hour).
- [ ] Plan sleep. A rested 8 hours beats a tired 14.

## 48-hour jam

| When | Goal | Done when |
|---|---|---|
| 0:00 to 1:00 | Read the theme, write 5 pitches (verb, goal, problem), pick one. Must/should/could list. | One sentence at the top of your notes. |
| 1:00 | `./jam/new-game.sh my-game`, `git init`, first commit. | The starter runs. |
| 1:00 to 12:00 | **The verb** with gray boxes: move, the core action, one way to win, one way to lose. | A stranger could play it with no help. |
| 12:00 | **Gate 1:** is it fun with boxes? If not, change the idea now. Run the [scope cutter](SCOPE-CUTTER.md). | Decision written down. |
| 12:00 to 24:00 | One complete level, sounds, restart. Sleep. | A full play from title to game over. |
| 24:00 | **Gate 2:** first playtest (5 minutes, someone else). Upload a **draft build** to itch.io. | The draft plays on itch.io. |
| 24:00 to 38:00 | Shoulds, more levels or waves, art pass, juice (particles, shake, tweens). | Feels good, not just works. |
| 38:00 | **Feature freeze.** No new features from here. Second playtest. | |
| 38:00 to 44:00 | Fix the biggest problems, balance difficulty (easier than you think), title screen with controls. | |
| 44:00 to 46:00 | Screenshots, a short GIF (graphics interchange format), itch.io page text, credits, AI disclosure if required. **Submit.** | Submitted with 2 hours to spare. |
| 46:00 to 48:00 | Buffer for disasters. Then sleep. | |

## 72-hour jam

Same order, more room:

| When | Goal |
|---|---|
| 0:00 to 1:00 | Pitches, pick, must/should/could. |
| 1:00 to 16:00 | The verb with boxes, win, lose. **Gate 1** at 16:00. |
| 16:00 to 36:00 | Full loop, sound, a draft build on itch.io. **Gate 2** playtest at 36:00. |
| 36:00 to 58:00 | Content, art, juice. **Feature freeze** at 58:00, second playtest. |
| 58:00 to 68:00 | Fixes, difficulty, title screen, accessibility (remappable or simple controls, readable text, mute). |
| 68:00 to 70:00 | Page, screenshots, credits, disclosure. **Submit.** |
| 70:00 to 72:00 | Buffer. |

## Every few hours

- [ ] Commit (`git add -A && git commit -m "what works now"`).
- [ ] Drink water, stand up, look out of a window.
- [ ] Ask: is what I am doing on the **must** list?

## After

- [ ] Play and rate other games: that is how yours gets played.
- [ ] Write the [postmortem](POSTMORTEM.md) while you remember.
