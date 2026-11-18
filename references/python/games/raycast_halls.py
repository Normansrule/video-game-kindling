"""
games/raycast_halls.py   (JavaScript twin: samples/3d/03-raycaster-maze, viz/11-raycaster)
WHAT: A first-person walk through glowing halls, drawn with a DDA raycaster: one ray per
      screen column, walls shaded by distance and side, plus floating light orbs to collect.
WHY:  A 3D-looking world with no 3D library. Also shows billboards (flat sprites that
      always face you) sorted against walls with a depth buffer: one distance per column.
RUN:  cd ~/projects/kindling/references/python && python -m games.raycast_halls
KEYS: W/S or Up/Down walk, A/D strafe, Left/Right or Q/E turn, M toggles the map, Esc quits.
"""

import math

import pygame

from kindling_ref import fx
from kindling_ref.app import App
from kindling_ref.raycast import cast_view, move_in_grid

WIDTH, HEIGHT = 320, 180
COLUMNS = 160                 # rays; each one draws a 2-pixel-wide stripe
FIELD_OF_VIEW = math.radians(70)
MAP = [
    "################",
    "#......#.......#",
    "#.##...#..###..#",
    "#.#....2...#...#",
    "#.#.####...#.#.#",
    "#......#.....#.#",
    "###.##.#####.#.#",
    "#...#........#.#",
    "#.#.#.3333.###.#",
    "#.#...3..3.....#",
    "#.#####..3.#####",
    "#..............#",
    "################",
]
WALL_COLORS = {"#": (110, 90, 200), "2": (230, 90, 160), "3": (70, 200, 220)}
FOG = (14, 8, 30)
ORB = (255, 200, 90)


class Halls:
    def __init__(self, app):
        self.app = app
        self.x, self.y, self.angle = 1.5, 11.5, -0.25
        self.orbs = [(4.5, 1.5), (14.5, 1.5), (5.5, 7.5), (8.0, 9.5), (14.5, 11.5), (1.5, 1.5), (9.5, 3.5), (11.5, 11.5)]
        self.collected = 0
        self.show_map = True
        self.time = 0.0
        self.bob = 0.0
        self.flash = 0.0

    def update(self, seconds):
        actions = self.app.actions
        self.time += seconds
        if actions.was_pressed("map"):
            self.show_map = not self.show_map
        self.angle += actions.axis("turn_left", "turn_right") * 2.4 * seconds
        forward = actions.axis("back", "forward")
        side = actions.axis("left", "right")
        speed = 2.6 * seconds
        delta_x = (math.cos(self.angle) * forward - math.sin(self.angle) * side) * speed
        delta_y = (math.sin(self.angle) * forward + math.cos(self.angle) * side) * speed
        if forward or side:
            self.bob += seconds * 9
        self.x, self.y = move_in_grid(MAP, self.x, self.y, delta_x, delta_y)
        for orb in list(self.orbs):
            if math.hypot(orb[0] - self.x, orb[1] - self.y) < 0.45:
                self.orbs.remove(orb)
                self.collected += 1
                self.flash = 0.35
        self.flash = max(0.0, self.flash - seconds)

    def draw(self, screen, alpha):
        horizon = HEIGHT / 2 + math.sin(self.bob) * 1.5
        screen.blit(fx.vertical_gradient(WIDTH, HEIGHT // 2 + 2, (30, 14, 60), FOG), (0, 0))
        floor = fx.vertical_gradient(WIDTH, HEIGHT // 2 + 2, FOG, (40, 26, 50))
        screen.blit(floor, (0, round(horizon) - 1))

        hits = cast_view(MAP, self.x, self.y, self.angle, FIELD_OF_VIEW, COLUMNS)
        stripe = WIDTH / COLUMNS
        depth = []
        for index, hit in enumerate(hits):
            if hit is None:
                depth.append(math.inf)
                continue
            distance, wall, side, texture_u = hit
            depth.append(distance)
            wall_height = HEIGHT / max(distance, 0.05)
            top = horizon - wall_height / 2
            # Light falls off with distance; "y" faces get a little less (fake sun).
            light = max(0.0, 1 - distance / 9) * (0.75 if side == "y" else 1.0)
            # A bright seam near each cell edge and a band in the middle read as panels.
            seam = 1.35 if texture_u < 0.06 or texture_u > 0.94 else 1.0
            base = WALL_COLORS.get(wall, (150, 150, 150))
            color = [round(min(255, FOG[i] + (base[i] * seam - FOG[i]) * light)) for i in range(3)]
            screen.fill(color, (round(index * stripe), round(top), math.ceil(stripe), round(wall_height)))
            band_y = top + wall_height * 0.62
            glow_color = [round(c * 0.5 * light) for c in base]
            screen.fill(glow_color, (round(index * stripe), round(band_y), math.ceil(stripe), max(1, round(wall_height * 0.04))),
                        special_flags=pygame.BLEND_ADD)

        self.draw_orbs(screen, depth, horizon)
        screen.blit(fx.vignette(WIDTH, HEIGHT, 170), (0, 0))
        if self.flash > 0:
            screen.fill([round(c * self.flash) for c in ORB], special_flags=pygame.BLEND_ADD)
        if self.show_map:
            self.draw_map(screen, hits)
        message = "All lights found!" if not self.orbs else f"LIGHTS {self.collected}/{self.collected + len(self.orbs)}"
        fx.text(screen, message, (WIDTH - 8 - len(message) * 6, 6), 14, ORB)

    def draw_orbs(self, screen, depth, horizon):
        half_width = math.tan(FIELD_OF_VIEW / 2)
        visible = []
        for orb_x, orb_y in self.orbs:
            dx, dy = orb_x - self.x, orb_y - self.y
            # Turn the orb's position into camera space: forward distance and sideways offset.
            forward = dx * math.cos(self.angle) + dy * math.sin(self.angle)
            sideways = -dx * math.sin(self.angle) + dy * math.cos(self.angle)
            if forward > 0.1:
                visible.append((forward, sideways))
        for forward, sideways in sorted(visible, reverse=True):   # far to near
            screen_x = (sideways / (forward * half_width) + 1) / 2 * WIDTH
            size = HEIGHT / forward * 0.5
            column = int(screen_x / (WIDTH / COLUMNS))
            if 0 <= column < COLUMNS and depth[column] < forward:
                continue   # hidden behind a wall
            float_y = horizon + math.sin(self.time * 3 + sideways) * size * 0.3
            fx.add_glow(screen, screen_x, float_y, size * 1.6, ORB, max(0.2, 1 - forward / 10))
            pygame.draw.circle(screen, (255, 245, 220), (round(screen_x), round(float_y)), max(1, round(size * 0.18)))

    def draw_map(self, screen, hits):
        cell = 4
        left, top = 6, 6
        for row, line in enumerate(MAP):
            for column, character in enumerate(line):
                if character != ".":
                    color = [c // 2 for c in WALL_COLORS.get(character, (120, 120, 120))]
                    screen.fill(color, (left + column * cell, top + row * cell, cell, cell))
        player = (left + self.x * cell, top + self.y * cell)
        for index in range(0, COLUMNS, 8):
            hit = hits[index]
            if hit is None:
                continue
            ray_angle = self.angle + math.atan((2 * (index + 0.5) / COLUMNS - 1) * math.tan(FIELD_OF_VIEW / 2))
            raw = hit[0] / math.cos(ray_angle - self.angle)
            end = (player[0] + math.cos(ray_angle) * raw * cell, player[1] + math.sin(ray_angle) * raw * cell)
            pygame.draw.line(screen, (170, 130, 60), player, end)
        for orb_x, orb_y in self.orbs:
            screen.fill(ORB, (left + orb_x * cell - 1, top + orb_y * cell - 1, 2, 2))
        pygame.draw.circle(screen, (255, 255, 255), (round(player[0]), round(player[1])), 2)


BINDINGS = {
    "forward": [pygame.K_w, pygame.K_UP],
    "back": [pygame.K_s, pygame.K_DOWN],
    "left": [pygame.K_a],
    "right": [pygame.K_d],
    "turn_left": [pygame.K_LEFT, pygame.K_q],
    "turn_right": [pygame.K_RIGHT, pygame.K_e],
    "map": [pygame.K_m],
}


def main(max_frames=None, script=None, screenshot=None):
    app = App("Raycast halls (Kindling reference)", WIDTH, HEIGHT, scale=4, bindings=BINDINGS)
    scene = Halls(app)
    app.run(scene, max_frames=max_frames, script=script, screenshot=screenshot)
    return scene


if __name__ == "__main__":
    main()
