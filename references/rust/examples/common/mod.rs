//! examples/common/mod.rs
//! WHAT: Drawing and window helpers shared by the macroquad examples: a pixel-sized 2D
//!       camera, additive glows, gradients, and a headless "capture" mode.
//! WHY:  Keeps each example about its game. Every example includes this file with
//!       `mod common;`, so there is nothing to install beyond macroquad.
//! Capture mode (used to make the screenshots and to smoke-test the examples):
//!   KINDLING_FRAMES=240 KINDLING_SHOT=shot.png cargo run --example neon_platformer
//! runs 240 fixed frames with the built-in autopilot, saves a PNG and exits.

#![allow(dead_code)]

use macroquad::miniquad::{BlendFactor, BlendState, BlendValue, Equation, PipelineParams};
use macroquad::models::{Mesh, Vertex};
use macroquad::prelude::*;

/// A camera that shows `width x height` game pixels, whatever the window size.
/// (The negative height flips y so it points down, like Canvas 2D.)
pub fn pixel_camera(x: f32, y: f32, width: f32, height: f32) -> Camera2D {
    Camera2D::from_display_rect(Rect::new(x, y + height, width, -height))
}

const GLOW_VERTEX: &str = r#"#version 100
attribute vec3 position;
attribute vec2 texcoord;
attribute vec4 color0;
varying lowp vec2 uv;
varying lowp vec4 color;
uniform mat4 Model;
uniform mat4 Projection;
void main() {
    gl_Position = Projection * Model * vec4(position, 1);
    color = color0 / 255.0;
    uv = texcoord;
}"#;

const GLOW_FRAGMENT: &str = r#"#version 100
varying lowp vec4 color;
varying lowp vec2 uv;
uniform sampler2D Texture;
void main() {
    gl_FragColor = color * texture2D(Texture, uv);
}"#;

/// Soft round lights drawn with additive blending: overlapping glows add up and get
/// brighter, like real light. That one blend setting is most of a neon look.
pub struct Glow {
    texture: Texture2D,
    material: Material,
}

impl Glow {
    pub fn new() -> Self {
        let size = 64u16;
        let mut image = Image::gen_image_color(size, size, Color::new(0.0, 0.0, 0.0, 0.0));
        for y in 0..size as u32 {
            for x in 0..size as u32 {
                let dx = (x as f32 + 0.5) / size as f32 * 2.0 - 1.0;
                let dy = (y as f32 + 0.5) / size as f32 * 2.0 - 1.0;
                let falloff = (1.0 - (dx * dx + dy * dy).sqrt()).max(0.0).powi(2);
                image.set_pixel(x, y, Color::new(1.0, 1.0, 1.0, falloff));
            }
        }
        let texture = Texture2D::from_image(&image);
        let material = load_material(
            ShaderSource::Glsl { vertex: GLOW_VERTEX, fragment: GLOW_FRAGMENT },
            MaterialParams {
                pipeline_params: PipelineParams {
                    color_blend: Some(BlendState::new(
                        Equation::Add,
                        BlendFactor::Value(BlendValue::SourceAlpha),
                        BlendFactor::One,
                    )),
                    ..Default::default()
                },
                ..Default::default()
            },
        )
        .expect("glow shader");
        Self { texture, material }
    }

    /// Call `begin`, draw any number of glows, then `end`.
    pub fn begin(&self) {
        gl_use_material(&self.material);
    }

    pub fn end(&self) {
        gl_use_default_material();
    }

    pub fn draw(&self, x: f32, y: f32, radius: f32, color: Color, strength: f32) {
        let tint = Color::new(color.r, color.g, color.b, strength.clamp(0.0, 1.0));
        draw_texture_ex(&self.texture, x - radius, y - radius, tint, DrawTextureParams {
            dest_size: Some(vec2(radius * 2.0, radius * 2.0)),
            ..Default::default()
        });
    }
}

/// A rectangle that fades from `top` to `bottom` (one mesh, colors blended by the GPU).
pub fn vertical_gradient(x: f32, y: f32, width: f32, height: f32, top: Color, bottom: Color) {
    gradient_at_depth(x, y, width, height, top, bottom, 0.0);
}

/// The same, but pushed to the very back of the depth buffer, so a 3D scene drawn
/// afterwards is never hidden behind it (use it for skies).
pub fn sky_gradient(x: f32, y: f32, width: f32, height: f32, top: Color, bottom: Color) {
    gradient_at_depth(x, y, width, height, top, bottom, SKY_DEPTH);
}

const SKY_DEPTH: f32 = -0.999;

fn gradient_at_depth(x: f32, y: f32, width: f32, height: f32, top: Color, bottom: Color, z: f32) {
    let mesh = Mesh {
        vertices: vec![
            Vertex::new(x, y, z, 0.0, 0.0, top),
            Vertex::new(x + width, y, z, 1.0, 0.0, top),
            Vertex::new(x + width, y + height, z, 1.0, 1.0, bottom),
            Vertex::new(x, y + height, z, 0.0, 1.0, bottom),
        ],
        indices: vec![0, 1, 2, 0, 2, 3],
        texture: None,
    };
    draw_mesh(&mesh);
}

pub fn rgb(red: u8, green: u8, blue: u8) -> Color {
    Color::from_rgba(red, green, blue, 255)
}

pub fn from_array(color: [f32; 3]) -> Color {
    Color::new(color[0], color[1], color[2], 1.0)
}

/// Headless capture: fixed frame time, an autopilot flag, and a screenshot at the end.
pub struct Capture {
    frames: Option<u32>,
    path: Option<String>,
    pub frame: u32,
}

impl Capture {
    pub fn from_env() -> Self {
        Self {
            frames: std::env::var("KINDLING_FRAMES").ok().and_then(|value| value.parse().ok()),
            path: std::env::var("KINDLING_SHOT").ok(),
            frame: 0,
        }
    }

    /// True when the game should drive itself (capture mode).
    pub fn autopilot(&self) -> bool {
        self.frames.is_some()
    }

    /// Real frame time when playing; exactly 1/60 s when capturing (repeatable runs).
    pub fn frame_seconds(&self) -> f32 {
        if self.autopilot() { 1.0 / 60.0 } else { get_frame_time() }
    }

    /// Call after drawing, before `next_frame().await`.
    pub fn end_frame(&mut self) {
        self.frame += 1;
        if let Some(frames) = self.frames {
            if self.frame >= frames {
                if let Some(path) = &self.path {
                    get_screen_data().export_png(path);
                }
                std::process::exit(0);
            }
        }
    }
}

pub fn window(title: &str) -> Conf {
    Conf {
        window_title: title.to_owned(),
        window_width: 1280,
        window_height: 720,
        high_dpi: true,
        sample_count: 4,
        ..Default::default()
    }
}
