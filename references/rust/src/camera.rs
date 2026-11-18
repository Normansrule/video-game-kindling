//! 2D camera (JavaScript twin: engine/2d/camera.js): damped follow, world bounds, and
//! trauma-based shake (shake = trauma squared, so small hits barely move the screen).

use crate::easing::damp;

pub struct Camera {
    pub x: f32,
    pub y: f32,
    pub view_width: f32,
    pub view_height: f32,
    pub world_width: f32,
    pub world_height: f32,
    pub trauma: f32,
    pub shake_x: f32,
    pub shake_y: f32,
    time: f32,
}

impl Camera {
    pub fn new(view_width: f32, view_height: f32, world_width: f32, world_height: f32) -> Self {
        Self { x: 0.0, y: 0.0, view_width, view_height, world_width, world_height,
               trauma: 0.0, shake_x: 0.0, shake_y: 0.0, time: 0.0 }
    }

    pub fn follow(&mut self, target_x: f32, target_y: f32, seconds: f32, smoothing: f32) {
        self.x = damp(self.x, target_x - self.view_width / 2.0, smoothing, seconds);
        self.y = damp(self.y, target_y - self.view_height / 2.0, smoothing, seconds);
        self.x = self.x.clamp(0.0, (self.world_width - self.view_width).max(0.0));
        self.y = self.y.clamp(0.0, (self.world_height - self.view_height).max(0.0));
    }

    pub fn add_trauma(&mut self, amount: f32) {
        self.trauma = (self.trauma + amount).min(1.0);
    }

    pub fn update(&mut self, seconds: f32, max_offset: f32) {
        self.time += seconds;
        self.trauma = (self.trauma - seconds * 1.5).max(0.0);
        let power = self.trauma * self.trauma;
        // Two sine waves at odd speeds: smooth wobble that never quite repeats.
        self.shake_x = max_offset * power * (self.time * 53.0).sin();
        self.shake_y = max_offset * power * (self.time * 41.0 + 1.3).sin();
    }

    /// Top-left of the view, including shake.
    pub fn view_x(&self) -> f32 {
        self.x - self.shake_x
    }

    pub fn view_y(&self) -> f32 {
        self.y - self.shake_y
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn follow_stays_inside_world() {
        let mut camera = Camera::new(100.0, 50.0, 300.0, 50.0);
        for _ in 0..300 {
            camera.follow(1000.0, 25.0, 1.0 / 60.0, 0.002);
        }
        assert!((camera.x - 200.0).abs() < 1e-3);
        assert_eq!(camera.y, 0.0);
    }
}
