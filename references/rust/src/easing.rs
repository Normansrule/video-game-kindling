//! Number helpers (JavaScript twin: engine/math/easing.js, engine/math/scalar.js).

pub fn lerp(start: f32, end: f32, amount: f32) -> f32 {
    start + (end - start) * amount
}

/// Frame-rate-independent smoothing: `smoothing` is how much of the gap is left after
/// one second (0.001 snappy, 0.5 lazy).
pub fn damp(current: f32, target: f32, smoothing: f32, seconds: f32) -> f32 {
    lerp(current, target, 1.0 - smoothing.powf(seconds))
}

/// Move toward target by at most `step`.
pub fn approach(current: f32, target: f32, step: f32) -> f32 {
    if current < target { (current + step).min(target) } else { (current - step).max(target) }
}

pub fn ease_out_back(t: f32) -> f32 {
    let c1 = 1.70158;
    let c3 = c1 + 1.0;
    1.0 + c3 * (t - 1.0).powi(3) + c1 * (t - 1.0).powi(2)
}

pub fn ease_in_out_sine(t: f32) -> f32 {
    -((std::f32::consts::PI * t).cos() - 1.0) / 2.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn damp_does_not_depend_on_frame_rate() {
        let once = damp(0.0, 100.0, 0.01, 1.0);
        let mut many = 0.0;
        for _ in 0..60 {
            many = damp(many, 100.0, 0.01, 1.0 / 60.0);
        }
        assert!((once - many).abs() < 1e-2);
    }

    #[test]
    fn approach_stops_at_target() {
        assert_eq!(approach(9.0, 10.0, 3.0), 10.0);
        assert_eq!(approach(0.0, -10.0, 3.0), -3.0);
        assert!((ease_out_back(1.0) - 1.0).abs() < 1e-6);
    }
}
