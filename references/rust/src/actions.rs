//! Named input actions (JavaScript twin: engine/input/actions.js).
//! The game asks "was jump pressed?", not "was Space pressed?". A press is remembered
//! until `end_step`, so a tap shorter than one step is never lost.

use std::collections::HashSet;

#[derive(Default)]
pub struct Actions {
    held: HashSet<&'static str>,
    pressed: HashSet<&'static str>,
    released: HashSet<&'static str>,
}

impl Actions {
    /// Call once per frame for each action with whether any of its keys is down now.
    pub fn set(&mut self, name: &'static str, down: bool) {
        if down && !self.held.contains(name) {
            self.held.insert(name);
            self.pressed.insert(name);
        } else if !down && self.held.remove(name) {
            self.released.insert(name);
        }
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

    /// -1, 0 or +1 from two opposite actions.
    pub fn axis(&self, negative: &str, positive: &str) -> f32 {
        self.is_down(positive) as i32 as f32 - self.is_down(negative) as i32 as f32
    }

    pub fn end_step(&mut self) {
        self.pressed.clear();
        self.released.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn short_tap_survives_until_end_of_step() {
        let mut actions = Actions::default();
        actions.set("jump", true);
        actions.set("jump", false);
        assert!(actions.was_pressed("jump"));
        assert!(!actions.is_down("jump"));
        actions.end_step();
        assert!(!actions.was_pressed("jump"));
    }
}
