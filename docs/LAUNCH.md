# Launch checklist

How to publish Kindling and let people find it. No fake stars, no vote rings: just make the page good and post it where it helps people.

## 1. GitHub settings (one command)

```bash
cd ~/projects/kindling && gh repo edit Normansrule/video-game-kindling --description "Build games from scratch: a zero-dependency 2D + 3D JavaScript game engine, game jam template, and interactive visual lessons." --homepage "https://normansrule.github.io/video-game-kindling/" --enable-discussions && gh api -X PUT repos/Normansrule/video-game-kindling/topics -f "names[]=game-engine" -f "names[]=javascript" -f "names[]=gamedev" -f "names[]=game-development" -f "names[]=webgl2" -f "names[]=webgl" -f "names[]=canvas" -f "names[]=html5-game" -f "names[]=game-jam" -f "names[]=itch-io" -f "names[]=educational" -f "names[]=learn-to-code" -f "names[]=tutorial" -f "names[]=visualization" -f "names[]=zero-dependency" -f "names[]=es-modules" -f "names[]=2d-game-engine" -f "names[]=3d" -f "names[]=raycaster" -f "names[]=web-audio" --jq .names
```

The second command replaces all topics at once (adding to old ones could go over the limit). That is 20 topics, the most GitHub allows.

**Social preview:** Settings → General → Social preview → upload `assets/social-preview.png` (1280 × 640). The website cannot do this from the command line.

**Pages:** Settings → Pages → Source: **GitHub Actions**. The workflow in `.github/workflows/pages.yml` deploys on every push to `main`.

## 2. Labels and five good first issues

```bash
cd ~/projects/kindling && gh label create "sample idea" --color 1d76db --description "A small game that would teach something" --force && gh label create "lesson request" --color 0e8a16 --description "A lesson or visualization someone wants" --force && gh label create "good first issue" --color 7057ff --description "Good for newcomers" --force
```

```bash
cd ~/projects/kindling && gh issue create --label "good first issue" --title "Add a 'press any button' hint for gamepads on sample title screens" --body "Browsers only report a gamepad after a button press. Add a line such as 'Gamepad: press any button' to the title screens of samples/2d/01-pong and samples/2d/03-breakout when no gamepad is connected (game.input.gamepad.isConnected()). Files: samples/2d/01-pong/main.js, samples/2d/03-breakout/main.js."
```

```bash
cd ~/projects/kindling && gh issue create --label "good first issue" --title "Add a capsule (rounded box) primitive to engine/3d/primitives.js" --body "Add capsule(radius, height, segments) next to sphere(), with positions, normals, uvs and counter-clockwise triangles. Add a winding check like the others in tests/checks/3d.checks.js and a line in docs/modules/3d.md."
```

```bash
cd ~/projects/kindling && gh issue create --label "good first issue" --title "Mute toggle (M key) for the 2D samples" --body "The jam starter mutes with M (audio.toggleMute()). Add the same to samples/2d/01 to 06 and mention it in each README's controls table."
```

```bash
cd ~/projects/kindling && gh issue create --label "good first issue" --title "Add vec2.reflect(vector, normal) with a check and a docs line" --body "reflect(v, n) = v - 2 * dot(v, n) * n, for bouncing. Add it to engine/math/vec2.js, a check in tests/checks/math.checks.js, and a row in docs/modules/math.md."
```

```bash
cd ~/projects/kindling && gh issue create --label "good first issue" --title "Snake: a high score saved with createStorage" --body "Save the best score in samples/2d/02-snake with createStorage from engine/core/storage.js and show it on the game-over screen. Lesson 3D-3's exercise shows the pattern."
```

## 3. The v1.0.0 release

```bash
cd ~/projects/kindling && git tag -a v1.0.0 -m "Kindling v1.0.0" && git push origin v1.0.0 && gh release create v1.0.0 --title "Kindling v1.0.0" --notes-file docs/RELEASE-NOTES-v1.0.0.md
```

## 4. Where to share it

Post once per place, follow each community's rules on self-promotion, and answer every comment in the first day.

| Where | How |
|---|---|
| Hacker News, as a "Show HN" post | Title: `Show HN: Kindling – a zero-dependency JS game engine with visual lessons`. Link the Pages site; first comment: why you built it and what you learned. |
| The r/gamedev subreddit | Read its self-promotion rules first; it has weekly threads for sharing. Lead with a GIF and what people can learn. |
| The r/webgl and r/javascript subreddits | Lead with the 3D samples and the lighting visualization for r/webgl; the import-map, no-build approach for r/javascript. |
| itch.io | Upload a sample (the platformer) as a free game that links back to the repository; post in a jam's community tab after you submit. |
| Awesome lists | Open a pull request adding one line, following each list's contributing rules. Good fits: [awesome-gamedev](https://github.com/Calinou/awesome-gamedev), [Magictools](https://github.com/ellisonleao/magictools), [awesome-webgl](https://github.com/sjfricke/awesome-webgl). |
| Dev.to or a blog | A post per lesson idea: "How a fixed timestep works, with a visualization". Link back. |

### Ready-to-paste text

Edit these so they sound like you. Hacker News readers ask how a project was made, so say plainly that you built it with AI help.

**Show HN first comment:**

> I wanted one place to learn how a game engine works and then actually ship jam games, so I built Kindling with AI help: about 45 small ES modules (fixed-timestep loop, input actions, collision, tilemaps, particles, Web Audio, and a raw WebGL 2 renderer with Phong lighting and a raycaster). No dependencies and no build step; pages load the engine through an import map, so the same files run locally, on GitHub Pages and on itch.io.
>
> Every module has a doc page and an interactive visualization with sliders, and there are 13 lessons and 11 small games. I also wrote the same ideas as reference games in Python (pygame-ce), Rust (macroquad) and React (react-three-fiber), so you can compare them side by side.
>
> I'd love feedback on the lessons: what was confusing, and what you'd want explained next.

**Awesome-list line** (match each list's format and section; check its CONTRIBUTING file first):

```markdown
- [Kindling](https://github.com/Normansrule/video-game-kindling) - Zero-dependency 2D + 3D JavaScript game engine with interactive visual lessons and a game jam template.
```

For Magictools, the "JavaScript" engines section fits; for awesome-webgl, "Learning" or "Tutorials" fits better than "Libraries".

## 5. After launch

- Answer issues and Discussions within a day for the first week.
- Turn the most common question into a lesson.
- Add every game people make with Kindling to a "Made with Kindling" section in the README (with permission).
