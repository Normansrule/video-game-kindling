# Contributing to Kindling

Thank you! Kindling is a teaching engine, so **clear beats clever** everywhere.

## Ways to help

- **Play and report:** open a [bug report](https://github.com/Normansrule/video-game-kindling/issues/new/choose) with the page, the browser and any console errors.
- **Ask for a lesson or a sample** with the issue templates. If something confused you, it will confuse others.
- **Pick a `good first issue`:** each one names the files to touch.
- **Share a jam game** made with Kindling in [Discussions](https://github.com/Normansrule/video-game-kindling/discussions).

## Set up

```bash
cd ~/projects && git clone https://github.com/Normansrule/video-game-kindling.git kindling && cd kindling && python3 -m http.server 8000
```

There is nothing to install for the engine. Optional, for the page check:

```bash
cd ~/projects/kindling/tools/smoke && npm install && npx playwright install chromium && node smoke.mjs
```

## The rules

1. **Zero dependencies and no build step** in `engine/`, `samples/`, `viz/` and `lessons/`. Plain ES modules, Canvas 2D, WebGL 2, Web Audio.
2. **One concept per file, under about 300 lines,** with a top comment: WHAT it is, WHY it exists, where its DOC is.
3. **Factories, not classes:** `createThing(options)` returns a plain object. No `this`.
4. **Plain names:** `stepSeconds`, `velocityX`. Spell out acronyms the first time a doc uses them.
5. **Every module has a doc page and a visualization.** Every lesson has: idea, visualization, walkthrough, exercise with hints and a solution, "you now know" checklist.
6. **Pages work in light and dark themes, at 390 px wide, with reduced motion,** and meet WCAG (Web Content Accessibility Guidelines) AA contrast.
7. **Tests:** add checks to `tests/checks/*.checks.js` for anything with math or logic. They run in the browser and in Node.

## Pull requests

Small and focused is best. Fill in the checklist in the template. By contributing you agree your work is released under the [MIT license](LICENSE) and that you follow the [code of conduct](CODE_OF_CONDUCT.md).
