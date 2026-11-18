# Bridge: Kindling ideas in Python

**Code:** [`docs/bridges/python/`](python/) · **Checks:** `cd ~/projects/kindling/docs/bridges/python && python3 -m unittest -v`

Python is great for prototyping game logic, tools (level converters, sprite packers) and, with [pygame-ce](https://pyga.me/) (pygame Community Edition), whole 2D games. This page maps each Kindling idea to Python and points at the matching file.

## What is in the folder

| File | What it is |
|---|---|
| [`kindling_ideas.py`](python/kindling_ideas.py) | Standard library only: `FixedLoop`, `Vec2`, `Rect` and `rects_overlap`, `Tilemap`, `Body` and `move_and_collide`, `Keys`, `Scene` and `SceneManager`. About 200 lines. |
| [`test_kindling_ideas.py`](python/test_kindling_ideas.py) | Six checks, the same ones the JavaScript tests make. |
| [`pygame_platformer.py`](python/pygame_platformer.py) | A small platformer with pygame-ce on top of those ideas. |

Run the platformer:

```bash
cd ~/projects/kindling/docs/bridges/python && python3 -m venv .venv && . .venv/bin/activate && pip install pygame-ce && python pygame_platformer.py
```

(On Ubuntu under WSL, Windows 11 shows the window through WSLg. If `python3 -m venv` is missing, install it with `sudo apt install python3-venv`.)

## Idea by idea

| Kindling (JavaScript) | Python version | Notes |
|---|---|---|
| `createLoop({ update })` | `FixedLoop(update).advance(frame_seconds)` | Same accumulator and 0.25 s clamp. pygame's `clock.tick()` returns the milliseconds to feed in. |
| `vec2.add(a, b)` | `a + b` with `@dataclass(frozen=True) class Vec2` and `__add__` | Python has operator overloading; JavaScript does not. `frozen=True` makes vectors values that cannot be changed by accident, like Kindling's pure functions. |
| `rectsOverlap(a, b)` | `rects_overlap(a, b)` | Identical logic. |
| `createTilemap({ rows })` | `Tilemap(rows)` | Strings are already lists of characters in Python. |
| `moveAndCollide(body, step, world)` | `move_and_collide(body, step, world)` | `getattr`/`setattr` let one function handle both axes. |
| `keyboard.wasPressed("Space")` + `endStep()` | `keys.pressed` + `keys.end_step()` | pygame gives `KEYDOWN` events; turning them into "pressed since last step" is your job, exactly as in Kindling. |
| scene objects `{ enter, update, render }` | `class Scene` with no-op methods | Override only what you need. |

## The fixed timestep with pygame

```python
loop = FixedLoop(update, step_seconds=1 / 60)
while running:
    for event in pygame.event.get():
        ...                                   # record key presses into Keys
    frame_seconds = clock.tick(144) / 1000    # real time since the last frame
    loop.advance(frame_seconds)               # 0, 1 or more fixed steps
    render(screen)
    pygame.display.flip()
```

`clock.tick(144)` caps the frame rate but does not make frames even; the fixed step does.

## Pixel art in pygame

Draw on a small `pygame.Surface((320, 180))`, then `pygame.transform.scale` it to the window. That is what `createGame({ pixelArt: true })` does with a canvas.

## Where Python and JavaScript differ for games

- **Speed:** CPython is slower than a browser's JavaScript engine. Thousands of particles are fine in Kindling and slow in plain Python; use pygame's `Surface.fill` and sprite groups, or NumPy for big loops.
- **Shipping:** a browser game is a link; a Python game needs [pygbag](https://pypi.org/project/pygbag/) (pygame in the browser through WebAssembly) or a packaged executable. For game jams on itch.io, pygbag is the common route.
- **Integers:** Python's `//` floors toward minus infinity, like `Math.floor`. `int()` truncates toward zero. Use `//` for tile coordinates, or negative positions land in the wrong tile.

## Go further

- [pygame-ce documentation](https://pyga.me/docs/)
- [Python `dataclasses`](https://docs.python.org/3/library/dataclasses.html)
