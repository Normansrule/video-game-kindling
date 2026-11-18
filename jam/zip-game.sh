#!/usr/bin/env bash
# jam/zip-game.sh
# WHAT: Zip a jam game folder for itch.io, with index.html at the TOP of the zip.
# WHY:  itch.io looks for index.html at the top level. Zipping the folder itself (instead
#       of its contents) is the most common upload mistake. Uses python3, so the zip
#       tool does not need to be installed.
# USE:  cd ~/projects/kindling && ./jam/zip-game.sh ~/projects/my-jam-game
#       -> ~/projects/my-jam-game.zip
set -euo pipefail

folder="${1:-}"
if [[ -z "$folder" || ! -f "$folder/index.html" ]]; then
  echo "Usage: ./jam/zip-game.sh path/to/game-folder   (the folder must contain index.html)"
  exit 1
fi
folder="$(cd "$folder" && pwd)"
zip_path="$folder.zip"
rm -f "$zip_path"

python3 - "$folder" "$zip_path" <<'PYTHON'
import os, sys, zipfile
folder, zip_path = sys.argv[1], sys.argv[2]
count = 0
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
    for root, directories, files in os.walk(folder):
        directories[:] = [d for d in directories if not d.startswith(".")]   # skip .git and friends
        for name in files:
            if name.startswith("."):
                continue
            full = os.path.join(root, name)
            archive.write(full, os.path.relpath(full, folder))
            count += 1
print(f"{count} files")
PYTHON

size_kb=$(( $(stat -c %s "$zip_path") / 1024 ))
echo "Made $zip_path ($size_kb KB). Upload it to itch.io as an HTML game; see jam/SUBMIT-TO-ITCH.md."
