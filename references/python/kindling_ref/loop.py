"""
kindling_ref/loop.py   (JavaScript twin: engine/core/loop.js)
WHAT: A fixed-timestep loop: update() always gets the same step (1/60 s), however
      unevenly real frames arrive. advance() returns alpha (0..1) for smooth drawing.
WHY:  Physics that depends on frame rate breaks on fast or slow computers. Fixed steps
      make jumps the same height on a 30 Hz laptop and a 144 Hz monitor.
"""


class FixedStepLoop:
    def __init__(self, update, step_seconds=1 / 60, max_frame_seconds=0.25):
        self.update = update
        self.step_seconds = step_seconds
        self.max_frame_seconds = max_frame_seconds
        self.accumulator = 0.0
        self.steps_run = 0

    def advance(self, frame_seconds):
        # Clamp: after a freeze (dragging the window) don't run hundreds of catch-up steps.
        self.accumulator += min(frame_seconds, self.max_frame_seconds)
        while self.accumulator >= self.step_seconds:
            self.update(self.step_seconds)
            self.accumulator -= self.step_seconds
            self.steps_run += 1
        return self.accumulator / self.step_seconds
