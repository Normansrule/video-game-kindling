"""
docs/bridges/python/kindling_ideas.py
WHAT: Kindling's core ideas in plain Python (standard library only): a fixed-timestep
      loop, 2D vectors, AABB collision, "move one axis at a time" against a tilemap,
      input that remembers presses between steps, and scenes.
WHY:  The ideas are the same in every language. Seeing them twice, in JavaScript and in
      Python, makes it obvious which parts are the idea and which parts are syntax.
RUN:  cd ~/projects/kindling/docs/bridges/python && python3 -m unittest -v
DOC:  docs/bridges/python.md
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field


# --- Fixed timestep (engine/core/loop.js) ------------------------------------------

class FixedLoop:
    """Runs update(step_seconds) in equal steps, however unevenly frames arrive."""

    def __init__(self, update, step_seconds=1 / 60, max_frame_seconds=0.25):
        self.update = update
        self.step_seconds = step_seconds
        self.max_frame_seconds = max_frame_seconds
        self.accumulator = 0.0

    def advance(self, frame_seconds):
        """Feed real time in; returns alpha (0..1) for smooth drawing."""
        # Clamp, so a long freeze does not cause hundreds of catch-up steps.
        self.accumulator += min(frame_seconds, self.max_frame_seconds)
        while self.accumulator >= self.step_seconds:
            self.update(self.step_seconds)
            self.accumulator -= self.step_seconds
        return self.accumulator / self.step_seconds


# --- Vectors (engine/math/vec2.js) ---------------------------------------------------
# JavaScript has no operator overloading, so Kindling writes vec2.add(a, b).
# Python does, so a frozen dataclass with __add__ reads like math: a + b.

@dataclass(frozen=True)
class Vec2:
    x: float = 0.0
    y: float = 0.0

    def __add__(self, other):
        return Vec2(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Vec2(self.x - other.x, self.y - other.y)

    def __mul__(self, amount):
        return Vec2(self.x * amount, self.y * amount)

    def length(self):
        return math.hypot(self.x, self.y)

    def normalized(self):
        size = self.length()
        return Vec2() if size == 0 else Vec2(self.x / size, self.y / size)

    def dot(self, other):
        return self.x * other.x + self.y * other.y


# --- AABB collision (engine/2d/collision.js) -----------------------------------------

@dataclass
class Rect:
    x: float
    y: float
    width: float
    height: float


def rects_overlap(a: Rect, b: Rect) -> bool:
    """Two boxes overlap unless one is entirely left, right, above or below the other."""
    return a.x < b.x + b.width and a.x + a.width > b.x and a.y < b.y + b.height and a.y + a.height > b.y


# --- Tilemap and arcade physics (engine/2d/tilemap.js, physics.js) -------------------

class Tilemap:
    def __init__(self, rows, tile_size=16, solid="#"):
        self.rows = rows
        self.tile_size = tile_size
        self.solid = solid

    def is_solid(self, column, row):
        if row < 0 or row >= len(self.rows) or column < 0 or column >= len(self.rows[0]):
            return True   # outside the map is a wall
        return self.rows[row][column] in self.solid

    def solids_near(self, area: Rect):
        size = self.tile_size
        found = []
        for row in range(int(area.y // size), int((area.y + area.height - 1e-9) // size) + 1):
            for column in range(int(area.x // size), int((area.x + area.width - 1e-9) // size) + 1):
                if self.is_solid(column, row):
                    found.append(Rect(column * size, row * size, size, size))
        return found


@dataclass
class Body(Rect):
    velocity_x: float = 0.0
    velocity_y: float = 0.0
    gravity: float = 0.0
    on_ground: bool = False


def move_and_collide(body: Body, step_seconds: float, world: Tilemap):
    """Gravity changes velocity, velocity changes position: x first, then y."""
    body.velocity_y += body.gravity * step_seconds
    body.on_ground = False
    _move_axis(body, "x", body.velocity_x * step_seconds, world)
    _move_axis(body, "y", body.velocity_y * step_seconds, world)


def _move_axis(body, axis, distance, world):
    if distance == 0:
        return
    setattr(body, axis, getattr(body, axis) + distance)
    size = "width" if axis == "x" else "height"
    for solid in world.solids_near(body):
        if not rects_overlap(body, solid):
            continue
        if distance > 0:
            setattr(body, axis, getattr(solid, axis) - getattr(body, size))
            if axis == "y":
                body.on_ground = True   # +y is down in 2D: we landed
        else:
            setattr(body, axis, getattr(solid, axis) + getattr(solid, size))
        setattr(body, "velocity_" + axis, 0.0)


# --- Input that remembers presses (engine/input/keyboard.js) -------------------------

@dataclass
class Keys:
    held: set = field(default_factory=set)
    pressed: set = field(default_factory=set)    # went down since the last step
    released: set = field(default_factory=set)   # went up since the last step

    def key_down(self, name):        # call from your event handler
        if name not in self.held:
            self.pressed.add(name)
        self.held.add(name)

    def key_up(self, name):
        self.held.discard(name)
        self.released.add(name)

    def end_step(self):              # call after each update step
        self.pressed.clear()
        self.released.clear()


# --- Scenes (engine/core/scene.js) ----------------------------------------------------
# In JavaScript a scene is a plain object with optional methods. In Python, a class
# with default no-op methods does the same job; override only what you need.

class Scene:
    def enter(self, game, data=None): ...
    def update(self, game, step_seconds): ...
    def render(self, game, surface): ...


class SceneManager:
    def __init__(self, game):
        self.game = game
        self.scenes = {}
        self.current = None

    def add(self, name, scene):
        self.scenes[name] = scene

    def switch_to(self, name, data=None):
        self.current = self.scenes[name]
        self.current.enter(self.game, data)
