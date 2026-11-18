//! examples/crystal_islands_3d.rs   (JavaScript twin: samples/3d/04-coin-collector)
//! WHAT: A third-person 3D game: hop between floating islands and collect glowing crystals
//!       before the sun sets. Real 3D with macroquad's Camera3D.
//! WHY:  Shows the 3D basics in Rust: boxes as data, gravity and landing with axis-separated
//!       3D box collision, camera-relative movement, a damped orbit camera, per-face
//!       lighting and distance fog built into a Mesh, and 2D glows projected from 3D points.
//! RUN:  cd ~/projects/kindling/references/rust && cargo run --release --example crystal_islands_3d
//! KEYS: WASD or arrows move (relative to the camera), Space jumps, Q/E turn the camera,
//!       R restarts, Esc quits.

mod common;

use common::{pixel_camera, rgb, sky_gradient, window, Capture, Glow};
use kindling_ref::actions::Actions;
use kindling_ref::easing::damp;
use kindling_ref::fixed_step::FixedStep;
use kindling_ref::particles::Random;
use macroquad::models::{Mesh, Vertex};
use macroquad::prelude::*;

/// An axis-aligned box: `min` corner and `size`, +y is up (like engine/3d/collision3d.js).
#[derive(Clone, Copy)]
struct Block {
    min: Vec3,
    size: Vec3,
    color: [f32; 3],
}

impl Block {
    fn overlaps(&self, min: Vec3, size: Vec3) -> bool {
        min.x < self.min.x + self.size.x && min.x + size.x > self.min.x
            && min.y < self.min.y + self.size.y && min.y + size.y > self.min.y
            && min.z < self.min.z + self.size.z && min.z + size.z > self.min.z
    }
}

/// A 3D spark. (kindling_ref::particles is 2D; a 3D one is the same idea with Vec3.)
struct Spark {
    position: Vec3,
    velocity: Vec3,
    life: f32,
    max_life: f32,
}

const PLAYER_SIZE: Vec3 = vec3(0.7, 1.0, 0.7);
const GRAVITY: f32 = 24.0;
const JUMP_SPEED: f32 = 10.0;
const RUN_SPEED: f32 = 6.0;
const LIGHT: Vec3 = vec3(-0.45, 0.8, -0.35);
const FOG: [f32; 3] = [0.98, 0.62, 0.55];
const FOG_START: f32 = 14.0;
const FOG_END: f32 = 46.0;

struct Game {
    blocks: Vec<Block>,
    crystals: Vec<Vec3>,
    total: usize,
    position: Vec3,
    velocity: Vec3,
    on_ground: bool,
    coyote: f32,
    camera_yaw: f32,
    camera_target: Vec3,
    facing: f32,
    sparks: Vec<Spark>,
    random: Random,
    time: f32,
}

fn island(x: f32, y: f32, z: f32, width: f32, depth: f32, color: [f32; 3]) -> [Block; 2] {
    // A grassy top slab and a darker rock underneath.
    [
        Block { min: vec3(x, y - 0.5, z), size: vec3(width, 0.5, depth), color },
        Block { min: vec3(x + 0.4, y - 2.6, z + 0.4), size: vec3(width - 0.8, 2.1, depth - 0.8), color: [0.36, 0.27, 0.34] },
    ]
}

impl Game {
    fn new() -> Self {
        let grass = [0.48, 0.82, 0.45];
        let teal = [0.35, 0.75, 0.7];
        let rose = [0.92, 0.55, 0.62];
        let mut blocks = Vec::new();
        for (x, y, z, w, d, c) in [
            (-4.0, 0.0, -4.0, 8.0, 8.0, grass),
            (6.0, 1.0, -2.0, 4.0, 4.0, teal),
            (12.0, 2.5, 2.0, 4.0, 5.0, grass),
            (6.0, 3.5, 7.0, 4.0, 4.0, rose),
            (-2.0, 4.5, 9.0, 5.0, 4.0, teal),
            (-10.0, 2.0, 2.0, 4.0, 4.0, rose),
            (-11.0, 4.0, -7.0, 5.0, 4.0, grass),
            (-2.0, 6.0, -12.0, 4.0, 4.0, teal),
        ] {
            blocks.extend(island(x, y, z, w, d, c));
        }
        let crystals = vec![
            vec3(2.0, 1.2, 2.0), vec3(8.0, 2.2, 0.0), vec3(14.0, 3.7, 4.5), vec3(8.0, 4.7, 9.0),
            vec3(0.5, 5.7, 11.0), vec3(-8.0, 3.2, 4.0), vec3(-8.5, 5.2, -5.0), vec3(0.0, 7.2, -10.0),
        ];
        Self {
            blocks, total: crystals.len(), crystals,
            position: vec3(-0.35, 0.0, -0.35), velocity: Vec3::ZERO, on_ground: false, coyote: 0.0,
            camera_yaw: 0.6, camera_target: Vec3::ZERO, facing: 0.0, sparks: Vec::new(), random: Random::new(42), time: 0.0,
        }
    }

    /// Move one axis at a time; on a hit, snap to the block's face.
    fn move_axis(&mut self, axis: usize, amount: f32) -> bool {
        let mut position = self.position;
        position[axis] += amount;
        let min = position - vec3(PLAYER_SIZE.x / 2.0, 0.0, PLAYER_SIZE.z / 2.0);
        let mut hit = false;
        for block in &self.blocks {
            if block.overlaps(min, PLAYER_SIZE) {
                hit = true;
                let offset = if axis == 1 { 0.0 } else { PLAYER_SIZE[axis] / 2.0 };
                position[axis] = if amount > 0.0 {
                    block.min[axis] - if axis == 1 { PLAYER_SIZE.y } else { offset }
                } else {
                    block.min[axis] + block.size[axis] + offset
                };
            }
        }
        self.position = position;
        hit
    }

    fn update(&mut self, actions: &Actions, seconds: f32) {
        self.time += seconds;
        self.camera_yaw += actions.axis("turn_left", "turn_right") * 2.0 * seconds;
        // Camera-relative movement: "forward" means away from the camera.
        let input = vec2(actions.axis("left", "right"), actions.axis("back", "forward"));
        let forward = vec3(-self.camera_yaw.sin(), 0.0, -self.camera_yaw.cos());
        let right = vec3(-forward.z, 0.0, forward.x);
        let mut wish = right * input.x + forward * input.y;
        if wish.length() > 1.0 {
            wish = wish.normalize();
        }
        self.velocity.x = damp(self.velocity.x, wish.x * RUN_SPEED, 0.0001, seconds);
        self.velocity.z = damp(self.velocity.z, wish.z * RUN_SPEED, 0.0001, seconds);
        if wish.length() > 0.1 {
            self.facing = wish.x.atan2(wish.z);
        }
        self.coyote = if self.on_ground { 0.1 } else { self.coyote - seconds };
        if actions.was_pressed("jump") && self.coyote > 0.0 {
            self.velocity.y = JUMP_SPEED;
            self.coyote = 0.0;
            self.puff(10);
        }
        if actions.was_released("jump") && self.velocity.y > 3.0 {
            self.velocity.y *= 0.5;
        }
        self.velocity.y -= GRAVITY * seconds;

        if self.move_axis(0, self.velocity.x * seconds) {
            self.velocity.x = 0.0;
        }
        let falling = self.velocity.y < 0.0;
        let landed_hard = self.velocity.y < -12.0;
        self.on_ground = false;
        if self.move_axis(1, self.velocity.y * seconds) {
            if falling {
                self.on_ground = true;
                if landed_hard {
                    self.puff(14);
                }
            }
            self.velocity.y = 0.0;
        }
        if self.move_axis(2, self.velocity.z * seconds) {
            self.velocity.z = 0.0;
        }
        if self.position.y < -25.0 {
            self.position = vec3(-0.35, 1.0, -0.35);
            self.velocity = Vec3::ZERO;
        }

        let center = self.position + vec3(0.0, 0.5, 0.0);
        let mut picked = Vec::new();
        self.crystals.retain(|crystal| {
            let hit = crystal.distance(center) < 1.0;
            if hit {
                picked.push(*crystal);
            }
            !hit
        });
        for crystal in picked {
            for _ in 0..24 {
                let direction = vec3(self.random.range(-1.0, 1.0), self.random.range(0.2, 1.5), self.random.range(-1.0, 1.0));
                let speed = self.random.range(2.0, 6.0);
                self.spark(crystal, direction * speed);
            }
        }
        for spark in &mut self.sparks {
            spark.life -= seconds;
            spark.velocity *= (1.0 - 1.5 * seconds).max(0.0);
            spark.velocity.y -= 9.0 * seconds;
            spark.position += spark.velocity * seconds;
        }
        self.sparks.retain(|spark| spark.life > 0.0);
        self.camera_target = vec3(
            damp(self.camera_target.x, center.x, 0.001, seconds),
            damp(self.camera_target.y, center.y, 0.003, seconds),
            damp(self.camera_target.z, center.z, 0.001, seconds),
        );
    }

    fn puff(&mut self, count: usize) {
        let feet = self.position;
        for _ in 0..count {
            let direction = vec3(self.random.range(-1.0, 1.0), self.random.range(0.1, 0.6), self.random.range(-1.0, 1.0));
            let speed = self.random.range(1.0, 2.5);
            self.spark(feet, direction * speed);
        }
    }

    fn spark(&mut self, position: Vec3, velocity: Vec3) {
        let life = self.random.range(0.4, 0.8);
        self.sparks.push(Spark { position, velocity, life, max_life: life });
    }

    fn camera(&self) -> Camera3D {
        let distance = 10.0;
        let offset = vec3(self.camera_yaw.sin() * distance, 6.5, self.camera_yaw.cos() * distance);
        Camera3D {
            position: self.camera_target + offset,
            target: self.camera_target + vec3(0.0, 0.8, 0.0),
            up: vec3(0.0, 1.0, 0.0),
            fovy: 0.9,
            ..Default::default()
        }
    }

    fn draw(&self, glow: &Glow) {
        // Sky: a sunset gradient, then the 3D scene on top.
        set_camera(&pixel_camera(0.0, 0.0, 320.0, 180.0));
        sky_gradient(0.0, 0.0, 320.0, 180.0, rgb(70, 60, 150), rgb(250, 160, 140));
        let camera = self.camera();
        set_camera(&camera);
        let eye = camera.position;
        let mut mesh = MeshBuilder::default();
        for block in &self.blocks {
            mesh.add_box(block.min, block.size, block.color, eye);
        }
        // The player: a body, and a "nose" box showing which way it faces.
        let body_min = self.position - vec3(PLAYER_SIZE.x / 2.0, 0.0, PLAYER_SIZE.z / 2.0);
        let squash = if self.on_ground { 1.0 } else { 1.08 };
        mesh.add_box(body_min, vec3(PLAYER_SIZE.x, PLAYER_SIZE.y * squash, PLAYER_SIZE.z), [1.0, 0.55, 0.25], eye);
        let nose = self.position + vec3(self.facing.sin() * 0.38, 0.55, self.facing.cos() * 0.38);
        mesh.add_box(nose - vec3(0.12, 0.08, 0.12), vec3(0.24, 0.16, 0.24), [0.25, 0.2, 0.3], eye);
        // A blob shadow under the player: find the highest block top below.
        let shadow_y = self.blocks.iter()
            .filter(|b| self.position.x > b.min.x && self.position.x < b.min.x + b.size.x
                && self.position.z > b.min.z && self.position.z < b.min.z + b.size.z
                && b.min.y + b.size.y <= self.position.y + 0.01)
            .map(|b| b.min.y + b.size.y).fold(f32::NEG_INFINITY, f32::max);
        if shadow_y.is_finite() {
            mesh.add_box(vec3(self.position.x - 0.35, shadow_y + 0.01, self.position.z - 0.35), vec3(0.7, 0.01, 0.7), [0.1, 0.1, 0.15], eye);
        }
        for crystal in &self.crystals {
            let bob = (self.time * 2.0 + crystal.x).sin() * 0.15;
            mesh.add_crystal(*crystal + vec3(0.0, bob, 0.0), self.time * 1.5 + crystal.z, eye);
        }
        mesh.draw();

        // Glows are 2D: project each 3D point to the screen and draw an additive light there.
        set_camera(&pixel_camera(0.0, 0.0, 320.0, 180.0));
        let view_projection = camera.matrix();
        glow.begin();
        for crystal in &self.crystals {
            let bob = (self.time * 2.0 + crystal.x).sin() * 0.15;
            if let Some((x, y, depth)) = project(view_projection, *crystal + vec3(0.0, bob, 0.0)) {
                let size = (60.0 / depth).clamp(6.0, 40.0);
                glow.draw(x, y, size, Color::new(0.5, 0.9, 1.0, 1.0), 0.8);
            }
        }
        for spark in &self.sparks {
            if let Some((x, y, depth)) = project(view_projection, spark.position) {
                let left = spark.life / spark.max_life;
                glow.draw(x, y, (14.0 / depth).clamp(1.0, 8.0) * (0.5 + left), Color::new(0.7, 0.95, 1.0, 1.0), left);
            }
        }
        glow.end();

        let found = self.total - self.crystals.len();
        let label = if self.crystals.is_empty() { "All crystals! R to play again".to_string() } else { format!("CRYSTALS {found}/{}", self.total) };
        draw_text(&label, 8.0, 14.0, 14.0, WHITE);
        draw_text("WASD move  Space jump  Q/E camera", 8.0, 174.0, 10.0, Color::new(1.0, 1.0, 1.0, 0.7));
    }
}

fn project(view_projection: Mat4, point: Vec3) -> Option<(f32, f32, f32)> {
    let clip = view_projection * point.extend(1.0);
    if clip.w <= 0.1 {
        return None;   // behind the camera
    }
    let ndc = clip.truncate() / clip.w;
    Some(((ndc.x + 1.0) / 2.0 * 320.0, (1.0 - ndc.y) / 2.0 * 180.0, clip.w))
}

/// Collects triangles with per-face lighting and fog baked into vertex colors,
/// then draws them in chunks (a macroquad mesh holds at most 65,535 vertices).
#[derive(Default)]
struct MeshBuilder {
    vertices: Vec<Vertex>,
    indices: Vec<u16>,
}

impl MeshBuilder {
    fn shade(&self, color: [f32; 3], normal: Vec3, position: Vec3, eye: Vec3) -> Color {
        let diffuse = normal.dot(LIGHT.normalize()).max(0.0);
        let light = 0.45 + 0.65 * diffuse;
        let fog = ((position.distance(eye) - FOG_START) / (FOG_END - FOG_START)).clamp(0.0, 1.0);
        let channel = |i: usize| (color[i] * light * (1.0 - fog) + FOG[i] * fog).min(1.0);
        Color::new(channel(0), channel(1), channel(2), 1.0)
    }

    fn quad(&mut self, corners: [Vec3; 4], normal: Vec3, color: [f32; 3], eye: Vec3) {
        let center = (corners[0] + corners[2]) / 2.0;
        let shaded = self.shade(color, normal, center, eye);
        let start = self.vertices.len() as u16;
        for corner in corners {
            self.vertices.push(Vertex::new(corner.x, corner.y, corner.z, 0.0, 0.0, shaded));
        }
        self.indices.extend_from_slice(&[start, start + 1, start + 2, start, start + 2, start + 3]);
    }

    fn add_box(&mut self, min: Vec3, size: Vec3, color: [f32; 3], eye: Vec3) {
        let max = min + size;
        let p = |x: f32, y: f32, z: f32| vec3(x, y, z);
        self.quad([p(min.x, max.y, min.z), p(max.x, max.y, min.z), p(max.x, max.y, max.z), p(min.x, max.y, max.z)], Vec3::Y, color, eye);
        self.quad([p(min.x, min.y, min.z), p(min.x, min.y, max.z), p(max.x, min.y, max.z), p(max.x, min.y, min.z)], -Vec3::Y, color, eye);
        self.quad([p(min.x, min.y, max.z), p(min.x, max.y, max.z), p(max.x, max.y, max.z), p(max.x, min.y, max.z)], Vec3::Z, color, eye);
        self.quad([p(max.x, min.y, min.z), p(max.x, max.y, min.z), p(min.x, max.y, min.z), p(min.x, min.y, min.z)], -Vec3::Z, color, eye);
        self.quad([p(max.x, min.y, max.z), p(max.x, max.y, max.z), p(max.x, max.y, min.z), p(max.x, min.y, min.z)], Vec3::X, color, eye);
        self.quad([p(min.x, min.y, min.z), p(min.x, max.y, min.z), p(min.x, max.y, max.z), p(min.x, min.y, max.z)], -Vec3::X, color, eye);
        if self.vertices.len() > 60_000 {
            self.draw();
        }
    }

    /// An octahedron (two four-sided pyramids), spun around y.
    fn add_crystal(&mut self, center: Vec3, spin: f32, eye: Vec3) {
        let top = center + vec3(0.0, 0.55, 0.0);
        let bottom = center - vec3(0.0, 0.55, 0.0);
        let ring: Vec<Vec3> = (0..4).map(|i| {
            let angle = spin + i as f32 * std::f32::consts::FRAC_PI_2;
            center + vec3(angle.cos() * 0.32, 0.0, angle.sin() * 0.32)
        }).collect();
        for i in 0..4 {
            let (a, b) = (ring[i], ring[(i + 1) % 4]);
            for (tip, upward) in [(top, true), (bottom, false)] {
                let normal = (a - tip).cross(b - tip).normalize() * if upward { -1.0 } else { 1.0 };
                let shaded = self.shade([0.55, 0.95, 1.0], normal, center, eye);
                let glow = Color::new((shaded.r + 0.25).min(1.0), (shaded.g + 0.25).min(1.0), (shaded.b + 0.25).min(1.0), 1.0);
                let start = self.vertices.len() as u16;
                for corner in [tip, a, b] {
                    self.vertices.push(Vertex::new(corner.x, corner.y, corner.z, 0.0, 0.0, glow));
                }
                self.indices.extend_from_slice(&[start, start + 1, start + 2]);
            }
        }
    }

    fn draw(&mut self) {
        if self.vertices.is_empty() {
            return;
        }
        let mesh = Mesh { vertices: std::mem::take(&mut self.vertices), indices: std::mem::take(&mut self.indices), texture: None };
        draw_mesh(&mesh);
    }
}

fn read_input(actions: &mut Actions, capture: &Capture, game: &Game) {
    let any = |keys: &[KeyCode]| keys.iter().any(|key| is_key_down(*key));
    if capture.autopilot() {
        // Autopilot: turn the world direction to the nearest crystal into camera-relative
        // keys (the same math as movement, run backwards), and hop when it's above us.
        let nearest = game.crystals.iter().min_by(|a, b| a.distance(game.position).total_cmp(&b.distance(game.position)));
        let (mut forward, mut right, mut jump) = (0.0, 0.0, false);
        if let Some(crystal) = nearest {
            let to = vec3(crystal.x - game.position.x, 0.0, crystal.z - game.position.z);
            let camera_forward = vec3(-game.camera_yaw.sin(), 0.0, -game.camera_yaw.cos());
            let camera_right = vec3(-camera_forward.z, 0.0, camera_forward.x);
            forward = to.dot(camera_forward);
            right = to.dot(camera_right);
            jump = crystal.y > game.position.y + 1.5 && to.length() < 4.0;
        }
        actions.set("forward", forward > 0.3);
        actions.set("back", forward < -0.3);
        actions.set("right", right > 0.3);
        actions.set("left", right < -0.3);
        actions.set("jump", jump && game.on_ground || (actions.is_down("jump") && game.velocity.y > 0.0));
        actions.set("turn_left", (0.5..1.2).contains(&game.time));
        return;
    }
    actions.set("forward", any(&[KeyCode::W, KeyCode::Up]));
    actions.set("back", any(&[KeyCode::S, KeyCode::Down]));
    actions.set("left", any(&[KeyCode::A, KeyCode::Left]));
    actions.set("right", any(&[KeyCode::D, KeyCode::Right]));
    actions.set("turn_left", any(&[KeyCode::Q]));
    actions.set("turn_right", any(&[KeyCode::E]));
    actions.set("jump", any(&[KeyCode::Space]));
    actions.set("restart", any(&[KeyCode::R]));
}

fn conf() -> Conf {
    window("Crystal islands 3D (Kindling reference)")
}

#[macroquad::main(conf)]
async fn main() {
    let glow = Glow::new();
    let mut game = Game::new();
    let mut actions = Actions::default();
    let mut stepper = FixedStep::new(1.0 / 60.0);
    let mut capture = Capture::from_env();
    loop {
        if is_key_pressed(KeyCode::Escape) {
            break;
        }
        read_input(&mut actions, &capture, &game);
        for _ in 0..stepper.advance(capture.frame_seconds()) {
            if actions.was_pressed("restart") {
                game = Game::new();
            }
            game.update(&actions, stepper.step_seconds);
            actions.end_step();
        }
        clear_background(BLACK);
        game.draw(&glow);
        capture.end_frame();
        next_frame().await;
    }
}
