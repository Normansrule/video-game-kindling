#!/usr/bin/env bash
# jam/new-game.sh
# WHAT: Make a new jam game folder: the starter game plus its own copy of the engine.
# WHY:  A jam game must work on its own once zipped and uploaded to itch.io, so it
#       carries the engine with it (docs/DECISIONS.md, D3). The repo itself never
#       contains a second copy of the engine.
# USE:  cd ~/projects/kindling && ./jam/new-game.sh my-jam-game            -> ~/projects/my-jam-game
#       cd ~/projects/kindling && ./jam/new-game.sh my-jam-game ~/games    -> ~/games/my-jam-game
set -euo pipefail

name="${1:-}"
parent="${2:-$HOME/projects}"
if [[ -z "$name" || ! "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Usage: ./jam/new-game.sh my-game-name [parent-folder]"
  echo "The name uses lowercase letters, digits and dashes, like: sinking-city"
  exit 1
fi

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
destination="$parent/$name"
if [[ -e "$destination" ]]; then
  echo "Stopped: $destination already exists. Pick another name, or remove that folder first."
  exit 1
fi

mkdir -p "$destination"
cp -R "$repo/jam/starter/." "$destination/"
cp -R "$repo/engine" "$destination/engine"
cp "$repo/LICENSE" "$destination/engine/LICENSE"
# Give the game its own save slot and title, so two jam games never share a best score.
sed -i.bak "s/my-kindling-game/$name/; s/const TITLE = \"DODGE\"/const TITLE = \"$(echo "$name" | tr '[:lower:]-' '[:upper:] ')\"/" "$destination/main.js"
sed -i.bak "s/<title>My Kindling Game<\/title>/<title>$name<\/title>/" "$destination/index.html"
rm -f "$destination/main.js.bak" "$destination/index.html.bak"

echo "Made $destination"
echo "Run it:   cd $destination && python3 -m http.server 8000   then open http://localhost:8000/"
echo "Zip it:   cd $repo && ./jam/zip-game.sh $destination"
