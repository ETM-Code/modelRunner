#!/usr/bin/env bash
set -euo pipefail

ROOT="${RUNNER_TEMP:?}/p11-pdk"
SOURCE="$ROOT/source"
BUNDLE="$ROOT/bundle"
OUT="${RUNNER_TEMP:?}/p11-pdk-out"
PDK_REVISION='026824c7969ce6f4fc9678e6ca04b0a06a596c4b'

sudo apt-get update
sudo apt-get install -y --no-install-recommends python3-venv zstd
python3 -m venv "$ROOT/ciel-venv"
"$ROOT/ciel-venv/bin/pip" install --disable-pip-version-check 'ciel==2.6.1'
mkdir -p "$SOURCE" "$BUNDLE/pdk/sky130A/libs.tech" \
  "$BUNDLE/pdk/sky130A/libs.ref/sky130_fd_pr" "$BUNDLE/runtime" "$OUT"
"$ROOT/ciel-venv/bin/ciel" enable --pdk-root "$SOURCE" \
  --pdk-family sky130 "$PDK_REVISION" | tee "$BUNDLE/runtime/ciel-enable.log"
PDK="$SOURCE/sky130A"
test -f "$PDK/libs.tech/ngspice/sky130.lib.spice"
test -d "$PDK/libs.tech/combined/continuous"
cp -aL "$PDK/libs.tech/ngspice" "$BUNDLE/pdk/sky130A/libs.tech/"
cp -aL "$PDK/libs.tech/combined" "$BUNDLE/pdk/sky130A/libs.tech/"
cp -aL "$PDK/libs.ref/sky130_fd_pr/spice" "$BUNDLE/pdk/sky130A/libs.ref/sky130_fd_pr/"
export BUNDLE PDK_REVISION
python3 - <<'PY'
import hashlib
import json
import os
import platform
from pathlib import Path

bundle = Path(os.environ['BUNDLE'])
lib = bundle / 'pdk/sky130A/libs.tech/ngspice/sky130.lib.spice'
manifest = {
    'schema': 'p11.pdk.v1',
    'image_id': f"github-actions:ETM-Code/modelRunner:{os.environ['GITHUB_RUN_ID']}:{os.environ['GITHUB_RUN_ATTEMPT']}",
    'platform': platform.platform(),
    'pdk_family': 'sky130',
    'pdk_revision': os.environ['PDK_REVISION'],
    'sky130_lib_sha256': hashlib.sha256(lib.read_bytes()).hexdigest(),
}
(bundle / 'runtime/manifest.json').write_text(
    json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8'
)
PY
tar --zstd -cf "$OUT/p11-sky130-models.tar.zst" -C "$BUNDLE" .
sha256sum "$OUT/p11-sky130-models.tar.zst" > "$OUT/p11-sky130-models.tar.zst.sha256"
du -sh "$BUNDLE" "$OUT" | tee "$OUT/sizes.txt"
