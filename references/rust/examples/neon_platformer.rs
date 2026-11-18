//! examples/neon_platformer.rs   (JavaScript twin: samples/2d/04-platformer)
//! WHAT: A glowing platformer: run, jump, collect embers, avoid spikes, reach the beacon.
//! WHY:  The same tricks as the Python and JavaScript versions (coyote time, jump buffer,
//!       variable jump height, axis-separated tile collision, damped camera with shake,
//!       squash and stretch, parallax, additive particles), written the Rust way:
//!       one `Game` struct that owns all state, `update` and `draw` as methods.
//! RUN:  cd ~/projects/kindling/references/rust && cargo run --release --example neon_platformer
//! KEYS: Left/Right or A/D run, Space/Up/W/Z jump (hold for higher), R restarts, Esc quits.

mod common;

use common::{from_array, pixel_camera, rgb, vertical_gradient, window, Capture, Glow};
use kindling_ref::actions::Actions;
use kindling_ref::camera::Camera;
use kindling_ref::collision::{move_and_collide, Box2};
use kindling_ref::easing::{approach, ease_out_back};
use kindling_ref::fixed_step::FixedStep;
use kindling_ref::particles::{Burst, Particles};
use kindling_ref::tilemap::TileMap;
use macroquad::prelude::*;
use std::f32::consts::PI;

const WIDTH: f32 = 320.0;
const HEIGHT: f32 = 180.0;
const TILE: f32 = 12.0;
const LEVEL: &str = "
#..........................................................................#
#..........................................................................#
#..........................................................................#
#.......................................o.o.o..............................#
#.....................................#########....................o.......#
#..........................o.o.................................o.......o...#
#........................#######.....................o......#####.........G#
#.................o.o.........................o.o..........................##
#...............#######...................##########.......................##
#....o.o..............o....................................................##
#..######..........#####...............o.o.o.............##########.......##
#...............................................................o..........##
#..P.......................^^^....#########.......^^^^.....................##
############....########################.....#######################..######
############....########################.....#######################..######
";

const RUN_SPEED: f32 = 95.0;
const ACCELERATION: f32 = 900.0;
const FRICTION: f32 = 1100.0;
const GRAVITY: f32 = 760.0;
const JUMP_SPEED: f32 = 255.0;
const COYOTE_SECONDS: f32 = 0.1;
const BUFFER_SECONDS: f32 = 0.12;
const EMBER: [f32; 3] = [1.0, 0.67, 0.24];
const CYAN: [f32; 3] = [0.31, 0.86, 1.0];

struct Game {
    map: TileMap,
    camera: Camera,
    particles: Particles,
    player: Box2,
    spawn: (f32, f32),
    velocity: (f32, f32),
    on_ground: bool,
    coyote: f32,
    buffer: f32,
    squash: f32,
    facing: f32,
    embers: Vec<(f32, f32)>,
    total: usize,
    spikes: Vec<Box2>,
    goal: Box2,
    won_at: Option<f32>,
    time: f32,
}

impl Game {
    fn new() -> Self {
        let map = TileMap::new(LEVEL, TILE);
        let camera = Camera::new(WIDTH, HEIGHT, map.pixel_width(), map.pixel_height());
        let (column, row) = map.find('P')[0];
        let spawn = (column as f32 * TILE + 2.0, row as f32 * TILE);
        let embers: Vec<(f32, f32)> = map.find('o').iter()
            .map(|(c, r)| (*c as f32 * TILE + TILE / 2.0, *r as f32 * TILE + TILE / 2.0)).collect();
        let spikes = map.find('^').iter()
            .map(|(c, r)| Box2::new(*c as f32 * TILE + 1.0, *r as f32 * TILE + 6.0, TILE - 2.0, TILE - 6.0)).collect();
        let (goal_column, goal_row) = map.find('G')[0];
        Self {
            total: embers.len(),
            goal: Box2::new(goal_column as f32 * TILE, (goal_row as f32 - 2.0) * TILE, TILE, TILE * 3.0),
            map, camera, particles: Particles::new(3000),
            player: Box2::new(spawn.0, spawn.1, 8.0, 11.0), spawn,
            velocity: (0.0, 0.0), on_ground: false, coyote: 0.0, buffer: 0.0, squash: 1.0, facing: 1.0,
            embers, spikes, won_at: None, time: 0.0,
        }
    }

    fn update(&mut self, actions: &Actions, seconds: f32) {
        self.time += seconds;
        if self.won_at.is_some() {
            if self.particles.random().unit() < 0.3 {
                let x = self.goal.x + self.particles.random().range(-60.0, 60.0);
                let y = self.goal.y - self.particles.random().range(0.0, 40.0);
                self.firework(x, y);
            }
            self.particles.update(seconds);
            return;
        }
        let direction = actions.axis("left", "right");
        if direction != 0.0 {
            self.facing = direction;
            self.velocity.0 = approach(self.velocity.0, direction * RUN_SPEED, ACCELERATION * seconds);
        } else {
            self.velocity.0 = approach(self.velocity.0, 0.0, FRICTION * seconds);
        }
        // Forgiving jumps: coyote time after leaving a ledge, a buffer before landing.
        self.coyote = if self.on_ground { COYOTE_SECONDS } else { self.coyote - seconds };
        self.buffer = if actions.was_pressed("jump") { BUFFER_SECONDS } else { self.buffer - seconds };
        if self.buffer > 0.0 && self.coyote > 0.0 {
            self.velocity.1 = -JUMP_SPEED;
            self.buffer = 0.0;
            self.coyote = 0.0;
            self.squash = 1.35;
            self.dust(8);
        }
        if actions.was_released("jump") && self.velocity.1 < -80.0 {
            self.velocity.1 *= 0.45;   // let go early for a short hop
        }
        self.velocity.1 = (self.velocity.1 + GRAVITY * seconds).min(420.0);

        let was_on_ground = self.on_ground;
        let falling_speed = self.velocity.1;
        let hits = move_and_collide(&mut self.player, self.velocity.0 * seconds, self.velocity.1 * seconds, &self.map);
        if hits.left || hits.right {
            self.velocity.0 = 0.0;
        }
        if hits.up {
            self.velocity.1 = 0.0;
        }
        self.on_ground = hits.down;
        if self.on_ground {
            if !was_on_ground && falling_speed > 200.0 {
                self.squash = 0.65;
                self.dust(10);
                self.camera.add_trauma(0.15);
            }
            self.velocity.1 = 0.0;
        }
        self.squash += (1.0 - self.squash) * (seconds * 12.0).min(1.0);

        let (center_x, center_y) = self.player.center();
        let mut picked = Vec::new();
        self.embers.retain(|(x, y)| {
            let hit = (x - center_x).abs() < 9.0 && (y - center_y).abs() < 10.0;
            if hit {
                picked.push((*x, *y));
            }
            !hit
        });
        for (x, y) in picked {
            self.particles.burst(x, y, &Burst { count: 18, speed: (30.0, 110.0), life: (0.3, 0.7),
                colors: vec![EMBER, [1.0, 0.9, 0.55]], drag: 3.0, ..Burst::default() });
        }
        if self.spikes.iter().any(|spike| spike.overlaps(&self.player)) || self.player.y > self.map.pixel_height() + 40.0 {
            self.die();
        }
        if self.goal.overlaps(&self.player) {
            self.won_at = Some(self.time);
            for _ in 0..4 {
                self.firework(self.goal.x, self.goal.y);
            }
        }
        self.particles.update(seconds);
        self.camera.follow(center_x + self.facing * 24.0, center_y - 10.0, seconds, 0.004);
        self.camera.update(seconds, 6.0);
    }

    fn die(&mut self) {
        let (x, y) = self.player.center();
        self.particles.burst(x, y, &Burst { count: 40, speed: (60.0, 200.0), life: (0.4, 0.9),
            colors: vec![CYAN, [1.0, 1.0, 1.0]], gravity: 300.0, drag: 1.5, ..Burst::default() });
        self.camera.add_trauma(0.6);
        self.player.x = self.spawn.0;
        self.player.y = self.spawn.1;
        self.velocity = (0.0, 0.0);
    }

    fn dust(&mut self, count: usize) {
        let (x, y) = (self.player.x + 4.0, self.player.y + 11.0);
        self.particles.burst(x, y, &Burst { count, speed: (10.0, 45.0), life: (0.2, 0.5), size: (1.0, 2.0),
            colors: vec![[0.47, 0.55, 0.75]], gravity: -20.0, angle: -PI / 2.0, spread: PI, ..Burst::default() });
    }

    fn firework(&mut self, x: f32, y: f32) {
        let palette = [EMBER, CYAN, [1.0, 0.35, 0.7], [0.63, 1.0, 0.47]];
        let color = palette[(self.particles.random().unit() * 4.0) as usize % 4];
        self.particles.burst(x, y, &Burst { count: 30, speed: (40.0, 140.0), life: (0.6, 1.2),
            colors: vec![color, [1.0, 1.0, 1.0]], gravity: 90.0, drag: 1.2, ..Burst::default() });
    }

    fn draw(&self, glow: &Glow) {
        // Background in screen space, world in camera space (with shake).
        set_camera(&pixel_camera(0.0, 0.0, WIDTH, HEIGHT));
        vertical_gradient(0.0, 0.0, WIDTH, HEIGHT, rgb(12, 10, 36), rgb(60, 20, 70));
        for i in 0..70 {
            let depth = ((i * 37) % 10) as f32 / 10.0;
            let x = ((i as f32 * 53.7) - self.camera.x * 0.1 * depth).rem_euclid(WIDTH);
            let y = (i as f32 * 29.3) % (HEIGHT * 0.7);
            let twinkle = 0.6 + 0.4 * (self.time * 3.0 + i as f32).sin();
            let shade = 0.45 + 0.5 * depth * twinkle;
            draw_rectangle(x, y, 1.0, 1.0, Color::new(shade, shade, (shade + 0.1).min(1.0), 1.0));
        }
        self.mountains(0.25, 120.0, rgb(34, 22, 66), 38.0);
        self.mountains(0.5, 135.0, rgb(50, 26, 80), 24.0);

        set_camera(&pixel_camera(self.camera.view_x(), self.camera.view_y(), WIDTH, HEIGHT));
        let first_column = (self.camera.x / TILE) as i32;
        let first_row = (self.camera.y / TILE) as i32;
        for row in first_row..first_row + (HEIGHT / TILE) as i32 + 2 {
            for column in first_column..first_column + (WIDTH / TILE) as i32 + 2 {
                if !self.map.is_solid(column, row) || column < 0 {
                    continue;
                }
                let (x, y) = (column as f32 * TILE, row as f32 * TILE);
                draw_rectangle(x, y, TILE, TILE, rgb(28, 24, 54));
                if !self.map.is_solid(column, row - 1) {
                    draw_rectangle(x, y, TILE, 2.0, rgb(90, 230, 255));
                    draw_rectangle(x, y + 2.0, TILE, 2.0, rgb(40, 70, 110));
                } else {
                    draw_rectangle_lines(x + 1.0, y + 1.0, TILE - 2.0, TILE - 2.0, 1.0, rgb(36, 30, 66));
                }
            }
        }
        for spike in &self.spikes {
            for i in 0..2 {
                let left = spike.x + i as f32 * 5.0;
                draw_triangle(vec2(left, spike.y + 6.0), vec2(left + 2.5, spike.y - 1.0), vec2(left + 5.0, spike.y + 6.0), rgb(230, 70, 110));
            }
        }
        let goal_x = self.goal.x + TILE / 2.0;
        draw_line(goal_x, self.goal.y, goal_x, self.goal.y + TILE * 3.0, 2.0, rgb(200, 250, 255));
        // Player with squash and stretch (area stays about the same).
        let width = 8.0 / self.squash.sqrt();
        let height = 11.0 * self.squash.sqrt();
        let (cx, bottom) = (self.player.x + 4.0, self.player.y + 11.0);
        draw_rectangle(cx - width / 2.0, bottom - height, width, height, rgb(235, 245, 255));
        draw_rectangle(cx + self.facing * 1.5 - 1.0, bottom - height + 3.0, 2.0, 3.0, rgb(30, 40, 90));
        for (x, y) in &self.embers {
            let bob = (self.time * 4.0 + x).sin() * 2.0;
            draw_circle(*x, y + bob, 1.6, rgb(255, 230, 160));
        }

        glow.begin();
        for (x, y) in &self.embers {
            let bob = (self.time * 4.0 + x).sin() * 2.0;
            glow.draw(*x, y + bob, 10.0, from_array(EMBER), 0.8);
        }
        glow.draw(goal_x, self.goal.y + 10.0, 28.0, from_array(CYAN), 0.7 + 0.3 * (self.time * 5.0).sin());
        glow.draw(cx, bottom - height / 2.0, 16.0, rgb(60, 140, 255), 0.6);
        for particle in &self.particles.list {
            let left = particle.fraction_left();
            glow.draw(particle.x, particle.y, particle.size * 3.0 * (0.4 + 0.6 * left), from_array(particle.color), left);
        }
        glow.end();

        set_camera(&pixel_camera(0.0, 0.0, WIDTH, HEIGHT));
        let collected = self.total - self.embers.len();
        let label = format!("EMBERS {collected}/{}", self.total);
        draw_text(&label, 6.0, 14.0, 14.0, rgb(255, 210, 140));
        if let Some(won_at) = self.won_at {
            let t = ((self.time - won_at) / 0.6).clamp(0.0, 1.0);
            let size = 10.0 + 18.0 * ease_out_back(t);
            let label = "BEACON LIT!";
            let measure = measure_text(label, None, size as u16, 1.0);
            draw_text(label, WIDTH / 2.0 - measure.width / 2.0, HEIGHT / 2.0 - 4.0, size, rgb(180, 245, 255));
            let hint = "R to play again";
            let measure = measure_text(hint, None, 12, 1.0);
            draw_text(hint, WIDTH / 2.0 - measure.width / 2.0, HEIGHT / 2.0 + 14.0, 12.0, WHITE);
        }
    }

    fn mountains(&self, factor: f32, base: f32, color: Color, height: f32) {
        let offset = self.camera.x * factor;
        let mut x = 0.0;
        while x < WIDTH {
            let peak = |x: f32| {
                let world = x + offset;
                base - height * (0.5 + 0.3 * (world * 0.021).sin() + 0.2 * (world * 0.057).sin())
            };
            let (left, right) = (peak(x), peak(x + 8.0));
            draw_triangle(vec2(x, left), vec2(x + 8.0, right), vec2(x, HEIGHT), color);
            draw_triangle(vec2(x + 8.0, right), vec2(x + 8.0, HEIGHT), vec2(x, HEIGHT), color);
            x += 8.0;
        }
    }
}

fn read_input(actions: &mut Actions, capture: &Capture, game: &Game) {
    let any = |keys: &[KeyCode]| keys.iter().any(|key| is_key_down(*key));
    if capture.autopilot() {
        // Autopilot for screenshots and smoke tests: run right, jump at gaps, walls and spikes.
        let ahead = ((game.player.x + 18.0) / TILE).floor() as i32;
        let feet_row = ((game.player.y + 12.0) / TILE).floor() as i32;
        let body_row = ((game.player.y + 5.0) / TILE).floor() as i32;
        let danger = !game.map.is_solid(ahead, feet_row) || game.map.is_solid(ahead, body_row)
            || game.map.at(ahead, body_row) == '^' || game.map.at(ahead + 1, body_row) == '^';
        actions.set("right", game.time > 0.2);
        actions.set("jump", danger && game.on_ground || (actions.is_down("jump") && game.velocity.1 < 0.0));
        return;
    }
    actions.set("left", any(&[KeyCode::Left, KeyCode::A]));
    actions.set("right", any(&[KeyCode::Right, KeyCode::D]));
    actions.set("jump", any(&[KeyCode::Space, KeyCode::Up, KeyCode::W, KeyCode::Z]));
    actions.set("restart", any(&[KeyCode::R]));
}

fn conf() -> Conf {
    window("Neon platformer (Kindling reference)")
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
        game.draw(&glow);
        capture.end_frame();
        next_frame().await;
    }
}
