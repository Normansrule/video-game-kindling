"""
kindling_ref/actions.py   (JavaScript twin: engine/input/actions.js)
WHAT: Name what the player wants ("jump", "left") instead of which key they pressed.
      Remembers presses until the next fixed step, so a quick tap is never lost.
WHY:  One place to rebind keys, add gamepad buttons, or fake input in tests.
Works with key codes from any library: pass in whatever your event loop gives you.
"""


class Actions:
    def __init__(self, bindings):
        # bindings: {"jump": [key_a, key_b], ...}
        self.bindings = {name: set(keys) for name, keys in bindings.items()}
        self.held = set()
        self.pressed = set()     # since the last step
        self.released = set()

    def _names_for(self, key):
        return [name for name, keys in self.bindings.items() if key in keys]

    def key_down(self, key):
        for name in self._names_for(key):
            self.press(name)

    def key_up(self, key):
        for name in self._names_for(key):
            self.release(name)

    # press() and release() also let tests and demo scripts drive the game.
    def press(self, name):
        if name not in self.held:
            self.pressed.add(name)
        self.held.add(name)

    def release(self, name):
        if name in self.held:
            self.released.add(name)
        self.held.discard(name)

    def is_down(self, name):
        return name in self.held

    def was_pressed(self, name):
        return name in self.pressed

    def was_released(self, name):
        return name in self.released

    def axis(self, negative, positive):
        return (1 if positive in self.held else 0) - (1 if negative in self.held else 0)

    def end_step(self):
        self.pressed.clear()
        self.released.clear()
