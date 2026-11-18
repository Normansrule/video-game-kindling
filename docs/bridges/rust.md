# Bridge: Kindling ideas in Rust

**Code:** [`docs/bridges/rust/`](rust/) · **Checks:** `cd ~/projects/kindling/docs/bridges/rust && cargo test` (7 checks; `cargo clippy` is clean)

Rust is a great second game language: fast, no garbage collector pauses, and it compiles to WebAssembly so Rust games run in the browser too. Its rules about **ownership** feel strict at first; games are a good way to learn why they exist.

## What is in the folder

[`src/lib.rs`](rust/src/lib.rs) has, with the standard library only: `FixedLoop`, `Vec2` with `+ - *`, `Rect::overlaps`, `Tilemap`, `Body` and `move_and_collide`, `Keys`, and a `Scene` trait with `Transition`. Every function has a check at the bottom of the file.

## Idea by idea

| Kindling (JavaScript) | Rust version | What Rust adds |
|---|---|---|
| `createLoop({ update })` | `FixedLoop::advance(frame_seconds, \|step\| { ... })` | The update is a closure (`impl FnMut(f64)`). `FnMut` means it may change the variables it captured, such as your player. |
| `{ x, y }` and `vec2.add(a, b)` | `#[derive(Clone, Copy)] struct Vec2` with `impl Add` | `Copy` makes vectors behave like numbers: passing one copies it. Operator traits give you `a + b`. |
| `rectsOverlap(a, b)` | `a.overlaps(&b)` | `&b` borrows `b` to read it; nothing is copied or moved. |
| `moveAndCollide(body, step, world)` | `move_and_collide(&mut body, step, &world)` | `&mut` says "this function changes the body, and nothing else can touch it meanwhile". The compiler enforces it. |
| `"x"` / `"y"` strings for the axis | `enum Axis { X, Y }` and `match` | A typo in an axis name is a compile error instead of a silent bug. |
| scene objects with optional methods | `trait Scene` with default methods | `update` **returns** a `Transition` instead of switching scenes itself. The manager owns the scenes, so ownership stays simple. |
| `keyboard.wasPressed` + `endStep()` | `Keys::was_pressed` + `end_step()` | `HashSet::insert` returns `false` if the key was already held, which skips auto-repeat for free. |

## A playable version with macroquad

[macroquad](https://macroquad.rs/) is a small Rust game library (window, input, drawing, sound) that also builds for the web. This program uses the bridge crate for the ideas and macroquad for the window. It was compiled against macroquad 0.4.16.

Create a project next to the bridge and add both:

```bash
cd ~/projects && cargo new kindling-rust-platformer && cd kindling-rust-platformer && cargo add macroquad@0.4 && cargo add kindling_ideas --path ../kindling/docs/bridges/rust
```

Then put this in `src/main.rs` and `cargo run`:

```rust
use kindling_ideas::{move_and_collide, Body, FixedLoop, Keys, Rect, Tilemap, Vec2};
use macroquad::prelude::*;

const LEVEL: [&str; 6] = [
    "####################",
    "#..................#",
    "#........###.......#",
    "#..................#",
    "#...........#......#",
    "####################",
];

#[macroquad::main("Kindling ideas in macroquad")]
async fn main() {
    let level = Tilemap::new(&LEVEL, 16.0);
    let mut player = Body {
        rect: Rect { x: 32.0, y: 32.0, width: 12.0, height: 14.0 },
        velocity: Vec2::default(),
        gravity: 900.0,
        on_ground: false,
    };
    let mut keys = Keys::default();
    let mut game_loop = FixedLoop::new(1.0 / 60.0);
    // Draw at 320 x 180 game pixels, scaled up to the window.
    let camera = Camera2D::from_display_rect(macroquad::math::Rect::new(0.0, 180.0, 320.0, -180.0));

    loop {
        // macroquad tells us what is held; Keys turns that into held / pressed / released.
        for (key, name) in [(KeyCode::Left, "left"), (KeyCode::Right, "right"), (KeyCode::Space, "jump")] {
            if is_key_down(key) { keys.key_down(name) } else if keys.is_down(name) { keys.key_up(name) }
        }
        game_loop.advance(get_frame_time() as f64, |step| {
            let step = step as f32;
            let direction = keys.is_down("right") as i32 - keys.is_down("left") as i32;
            player.velocity.x = direction as f32 * 90.0;
            if keys.was_pressed("jump") && player.on_ground {
                player.velocity.y = -300.0;
            }
            move_and_collide(&mut player, step, &level);
            keys.end_step();
        });

        clear_background(Color::from_rgba(20, 22, 27, 255));
        set_camera(&camera);
        for (row, line) in LEVEL.iter().enumerate() {
            for (column, character) in line.chars().enumerate() {
                if character == '#' {
                    draw_rectangle(column as f32 * 16.0, row as f32 * 16.0, 16.0, 16.0, GRAY);
                }
            }
        }
        let r = player.rect;
        draw_rectangle(r.x.round(), r.y.round(), r.width, r.height, ORANGE);
        next_frame().await
    }
}
```

Notice the closure passed to `advance` changes `player` and `keys`, which live outside it. Rust allows this because nothing else uses them while the closure runs; try reading `player` inside the closure **and** in the `advance` call's arguments, and the compiler will explain the conflict.

On Ubuntu under WSL, macroquad needs a few system libraries to open a window: `sudo apt install pkg-config libx11-dev libxi-dev libgl1-mesa-dev libasound2-dev`.

## Rust and the browser

macroquad and [Bevy](https://bevy.org/) both build to WebAssembly, so a Rust game can be uploaded to itch.io like a Kindling game. The ideas on this page do not change; only the window library does.

## Go further

- [The Rust Programming Language](https://doc.rust-lang.org/book/) (free), chapters 4 (ownership), 10 (traits) and 13 (closures).
- [macroquad](https://macroquad.rs/) home page, with live examples you can run in the browser.
