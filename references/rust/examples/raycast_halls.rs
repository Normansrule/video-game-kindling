//! examples/raycast_halls.rs   (JavaScript twin: samples/3d/03-raycaster-maze)
//! WHAT: A first-person walk through glowing halls drawn with a DDA raycaster, with light
//!       orbs to collect and a minimap that shows the rays.
//! WHY:  Uses `kindling_ref::raycast` (plain Rust, tested) for all the math; macroquad only
//!       draws rectangles. Orbs are billboards hidden behind walls with a per-column depth list.
//! RUN:  cd ~/projects/kindling/references/rust && cargo run --release --example raycast_halls
//! KEYS: W/S or Up/Down walk, A/D strafe, Left/Right or Q/E turn, M toggles the map, Esc quits.

mod common;

use common::{pixel_camera, rgb, vertical_gradient, window, Capture, Glow};
use kindling_ref::actions::Actions;
use kindling_ref::fixed_step::FixedStep;
use kindling_ref::raycast::{cast_view, move_in_grid, Hit};
use macroquad::prelude::*;

const WIDTH: f32 = 320.0;
const HEIGHT: f32 = 180.0;
const COLUMNS: usize = 320;
const FIELD_OF_VIEW: f32 = 1.22; // about 70 degrees
const MAP: [&str; 13] = [
    "################",
    "#......#.......#",
    "#.##...#..###..#",
    "#.#....2...#...#",
    "#.#.####...#.#.#",
    "#......#.....#.#",
    "###.##.#####.#.#",
    "#...#........#.#",
    "#.#.#.3333.###.#",
    "#.#...3..3.....#",
    "#.#####..3.#####",
    "#..............#",
    "################",
];
const FOG: [f32; 3] = [0.055, 0.03, 0.12];
const ORB: Color = Color::new(1.0, 0.78, 0.35, 1.0);

fn wall_color(wall: char) -> [f32; 3] {
    match wall {
        '2' => [0.9, 0.35, 0.63],
        '3' => [0.27, 0.78, 0.86],
        _ => [0.43, 0.35, 0.78],
    }
}

struct Game {
    x: f32,
    y: f32,
    angle: f32,
    orbs: Vec<(f32, f32)>,
    total: usize,
    show_map: bool,
    time: f32,
    bob: f32,
    flash: f32,
}

impl Game {
    fn new() -> Self {
        let orbs = vec![(4.5, 1.5), (14.5, 1.5), (5.5, 7.5), (8.0, 9.5), (14.5, 11.5), (1.5, 1.5), (9.5, 3.5), (11.5, 11.5)];
        Self { x: 1.5, y: 11.5, angle: -0.25, total: orbs.len(), orbs, show_map: true, time: 0.0, bob: 0.0, flash: 0.0 }
    }

    fn update(&mut self, actions: &Actions, seconds: f32) {
        self.time += seconds;
        if actions.was_pressed("map") {
            self.show_map = !self.show_map;
        }
        self.angle += actions.axis("turn_left", "turn_right") * 2.4 * seconds;
        let forward = actions.axis("back", "forward");
        let side = actions.axis("left", "right");
        let speed = 2.6 * seconds;
        let delta_x = (self.angle.cos() * forward - self.angle.sin() * side) * speed;
        let delta_y = (self.angle.sin() * forward + self.angle.cos() * side) * speed;
        if forward != 0.0 || side != 0.0 {
            self.bob += seconds * 9.0;
        }
        (self.x, self.y) = move_in_grid(&MAP, self.x, self.y, delta_x, delta_y, 0.2);
        let (x, y) = (self.x, self.y);
        let before = self.orbs.len();
        self.orbs.retain(|(orb_x, orb_y)| (orb_x - x).hypot(orb_y - y) > 0.45);
        if self.orbs.len() < before {
            self.flash = 0.35;
        }
        self.flash = (self.flash - seconds).max(0.0);
    }

    fn draw(&self, glow: &Glow) {
        set_camera(&pixel_camera(0.0, 0.0, WIDTH, HEIGHT));
        let horizon = HEIGHT / 2.0 + self.bob.sin() * 1.5;
        let fog = Color::new(FOG[0], FOG[1], FOG[2], 1.0);
        vertical_gradient(0.0, 0.0, WIDTH, horizon, rgb(30, 14, 60), fog);
        vertical_gradient(0.0, horizon, WIDTH, HEIGHT - horizon, fog, rgb(40, 26, 50));

        let hits = cast_view(&MAP, self.x, self.y, self.angle, FIELD_OF_VIEW, COLUMNS);
        let stripe = WIDTH / COLUMNS as f32;
        let mut depth = vec![f32::INFINITY; COLUMNS];
        for (index, hit) in hits.iter().enumerate() {
            let Some(Hit { distance, wall, x_side, texture_u }) = hit else { continue };
            depth[index] = *distance;
            let wall_height = HEIGHT / distance.max(0.05);
            let top = horizon - wall_height / 2.0;
            // Light falls off with distance; one side is darker (fake sun).
            let light = (1.0 - distance / 9.0).max(0.0) * if *x_side { 1.0 } else { 0.75 };
            let seam = if *texture_u < 0.06 || *texture_u > 0.94 { 1.35 } else { 1.0 };
            let base = wall_color(*wall);
            let channel = |i: usize| (FOG[i] + (base[i] * seam - FOG[i]) * light).min(1.0);
            draw_rectangle(index as f32 * stripe, top, stripe + 0.05, wall_height, Color::new(channel(0), channel(1), channel(2), 1.0));
            let band = Color::new(base[0], base[1], base[2], 0.5 * light);
            draw_rectangle(index as f32 * stripe, top + wall_height * 0.62, stripe + 0.05, (wall_height * 0.04).max(1.0), band);
        }

        // Orbs: turn world position into camera space, then into a screen column.
        let half_width = (FIELD_OF_VIEW / 2.0).tan();
        let mut visible: Vec<(f32, f32)> = self.orbs.iter().filter_map(|(orb_x, orb_y)| {
            let (dx, dy) = (orb_x - self.x, orb_y - self.y);
            let forward = dx * self.angle.cos() + dy * self.angle.sin();
            let sideways = -dx * self.angle.sin() + dy * self.angle.cos();
            (forward > 0.1).then_some((forward, sideways))
        }).collect();
        visible.sort_by(|a, b| b.0.total_cmp(&a.0));
        glow.begin();
        for (forward, sideways) in &visible {
            let screen_x = (sideways / (forward * half_width) + 1.0) / 2.0 * WIDTH;
            let column = (screen_x / stripe) as usize;
            if column < COLUMNS && depth[column] < *forward {
                continue;
            }
            let size = HEIGHT / forward * 0.5;
            let float_y = horizon + (self.time * 3.0 + sideways).sin() * size * 0.3;
            glow.draw(screen_x, float_y, size * 1.6, ORB, (1.0 - forward / 10.0).max(0.2));
            glow.draw(screen_x, float_y, size * 0.3, WHITE, 1.0);
        }
        glow.end();
        if self.flash > 0.0 {
            draw_rectangle(0.0, 0.0, WIDTH, HEIGHT, Color::new(1.0, 0.8, 0.4, self.flash * 0.5));
        }
        if self.show_map {
            self.draw_map(&hits);
        }
        let found = self.total - self.orbs.len();
        let message = if self.orbs.is_empty() { "All lights found!".to_string() } else { format!("LIGHTS {found}/{}", self.total) };
        draw_text(&message, WIDTH - 8.0 - measure_text(&message, None, 14, 1.0).width, 14.0, 14.0, ORB);
    }

    fn draw_map(&self, hits: &[Option<Hit>]) {
        let (cell, left, top) = (4.0, 6.0, 6.0);
        for (row, line) in MAP.iter().enumerate() {
            for (column, character) in line.chars().enumerate() {
                if character != '.' {
                    let c = wall_color(character);
                    draw_rectangle(left + column as f32 * cell, top + row as f32 * cell, cell, cell, Color::new(c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 1.0));
                }
            }
        }
        let player = vec2(left + self.x * cell, top + self.y * cell);
        for index in (0..COLUMNS).step_by(16) {
            let Some(hit) = &hits[index] else { continue };
            let ray_angle = self.angle + ((2.0 * (index as f32 + 0.5) / COLUMNS as f32 - 1.0) * (FIELD_OF_VIEW / 2.0).tan()).atan();
            let raw = hit.distance / (ray_angle - self.angle).cos();
            draw_line(player.x, player.y, player.x + ray_angle.cos() * raw * cell, player.y + ray_angle.sin() * raw * cell, 0.5, rgb(170, 130, 60));
        }
        for (orb_x, orb_y) in &self.orbs {
            draw_rectangle(left + orb_x * cell - 1.0, top + orb_y * cell - 1.0, 2.0, 2.0, ORB);
        }
        draw_circle(player.x, player.y, 1.5, WHITE);
    }
}

fn read_input(actions: &mut Actions, capture: &Capture, time: f32) {
    let any = |keys: &[KeyCode]| keys.iter().any(|key| is_key_down(*key));
    if capture.autopilot() {
        actions.set("forward", !(0.7..=1.6).contains(&time));
        actions.set("turn_right", (1.0..1.4).contains(&time));
        return;
    }
    actions.set("forward", any(&[KeyCode::W, KeyCode::Up]));
    actions.set("back", any(&[KeyCode::S, KeyCode::Down]));
    actions.set("left", any(&[KeyCode::A]));
    actions.set("right", any(&[KeyCode::D]));
    actions.set("turn_left", any(&[KeyCode::Left, KeyCode::Q]));
    actions.set("turn_right", any(&[KeyCode::Right, KeyCode::E]));
    actions.set("map", any(&[KeyCode::M]));
}

fn conf() -> Conf {
    window("Raycast halls (Kindling reference)")
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
        read_input(&mut actions, &capture, game.time);
        for _ in 0..stepper.advance(capture.frame_seconds()) {
            game.update(&actions, stepper.step_seconds);
            actions.end_step();
        }
        game.draw(&glow);
        capture.end_frame();
        next_frame().await;
    }
}
