//! Box collision (JavaScript twin: engine/2d/collision.js).
//! Move x first, then y: you can tell walls from floors, and you slide along walls.

use crate::tilemap::TileMap;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Box2 {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl Box2 {
    pub fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self { x, y, width, height }
    }

    pub fn center(&self) -> (f32, f32) {
        (self.x + self.width / 2.0, self.y + self.height / 2.0)
    }

    pub fn overlaps(&self, other: &Box2) -> bool {
        self.x < other.x + other.width && self.x + self.width > other.x
            && self.y < other.y + other.height && self.y + self.height > other.y
    }
}

pub fn circles_overlap(a: (f32, f32), a_radius: f32, b: (f32, f32), b_radius: f32) -> bool {
    let (dx, dy) = (b.0 - a.0, b.1 - a.1);
    dx * dx + dy * dy < (a_radius + b_radius).powi(2)
}

#[derive(Default, Debug, PartialEq)]
pub struct Hits {
    pub left: bool,
    pub right: bool,
    pub up: bool,
    pub down: bool,
}

pub fn move_and_collide(body: &mut Box2, dx: f32, dy: f32, map: &TileMap) -> Hits {
    let size = map.tile_size;
    let mut hits = Hits::default();
    body.x += dx;
    if dx != 0.0 {
        if let Some((column, _)) = first_solid(body, map) {
            if dx > 0.0 {
                body.x = column as f32 * size - body.width;
                hits.right = true;
            } else {
                body.x = (column + 1) as f32 * size;
                hits.left = true;
            }
        }
    }
    body.y += dy;
    if dy != 0.0 {
        if let Some((_, row)) = first_solid(body, map) {
            if dy > 0.0 {
                body.y = row as f32 * size - body.height;
                hits.down = true;
            } else {
                body.y = (row + 1) as f32 * size;
                hits.up = true;
            }
        }
    }
    hits
}

fn first_solid(body: &Box2, map: &TileMap) -> Option<(i32, i32)> {
    let inset = 1e-4;
    let size = map.tile_size;
    let first_column = ((body.x + inset) / size).floor() as i32;
    let last_column = ((body.x + body.width - inset) / size).floor() as i32;
    let first_row = ((body.y + inset) / size).floor() as i32;
    let last_row = ((body.y + body.height - inset) / size).floor() as i32;
    for row in first_row..=last_row {
        for column in first_column..=last_column {
            if map.is_solid(column, row) {
                return Some((column, row));
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lands_on_floor_then_stops_at_wall() {
        let map = TileMap::new("....\n...#\n####", 10.0);
        let mut body = Box2::new(5.0, 5.0, 8.0, 8.0);
        assert!(move_and_collide(&mut body, 0.0, 20.0, &map).down);
        assert_eq!(body.y, 12.0);
        assert!(move_and_collide(&mut body, 30.0, 0.0, &map).right);
        assert_eq!(body.x, 22.0);
    }

    #[test]
    fn overlap_rules() {
        assert!(Box2::new(0.0, 0.0, 10.0, 10.0).overlaps(&Box2::new(5.0, 5.0, 10.0, 10.0)));
        assert!(!Box2::new(0.0, 0.0, 10.0, 10.0).overlaps(&Box2::new(10.0, 0.0, 10.0, 10.0)));
        assert!(circles_overlap((0.0, 0.0), 2.0, (3.0, 0.0), 2.0));
    }
}
