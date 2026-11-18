"""
kindling_ref/particles.py   (JavaScript twin: engine/2d/particles.js)
WHAT: Lots of tiny short-lived dots: sparks, dust, smoke, fireworks.
WHY:  Particles are the cheapest way to make hits, jumps and pickups feel good.
      Stored as plain lists of numbers, updated in one loop, removed when they die.
"""

import math
import random


class Particle:
    __slots__ = ("x", "y", "vx", "vy", "life", "max_life", "size", "color", "gravity", "drag")

    def __init__(self, x, y, vx, vy, life, size, color, gravity, drag):
        self.x, self.y, self.vx, self.vy = x, y, vx, vy
        self.life = self.max_life = life
        self.size, self.color, self.gravity, self.drag = size, color, gravity, drag

    @property
    def fraction_left(self):
        return self.life / self.max_life


class ParticleSystem:
    def __init__(self, limit=3000):
        self.particles = []
        self.limit = limit

    def burst(self, x, y, count, speed=(40, 120), life=(0.3, 0.8), size=(1, 3),
              colors=((255, 220, 120),), gravity=0.0, drag=2.0, angle=None, spread=math.tau):
        for _ in range(count):
            if len(self.particles) >= self.limit:
                break
            direction = (angle if angle is not None else 0.0) + random.uniform(-spread / 2, spread / 2)
            power = random.uniform(*speed)
            self.particles.append(Particle(
                x, y, math.cos(direction) * power, math.sin(direction) * power,
                random.uniform(*life), random.uniform(*size), random.choice(colors), gravity, drag))

    def update(self, seconds):
        alive = []
        for particle in self.particles:
            particle.life -= seconds
            if particle.life <= 0:
                continue
            slow = max(0.0, 1 - particle.drag * seconds)
            particle.vx *= slow
            particle.vy = particle.vy * slow + particle.gravity * seconds
            particle.x += particle.vx * seconds
            particle.y += particle.vy * seconds
            alive.append(particle)
        self.particles = alive

    def __len__(self):
        return len(self.particles)
