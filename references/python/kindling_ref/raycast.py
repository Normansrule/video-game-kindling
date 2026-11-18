"""
kindling_ref/raycast.py   (JavaScript twin: engine/3d/raycaster.js)
WHAT: DDA (Digital Differential Analysis) raycasting on a text grid: the "2.5D" trick
      behind 1990s first-person games. One ray per screen column; hop from grid line to
      grid line until a wall is hit.
WHY:  It is the shortest path from 2D grids to a 3D-looking view, and it is pure math:
      no graphics library needed, so it is easy to test.
Units: 1 = one grid cell. Angle 0 looks along +x.
"""

import math


def is_wall(grid, column, row):
    if row < 0 or row >= len(grid) or column < 0 or column >= len(grid[row]):
        return True
    return grid[row][column] != "."


def cast_ray(grid, x, y, angle, max_distance=64.0):
    """Returns (distance, wall_char, side, texture_u) or None. side is "x" or "y"."""
    direction_x, direction_y = math.cos(angle), math.sin(angle)
    column, row = int(math.floor(x)), int(math.floor(y))
    cross_x = abs(1 / direction_x) if direction_x != 0 else math.inf
    cross_y = abs(1 / direction_y) if direction_y != 0 else math.inf
    step_column = -1 if direction_x < 0 else 1
    step_row = -1 if direction_y < 0 else 1
    next_x = (x - column) * cross_x if direction_x < 0 else (column + 1 - x) * cross_x
    next_y = (y - row) * cross_y if direction_y < 0 else (row + 1 - y) * cross_y
    distance = 0.0
    while distance < max_distance:
        if next_x < next_y:
            distance, next_x, column, side = next_x, next_x + cross_x, column + step_column, "x"
        else:
            distance, next_y, row, side = next_y, next_y + cross_y, row + step_row, "y"
        if is_wall(grid, column, row):
            along = (y + direction_y * distance) if side == "x" else (x + direction_x * distance)
            inside = 0 <= row < len(grid) and 0 <= column < len(grid[row])
            wall = grid[row][column] if inside else "#"
            return distance, wall, side, along - math.floor(along)
    return None


def cast_view(grid, x, y, angle, field_of_view, columns):
    """One hit per screen column, with the fish-eye effect removed."""
    half_width = math.tan(field_of_view / 2)
    hits = []
    for index in range(columns):
        screen_x = 2 * (index + 0.5) / columns - 1
        ray_angle = angle + math.atan(screen_x * half_width)
        hit = cast_ray(grid, x, y, ray_angle)
        if hit is not None:
            distance, wall, side, texture_u = hit
            hit = (distance * math.cos(ray_angle - angle), wall, side, texture_u)
        hits.append(hit)
    return hits


def move_in_grid(grid, x, y, delta_x, delta_y, radius=0.2):
    """Slide along walls: try x and y separately."""
    edge_x = x + delta_x + math.copysign(radius, delta_x) if delta_x else x
    if not is_wall(grid, int(math.floor(edge_x)), int(math.floor(y))):
        x += delta_x
    edge_y = y + delta_y + math.copysign(radius, delta_y) if delta_y else y
    if not is_wall(grid, int(math.floor(x)), int(math.floor(edge_y))):
        y += delta_y
    return x, y
