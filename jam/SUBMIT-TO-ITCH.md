# Submit a Kindling game to itch.io

itch.io (<https://itch.io/>) hosts browser games for free, and most online jams take submissions there.

## 1. Check the rules first

Re-read the jam's rules page now: what may be pre-made, required credits, file formats, and whether you must **disclose AI-assisted tools**. Kindling was written with AI help; if the jam asks about AI use, say so in your submission and on your game page (for example: "Engine: Kindling, a public engine written with AI assistance before the jam. Game code, art and design made during the jam by me.").

## 2. Make the zip

```bash
cd ~/projects/kindling && ./jam/zip-game.sh ~/projects/my-jam-game
```

This puts `index.html` at the **top level** of `~/projects/my-jam-game.zip`, with `main.js` and `engine/` next to it. (Zipping the folder itself, so that `index.html` sits inside `my-jam-game/`, is the most common mistake; itch.io then cannot find the game.)

From WSL the zip is also visible to Windows at `\\wsl$\Ubuntu\home\YOUR-NAME\projects\` in File Explorer, or copy it to your Windows Downloads folder:

```bash
cd ~/projects && cp my-jam-game.zip /mnt/c/Users/YOUR-WINDOWS-NAME/Downloads/
```

## 3. Create the project on itch.io

1. Dashboard → **Create new project**.
2. **Kind of project:** HTML.
3. **Uploads:** upload the zip and tick **This file will be played in the browser**.
4. **Embed options:**
   - Viewport size: **960 × 540** (16:9; the game scales to fit any size).
   - Tick **Mobile friendly** (Kindling has touch controls) and **Fullscreen button**.
   - Leave **Automatically start on page load** off, so the browser lets sound play after the first click.
5. Title, short description, the controls, **cover image** (630 × 500) and 3 to 5 **screenshots**.
6. Credits: Kindling (MIT license), every asset and its license, and the AI disclosure if the jam requires it.
7. Visibility: **Draft** first.

## 4. Test the uploaded page

Open the draft page (there is a link at the top of the edit page) and check:

- [ ] The game appears, and keyboard input works after one click.
- [ ] Sound plays after the first click or key.
- [ ] Fullscreen works.
- [ ] On a phone: it fits, and touch controls work.
- [ ] The browser console (F12) shows no red errors.

If you see a blank frame, the zip almost certainly has `index.html` inside a folder; rebuild it with `zip-game.sh`.

## 5. Submit

Set visibility to **Public**, then go to the jam page and press **Submit your project**. Do it **two hours before the deadline**. You can usually still upload fixes for a short time after; check the jam's rules on post-deadline updates.
