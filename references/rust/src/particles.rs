//! Particles (JavaScript twin: engine/2d/particles.js): a Vec of small structs, updated
//! in one loop and removed with `retain` when they die.

/// A tiny random number generator (xorshift) so the library needs no dependencies.
pub struct Random(u64);

impl Random {
    pub fn new(seed: u64) -> Self {
        Self(seed.max(1))
    }

    /// 0.0 ..< 1.0
    pub fn unit(&mut self) -> f32 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 >> 40) as f32 / (1u64 << 24) as f32
    }

    pub fn range(&mut self, low: f32, high: f32) -> f32 {
        low + (high - low) * self.unit()
    }
}

#[derive(Clone, Copy)]
pub struct Particle {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub life: f32,
    pub max_life: f32,
    pub size: f32,
    pub color: [f32; 3],
    pub gravity: f32,
    pub drag: f32,
}

impl Particle {
    pub fn fraction_left(&self) -> f32 {
        self.life / self.max_life
    }
}

/// Settings for one burst. Use struct update syntax: `Burst { count: 20, ..Burst::default() }`.
#[derive(Clone)]
pub struct Burst {
    pub count: usize,
    pub speed: (f32, f32),
    pub life: (f32, f32),
    pub size: (f32, f32),
    pub colors: Vec<[f32; 3]>,
    pub gravity: f32,
    pub drag: f32,
    pub angle: f32,
    pub spread: f32,
}

impl Default for Burst {
    fn default() -> Self {
        Self { count: 20, speed: (40.0, 120.0), life: (0.3, 0.8), size: (1.0, 3.0),
               colors: vec![[1.0, 0.85, 0.5]], gravity: 0.0, drag: 2.0,
               angle: 0.0, spread: std::f32::consts::TAU }
    }
}

pub struct Particles {
    pub list: Vec<Particle>,
    pub limit: usize,
    random: Random,
}

impl Particles {
    pub fn new(limit: usize) -> Self {
        Self { list: Vec::with_capacity(limit), limit, random: Random::new(0x9E3779B97F4A7C15) }
    }

    pub fn burst(&mut self, x: f32, y: f32, settings: &Burst) {
        for _ in 0..settings.count {
            if self.list.len() >= self.limit {
                break;
            }
            let r = &mut self.random;
            let direction = settings.angle + r.range(-settings.spread / 2.0, settings.spread / 2.0);
            let power = r.range(settings.speed.0, settings.speed.1);
            let life = r.range(settings.life.0, settings.life.1);
            let color = settings.colors[(r.unit() * settings.colors.len() as f32) as usize % settings.colors.len()];
            self.list.push(Particle {
                x, y, vx: direction.cos() * power, vy: direction.sin() * power,
                life, max_life: life, size: r.range(settings.size.0, settings.size.1),
                color, gravity: settings.gravity, drag: settings.drag,
            });
        }
    }

    pub fn update(&mut self, seconds: f32) {
        for particle in &mut self.list {
            particle.life -= seconds;
            let slow = (1.0 - particle.drag * seconds).max(0.0);
            particle.vx *= slow;
            particle.vy = particle.vy * slow + particle.gravity * seconds;
            particle.x += particle.vx * seconds;
            particle.y += particle.vy * seconds;
        }
        self.list.retain(|particle| particle.life > 0.0);
    }

    pub fn random(&mut self) -> &mut Random {
        &mut self.random
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn particles_die() {
        let mut particles = Particles::new(100);
        particles.burst(0.0, 0.0, &Burst { count: 20, life: (0.1, 0.2), ..Burst::default() });
        assert_eq!(particles.list.len(), 20);
        for _ in 0..20 {
            particles.update(1.0 / 60.0);
        }
        assert!(particles.list.is_empty());
    }

    #[test]
    fn random_stays_in_range() {
        let mut random = Random::new(7);
        assert!((0..1000).all(|_| { let n = random.unit(); (0.0..1.0).contains(&n) }));
    }
}
