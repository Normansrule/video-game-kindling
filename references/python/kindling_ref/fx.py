"""
kindling_ref/fx.py
WHAT: Drawing helpers that make a small game look good: gradients, soft glows,
      additive particles, a vignette, and outlined text.
WHY:  "Additive" blending (pygame.BLEND_ADD) adds light instead of painting over it,
      so overlapping glows get brighter, like real light. Most neon looks are just that.
Surfaces are cached by size and color, because building a glow every frame is slow.
"""

import math

import pygame

_cache = {}


def forget_fonts():
    """Fonts die with pygame.quit(); App calls this so a second game in one run still works."""
    for key in [key for key in _cache if key[0] == "font"]:
        del _cache[key]


def vertical_gradient(width, height, top, bottom):
    key = ("gradient", width, height, top, bottom)
    if key not in _cache:
        surface = pygame.Surface((width, height))
        for y in range(height):
            t = y / max(1, height - 1)
            color = [round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)]
            pygame.draw.line(surface, color, (0, y), (width, y))
        _cache[key] = surface
    return _cache[key]


def glow(radius, color, strength=1.0):
    """A soft round light: bright in the middle, fading to black at the edge."""
    radius = max(1, int(radius))
    key = ("glow", radius, tuple(color), round(strength, 2))
    if key not in _cache:
        surface = pygame.Surface((radius * 2, radius * 2))
        for ring in range(radius, 0, -1):
            falloff = (1 - ring / radius) ** 2 * strength
            ring_color = [min(255, round(channel * falloff)) for channel in color]
            pygame.draw.circle(surface, ring_color, (radius, radius), ring)
        _cache[key] = surface
    return _cache[key]


def add_glow(target, x, y, radius, color, strength=1.0):
    image = glow(radius, color, strength)
    target.blit(image, (round(x - radius), round(y - radius)), special_flags=pygame.BLEND_ADD)


def draw_particles(target, particles, offset=(0, 0), glow_size=3.0):
    """Each particle is a small glow that shrinks and fades as it dies.
    Size and brightness are rounded to a few steps so the glow cache stays small."""
    for particle in particles:
        left = particle.fraction_left
        radius = max(1, round(particle.size * glow_size * (0.4 + 0.6 * left)))
        strength = max(1, round(left * 6)) / 6
        add_glow(target, particle.x - offset[0], particle.y - offset[1], radius, particle.color, strength)


def vignette(width, height, darkness=150):
    """Darken the corners so the eye goes to the middle (built small, then smoothly scaled up)."""
    key = ("vignette", width, height, darkness)
    if key not in _cache:
        small = pygame.Surface((64, 36), pygame.SRCALPHA)
        for y in range(36):
            for x in range(64):
                distance = math.hypot((x + 0.5) / 32 - 1, (y + 0.5) / 18 - 1) / math.sqrt(2)
                small.set_at((x, y), (0, 0, 0, round(darkness * max(0.0, distance - 0.35) ** 1.5 * 2.2)))
        _cache[key] = pygame.transform.smoothscale(small, (width, height))
    return _cache[key]


def text(target, string, position, size=10, color=(240, 240, 250), center=False, shadow=(10, 10, 20)):
    key = ("font", size)
    if key not in _cache:
        _cache[key] = pygame.font.Font(None, size)
    font = _cache[key]
    image = font.render(string, False, color)
    x, y = position
    if center:
        x -= image.get_width() / 2
        y -= image.get_height() / 2
    if shadow:
        target.blit(font.render(string, False, shadow), (round(x) + 1, round(y) + 1))
    target.blit(image, (round(x), round(y)))
