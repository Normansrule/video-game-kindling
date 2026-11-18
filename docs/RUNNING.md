# Running Kindling

## One way to run everything

Browsers refuse to load JavaScript modules (and `fetch()`) from pages opened straight from disk (`file://`). So **double-clicking `index.html` does not work**. Always start a tiny local web server from the repo root:

```bash
cd ~/projects/kindling && python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Stop the server with `Ctrl+C`. The same files are online at <https://normansrule.github.io/kindling/>.

On WSL (Windows Subsystem for Linux), open the address in your normal Windows browser; WSL forwards `localhost` for you.

## How a page finds the engine: the import map

Every page that uses the engine has an import map. It gives the engine folder a nickname, `kindling/`, written as a path **relative to that page**:

```html
<!-- samples/00-hello/index.html -->
<script type="importmap">
  { "imports": { "kindling/": "../../engine/" } }
</script>
<script type="module">
  import { describeEngine } from "kindling/core/version.js";
  // the browser turns that into ../../engine/core/version.js
</script>
```

Why not write `/engine/core/version.js`? A path starting with `/` means "from the top of the website". On your machine the top is the repo, but on GitHub Pages the site lives at `/kindling/` and on itch.io it lives in a random folder, so `/engine/` would point at nothing. A relative path in the import map works in all three places.

Rules:

1. The import map comes **before** any `<script type="module">`.
2. Only one import map per page.
3. Pages use `kindling/...`. Engine files import each other with plain relative paths (`./time.js`), so the engine folder works wherever you copy it.

| Page lives in | Import map value |
|---|---|
| `index.html` (repo root) | `"./engine/"` |
| `samples/00-hello/index.html` | `"../../engine/"` |
| a jam game folder with its own `engine/` copy | `"./engine/"` |

## Running the tests

- In the browser: start the server, open <http://localhost:8000/tests/>.
- In the terminal (needs Node.js 20 or newer, optional): `cd ~/projects/kindling && node --test tests/node.test.js`

Both run the same checks from `tests/checks/`.
