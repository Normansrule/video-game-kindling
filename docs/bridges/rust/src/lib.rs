//! docs/bridges/rust/src/lib.rs
//! WHAT: Kindling's core ideas in Rust (standard library only): a fixed-timestep loop,
//!       2D vectors, AABB collision, "move one axis at a time" against a tilemap,
//!       input that remembers presses between steps, and scenes.
//! WHY:  The ideas are the same in JavaScript, Python and Rust. Rust adds two things
//!       worth seeing: ownership (who may change the player?) and traits (scenes).
//! RUN:  cd ~/projects/kindling/docs/bridges/rust && cargo test
//! DOC:  docs/bridges/rust.md

use std::collections::HashSet;
use std::ops::{Add, Mul, Sub};

// --- Fixed timestep (engine/core/loop.js) -----------------------------------------

/// Runs `update(step_seconds)` in equal steps, however unevenly frames arrive.
pub struct FixedLoop {
    pub step_seconds: f64,
    pub max_frame_seconds: f64,
    accumulator: f64,
}

impl FixedLoop {
    pub fn new(step_seconds: f64) -> Self {
        FixedLoop { step_seconds, max_frame_seconds: 0.25, accumulator: 0.0 }
    }

    /// Feed real time in. Calls `update` zero or more times. Returns alpha (0..1).
    /// `FnMut` means the closure may change the things it captured (your game state).
    pub fn advance(&mut self, frame_seconds: f64, mut update: impl FnMut(f64)) -> f64 {
        self.accumulator += frame_seconds.min(self.max_frame_seconds);
        while self.accumulator >= self.step_seconds {
            update(self.step_seconds);
            self.accumulator -= self.step_seconds;
        }
        self.accumulator / self.step_seconds
    }
}

// --- Vectors (engine/math/vec2.js) -------------------------------------------------
// `Copy` makes a Vec2 behave like a number: passing it copies it, nothing is "moved".

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub const fn new(x: f32, y: f32) -> Self {
        Vec2 { x, y }
    }
    pub fn length(self) -> f32 {
        self.x.hypot(self.y)
    }
    pub fn normalized(self) -> Self {
        let size = self.length();
        if size == 0.0 { Vec2::default() } else { Vec2::new(self.x / size, self.y / size) }
    }
    pub fn dot(self, other: Vec2) -> f32 {
        self.x * other.x + self.y * other.y
    }
}

impl Add for Vec2 {
    type Output = Vec2;
    fn add(self, other: Vec2) -> Vec2 {
        Vec2::new(self.x + other.x, self.y + other.y)
    }
}
impl Sub for Vec2 {
    type Output = Vec2;
    fn sub(self, other: Vec2) -> Vec2 {
        Vec2::new(self.x - other.x, self.y - other.y)
    }
}
impl Mul<f32> for Vec2 {
    type Output = Vec2;
    fn mul(self, amount: f32) -> Vec2 {
        Vec2::new(self.x * amount, self.y * amount)
    }
}

// --- AABB collision (engine/2d/collision.js) ---------------------------------------

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl Rect {
    /// Two boxes overlap unless one is entirely left, right, above or below the other.
    pub fn overlaps(&self, other: &Rect) -> bool {
        self.x < other.x + other.width
            && self.x + self.width > other.x
            && self.y < other.y + other.height
            && self.y + self.height > other.y
    }
}

// --- Tilemap and arcade physics (engine/2d/tilemap.js, physics.js) -----------------

pub struct Tilemap {
    rows: Vec<Vec<char>>,
    pub tile_size: f32,
}

impl Tilemap {
    pub fn new(rows: &[&str], tile_size: f32) -> Self {
        Tilemap { rows: rows.iter().map(|row| row.chars().collect()).collect(), tile_size }
    }

    /// Outside the map counts as a wall, so nothing walks off the edge.
    pub fn is_solid(&self, column: i32, row: i32) -> bool {
        if row < 0 || column < 0 {
            return true;
        }
        match self.rows.get(row as usize).and_then(|line| line.get(column as usize)) {
            Some(character) => *character == '#',
            None => true,
        }
    }

    pub fn solids_near(&self, area: &Rect) -> Vec<Rect> {
        let size = self.tile_size;
        let first_column = (area.x / size).floor() as i32;
        let last_column = ((area.x + area.width - 1e-4) / size).floor() as i32;
        let first_row = (area.y / size).floor() as i32;
        let last_row = ((area.y + area.height - 1e-4) / size).floor() as i32;
        let mut found = Vec::new();
        for row in first_row..=last_row {
            for column in first_column..=last_column {
                if self.is_solid(column, row) {
                    found.push(Rect { x: column as f32 * size, y: row as f32 * size, width: size, height: size });
                }
            }
        }
        found
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Body {
    pub rect: Rect,
    pub velocity: Vec2,
    pub gravity: f32,
    pub on_ground: bool,
}

#[derive(Clone, Copy)]
enum Axis {
    X,
    Y,
}

/// Gravity changes velocity, velocity changes position: x first, then y.
/// `&mut Body` means "I will change this body, and nobody else may touch it meanwhile".
pub fn move_and_collide(body: &mut Body, step_seconds: f32, world: &Tilemap) {
    body.velocity.y += body.gravity * step_seconds;
    body.on_ground = false;
    move_axis(body, Axis::X, body.velocity.x * step_seconds, world);
    move_axis(body, Axis::Y, body.velocity.y * step_seconds, world);
}

fn move_axis(body: &mut Body, axis: Axis, distance: f32, world: &Tilemap) {
    if distance == 0.0 {
        return;
    }
    match axis {
        Axis::X => body.rect.x += distance,
        Axis::Y => body.rect.y += distance,
    }
    for solid in world.solids_near(&body.rect) {
        if !body.rect.overlaps(&solid) {
            continue;
        }
        match (axis, distance > 0.0) {
            (Axis::X, true) => body.rect.x = solid.x - body.rect.width,
            (Axis::X, false) => body.rect.x = solid.x + solid.width,
            (Axis::Y, true) => {
                body.rect.y = solid.y - body.rect.height; // +y is down in 2D: we landed
                body.on_ground = true;
            }
            (Axis::Y, false) => body.rect.y = solid.y + solid.height,
        }
        match axis {
            Axis::X => body.velocity.x = 0.0,
            Axis::Y => body.velocity.y = 0.0,
        }
    }
}

// --- Input that remembers presses (engine/input/keyboard.js) -----------------------

#[derive(Default)]
pub struct Keys {
    held: HashSet<String>,
    pressed: HashSet<String>,  // went down since the last step
    released: HashSet<String>, // went up since the last step
}

impl Keys {
    pub fn key_down(&mut self, name: &str) {
        if self.held.insert(name.to_string()) {
            self.pressed.insert(name.to_string()); // insert returns false on auto-repeat
        }
    }
    pub fn key_up(&mut self, name: &str) {
        self.held.remove(name);
        self.released.insert(name.to_string());
    }
    pub fn is_down(&self, name: &str) -> bool {
        self.held.contains(name)
    }
    pub fn was_pressed(&self, name: &str) -> bool {
        self.pressed.contains(name)
    }
    pub fn was_released(&self, name: &str) -> bool {
        self.released.contains(name)
    }
    pub fn end_step(&mut self) {
        self.pressed.clear();
        self.released.clear();
    }
}

// --- Scenes (engine/core/scene.js) --------------------------------------------------
// A JavaScript scene is an object with optional methods. In Rust that is a trait with
// default (empty) methods. `update` returns what should happen next, instead of a scene
// reaching out and switching itself: ownership stays simple.

pub enum Transition {
    Stay,
    SwitchTo(Box<dyn Scene>),
}

pub trait Scene {
    fn update(&mut self, _keys: &Keys, _step_seconds: f32) -> Transition {
        Transition::Stay
    }
    fn name(&self) -> &str;
}

pub struct SceneManager {
    pub current: Box<dyn Scene>,
}

impl SceneManager {
    pub fn update(&mut self, keys: &Keys, step_seconds: f32) {
        if let Transition::SwitchTo(next) = self.current.update(keys, step_seconds) {
            self.current = next;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loop_runs_whole_steps_and_keeps_the_rest() {
        let mut loop_ = FixedLoop::new(1.0 / 64.0);
        let mut steps = 0;
        let alpha = loop_.advance(3.5 / 64.0, |_| steps += 1);
        assert_eq!(steps, 3);
        assert!((alpha - 0.5).abs() < 1e-9);
    }

    #[test]
    fn loop_clamps_long_freezes() {
        let mut loop_ = FixedLoop::new(1.0 / 64.0);
        let mut steps = 0;
        loop_.advance(5.0, |_| steps += 1);
        assert_eq!(steps, 16);
    }

    #[test]
    fn vectors() {
        assert_eq!(Vec2::new(1.0, 2.0) + Vec2::new(3.0, 4.0), Vec2::new(4.0, 6.0));
        assert!((Vec2::new(3.0, 4.0).normalized().length() - 1.0).abs() < 1e-6);
        assert_eq!(Vec2::default().normalized(), Vec2::default());
    }

    #[test]
    fn touching_boxes_do_not_overlap() {
        let a = Rect { x: 0.0, y: 0.0, width: 10.0, height: 10.0 };
        assert!(a.overlaps(&Rect { x: 5.0, y: 5.0, width: 10.0, height: 10.0 }));
        assert!(!a.overlaps(&Rect { x: 10.0, y: 0.0, width: 10.0, height: 10.0 }));
    }

    #[test]
    fn body_lands_on_floor_and_stops_at_wall() {
        let level = Tilemap::new(&["#####", "#...#", "#...#", "#####"], 16.0);
        let mut body = Body {
            rect: Rect { x: 20.0, y: 17.0, width: 10.0, height: 10.0 },
            velocity: Vec2::new(200.0, 0.0),
            gravity: 900.0,
            on_ground: false,
        };
        for _ in 0..60 {
            move_and_collide(&mut body, 1.0 / 60.0, &level);
        }
        assert!(body.on_ground);
        assert_eq!(body.rect.y, 38.0);
        assert_eq!(body.rect.x, 54.0);
    }

    #[test]
    fn quick_tap_is_not_lost() {
        let mut keys = Keys::default();
        keys.key_down("Space");
        keys.key_up("Space");
        assert!(!keys.is_down("Space"));
        assert!(keys.was_pressed("Space"));
        keys.end_step();
        assert!(!keys.was_pressed("Space"));
    }

    struct Title;
    struct Play;
    impl Scene for Title {
        fn update(&mut self, keys: &Keys, _: f32) -> Transition {
            if keys.was_pressed("Space") { Transition::SwitchTo(Box::new(Play)) } else { Transition::Stay }
        }
        fn name(&self) -> &str {
            "title"
        }
    }
    impl Scene for Play {
        fn name(&self) -> &str {
            "play"
        }
    }

    #[test]
    fn scenes_switch_by_returning_a_transition() {
        let mut scenes = SceneManager { current: Box::new(Title) };
        let mut keys = Keys::default();
        scenes.update(&keys, 1.0 / 60.0);
        assert_eq!(scenes.current.name(), "title");
        keys.key_down("Space");
        scenes.update(&keys, 1.0 / 60.0);
        assert_eq!(scenes.current.name(), "play");
    }
}
