"""
kindling_ref/app.py   (JavaScript twin: engine/game.js + engine/core/canvas.js)
WHAT: Opens a pygame-ce window, draws the game at a small "pixel" size and scales it up,
      turns keyboard and mouse events into actions, and runs the fixed-timestep loop.
WHY:  Every game in references/python/games needs the same 60 lines of setup. Writing it
      once keeps each game file about the game.
Headless runs (tests, screenshots): pass max_frames, and optionally a script of
{frame_number: [("press", "jump"), ("release", "jump")]} to fake input.
"""

import os

import pygame

from . import fx
from .actions import Actions
from .loop import FixedStepLoop


class App:
    def __init__(self, title, width, height, scale=3, bindings=None):
        pygame.init()
        fx.forget_fonts()
        self.title = title
        self.width = width
        self.height = height
        self.scale = scale
        self.headless = os.environ.get("SDL_VIDEODRIVER") == "dummy"
        flags = pygame.SCALED | pygame.RESIZABLE if not self.headless else 0
        self.window = pygame.display.set_mode((width * scale, height * scale), flags)
        pygame.display.set_caption(title)
        self.screen = pygame.Surface((width, height))   # the game draws here, at low resolution
        self.actions = Actions(bindings or {})
        self.mouse = (0.0, 0.0)                          # in game pixels, like Kindling's mouse.position
        self.mouse_held = set()
        self.mouse_pressed = set()
        self.time = 0.0
        self.running = True
        self.scene = None

    def switch(self, scene):
        self.scene = scene

    def _update(self, seconds):
        self.time += seconds
        self.scene.update(seconds)
        self.actions.end_step()
        self.mouse_pressed.clear()

    def _handle(self, event):
        if event.type == pygame.QUIT:
            self.running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                self.running = False
            self.actions.key_down(event.key)
        elif event.type == pygame.KEYUP:
            self.actions.key_up(event.key)
        elif event.type == pygame.MOUSEMOTION:
            self.mouse = self._to_game(event.pos)
        elif event.type == pygame.MOUSEBUTTONDOWN:
            self.mouse = self._to_game(event.pos)
            self.mouse_held.add(event.button)
            self.mouse_pressed.add(event.button)
        elif event.type == pygame.MOUSEBUTTONUP:
            self.mouse_held.discard(event.button)
        if self.scene is not None and hasattr(self.scene, "handle_event"):
            self.scene.handle_event(event)

    def _to_game(self, position):
        window_width, window_height = self.window.get_size()
        return (position[0] * self.width / window_width, position[1] * self.height / window_height)

    def run(self, scene, max_frames=None, script=None, screenshot=None):
        """Run until the window closes (or max_frames frames, for tests and screenshots)."""
        self.scene = scene
        loop = FixedStepLoop(self._update)
        clock = pygame.time.Clock()
        frame = 0
        while self.running:
            for event in pygame.event.get():
                self._handle(event)
            for kind, name in (script or {}).get(frame, []):
                self.actions.press(name) if kind == "press" else self.actions.release(name)
            # Real time when playing; exactly one step per frame when headless (repeatable).
            seconds = clock.tick(60) / 1000 if max_frames is None else 1 / 60
            alpha = loop.advance(seconds)
            self.scene.draw(self.screen, alpha)
            pygame.transform.scale(self.screen, self.window.get_size(), self.window)
            pygame.display.flip()
            frame += 1
            if max_frames is not None and frame >= max_frames:
                break
        if screenshot:
            pygame.image.save(pygame.transform.scale_by(self.screen, self.scale), screenshot)
        pygame.quit()
        return frame
