//! examples/fireworks.rs   (JavaScript twin: viz/08-particles)
//! WHAT: An interactive fireworks show over a city: rockets rise and burst into rings,
//!       spheres and willows of glowing sparks. Click or press Space to launch.
//! WHY:  A particle-system showcase using `kindling_ref::particles`: bursts with speed,
//!       life, gravity and drag, drawn as additive glows so overlapping sparks get brighter.
//! RUN:  cd ~/projects/kindling/references/rust && cargo run --release --example fireworks
//! KEYS: Click or Space launches, A toggles autoplay, Esc quits.

mod common;

use common::{from_array, pixel_camera, rgb, vertical_gradient, window, Capture, Glow};
use kindling_ref::fixed_step::FixedStep;
use kindling_ref::particles::{Burst, Particles};
use macroquad::prelude::*;
use std::f32::consts::TAU;

const WIDTH: f32 = 320.0;
const HEIGHT: f32 = 180.0;
const PALETTES: [[[f32; 3]; 2]; 5] = [
    [[1.0, 0.35, 0.63], [1.0, 0.8, 0.9]],
    [[0.35, 0.78, 1.0], [0.86, 0.96, 1.0]],
    [[1.0, 0.75, 0.27], [1.0, 0.94, 0.75]],
    [[0.59, 1.0, 0.47], [0.9, 1.0, 0.82]],
    [[0.75, 0.47, 1.0], [0.94, 0.86, 1.0]],
];

struct Rocket {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    fuse: f32,
    palette: usize,
    shape: usize,
}

struct Show {
    sparks: Particles,
    trails: Particles,
    rockets: Vec<Rocket>,
    autoplay: bool,
    timer: f32,
    launched: usize,
}

impl Show {
    fn launch(&mut self, x: Option<f32>) {
        let random = self.sparks.random();
        let x = x.unwrap_or_else(|| random.range(WIDTH * 0.2, WIDTH * 0.8));
        let rocket = Rocket { x, y: HEIGHT + 2.0, vx: random.range(-12.0, 12.0), vy: random.range(-185.0, -150.0),
                              fuse: random.range(0.75, 1.05), palette: self.launched % PALETTES.len(), shape: (self.launched / 2) % 3 };
        self.launched += 1;
        self.rockets.push(rocket);
    }

    fn explode(&mut self, x: f32, y: f32, palette: usize, shape: usize) {
        let colors = PALETTES[palette].to_vec();
        // Shapes and palettes take turns at different speeds, so the show keeps varying.
        match shape {
            0 => {
                for i in 0..60 {
                    let angle = i as f32 / 60.0 * TAU;
                    self.sparks.burst(x, y, &Burst { count: 1, speed: (90.0, 95.0), life: (0.9, 1.2), size: (1.0, 1.5),
                        colors: colors.clone(), gravity: 40.0, drag: 1.4, angle, spread: 0.01 });
                }
            }
            1 => self.sparks.burst(x, y, &Burst { count: 140, speed: (20.0, 90.0), life: (1.4, 2.2), size: (0.8, 1.4),
                colors: vec![[1.0, 0.78, 0.47], [1.0, 0.63, 0.31]], gravity: 55.0, drag: 1.0, ..Burst::default() }),
            _ => self.sparks.burst(x, y, &Burst { count: 160, speed: (10.0, 120.0), life: (0.7, 1.4), size: (0.8, 1.6),
                colors, gravity: 45.0, drag: 1.6, ..Burst::default() }),
        }
        self.sparks.burst(x, y, &Burst { count: 10, speed: (0.0, 20.0), life: (0.1, 0.25), size: (4.0, 6.0),
            colors: vec![[1.0, 1.0, 1.0]], drag: 6.0, ..Burst::default() });
    }

    fn update(&mut self, seconds: f32) {
        if self.autoplay {
            self.timer -= seconds;
            if self.timer <= 0.0 {
                self.launch(None);
                self.timer = self.sparks.random().range(0.25, 0.8);
            }
        }
        let mut bursts = Vec::new();
        for rocket in &mut self.rockets {
            rocket.vy += 60.0 * seconds;
            rocket.x += rocket.vx * seconds;
            rocket.y += rocket.vy * seconds;
            rocket.fuse -= seconds;
            self.trails.burst(rocket.x, rocket.y, &Burst { count: 2, speed: (0.0, 12.0), life: (0.2, 0.5), size: (0.6, 1.2),
                colors: vec![[1.0, 0.82, 0.6]], gravity: 20.0, drag: 3.0, ..Burst::default() });
            if rocket.fuse <= 0.0 {
                bursts.push((rocket.x, rocket.y, rocket.palette, rocket.shape));
            }
        }
        self.rockets.retain(|rocket| rocket.fuse > 0.0);
        for (x, y, palette, shape) in bursts {
            self.explode(x, y, palette, shape);
        }
        self.sparks.update(seconds);
        self.trails.update(seconds);
    }

    fn draw(&self, glow: &Glow) {
        set_camera(&pixel_camera(0.0, 0.0, WIDTH, HEIGHT));
        vertical_gradient(0.0, 0.0, WIDTH, HEIGHT, rgb(6, 6, 24), rgb(30, 14, 44));
        glow.begin();
        for particle in self.trails.list.iter().chain(self.sparks.list.iter()) {
            let left = particle.fraction_left();
            glow.draw(particle.x, particle.y, particle.size * 2.6 * (0.4 + 0.6 * left), from_array(particle.color), left);
        }
        glow.end();
        for index in 0..22 {
            let x = index as f32 * 15.0;
            let height = 14.0 + (index * 37 % 23) as f32;
            draw_rectangle(x, HEIGHT - height, 14.0, height, rgb(8, 6, 16));
            for window in 0..3 {
                if (index + window) % 3 == 0 {
                    draw_rectangle(x + 3.0 + window as f32 * 4.0, HEIGHT - height + 4.0, 2.0, 2.0, rgb(90, 75, 40));
                }
            }
        }
        let hint = "Click or Space to launch   A: autoplay";
        draw_text(hint, WIDTH / 2.0 - measure_text(hint, None, 12, 1.0).width / 2.0, 12.0, 12.0, rgb(200, 200, 230));
    }
}

fn conf() -> Conf {
    window("Fireworks (Kindling reference)")
}

#[macroquad::main(conf)]
async fn main() {
    let glow = Glow::new();
    let mut show = Show { sparks: Particles::new(5000), trails: Particles::new(2000), rockets: Vec::new(), autoplay: true, timer: 0.0, launched: 0 };
    let mut stepper = FixedStep::new(1.0 / 60.0);
    let mut capture = Capture::from_env();
    loop {
        if is_key_pressed(KeyCode::Escape) {
            break;
        }
        if is_key_pressed(KeyCode::A) {
            show.autoplay = !show.autoplay;
        }
        if is_key_pressed(KeyCode::Space) {
            show.launch(None);
        }
        if is_mouse_button_pressed(MouseButton::Left) {
            show.launch(Some(mouse_position().0 / screen_width() * WIDTH));
        }
        for _ in 0..stepper.advance(capture.frame_seconds()) {
            show.update(stepper.step_seconds);
        }
        show.draw(&glow);
        capture.end_frame();
        next_frame().await;
    }
}
