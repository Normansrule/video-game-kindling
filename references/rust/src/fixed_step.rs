//! Fixed timestep (JavaScript twin: engine/core/loop.js).
//! Returns how many equal steps to run this frame, instead of taking a closure, so the
//! caller can borrow its game state mutably inside an ordinary `for` loop.

pub struct FixedStep {
    pub step_seconds: f32,
    pub max_frame_seconds: f32,
    accumulator: f32,
}

impl FixedStep {
    pub fn new(step_seconds: f32) -> Self {
        Self { step_seconds, max_frame_seconds: 0.25, accumulator: 0.0 }
    }

    /// Feed in real frame time; returns the number of steps to run now.
    pub fn advance(&mut self, frame_seconds: f32) -> u32 {
        // Clamp, so a long freeze doesn't cause hundreds of catch-up steps.
        self.accumulator += frame_seconds.min(self.max_frame_seconds);
        let mut steps = 0;
        while self.accumulator >= self.step_seconds {
            self.accumulator -= self.step_seconds;
            steps += 1;
        }
        steps
    }

    /// 0..1: how far we are between the last step and the next (for smooth drawing).
    pub fn alpha(&self) -> f32 {
        self.accumulator / self.step_seconds
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runs_whole_steps_and_keeps_the_rest() {
        let mut stepper = FixedStep::new(0.1);
        assert_eq!(stepper.advance(0.25), 2);
        assert!((stepper.alpha() - 0.5).abs() < 1e-4);
    }

    #[test]
    fn clamps_long_frames() {
        let mut stepper = FixedStep::new(1.0 / 60.0);
        assert_eq!(stepper.advance(10.0), 15);
    }
}
