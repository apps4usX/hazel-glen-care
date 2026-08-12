#!/usr/bin/env bash
# Generate the 5 Hazel Glen Care senior-care images via the Higgsfield CLI.
# Run on YOUR machine (the CLI needs network + a browser login):
#   curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh -s -- --prefix=$HOME/.local
#   higgsfield auth login
#   bash generate-hazel-images.sh
#
# Model: Soul 2.0 (text2image_soul_v2) — best for warm editorial people shots.
# Each command blocks (--wait) and prints the result image URL.
set -euo pipefail
OUT="./hazel-images"; mkdir -p "$OUT"
MODEL="text2image_soul_v2"
COMMON="soft navy-blue scrubs uniform with a small round embroidered chest badge and subtle teal piping, warm natural window light, soft warm colour grading, authentic, photorealistic, premium healthcare brand photography"

gen () { # $1 name  $2 aspect  $3 prompt
  echo "▶ $1"
  higgsfield generate create "$MODEL" --aspect_ratio "$2" --quality 2k --wait \
    --prompt "$3" | tee "$OUT/$1.url.txt"
}

gen hero        4:5 "A caring young Black South African female nurse gently holding the hand of a happy elderly white South African woman in a bright sunlit living room, genuine warm smiles, shallow depth of field, $COMMON"
gen nursing     3:2 "A small diverse South African nursing team standing together in a bright modern care facility — a Black man, an Indian woman, a white woman and a Coloured man, confident and friendly, matching uniforms, $COMMON"
gen dementia    3:2 "A patient young mixed-race South African female carer sitting beside and gently reassuring an elderly Black South African man in a calm softly lit room, compassionate and dignified, $COMMON"
gen homecare    3:2 "A kind Indian South African male carer helping an elderly Black South African woman hold a cup of tea at a cosy home dining table, both smiling warmly, companionship, $COMMON"
gen welcome     4:5 "A heartwarming multi-generational South African family gathered warmly at home with their carer, a diverse rainbow-nation group of different ages and races together, an elderly woman at the centre, joyful and inclusive, $COMMON"

echo "✅ Done. Image URLs are in $OUT/*.url.txt"
echo "Download each, then drop them into the homepage placeholders (hero, 3 service cards, welcome)."
