"""
kindling_ref/easing.py   (JavaScript twin: engine/math/easing.js, engine/math/scalar.js)
WHAT: Small number helpers every game uses: clamp, lerp, damp, and easing curves.
WHY:  "Juice" (motion that feels alive) is mostly these few functions used everywhere.
"""

import math


def clamp(value, low, high):
    return max(low, min(high, value))


def lerp(start, end, amount):
    """Linear interpolation: amount 0 gives start, 1 gives end."""
    return start + (end - start) * amount


def damp(current, target, smoothing, seconds):
    """Move toward target by the same fraction per second, whatever the frame rate.
    smoothing = how much of the gap is left after one second (0.001 is snappy, 0.5 is lazy)."""
    return lerp(current, target, 1 - smoothing ** seconds)


def ease_out_quad(t):
    return 1 - (1 - t) * (1 - t)


def ease_in_out_sine(t):
    return -(math.cos(math.pi * t) - 1) / 2


def ease_out_back(t):
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def ease_out_elastic(t):
    if t in (0, 1):
        return t
    return 2 ** (-10 * t) * math.sin((t * 10 - 0.75) * (2 * math.pi) / 3) + 1


def approach(current, target, step):
    """Move current toward target by at most step (good for speeds and timers)."""
    if current < target:
        return min(current + step, target)
    return max(current - step, target)
