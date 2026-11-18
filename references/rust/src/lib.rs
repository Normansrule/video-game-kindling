//! references/rust/src/lib.rs
//! WHAT: Kindling's engine ideas in plain Rust (standard library only): a fixed timestep,
//!       named input actions, easing, box collision through a tilemap, a damped camera
//!       with shake, particles, and a DDA raycaster.
//! WHY:  The game examples use macroquad for windows and drawing, but none of this logic
//!       depends on it, so it is easy to test (`cargo test`) and to reuse with Bevy, ggez,
//!       or a server.
//! DOC:  references/rust/README.md

pub mod actions;
pub mod camera;
pub mod collision;
pub mod easing;
pub mod fixed_step;
pub mod particles;
pub mod raycast;
pub mod tilemap;
