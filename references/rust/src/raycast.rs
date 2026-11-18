//! DDA raycasting (JavaScript twin: engine/3d/raycaster.js). One ray per screen column,
//! hopping from grid line to grid line until it hits a wall.
//! Units: 1 = one grid cell. Angle 0 looks along +x.

pub struct Hit {
    /// Perpendicular distance (fish-eye already removed by `cast_view`).
    pub distance: f32,
    pub wall: char,
    /// true when the ray hit a face that runs north-south.
    pub x_side: bool,
    /// Where along the wall face it hit, 0..1 (for texturing).
    pub texture_u: f32,
}

pub fn is_wall(grid: &[&str], column: i32, row: i32) -> bool {
    if row < 0 || column < 0 || row as usize >= grid.len() {
        return true;
    }
    grid[row as usize].as_bytes().get(column as usize).is_none_or(|cell| *cell != b'.')
}

pub fn cast_ray(grid: &[&str], x: f32, y: f32, angle: f32, max_distance: f32) -> Option<Hit> {
    let (direction_x, direction_y) = (angle.cos(), angle.sin());
    let (mut column, mut row) = (x.floor() as i32, y.floor() as i32);
    let cross_x = if direction_x == 0.0 { f32::INFINITY } else { (1.0 / direction_x).abs() };
    let cross_y = if direction_y == 0.0 { f32::INFINITY } else { (1.0 / direction_y).abs() };
    let step_column = if direction_x < 0.0 { -1 } else { 1 };
    let step_row = if direction_y < 0.0 { -1 } else { 1 };
    let mut next_x = if direction_x < 0.0 { (x - column as f32) * cross_x } else { (column as f32 + 1.0 - x) * cross_x };
    let mut next_y = if direction_y < 0.0 { (y - row as f32) * cross_y } else { (row as f32 + 1.0 - y) * cross_y };
    let mut distance = 0.0;
    while distance < max_distance {
        let x_side = next_x < next_y;
        if x_side {
            distance = next_x;
            next_x += cross_x;
            column += step_column;
        } else {
            distance = next_y;
            next_y += cross_y;
            row += step_row;
        }
        if is_wall(grid, column, row) {
            let along = if x_side { y + direction_y * distance } else { x + direction_x * distance };
            let wall = grid.get(row as usize).and_then(|line| line.chars().nth(column as usize)).unwrap_or('#');
            return Some(Hit { distance, wall, x_side, texture_u: along - along.floor() });
        }
    }
    None
}

/// One hit per screen column, spread evenly across a flat screen, fish-eye removed.
pub fn cast_view(grid: &[&str], x: f32, y: f32, angle: f32, field_of_view: f32, columns: usize) -> Vec<Option<Hit>> {
    let half_width = (field_of_view / 2.0).tan();
    (0..columns)
        .map(|index| {
            let screen_x = 2.0 * (index as f32 + 0.5) / columns as f32 - 1.0;
            let ray_angle = angle + (screen_x * half_width).atan();
            cast_ray(grid, x, y, ray_angle, 64.0).map(|mut hit| {
                hit.distance *= (ray_angle - angle).cos();
                hit
            })
        })
        .collect()
}

/// Slide along walls: try x and y separately, keeping `radius` away from them.
pub fn move_in_grid(grid: &[&str], x: f32, y: f32, delta_x: f32, delta_y: f32, radius: f32) -> (f32, f32) {
    let (mut x, mut y) = (x, y);
    let edge_x = x + delta_x + radius.copysign(delta_x);
    if delta_x != 0.0 && !is_wall(grid, edge_x.floor() as i32, y.floor() as i32) {
        x += delta_x;
    }
    let edge_y = y + delta_y + radius.copysign(delta_y);
    if delta_y != 0.0 && !is_wall(grid, x.floor() as i32, edge_y.floor() as i32) {
        y += delta_y;
    }
    (x, y)
}

#[cfg(test)]
mod tests {
    use super::*;

    const GRID: [&str; 4] = ["#####", "#...#", "#...#", "#####"];

    #[test]
    fn ray_hits_wall() {
        let hit = cast_ray(&GRID, 1.5, 1.5, 0.0, 64.0).unwrap();
        assert!((hit.distance - 2.5).abs() < 1e-5);
        assert!(hit.x_side);
    }

    #[test]
    fn no_fisheye_on_flat_wall() {
        let hits = cast_view(&GRID, 2.5, 1.5, std::f32::consts::FRAC_PI_2, 1.0, 9);
        let middle = hits[4].as_ref().unwrap().distance;
        assert!(hits.iter().all(|hit| (hit.as_ref().unwrap().distance - middle).abs() < 1e-4));
    }

    #[test]
    fn slides_along_walls() {
        assert_eq!(move_in_grid(&GRID, 3.5, 1.5, 1.0, 0.5, 0.2), (3.5, 2.0));
    }
}
