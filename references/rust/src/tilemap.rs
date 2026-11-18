//! Text levels (JavaScript twin: engine/2d/tilemap.js). '#' is solid; any other
//! character can mark a spawn point, a coin or a spike.

pub struct TileMap {
    rows: Vec<Vec<char>>,
    pub tile_size: f32,
}

impl TileMap {
    pub fn new(text: &str, tile_size: f32) -> Self {
        let rows = text.trim_matches('\n').lines().map(|line| line.chars().collect()).collect();
        Self { rows, tile_size }
    }

    pub fn columns(&self) -> usize {
        self.rows.iter().map(|row| row.len()).max().unwrap_or(0)
    }

    pub fn row_count(&self) -> usize {
        self.rows.len()
    }

    pub fn at(&self, column: i32, row: i32) -> char {
        if row < 0 || column < 0 || row as usize >= self.rows.len() {
            return '#';
        }
        *self.rows[row as usize].get(column as usize).unwrap_or(&'#')
    }

    /// Solid tiles block movement. Below the map is open, so you can fall off.
    pub fn is_solid(&self, column: i32, row: i32) -> bool {
        row < self.rows.len() as i32 && self.at(column, row) == '#'
    }

    /// Every (column, row) holding `character`, top to bottom.
    pub fn find(&self, character: char) -> Vec<(i32, i32)> {
        let mut found = Vec::new();
        for (row, line) in self.rows.iter().enumerate() {
            for (column, value) in line.iter().enumerate() {
                if *value == character {
                    found.push((column as i32, row as i32));
                }
            }
        }
        found
    }

    pub fn pixel_width(&self) -> f32 {
        self.columns() as f32 * self.tile_size
    }

    pub fn pixel_height(&self) -> f32 {
        self.rows.len() as f32 * self.tile_size
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_and_looks_up() {
        let map = TileMap::new("#.P\n###", 8.0);
        assert_eq!(map.find('P'), vec![(2, 0)]);
        assert!(map.is_solid(-1, 0));
        assert!(!map.is_solid(0, 9));
        assert_eq!(map.pixel_width(), 24.0);
    }
}
