"""
kindling_ref/tilemap.py   (JavaScript twin: engine/2d/tilemap.js)
WHAT: A level written as text, one character per tile, plus lookups.
WHY:  Text levels are easy to edit, diff and share. "#" is solid, "." is empty, and any
      other character can mean a spawn point, a coin or a spike.
"""


class TileMap:
    def __init__(self, text, tile_size=16, solid="#"):
        self.rows_text = [line for line in text.strip("\n").splitlines()]
        self.rows = len(self.rows_text)
        self.columns = max(len(line) for line in self.rows_text)
        self.tile_size = tile_size
        self.solid = set(solid)

    def at(self, column, row):
        if row < 0 or row >= self.rows or column < 0 or column >= self.columns:
            return "#"   # outside the map counts as wall, so nothing falls out sideways
        line = self.rows_text[row]
        return line[column] if column < len(line) else "."

    def is_solid(self, column, row):
        if row >= self.rows:
            return False   # open at the bottom: falling off the level is allowed
        return self.at(column, row) in self.solid

    def find(self, character):
        """Every (column, row) holding character, top to bottom."""
        return [(column, row)
                for row, line in enumerate(self.rows_text)
                for column, value in enumerate(line) if value == character]

    @property
    def pixel_width(self):
        return self.columns * self.tile_size

    @property
    def pixel_height(self):
        return self.rows * self.tile_size
