"""Run: cd ~/projects/kindling/docs/bridges/python && python3 -m unittest -v"""
import unittest

from kindling_ideas import Body, FixedLoop, Keys, Rect, Tilemap, Vec2, move_and_collide, rects_overlap


class Checks(unittest.TestCase):
    def test_loop_runs_whole_steps_and_keeps_the_rest(self):
        steps = []
        loop = FixedLoop(steps.append, step_seconds=1 / 64)
        alpha = loop.advance(3.5 / 64)
        self.assertEqual(len(steps), 3)
        self.assertAlmostEqual(alpha, 0.5)

    def test_loop_clamps_long_freezes(self):
        steps = []
        loop = FixedLoop(steps.append, step_seconds=1 / 64)
        loop.advance(5.0)
        self.assertEqual(len(steps), 16)   # 0.25 s at most

    def test_vectors(self):
        self.assertEqual(Vec2(1, 2) + Vec2(3, 4), Vec2(4, 6))
        self.assertAlmostEqual(Vec2(3, 4).normalized().length(), 1)
        self.assertEqual(Vec2(0, 0).normalized(), Vec2(0, 0))

    def test_touching_boxes_do_not_overlap(self):
        self.assertTrue(rects_overlap(Rect(0, 0, 10, 10), Rect(5, 5, 10, 10)))
        self.assertFalse(rects_overlap(Rect(0, 0, 10, 10), Rect(10, 0, 10, 10)))

    def test_body_lands_on_floor_and_stops_at_wall(self):
        level = Tilemap(["#####", "#...#", "#...#", "#####"], tile_size=16)
        body = Body(x=20, y=17, width=10, height=10, gravity=900, velocity_x=200)
        for _ in range(60):
            move_and_collide(body, 1 / 60, level)
        self.assertTrue(body.on_ground)
        self.assertEqual(body.y, 48 - 10)
        self.assertEqual(body.x, 64 - 10)

    def test_quick_tap_is_not_lost(self):
        keys = Keys()
        keys.key_down("space")
        keys.key_up("space")           # both between two steps
        self.assertNotIn("space", keys.held)
        self.assertIn("space", keys.pressed)
        keys.end_step()
        self.assertNotIn("space", keys.pressed)


if __name__ == "__main__":
    unittest.main()
