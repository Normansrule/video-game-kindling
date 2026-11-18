#!/usr/bin/env bash
# tiny/new-tiny-game.sh
# WHAT: Make a new size-limited game folder: Spark Hop plus its own copy of kindling-tiny.js.
# WHY:  Same idea as jam/new-game.sh, but for js13kGames-style jams where the zipped
#       game must stay under 13 KB, so it copies the 2 KB tiny engine, not the full one.
# USE:  cd ~/projects/kindling && bash tiny/new-tiny-game.sh my-tiny-game           -> ~/projects/my-tiny-game
#       cd ~/projects/kindling && bash tiny/new-tiny-game.sh my-tiny-game ~/games   -> ~/games/my-tiny-game
set -euo pipefail

name="${1:-}"
parent="${2:-$HOME/projects}"
if [[ -z "$name" || ! "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Usage: bash tiny/new-tiny-game.sh my-game-name [parent-folder]"
  echo "The name uses lowercase letters, digits and dashes, like: spark-hop"
  exit 1
fi

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
destination="$parent/$name"
if [[ -e "$destination" ]]; then
  echo "Stopped: $destination already exists. Pick another name, or remove that folder first."
  exit 1
fi

mkdir -p "$destination"
cp "$repo/tiny/starter/index.html" "$repo/tiny/starter/main.js" "$destination/"
cp "$repo/tiny/kindling-tiny.js" "$destination/"
# The in-repo starter reaches up a folder for the engine; the new game has its own copy.
# Its own save slot too, so two games never share a best score.
sed -i.bak 's#"../kindling-tiny.js"#"./kindling-tiny.js"#; s#spark-hop-best#'"$name"'-best#g' "$destination/main.js"
sed -i.bak "s#<title>Spark Hop</title>#<title>$name</title>#" "$destination/index.html"
rm -f "$destination/main.js.bak" "$destination/index.html.bak"

echo "Made $destination"
echo "Run it:   cd $destination && python3 -m http.server 8000   then open http://localhost:8000/"
echo "Pack it:  cd $repo && node tiny/pack.mjs $destination"
