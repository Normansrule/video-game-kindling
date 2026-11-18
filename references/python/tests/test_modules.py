"""
tests/test_modules.py
WHAT: Unit tests for the pure modules (no pygame needed): loop, easing, collision,
      tilemap, camera, particles, actions and raycasting.
RUN:  cd ~/projects/kindling/references/python && python3 -m unittest -v
"""

import math
import unittest

from kindling_ref.actions import Actions
from kindling_ref.camera import Camera
from kindling_ref.collision import Box, boxes_overlap, circles_overlap, move_and_collide
from kindling_ref.easing import approach, clamp, damp, ease_out_back, lerp
from kindling_ref.loop import FixedStepLoop
from kindling_ref.particles import ParticleSystem
from kindling_ref.raycast import cast_ray, cast_view, move_in_grid
from kindling_ref.tilemap import TileMap


class LoopTests(unittest.TestCase):
    def test_runs_whole_steps_and_keeps_the_rest(self):
        steps = []
        loop = FixedStepLoop(steps.append, step_seconds=0.1)
        alpha = loop.advance(0.25)
        self.assertEqual(len(steps), 2)
        self.assertAlmostEqual(alpha, 0.5)

    def test_clamps_long_frames(self):
        steps = []
        loop = FixedStepLoop(steps.append, step_seconds=1 / 60)
        loop.advance(10.0)
        self.assertEqual(len(steps), 15)   # 0.25 s at 60 steps a second


class EasingTests(unittest.TestCase):
    def test_basics(self):
        self.assertEqual(clamp(5, 0, 3), 3)
        self.assertEqual(lerp(10, 20, 0.5), 15)
        self.assertEqual(approach(0, 10, 3), 3)
        self.assertEqual(approach(9, 10, 3), 10)
        self.assertAlmostEqual(ease_out_back(1), 1)

    def test_damp_is_frame_rate_independent(self):
        one_step = damp(0, 100, 0.01, 1.0)
        value = 0
        for _ in range(60):
            value = damp(value, 100, 0.01, 1 / 60)
        self.assertAlmostEqual(one_step, value, places=6)


class CollisionTests(unittest.TestCase):
    def test_overlaps(self):
        self.assertTrue(boxes_overlap(Box(0, 0, 10, 10), Box(5, 5, 10, 10)))
        self.assertFalse(boxes_overlap(Box(0, 0, 10, 10), Box(10, 0, 10, 10)))
        self.assertTrue(circles_overlap(0, 0, 2, 3, 0, 2))

    def test_lands_on_floor_and_stops_at_wall(self):
        level = TileMap("....\n...#\n####", tile_size=10)
        box = Box(5, 5, 8, 8)
        hits = move_and_collide(box, 0, 20, level.is_solid, 10)
        self.assertTrue(hits["down"])
        self.assertEqual(box.y, 12)
        hits = move_and_collide(box, 30, 0, level.is_solid, 10)
        self.assertTrue(hits["right"])
        self.assertEqual(box.x, 22)


class TileMapTests(unittest.TestCase):
    def test_lookup_and_find(self):
        level = TileMap("#.P\n###", tile_size=8)
        self.assertEqual(level.find("P"), [(2, 0)])
        self.assertTrue(level.is_solid(-1, 0))      # sides are walls
        self.assertFalse(level.is_solid(0, 5))      # bottom is open
        self.assertEqual(level.pixel_width, 24)


class CameraTests(unittest.TestCase):
    def test_follow_stays_in_world(self):
        camera = Camera(100, 50, world_width=300, world_height=50)
        for _ in range(300):
            camera.follow(1000, 25, 1 / 60)
        self.assertAlmostEqual(camera.x, 200, places=3)
        self.assertEqual(camera.y, 0)

    def test_trauma_decays(self):
        camera = Camera(10, 10)
        camera.add_trauma(1)
        camera.update(1.0)
        self.assertLess(camera.trauma, 1)


class ParticleTests(unittest.TestCase):
    def test_particles_die(self):
        system = ParticleSystem()
        system.burst(0, 0, 20, life=(0.1, 0.2))
        self.assertEqual(len(system), 20)
        for _ in range(20):
            system.update(1 / 60)
        self.assertEqual(len(system), 0)


class ActionTests(unittest.TestCase):
    def test_press_lasts_until_end_of_step(self):
        actions = Actions({"jump": ["space"]})
        actions.key_down("space")
        actions.key_up("space")
        self.assertTrue(actions.was_pressed("jump"))   # a tap shorter than a step still counts
        self.assertFalse(actions.is_down("jump"))
        actions.end_step()
        self.assertFalse(actions.was_pressed("jump"))


class RaycastTests(unittest.TestCase):
    GRID = ["#####", "#...#", "#...#", "#####"]

    def test_ray_hits_wall(self):
        distance, wall, side, _ = cast_ray(self.GRID, 1.5, 1.5, 0)
        self.assertAlmostEqual(distance, 2.5)
        self.assertEqual((wall, side), ("#", "x"))

    def test_no_fisheye(self):
        hits = cast_view(self.GRID, 2.5, 1.5, math.pi / 2, math.radians(60), 9)
        # Looking straight at a flat wall: every column sees the same distance.
        self.assertTrue(all(abs(hit[0] - hits[4][0]) < 1e-9 for hit in hits))

    def test_slides_along_walls(self):
        x, y = move_in_grid(self.GRID, 3.5, 1.5, 1.0, 0.5)
        self.assertEqual(x, 3.5)
        self.assertEqual(y, 2.0)


if __name__ == "__main__":
    unittest.main()
