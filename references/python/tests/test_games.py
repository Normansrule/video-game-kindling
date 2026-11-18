"""
tests/test_games.py
WHAT: Runs every game for a few seconds with no window (SDL's "dummy" driver) and fake
      input, and checks that something happened. Skipped if pygame-ce is not installed.
RUN:  cd ~/projects/kindling/references/python && python3 -m unittest -v
"""

import importlib.util
import os
import unittest

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

HAVE_PYGAME = importlib.util.find_spec("pygame") is not None


@unittest.skipUnless(HAVE_PYGAME, "pip install pygame-ce to run the game checks")
class GameRuns(unittest.TestCase):
    def test_platformer_jumps_the_first_pit(self):
        from games import neon_platformer
        script = {10: [("press", "right")], 72: [("press", "jump")], 102: [("release", "jump")]}
        scene = neon_platformer.main(max_frames=180, script=script)
        self.assertGreater(scene.player.x, 200)   # the pit ends at x = 192
        self.assertEqual(scene.deaths, 0)
        self.assertTrue(scene.on_ground)

    def test_arena_scores(self):
        from games import neon_arena
        scene = neon_arena.main(max_frames=300, script={5: [("press", "fire")]})
        self.assertGreater(scene.score, 0)

    def test_raycaster_walks(self):
        from games import raycast_halls
        scene = raycast_halls.main(max_frames=60, script={0: [("press", "forward")]})
        self.assertGreater(scene.x, 2.0)

    def test_fireworks_explode(self):
        from games import fireworks
        scene = fireworks.main(max_frames=150)
        self.assertGreater(len(scene.sparks), 0)


if __name__ == "__main__":
    unittest.main()
