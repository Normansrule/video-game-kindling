"""
kindling_ref/collision.py   (JavaScript twin: engine/2d/collision.js)
WHAT: Box overlap tests and "move one axis at a time" against solid boxes or tiles.
WHY:  Moving x then y separately is the trick behind almost every 2D platformer:
      you can tell a wall hit (x) from a floor hit (y), and you slide along walls.
Boxes are plain tuples or objects with x, y, width, height (top-left corner, +y down).
"""

from dataclasses import dataclass


@dataclass
class Box:
    x: float
    y: float
    width: float
    height: float

    @property
    def center(self):
        return (self.x + self.width / 2, self.y + self.height / 2)


def boxes_overlap(a, b):
    return (a.x < b.x + b.width and a.x + a.width > b.x and
            a.y < b.y + b.height and a.y + a.height > b.y)


def circles_overlap(ax, ay, a_radius, bx, by, b_radius):
    dx, dy = bx - ax, by - ay
    return dx * dx + dy * dy < (a_radius + b_radius) ** 2


def move_and_collide(box, dx, dy, is_solid_at, tile_size):
    """Move box by (dx, dy) through a tile grid. is_solid_at(column, row) -> bool.
    Returns dict(left, right, up, down) saying which sides hit something."""
    hits = {"left": False, "right": False, "up": False, "down": False}

    box.x += dx
    if dx != 0:
        for column, row in _tiles_under(box, tile_size):
            if is_solid_at(column, row):
                if dx > 0:
                    box.x = column * tile_size - box.width
                    hits["right"] = True
                else:
                    box.x = (column + 1) * tile_size
                    hits["left"] = True
                break

    box.y += dy
    if dy != 0:
        for column, row in _tiles_under(box, tile_size):
            if is_solid_at(column, row):
                if dy > 0:
                    box.y = row * tile_size - box.height
                    hits["down"] = True
                else:
                    box.y = (row + 1) * tile_size
                    hits["up"] = True
                break
    return hits


def _tiles_under(box, tile_size):
    # A tiny inset so a box resting exactly on a tile edge doesn't count as inside it.
    inset = 1e-6
    first_column = int((box.x + inset) // tile_size)
    last_column = int((box.x + box.width - inset) // tile_size)
    first_row = int((box.y + inset) // tile_size)
    last_row = int((box.y + box.height - inset) // tile_size)
    for row in range(first_row, last_row + 1):
        for column in range(first_column, last_column + 1):
            yield column, row
