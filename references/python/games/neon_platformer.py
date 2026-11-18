"""
games/neon_platformer.py   (JavaScript twin: samples/2d/04-platformer)
WHAT: A glowing platformer: run, jump, collect embers, avoid spikes, reach the beacon.
WHY:  Shows every platformer trick in one readable file: fixed timestep, coyote time,
      jump buffering, variable jump height, axis-separated tile collision, a damped
      camera with screen shake, squash and stretch, parallax, and additive particles.
RUN:  cd ~/projects/kindling/references/python && python -m games.neon_platformer
KEYS: Left/Right or A/D to run, Space/Up/W/Z to jump (hold for higher), R restarts, Esc quits.
"""

import math
import random

import pygame

from kindling_ref import fx
from kindling_ref.app import App
from kindling_ref.camera import Camera
from kindling_ref.collision import Box, boxes_overlap, move_and_collide
from kindling_ref.easing import approach, clamp, ease_out_back
from kindling_ref.particles import ParticleSystem
from kindling_ref.tilemap import TileMap

WIDTH, HEIGHT, TILE = 320, 180, 12

LEVEL = """
#..........................................................................#
#..........................................................................#
#..........................................................................#
#.......................................o.o.o..............................#
#.....................................#########....................o.......#
#..........................o.o.................................o.......o...#
#........................#######.....................o......#####.........G#
#.................o.o.........................o.o..........................##
#...............#######...................##########.......................##
#....o.o..............o....................................................##
#..######..........#####...............o.o.o.............##########.......##
#...............................................................o..........##
#..P.......................^^^....#########.......^^^^.....................##
############....########################.....#######################..######
############....########################.....#######################..######
"""

RUN_SPEED = 95          # pixels per second
ACCELERATION = 900
FRICTION = 1100
GRAVITY = 760
JUMP_SPEED = 255
COYOTE_SECONDS = 0.1    # you can still jump this long after running off a ledge
BUFFER_SECONDS = 0.12   # a jump pressed this long before landing still counts
EMBER = (255, 170, 60)
CYAN = (80, 220, 255)


class Platformer:
    def __init__(self, app):
        self.app = app
        self.map = TileMap(LEVEL, TILE)
        self.camera = Camera(WIDTH, HEIGHT, self.map.pixel_width, self.map.pixel_height)
        self.particles = ParticleSystem()
        self.stars = [(random.uniform(0, WIDTH * 2), random.uniform(0, HEIGHT * 0.7), random.random())
                      for _ in range(70)]
        self.restart()

    def restart(self):
        column, row = self.map.find("P")[0]
        self.spawn = (column * TILE + 2, row * TILE)
        self.player = Box(self.spawn[0], self.spawn[1], 8, 11)
        self.velocity_x = 0.0
        self.velocity_y = 0.0
        self.on_ground = False
        self.coyote = 0.0
        self.buffer = 0.0
        self.squash = 1.0          # 1 = normal; <1 squashed (landing), >1 stretched (jumping)
        self.facing = 1
        self.embers = [(column * TILE + TILE / 2, row * TILE + TILE / 2) for column, row in self.map.find("o")]
        self.collected = 0
        self.total = len(self.embers)
        self.spikes = [Box(column * TILE + 1, row * TILE + 6, TILE - 2, TILE - 6) for column, row in self.map.find("^")]
        goal_column, goal_row = self.map.find("G")[0]
        self.goal = Box(goal_column * TILE, goal_row * TILE - TILE * 2, TILE, TILE * 3)
        self.won_time = None
        self.deaths = 0
        self.time = 0.0

    def is_solid(self, column, row):
        return self.map.is_solid(column, row)

    # ---------------------------------------------------------------- update (fixed step)
    def update(self, seconds):
        actions = self.app.actions
        self.time += seconds
        if actions.was_pressed("restart"):
            self.restart()
        if self.won_time is not None:
            self.particles.update(seconds)
            if random.random() < 0.3:
                self.firework(self.goal.x + random.uniform(-60, 60), self.goal.y - random.uniform(0, 40))
            return

        # Horizontal: accelerate toward the wanted speed, so starts and stops feel weighty.
        direction = actions.axis("left", "right")
        if direction:
            self.facing = direction
            self.velocity_x = approach(self.velocity_x, direction * RUN_SPEED, ACCELERATION * seconds)
        else:
            self.velocity_x = approach(self.velocity_x, 0, FRICTION * seconds)

        # Timers that make jumping forgiving.
        self.coyote = COYOTE_SECONDS if self.on_ground else self.coyote - seconds
        self.buffer = BUFFER_SECONDS if actions.was_pressed("jump") else self.buffer - seconds
        if self.buffer > 0 and self.coyote > 0:
            self.velocity_y = -JUMP_SPEED
            self.buffer = self.coyote = 0
            self.squash = 1.35
            self.dust(self.player.x + 4, self.player.y + 11, 8)
        # Let go early for a short hop: cut the rising speed.
        if actions.was_released("jump") and self.velocity_y < -80:
            self.velocity_y *= 0.45

        self.velocity_y = min(self.velocity_y + GRAVITY * seconds, 420)
        was_on_ground = self.on_ground
        hits = move_and_collide(self.player, self.velocity_x * seconds, self.velocity_y * seconds,
                                self.is_solid, TILE)
        if hits["left"] or hits["right"]:
            self.velocity_x = 0
        if hits["up"]:
            self.velocity_y = 0
        self.on_ground = hits["down"]
        if self.on_ground:
            if not was_on_ground and self.velocity_y > 200:
                self.squash = 0.65
                self.dust(self.player.x + 4, self.player.y + 11, 10)
                self.camera.add_trauma(0.15)
            self.velocity_y = 0
        if self.on_ground and abs(self.velocity_x) > 60 and random.random() < 0.25:
            self.dust(self.player.x + 4, self.player.y + 11, 1)
        self.squash += (1 - self.squash) * min(1, seconds * 12)

        center_x, center_y = self.player.center
        for ember in list(self.embers):
            if abs(ember[0] - center_x) < 9 and abs(ember[1] - center_y) < 10:
                self.embers.remove(ember)
                self.collected += 1
                self.particles.burst(ember[0], ember[1], 18, speed=(30, 110), life=(0.3, 0.7),
                                     colors=(EMBER, (255, 230, 140)), drag=3)
        for spike in self.spikes:
            if boxes_overlap(self.player, spike):
                self.die()
        if self.player.y > self.map.pixel_height + 40:
            self.die()
        if boxes_overlap(self.player, self.goal):
            self.won_time = self.time
            for _ in range(4):
                self.firework(self.goal.x, self.goal.y)

        self.particles.update(seconds)
        look_ahead = self.facing * 24
        self.camera.follow(center_x + look_ahead, center_y - 10, seconds, smoothing=0.004)
        self.camera.update(seconds)

    def die(self):
        self.deaths += 1
        self.particles.burst(*self.player.center, 40, speed=(60, 200), life=(0.4, 0.9),
                             colors=(CYAN, (255, 255, 255)), gravity=300, drag=1.5)
        self.camera.add_trauma(0.6)
        self.player.x, self.player.y = self.spawn
        self.velocity_x = self.velocity_y = 0

    def dust(self, x, y, count):
        self.particles.burst(x, y, count, speed=(10, 45), life=(0.2, 0.5), size=(1, 2),
                             colors=((120, 140, 190),), gravity=-20, angle=-math.pi / 2, spread=math.pi)

    def firework(self, x, y):
        color = random.choice((EMBER, CYAN, (255, 90, 180), (160, 255, 120)))
        self.particles.burst(x, y, 30, speed=(40, 140), life=(0.6, 1.2), colors=(color, (255, 255, 255)),
                             gravity=90, drag=1.2)

    # ---------------------------------------------------------------- draw
    def draw(self, screen, alpha):
        camera = self.camera
        screen.blit(fx.vertical_gradient(WIDTH, HEIGHT, (12, 10, 36), (60, 20, 70)), (0, 0))
        # Stars and two mountain layers move slower than the camera: parallax = depth.
        for star_x, star_y, depth in self.stars:
            x = (star_x - camera.x * 0.1 * depth) % (WIDTH * 2) - WIDTH * 0.5
            twinkle = 0.6 + 0.4 * math.sin(self.time * 3 + star_x)
            shade = round(120 + 120 * depth * twinkle)
            screen.set_at((round(x), round(star_y)), (shade, shade, min(255, shade + 30)))
        self.draw_mountains(screen, 0.25, 120, (34, 22, 66), 38)
        self.draw_mountains(screen, 0.5, 135, (50, 26, 80), 24)

        self.draw_tiles(screen)
        for x, y in self.embers:
            bob = math.sin(self.time * 4 + x) * 2
            sx, sy = camera.to_screen(x, y + bob)
            fx.add_glow(screen, sx, sy, 9, EMBER, 0.8)
            pygame.draw.circle(screen, (255, 230, 160), (sx, sy), 2)
        for spike in self.spikes:
            sx, sy = camera.to_screen(spike.x, spike.y)
            for i in range(2):
                left = sx + i * 5
                pygame.draw.polygon(screen, (230, 70, 110), [(left, sy + 6), (left + 2.5, sy - 1), (left + 5, sy + 6)])
        gx, gy = camera.to_screen(self.goal.x + TILE / 2, self.goal.y)
        pulse = 0.7 + 0.3 * math.sin(self.time * 5)
        fx.add_glow(screen, gx, gy + 10, 26, CYAN, pulse)
        pygame.draw.line(screen, (200, 250, 255), (gx, gy), (gx, gy + TILE * 3), 2)

        self.draw_player(screen)
        fx.draw_particles(screen, self.particles.particles, (camera.x - camera.shake_x, camera.y - camera.shake_y))
        screen.blit(fx.vignette(WIDTH, HEIGHT), (0, 0))
        fx.text(screen, f"EMBERS {self.collected}/{self.total}", (6, 5), 14, (255, 210, 140))
        if self.won_time is not None:
            t = clamp((self.time - self.won_time) / 0.6, 0, 1)
            size = round(10 + 18 * ease_out_back(t))
            fx.text(screen, "BEACON LIT!", (WIDTH / 2, HEIGHT / 2 - 10), size, (180, 245, 255), center=True)
            fx.text(screen, f"{self.collected}/{self.total} embers   R to play again", (WIDTH / 2, HEIGHT / 2 + 12), 12, center=True)

    def draw_mountains(self, screen, factor, base, color, height):
        offset = self.camera.x * factor
        points = [(0, HEIGHT)]
        for x in range(0, WIDTH + 9, 8):
            world = x + offset
            y = base - height * (0.5 + 0.3 * math.sin(world * 0.021) + 0.2 * math.sin(world * 0.057))
            points.append((x, y))
        points.append((WIDTH, HEIGHT))
        pygame.draw.polygon(screen, color, points)

    def draw_tiles(self, screen):
        camera = self.camera
        first_column = int(camera.x // TILE)
        first_row = int(camera.y // TILE)
        for row in range(first_row, first_row + HEIGHT // TILE + 2):
            for column in range(first_column, first_column + WIDTH // TILE + 2):
                if self.map.at(column, row) != "#" or row >= self.map.rows:
                    continue
                sx, sy = camera.to_screen(column * TILE, row * TILE)
                pygame.draw.rect(screen, (28, 24, 54), (sx, sy, TILE, TILE))
                if not self.map.is_solid(column, row - 1):
                    # Top edge glows: the "grass" of a neon world.
                    pygame.draw.rect(screen, (90, 230, 255), (sx, sy, TILE, 2))
                    screen.fill((10, 40, 50), (sx, sy + 2, TILE, 2), special_flags=pygame.BLEND_ADD)
                else:
                    pygame.draw.rect(screen, (36, 30, 66), (sx + 1, sy + 1, TILE - 2, TILE - 2), 1)

    def draw_player(self, screen):
        width = 8 / self.squash ** 0.5
        height = 11 * self.squash ** 0.5
        cx, bottom = self.player.x + 4, self.player.y + 11
        sx, sy = self.camera.to_screen(cx - width / 2, bottom - height)
        fx.add_glow(screen, sx + width / 2, sy + height / 2, 16, (60, 140, 255), 0.6)
        pygame.draw.rect(screen, (235, 245, 255), (sx, sy, round(width), round(height)), border_radius=2)
        eye_x = sx + width / 2 + self.facing * 1.5
        pygame.draw.rect(screen, (30, 40, 90), (round(eye_x - 1), round(sy + 3), 2, 3))


BINDINGS = {
    "left": [pygame.K_LEFT, pygame.K_a],
    "right": [pygame.K_RIGHT, pygame.K_d],
    "jump": [pygame.K_SPACE, pygame.K_UP, pygame.K_w, pygame.K_z],
    "restart": [pygame.K_r],
}


def main(max_frames=None, script=None, screenshot=None):
    app = App("Neon platformer (Kindling reference)", WIDTH, HEIGHT, scale=4, bindings=BINDINGS)
    scene = Platformer(app)
    app.run(scene, max_frames=max_frames, script=script, screenshot=screenshot)
    return scene


if __name__ == "__main__":
    main()
