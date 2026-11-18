# Scope cutter

You are behind. Everyone is, at some point in every jam. Cut in this order, top first, until the plan fits the time you really have (about 40% of the remaining hours, with every estimate doubled).

1. **Anything online:** leaderboards, accounts, multiplayer. Use a local best score (`createStorage`).
2. **Story and cutscenes:** one line of text on the title screen can carry the story.
3. **Menus beyond start and restart:** no options screen; M for mute is enough.
4. **A second game mode or a boss.**
5. **Extra enemy types:** one enemy with two speeds is two enemy types.
6. **Hand-made levels after the second:** reuse the tilemap, or generate levels with a seeded `createRandom`.
7. **Art detail:** flat colors and clear shapes read better than detailed sprites at jam speed. Kindling's sample sprites and [free CC0 (public domain) assets](../docs/RESOURCES.md#free-assets) are fine.
8. **Animation frames:** two frames per animation, or squash and stretch on a single frame.
9. **Music:** sound effects matter more. One short loop, or none.

## Never cut

- **The verb** (the core action) and how it feels.
- **A way to win or score, and a way to lose or end.**
- **Restart** without reloading the page.
- **Sound effects** for the core action and for losing.
- **Instructions:** the controls on the title screen.
- **Time to submit:** two hours before the deadline.

## Signs you need to cut now

- The core verb is not playable by the end of the first quarter.
- You are drawing art for a feature that does not exist yet.
- You said "it will be fun once ..." twice.
