"""
games/neon_arena.py   (JavaScript twin: samples/2d/05-top-down-shooter)
WHAT: A top-down arena shooter: move, aim with the mouse, survive waves of drifting shapes.
WHY:  Shows twin-stick movement, aiming with atan2, object pools as plain lists, circle
      collision, enemy steering, hit-stop (a tiny pause on big hits), screen shake, and a
      neon look made only from additive glows.
RUN:  cd ~/projects/kindling/references/python && python -m games.neon_arena
KEYS: WASD or arrows move, aim with the mouse, hold the left button or Space to fire,
      R restarts, Esc quits. Without a mouse, Space fires at the nearest enemy.
"""

import math
import random

import pygame

from kindling_ref import fx
from kindling_ref.app import App
from kindling_ref.camera import Camera
from kindling_ref.collision import circles_overlap
from kindling_ref.easing import clamp, damp
from kindling_ref.particles import ParticleSystem

WIDTH, HEIGHT = 320, 180
ARENA = pygame.Rect(8, 8, WIDTH - 16, HEIGHT - 16)
PLAYER_SPEED = 110
FIRE_SECONDS = 0.09
BULLET_SPEED = 330
PINK, CYAN, LIME, GOLD = (255, 70, 170), (70, 220, 255), (150, 255, 110), (255, 200, 80)


class Arena:
    def __init__(self, app):
        self.app = app
        self.camera = Camera(WIDTH, HEIGHT)
        self.particles = ParticleSystem(limit=2500)
        self.restart()

    def restart(self):
        self.x, self.y = WIDTH / 2, HEIGHT / 2
        self.velocity_x = self.velocity_y = 0.0
        self.aim = 0.0
        self.bullets = []      # [x, y, vx, vy, life]
        self.enemies = []      # dicts, see spawn()
        self.fire_timer = 0.0
        self.wave = 0
        self.wave_timer = 1.0
        self.score = 0
        self.health = 3
        self.invulnerable = 0.0
        self.hit_stop = 0.0
        self.time = 0.0
        self.game_over = False
        self.mouse_used = False

    def update(self, seconds):
        app, actions = self.app, self.app.actions
        if actions.was_pressed("restart"):
            self.restart()
        self.time += seconds
        self.particles.update(seconds)
        self.camera.update(seconds)
        if self.game_over:
            return
        # Hit-stop: freeze the action for a few frames so a big hit feels heavy.
        if self.hit_stop > 0:
            self.hit_stop -= seconds
            return

        move_x = actions.axis("left", "right")
        move_y = actions.axis("up", "down")
        length = math.hypot(move_x, move_y) or 1
        self.velocity_x = damp(self.velocity_x, move_x / length * PLAYER_SPEED, 0.0005, seconds)
        self.velocity_y = damp(self.velocity_y, move_y / length * PLAYER_SPEED, 0.0005, seconds)
        self.x = clamp(self.x + self.velocity_x * seconds, ARENA.left + 4, ARENA.right - 4)
        self.y = clamp(self.y + self.velocity_y * seconds, ARENA.top + 4, ARENA.bottom - 4)
        if abs(self.velocity_x) + abs(self.velocity_y) > 30 and random.random() < 0.5:
            self.particles.burst(self.x, self.y, 1, speed=(5, 20), life=(0.2, 0.4), colors=(CYAN,), drag=4)

        if app.mouse_pressed or pygame.mouse.get_rel() != (0, 0):
            self.mouse_used = True
        if self.mouse_used:
            self.aim = math.atan2(app.mouse[1] - self.y, app.mouse[0] - self.x)
        elif self.enemies:
            nearest = min(self.enemies, key=lambda e: (e["x"] - self.x) ** 2 + (e["y"] - self.y) ** 2)
            self.aim = math.atan2(nearest["y"] - self.y, nearest["x"] - self.x)

        self.fire_timer -= seconds
        if (1 in app.mouse_held or actions.is_down("fire")) and self.fire_timer <= 0:
            self.fire_timer = FIRE_SECONDS
            wobble = random.uniform(-0.05, 0.05)
            direction = self.aim + wobble
            self.bullets.append([self.x, self.y, math.cos(direction) * BULLET_SPEED,
                                 math.sin(direction) * BULLET_SPEED, 1.2])
            self.particles.burst(self.x + math.cos(self.aim) * 6, self.y + math.sin(self.aim) * 6, 3,
                                 speed=(30, 80), life=(0.05, 0.15), colors=(GOLD,), angle=self.aim, spread=0.8)
            self.camera.add_trauma(0.03)

        for bullet in self.bullets:
            bullet[0] += bullet[2] * seconds
            bullet[1] += bullet[3] * seconds
            bullet[4] -= seconds
        self.bullets = [b for b in self.bullets if b[4] > 0 and ARENA.collidepoint(b[0], b[1])]

        self.update_waves(seconds)
        self.update_enemies(seconds)
        self.invulnerable -= seconds

    def update_waves(self, seconds):
        if self.enemies:
            return
        self.wave_timer -= seconds
        if self.wave_timer <= 0:
            self.wave += 1
            for _ in range(3 + self.wave * 2):
                self.spawn()
            self.wave_timer = 1.5

    def spawn(self):
        side = random.choice("tblr")
        x = random.uniform(ARENA.left, ARENA.right) if side in "tb" else (ARENA.left if side == "l" else ARENA.right)
        y = random.uniform(ARENA.top, ARENA.bottom) if side in "lr" else (ARENA.top if side == "t" else ARENA.bottom)
        kind = random.choice(("chaser", "chaser", "drifter")) if self.wave > 1 else "chaser"
        self.enemies.append({"x": x, "y": y, "vx": 0.0, "vy": 0.0, "kind": kind,
                             "radius": 5 if kind == "chaser" else 7, "health": 2 if kind == "chaser" else 4,
                             "flash": 0.0, "spin": random.uniform(0, math.tau),
                             "speed": random.uniform(35, 55) + self.wave * 3})

    def update_enemies(self, seconds):
        for enemy in self.enemies:
            # Steering: turn velocity toward "straight at the player" a little each step.
            angle = math.atan2(self.y - enemy["y"], self.x - enemy["x"])
            if enemy["kind"] == "drifter":
                angle += math.sin(self.time * 2 + enemy["spin"]) * 0.9
            enemy["vx"] = damp(enemy["vx"], math.cos(angle) * enemy["speed"], 0.1, seconds)
            enemy["vy"] = damp(enemy["vy"], math.sin(angle) * enemy["speed"], 0.1, seconds)
            enemy["x"] += enemy["vx"] * seconds
            enemy["y"] += enemy["vy"] * seconds
            enemy["spin"] += seconds * 3
            enemy["flash"] -= seconds
            for bullet in self.bullets:
                if bullet[4] > 0 and circles_overlap(bullet[0], bullet[1], 2, enemy["x"], enemy["y"], enemy["radius"]):
                    bullet[4] = 0
                    enemy["health"] -= 1
                    enemy["flash"] = 0.08
                    enemy["vx"] += bullet[2] * 0.15
                    enemy["vy"] += bullet[3] * 0.15
            if self.invulnerable <= 0 and circles_overlap(self.x, self.y, 4, enemy["x"], enemy["y"], enemy["radius"]):
                self.hurt()
        for enemy in [e for e in self.enemies if e["health"] <= 0]:
            color = PINK if enemy["kind"] == "chaser" else LIME
            self.particles.burst(enemy["x"], enemy["y"], 26, speed=(40, 170), life=(0.3, 0.8),
                                 size=(1, 3), colors=(color, (255, 255, 255)), drag=2.5)
            self.score += 10 * self.wave
            self.camera.add_trauma(0.12)
            self.hit_stop = 0.03
        self.enemies = [e for e in self.enemies if e["health"] > 0]

    def hurt(self):
        self.health -= 1
        self.invulnerable = 1.2
        self.camera.add_trauma(0.7)
        self.hit_stop = 0.12
        self.particles.burst(self.x, self.y, 50, speed=(60, 220), life=(0.4, 1.0), colors=(CYAN, (255, 255, 255)))
        if self.health <= 0:
            self.game_over = True

    def draw(self, screen, alpha):
        ox, oy = -self.camera.shake_x, -self.camera.shake_y
        screen.blit(fx.vertical_gradient(WIDTH, HEIGHT, (8, 8, 22), (22, 10, 34)), (0, 0))
        # A faint grid that pulses gives the floor depth and rhythm.
        pulse = 0.5 + 0.5 * math.sin(self.time * 2)
        grid_color = (22 + round(10 * pulse), 24, 52 + round(16 * pulse))
        for x in range(ARENA.left, ARENA.right + 1, 16):
            pygame.draw.line(screen, grid_color, (x - ox, ARENA.top - oy), (x - ox, ARENA.bottom - oy))
        for y in range(ARENA.top, ARENA.bottom + 1, 16):
            pygame.draw.line(screen, grid_color, (ARENA.left - ox, y - oy), (ARENA.right - ox, y - oy))
        pygame.draw.rect(screen, (90, 60, 160), ARENA.move(-ox, -oy), 1)

        for enemy in self.enemies:
            color = (255, 255, 255) if enemy["flash"] > 0 else (PINK if enemy["kind"] == "chaser" else LIME)
            x, y = enemy["x"] - ox, enemy["y"] - oy
            fx.add_glow(screen, x, y, enemy["radius"] * 3, color, 0.7)
            sides = 3 if enemy["kind"] == "chaser" else 4
            points = [(x + math.cos(enemy["spin"] + i * math.tau / sides) * enemy["radius"],
                       y + math.sin(enemy["spin"] + i * math.tau / sides) * enemy["radius"]) for i in range(sides)]
            pygame.draw.polygon(screen, color, points, 1)
        for bullet in self.bullets:
            fx.add_glow(screen, bullet[0] - ox, bullet[1] - oy, 6, GOLD, 0.9)
            tail = (bullet[0] - bullet[2] * 0.02 - ox, bullet[1] - bullet[3] * 0.02 - oy)
            pygame.draw.line(screen, (255, 240, 200), tail, (bullet[0] - ox, bullet[1] - oy))

        if not self.game_over and (self.invulnerable <= 0 or int(self.time * 20) % 2 == 0):
            x, y = self.x - ox, self.y - oy
            fx.add_glow(screen, x, y, 18, CYAN, 0.8)
            tip = (x + math.cos(self.aim) * 7, y + math.sin(self.aim) * 7)
            left = (x + math.cos(self.aim + 2.5) * 5, y + math.sin(self.aim + 2.5) * 5)
            right = (x + math.cos(self.aim - 2.5) * 5, y + math.sin(self.aim - 2.5) * 5)
            pygame.draw.polygon(screen, (220, 250, 255), [tip, left, right])
        fx.draw_particles(screen, self.particles.particles, (-ox, -oy), glow_size=2.5)
        screen.blit(fx.vignette(WIDTH, HEIGHT), (0, 0))

        fx.text(screen, f"SCORE {self.score}", (12, 12), 14, GOLD)
        fx.text(screen, f"WAVE {self.wave}", (WIDTH - 54, 12), 14, (200, 180, 255))
        for i in range(self.health):
            fx.add_glow(screen, 16 + i * 10, HEIGHT - 16, 6, CYAN)
        if self.game_over:
            fx.text(screen, "GAME OVER", (WIDTH / 2, HEIGHT / 2 - 8), 26, PINK, center=True)
            fx.text(screen, "R to try again", (WIDTH / 2, HEIGHT / 2 + 12), 12, center=True)


BINDINGS = {
    "left": [pygame.K_LEFT, pygame.K_a],
    "right": [pygame.K_RIGHT, pygame.K_d],
    "up": [pygame.K_UP, pygame.K_w],
    "down": [pygame.K_DOWN, pygame.K_s],
    "fire": [pygame.K_SPACE],
    "restart": [pygame.K_r],
}


def main(max_frames=None, script=None, screenshot=None):
    app = App("Neon arena (Kindling reference)", WIDTH, HEIGHT, scale=4, bindings=BINDINGS)
    scene = Arena(app)
    app.run(scene, max_frames=max_frames, script=script, screenshot=screenshot)
    return scene


if __name__ == "__main__":
    main()
