"""
kindling_ref/camera.py   (JavaScript twin: engine/2d/camera.js)
WHAT: A 2D camera that follows a target smoothly, stays inside the level, and shakes.
WHY:  A camera glued to the player feels stiff. Damped follow plus a little look-ahead
      and trauma-based shake is what makes a small game feel polished.
"""

import math
import random

from .easing import clamp, damp


class Camera:
    def __init__(self, view_width, view_height, world_width=None, world_height=None):
        self.view_width = view_width
        self.view_height = view_height
        self.world_width = world_width
        self.world_height = world_height
        self.x = 0.0
        self.y = 0.0
        self.trauma = 0.0          # 0..1, decays over time; shake = trauma squared
        self.shake_x = 0.0
        self.shake_y = 0.0
        self._time = 0.0

    def follow(self, target_x, target_y, seconds, smoothing=0.002):
        goal_x = target_x - self.view_width / 2
        goal_y = target_y - self.view_height / 2
        self.x = damp(self.x, goal_x, smoothing, seconds)
        self.y = damp(self.y, goal_y, smoothing, seconds)
        if self.world_width is not None:
            self.x = clamp(self.x, 0, max(0, self.world_width - self.view_width))
        if self.world_height is not None:
            self.y = clamp(self.y, 0, max(0, self.world_height - self.view_height))

    def add_trauma(self, amount):
        self.trauma = min(1.0, self.trauma + amount)

    def update(self, seconds, max_offset=6.0):
        self._time += seconds
        self.trauma = max(0.0, self.trauma - seconds * 1.5)
        power = self.trauma * self.trauma
        # Smooth wobble (two sine waves) reads better than pure random jitter.
        self.shake_x = max_offset * power * math.sin(self._time * 53.0) * random.uniform(0.6, 1.0)
        self.shake_y = max_offset * power * math.sin(self._time * 41.0 + 1.3) * random.uniform(0.6, 1.0)

    def to_screen(self, world_x, world_y):
        return (round(world_x - self.x + self.shake_x), round(world_y - self.y + self.shake_y))
