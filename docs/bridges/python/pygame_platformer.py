"""
docs/bridges/python/pygame_platformer.py
WHAT: A tiny platformer in Python with pygame-ce, built on kindling_ideas.py:
      fixed timestep, tilemap, move one axis at a time, jump on "pressed".
WHY:  pygame gives you a window, events and drawing; the game ideas are yours.
      Compare it line by line with samples/2d/04-platformer/main.js.
RUN:  cd ~/projects/kindling/docs/bridges/python && python3 -m venv .venv && . .venv/bin/activate
      pip install pygame-ce && python pygame_platformer.py
DOC:  docs/bridges/python.md
"""

import os

import pygame

from kindling_ideas import Body, FixedLoop, Keys, Tilemap, move_and_collide

WIDTH, HEIGHT, SCALE = 320, 180, 3
RUN_SPEED = 90        # pixels per second
JUMP_SPEED = 300
LEVEL = [
    "####################",
    "#..................#",
    "#..................#",
    "#..........###.....#",
    "#..................#",
    "#.....###..........#",
    "#..................#",
    "#..P...........##..#",
    "#..................#",
    "#..........#.......#",
    "####################",
]

level = Tilemap(LEVEL, tile_size=16)
start_row = next(i for i, row in enumerate(LEVEL) if "P" in row)
player = Body(x=LEVEL[start_row].index("P") * 16, y=start_row * 16, width=12, height=14, gravity=900)
keys = Keys()


def update(step_seconds):
    direction = ("right" in keys.held) - ("left" in keys.held)
    player.velocity_x = direction * RUN_SPEED
    if "jump" in keys.pressed and player.on_ground:
        player.velocity_y = -JUMP_SPEED
    move_and_collide(player, step_seconds, level)
    keys.end_step()   # forget "pressed" once this step has seen it


def render(screen):
    screen.fill((20, 22, 27))
    for row, line in enumerate(LEVEL):
        for column, character in enumerate(line):
            if character == "#":
                pygame.draw.rect(screen, (90, 96, 110), (column * 16, row * 16, 16, 16))
    pygame.draw.rect(screen, (255, 179, 71), (round(player.x), round(player.y), player.width, player.height))


KEY_TO_ACTION = {
    pygame.K_LEFT: "left", pygame.K_a: "left",
    pygame.K_RIGHT: "right", pygame.K_d: "right",
    pygame.K_SPACE: "jump", pygame.K_UP: "jump", pygame.K_w: "jump",
}


def main(max_frames=None):
    pygame.init()
    window = pygame.display.set_mode((WIDTH * SCALE, HEIGHT * SCALE))
    pygame.display.set_caption("Kindling ideas in pygame")
    screen = pygame.Surface((WIDTH, HEIGHT))      # draw small, scale up: crisp pixels
    clock = pygame.time.Clock()
    loop = FixedLoop(update, step_seconds=1 / 60)
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key in KEY_TO_ACTION:
                keys.key_down(KEY_TO_ACTION[event.key])
            elif event.type == pygame.KEYUP and event.key in KEY_TO_ACTION:
                keys.key_up(KEY_TO_ACTION[event.key])
        frame_seconds = clock.tick(144) / 1000   # milliseconds since last frame
        loop.advance(frame_seconds)
        render(screen)
        pygame.transform.scale(screen, window.get_size(), window)
        pygame.display.flip()
        frames += 1
        if max_frames and frames >= max_frames:
            running = False
    pygame.quit()
    return player


if __name__ == "__main__":
    main(int(os.environ.get("MAX_FRAMES", "0")) or None)
