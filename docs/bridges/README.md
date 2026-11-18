# Language bridges: Kindling ideas in Python, React and Rust

Game ideas do not belong to a language. A fixed timestep, a vector, an AABB (axis-aligned bounding box) test, "was it pressed since the last step?", and scenes look almost the same in JavaScript, Python and Rust. Seeing one idea in two languages is the fastest way to tell **the idea** apart from **the syntax**, and it makes you better in both.

| Bridge | What you get | Checked by |
|---|---|---|
| [Python](python.md) | The core ideas in plain Python, plus a pygame-ce platformer built on them. | `python3 -m unittest` (6 checks), and the pygame-ce game run headless |
| [React](react.md) | How to host a Kindling game inside a React app (and why game state must not be React state), plus a fixed-timestep hook for games written in React itself. | Bundled and run in a browser under `StrictMode`, no console errors |
| [Rust](rust.md) | The core ideas in std-only Rust with ownership and traits explained, plus a macroquad platformer built on them. | `cargo test` (7 checks), `cargo clippy` clean; the macroquad example compiles against macroquad 0.4.16 |

## The same idea, three times

The heart of every game loop, "move one axis at a time and stop at walls":

```js
// JavaScript: engine/2d/physics.js
body.x = body.x + body.velocityX * stepSeconds;
for (const solid of world.solidsNear(body)) {
  if (body.velocityX > 0) body.x = solid.x - body.width;
  else body.x = solid.x + solid.width;
}
```

```python
# Python: docs/bridges/python/kindling_ideas.py (simplified)
body.x += body.velocity_x * step_seconds
for solid in world.solids_near(body):
    body.x = solid.x - body.width if body.velocity_x > 0 else solid.x + solid.width
```

```rust
// Rust: docs/bridges/rust/src/lib.rs (simplified)
body.rect.x += body.velocity.x * step_seconds;
for solid in world.solids_near(&body.rect) {
    body.rect.x = if body.velocity.x > 0.0 { solid.x - body.rect.width } else { solid.x + solid.width };
}
```

What changes between languages is mostly **who owns the data** (Rust makes you say it), **how numbers are typed** (`f32` in Rust, any number in JavaScript and Python), and **whether operators can be overloaded** (`a + b` on vectors works in Python and Rust, not in JavaScript).
