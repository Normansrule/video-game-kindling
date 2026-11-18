"""
games/fireworks.py   (JavaScript twin: viz/08-particles)
WHAT: An interactive fireworks show: rockets rise, burst into thousands of glowing sparks,
      and leave trails. Click (or press Space) to launch your own.
WHY:  A pure particle-system showcase: emitters, gravity, drag, lifetimes, colour palettes,
      additive blending, and "afterimage" trails made by fading the last frame instead of
      clearing it.
RUN:  cd ~/projects/kindling/references/python && python -m games.fireworks
KEYS: Click or Space to launch, A toggles autoplay, Esc quits.
"""

import math
import random

import pygame

from kindling_ref import fx
from kindling_ref.app import App
from kindling_ref.particles import ParticleSystem

WIDTH, HEIGHT = 320, 180
PALETTES = [
    ((255, 90, 160), (255, 200, 230)),
    ((90, 200, 255), (220, 245, 255)),
    ((255, 190, 70), (255, 240, 190)),
    ((150, 255, 120), (230, 255, 210)),
    ((190, 120, 255), (240, 220, 255)),
]


class Fireworks:
    def __init__(self, app):
        self.app = app
        self.sparks = ParticleSystem(limit=4000)
        self.trails = ParticleSystem(limit=2000)
        self.rockets = []     # [x, y, vx, vy, fuse, palette]
        self.autoplay = True
        self.timer = 0.0
        self.time = 0.0
        self.canvas = pygame.Surface((WIDTH, HEIGHT))   # kept between frames for trails
        self.launched = 0

    def launch(self, target_x=None):
        x = target_x if target_x is not None else random.uniform(WIDTH * 0.2, WIDTH * 0.8)
        self.rockets.append([x, HEIGHT + 2, random.uniform(-12, 12), random.uniform(-185, -150),
                             random.uniform(0.75, 1.05), random.choice(PALETTES)])
        self.launched += 1

    def explode(self, x, y, palette):
        shape = random.choice(("sphere", "ring", "willow"))
        if shape == "ring":
            for i in range(60):
                angle = i / 60 * math.tau
                self.sparks.burst(x, y, 1, speed=(90, 95), life=(0.9, 1.2), size=(1, 1.5), colors=palette,
                                  gravity=40, drag=1.4, angle=angle, spread=0.01)
        elif shape == "willow":
            self.sparks.burst(x, y, 140, speed=(20, 90), life=(1.4, 2.2), size=(0.8, 1.4),
                              colors=((255, 200, 120), (255, 160, 80)), gravity=55, drag=1.0)
        else:
            self.sparks.burst(x, y, 160, speed=(10, 120), life=(0.7, 1.4), size=(0.8, 1.6), colors=palette,
                              gravity=45, drag=1.6)
        self.sparks.burst(x, y, 12, speed=(0, 20), life=(0.1, 0.25), size=(4, 6), colors=((255, 255, 255),), drag=6)

    def update(self, seconds):
        app = self.app
        self.time += seconds
        if app.actions.was_pressed("autoplay"):
            self.autoplay = not self.autoplay
        if app.actions.was_pressed("launch"):
            self.launch()
        if 1 in app.mouse_pressed:
            self.launch(app.mouse[0])
        if self.autoplay:
            self.timer -= seconds
            if self.timer <= 0:
                self.launch()
                self.timer = random.uniform(0.25, 0.8)
        for rocket in self.rockets:
            rocket[3] += 60 * seconds
            rocket[0] += rocket[2] * seconds
            rocket[1] += rocket[3] * seconds
            rocket[4] -= seconds
            self.trails.burst(rocket[0], rocket[1], 2, speed=(0, 12), life=(0.2, 0.5), size=(0.6, 1.2),
                              colors=((255, 210, 150),), gravity=20, drag=3)
            if rocket[4] <= 0:
                self.explode(rocket[0], rocket[1], rocket[5])
        self.rockets = [r for r in self.rockets if r[4] > 0]
        self.sparks.update(seconds)
        self.trails.update(seconds)

    def draw(self, screen, alpha):
        # Fade the previous frame toward the sky color instead of clearing it: trails for free.
        self.canvas.fill((22, 22, 26), special_flags=pygame.BLEND_RGB_SUB)
        fx.draw_particles(self.canvas, self.trails.particles, glow_size=2.0)
        fx.draw_particles(self.canvas, self.sparks.particles, glow_size=2.6)
        screen.blit(fx.vertical_gradient(WIDTH, HEIGHT, (6, 6, 24), (30, 14, 44)), (0, 0))
        screen.blit(self.canvas, (0, 0), special_flags=pygame.BLEND_ADD)
        # A city skyline in silhouette sells the scale.
        for index in range(22):
            building_x = index * 15
            height = 14 + (index * 37 % 23)
            pygame.draw.rect(screen, (8, 6, 16), (building_x, HEIGHT - height, 14, height))
            for window in range(3):
                if (index + window) % 3 == 0:
                    screen.fill((60, 50, 30), (building_x + 3 + window * 4, HEIGHT - height + 4, 2, 2))
        fx.text(screen, "Click or Space to launch   A: autoplay", (WIDTH / 2, 10), 12, (200, 200, 230), center=True)


BINDINGS = {"launch": [pygame.K_SPACE], "autoplay": [pygame.K_a]}


def main(max_frames=None, script=None, screenshot=None):
    app = App("Fireworks (Kindling reference)", WIDTH, HEIGHT, scale=4, bindings=BINDINGS)
    scene = Fireworks(app)
    app.run(scene, max_frames=max_frames, script=script, screenshot=screenshot)
    return scene


if __name__ == "__main__":
    main()
