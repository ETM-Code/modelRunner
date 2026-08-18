#!/usr/bin/env bash
set -Eeuo pipefail

export DEBIAN_FRONTEND=noninteractive
export LC_ALL=C

WORK=/work
OUT=/out
LOGS="$WORK/logs"
mkdir -p "$WORK" "$OUT" "$LOGS"

exec > >(tee "$OUT/harness.log") 2>&1

copy_logs() {
  mkdir -p "$OUT/build-logs"
  if [[ -d "$LOGS" ]]; then
    cp -a "$LOGS/." "$OUT/build-logs/" 2>/dev/null || true
  fi
}

finish() {
  rc=$?
  copy_logs
  printf '%s\n' "$rc" > "$OUT/harness-exit-code.txt"
  find "$OUT" -type f -print0 | sort -z | xargs -0 sha256sum > "$OUT/sha256sums.txt" 2>/dev/null || true
  exit "$rc"
}
trap finish EXIT

XYCE_VERSION=7.10
XYCE_SOURCE_URL=https://xyce.sandia.gov/download/1812/
XYCE_SOURCE_SHA256=93027b1e7dc195538bfb1886f07057ccd6d4be19b7b45943475108c7fb1e587b
XYCE_RELEASE_COMMIT=a592a42ae7472151d1c8e3bca0ca62d27476f2f3

TRILINOS_COMMIT=975307431d60d0859ebaa27c9169cbb1d4287513
TRILINOS_SOURCE_URL="https://codeload.github.com/trilinos/Trilinos/tar.gz/${TRILINOS_COMMIT}"
TRILINOS_SOURCE_SHA256=56ccacb1ae0033d85b19f71dc1945a4aaf3d43ab17b8f7f0bde6ee4a21f33cfe

SUITESPARSE_COMMIT=d3c4926d2c47fd6ae558e898bfc072ade210a2a1
SUITESPARSE_SOURCE_URL="https://codeload.github.com/DrTimothyAldenDavis/SuiteSparse/tar.gz/${SUITESPARSE_COMMIT}"
SUITESPARSE_SOURCE_SHA256=d1ddf6027190821091198682a6b880cd5cb905fece9bf81aaa5379b415ab32c9

ADMS_VERSION=2.3.7
ADMS_RELEASE_TAG=release-2.3.7
ADMS_RELEASE_COMMIT=06e1a6cbe1979db94c49e34bc47c0dbe304883db
ADMS_SOURCE_URL="https://codeload.github.com/Qucs/ADMS/tar.gz/refs/tags/${ADMS_RELEASE_TAG}"
ADMS_SOURCE_SHA256=0d24f645d7ce0daa447af1b0cff1123047f3b73cc41cf403650f469721f95173

RERAM_VERSION=2.0.3
RERAM_RELEASE_COMMIT=6574676cbbd062d63be0f090013d59ced7302349
RERAM_SOURCE_URL="https://raw.githubusercontent.com/google/skywater-pdk-libs-sky130_fd_pr_reram/v${RERAM_VERSION}/cells/reram_cell/sky130_fd_pr_reram__reram_cell.va"
RERAM_SOURCE_SHA256=11e1258955f4f3656647ec7f3049f294ae767142d9c27cac5ba1db1cb35c8320

PDK_VERSION=026824c7969ce6f4fc9678e6ca04b0a06a596c4b

cat > "$OUT/source-pins.txt" <<EOF
Xyce version: ${XYCE_VERSION}.0
Xyce release commit: ${XYCE_RELEASE_COMMIT}
Xyce archive SHA-256: ${XYCE_SOURCE_SHA256}
Trilinos commit: ${TRILINOS_COMMIT}
Trilinos archive SHA-256: ${TRILINOS_SOURCE_SHA256}
SuiteSparse commit: ${SUITESPARSE_COMMIT}
SuiteSparse archive SHA-256: ${SUITESPARSE_SOURCE_SHA256}
ADMS version: ${ADMS_VERSION}
ADMS release commit: ${ADMS_RELEASE_COMMIT}
ADMS archive SHA-256: ${ADMS_SOURCE_SHA256}
sky130_fd_pr_reram version: ${RERAM_VERSION}
sky130_fd_pr_reram release commit: ${RERAM_RELEASE_COMMIT}
sky130_fd_pr_reram cell SHA-256: ${RERAM_SOURCE_SHA256}
sky130 PDK version: ${PDK_VERSION}
EOF

apt-get update > "$LOGS/apt-update.log"
apt-get install -y --no-install-recommends \
  build-essential bison flex curl ca-certificates \
  cmake ninja-build gfortran \
  libblas-dev liblapack-dev libfftw3-dev libfl-dev \
  bc libxml2-dev libxml-libxml-perl \
  git pkg-config \
  > "$LOGS/apt-install.log"

curl -fL --retry 5 -o "$WORK/Xyce-${XYCE_VERSION}.tar.gz" "$XYCE_SOURCE_URL"
curl -fL --retry 5 -o "$WORK/Trilinos.tar.gz" "$TRILINOS_SOURCE_URL"
curl -fL --retry 5 -o "$WORK/SuiteSparse.tar.gz" "$SUITESPARSE_SOURCE_URL"
curl -fL --retry 5 -o "$WORK/ADMS-${ADMS_VERSION}.tar.gz" "$ADMS_SOURCE_URL"
curl -fL --retry 5 -o "$WORK/sky130_fd_pr_reram__reram_cell.va" "$RERAM_SOURCE_URL"

echo "${XYCE_SOURCE_SHA256}  $WORK/Xyce-${XYCE_VERSION}.tar.gz" | sha256sum -c -
echo "${TRILINOS_SOURCE_SHA256}  $WORK/Trilinos.tar.gz" | sha256sum -c -
echo "${SUITESPARSE_SOURCE_SHA256}  $WORK/SuiteSparse.tar.gz" | sha256sum -c -
echo "${ADMS_SOURCE_SHA256}  $WORK/ADMS-${ADMS_VERSION}.tar.gz" | sha256sum -c -
echo "${RERAM_SOURCE_SHA256}  $WORK/sky130_fd_pr_reram__reram_cell.va" | sha256sum -c -

tar -xzf "$WORK/Xyce-${XYCE_VERSION}.tar.gz" -C "$WORK"
tar -xzf "$WORK/Trilinos.tar.gz" -C "$WORK"
tar -xzf "$WORK/SuiteSparse.tar.gz" -C "$WORK"
tar -xzf "$WORK/ADMS-${ADMS_VERSION}.tar.gz" -C "$WORK"

cmake -S "$WORK/ADMS-${ADMS_RELEASE_TAG}" -B "$WORK/adms-build" -G Ninja \
  -D CMAKE_BUILD_TYPE=Release \
  -D CMAKE_INSTALL_PREFIX=/usr/local \
  > "$LOGS/adms-configure.log" 2>&1
cmake --build "$WORK/adms-build" -j2 -t install \
  > "$LOGS/adms-build.log" 2>&1 \
  || { tail -n 240 "$LOGS/adms-build.log"; exit 1; }
command -v admsXml
admsXml -v > "$OUT/adms-version.txt" 2>&1 || true

cmake -S "$WORK/SuiteSparse-${SUITESPARSE_COMMIT}" -B "$WORK/suitesparse-build" -G Ninja \
  -D CMAKE_BUILD_TYPE=Release \
  -D CMAKE_INSTALL_PREFIX=/opt/suitesparse \
  -D SUITESPARSE_ENABLE_PROJECTS="suitesparse_config;amd" \
  -D BUILD_SHARED_LIBS=ON \
  > "$LOGS/suitesparse-configure.log" 2>&1
cmake --build "$WORK/suitesparse-build" -j2 -t install \
  > "$LOGS/suitesparse-build.log" 2>&1 \
  || { tail -n 240 "$LOGS/suitesparse-build.log"; exit 1; }

TRILINOS_HEADER="$WORK/Trilinos-${TRILINOS_COMMIT}/packages/kokkos-kernels/sparse/src/KokkosSparse_spadd_handle.hpp"
test "$(sha256sum "$TRILINOS_HEADER" | cut -d' ' -f1)" \
  = "3ea7e98bfa5709d65d597d16797d3330f89d631552a377b94922826db813c22d"
sed -i '/void set_sort_option(int option)/,+3d' "$TRILINOS_HEADER"
test "$(sha256sum "$TRILINOS_HEADER" | cut -d' ' -f1)" \
  = "bc9eca5f975d418a378f048913125b41a6a609062b1fe543430f77eacdc7962d"

cmake -S "$WORK/Trilinos-${TRILINOS_COMMIT}" -B "$WORK/trilinos-build" -G Ninja \
  -C "$WORK/Xyce-${XYCE_VERSION}/cmake/trilinos/trilinos-base.cmake" \
  -D CMAKE_BUILD_TYPE=Release \
  -D CMAKE_INSTALL_PREFIX=/opt/trilinos \
  -D CMAKE_PREFIX_PATH=/opt/suitesparse \
  -D AMD_LIBRARY_DIRS=/opt/suitesparse/lib \
  -D AMD_INCLUDE_DIRS=/opt/suitesparse/include/suitesparse \
  -D TPL_AMD_LIBRARY_DIRS=/opt/suitesparse/lib \
  -D TPL_AMD_INCLUDE_DIRS=/opt/suitesparse/include/suitesparse \
  -D CMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -D TPL_ENABLE_MPI=OFF \
  > "$LOGS/trilinos-configure.log" 2>&1
cmake --build "$WORK/trilinos-build" -j2 -t install \
  > "$LOGS/trilinos-build.log" 2>&1 \
  || { tail -n 240 "$LOGS/trilinos-build.log"; exit 1; }

cmake -S "$WORK/Xyce-${XYCE_VERSION}" -B "$WORK/xyce-build" -G Ninja \
  -D CMAKE_BUILD_TYPE=Release \
  -D CMAKE_INSTALL_PREFIX=/usr/local \
  -D Trilinos_ROOT=/opt/trilinos \
  -D CMAKE_PREFIX_PATH=/opt/suitesparse \
  -D Xyce_PLUGIN_SUPPORT=ON \
  -D BUILD_SHARED_LIBS=ON \
  > "$LOGS/xyce-configure.log" 2>&1
cmake --build "$WORK/xyce-build" -j2 -t install \
  > "$LOGS/xyce-build.log" 2>&1 \
  || { tail -n 240 "$LOGS/xyce-build.log"; exit 1; }

Xyce -v > "$OUT/xyce-version.txt" 2>&1
sha256sum /usr/local/bin/Xyce > "$OUT/xyce-executable-sha256.txt"
test -x /usr/local/bin/buildxyceplugin.sh
ln -s /usr/local/bin/buildxyceplugin.sh /usr/local/bin/buildxyceplugin
command -v buildxyceplugin > "$OUT/buildxyceplugin-path.txt"
sha256sum /usr/local/bin/buildxyceplugin.sh /usr/local/bin/admsXml \
  > "$OUT/plugin-toolchain-sha256.txt"

PLUGIN_DIR="$WORK/plugin"
mkdir -p "$PLUGIN_DIR"
(
  cd "$PLUGIN_DIR"
  buildxyceplugin -o rram2 "$WORK/sky130_fd_pr_reram__reram_cell.va" "$PLUGIN_DIR" \
    > "$OUT/buildxyceplugin.stdout.txt" 2> "$OUT/buildxyceplugin.stderr.txt"
)
cp "$PLUGIN_DIR/buildxyceplugin.log" "$OUT/buildxyceplugin.log"
find "$PLUGIN_DIR" -maxdepth 2 -type f -printf '%P\n' | sort > "$OUT/plugin-files.txt"
test -s "$PLUGIN_DIR/rram2.so"
sha256sum "$PLUGIN_DIR/rram2.so" > "$OUT/rram2-plugin-sha256.txt"

mkdir -p "$WORK/decks"
cat > "$WORK/decks/set.cir" <<'EOF'
* Direct-cell SET characterisation through the v2.0.3 rram2 plugin.
.model rram2_model rram2 Tfilament_0=3.3e-9 t_step=1.0e-9
VDRV TE 0 2.4
Yrram2 res0 TE 0 rram2_model
.tran 1ns 1us 0 1ns
.print tran format=csv precision=16 V(TE) I(VDRV)
.end
EOF
cat > "$WORK/decks/reset.cir" <<'EOF'
* Direct-cell RESET characterisation through the v2.0.3 rram2 plugin.
.model rram2_model rram2 Tfilament_0=4.9e-9 t_step=1.0e-9
VDRV TE 0 -2.6
Yrram2 res0 TE 0 rram2_model
.tran 1ns 1us 0 1ns
.print tran format=csv precision=16 V(TE) I(VDRV)
.end
EOF
cat > "$WORK/decks/read-low.cir" <<'EOF'
* Read current at the public model's minimum filament state.
.model rram2_model rram2 Tfilament_0=3.3e-9 t_step=1.0e-9
VDRV TE 0 0.2
Yrram2 res0 TE 0 rram2_model
.tran 1ps 1ps 0 1ps
.print tran format=csv precision=16 V(TE) I(VDRV)
.end
EOF
cat > "$WORK/decks/read-high.cir" <<'EOF'
* Read current at the public model's maximum filament state.
.model rram2_model rram2 Tfilament_0=4.9e-9 t_step=1.0e-9
VDRV TE 0 0.2
Yrram2 res0 TE 0 rram2_model
.tran 1ps 1ps 0 1ps
.print tran format=csv precision=16 V(TE) I(VDRV)
.end
EOF

run_direct_case() {
  name=$1
  mkdir -p "$OUT/$name"
  cp "$WORK/decks/$name.cir" "$OUT/$name/$name.cir"
  set +e
  (
    cd "$OUT/$name"
    Xyce -plugin "$PLUGIN_DIR/rram2.so" \
      -l xyce.log -r "$name.raw" "$name.cir" \
      > stdout.txt 2> stderr.txt
  )
  rc=$?
  set -e
  printf '%s\n' "$rc" > "$OUT/$name/exit-code.txt"
}

run_direct_case set
run_direct_case reset
run_direct_case read-low
run_direct_case read-high

cat > "$WORK/compare.py" <<'PY'
from __future__ import annotations

import csv
import json
import math
from pathlib import Path

OUT = Path('/out')
TARGETS = {
    'set_energy_pj': 13544.2,
    'reset_energy_pj': 69.875,
    'read_low_ua': 0.06130891388748866,
    'read_high_ua': 20.57829443944576,
}
TOLERANCE_REL = 0.01


def load_case(name: str):
    case = OUT / name
    csvs = sorted(case.glob('*.csv'))
    if not csvs:
        raise RuntimeError(f'{name}: no Xyce CSV output; exit={case.joinpath("exit-code.txt").read_text().strip()}')
    with csvs[0].open(newline='', encoding='utf-8') as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    if not rows:
        raise RuntimeError(f'{name}: empty Xyce CSV output')
    keys = {key.strip().upper(): key for key in rows[0]}
    time_key = next((orig for norm, orig in keys.items() if norm == 'TIME'), None)
    voltage_key = next((orig for norm, orig in keys.items() if norm == 'V(TE)'), None)
    current_key = next((orig for norm, orig in keys.items() if norm == 'I(VDRV)'), None)
    if not (time_key and voltage_key and current_key):
        raise RuntimeError(f'{name}: unexpected CSV columns {list(rows[0])}')
    parsed = []
    for row in rows:
        t = float(row[time_key])
        v = float(row[voltage_key])
        i = float(row[current_key])
        if math.isfinite(t) and math.isfinite(v) and math.isfinite(i):
            parsed.append((t, v, i))
    parsed.sort(key=lambda item: item[0])
    return parsed, csvs[0].name


def right_rectangle_energy_j(points):
    total = 0.0
    for previous, current in zip(points, points[1:]):
        dt = current[0] - previous[0]
        if dt > 0.0:
            total += abs(current[1] * current[2]) * dt
    return total


observed = {}
metadata = {}
errors = []
for name in ('set', 'reset', 'read-low', 'read-high'):
    try:
        points, csv_name = load_case(name)
        metadata[name] = {
            'csv': csv_name,
            'points': len(points),
            't_start_s': points[0][0],
            't_stop_s': points[-1][0],
            'peak_current_a': max(abs(point[2]) for point in points),
        }
        if name == 'set':
            observed['set_energy_pj'] = right_rectangle_energy_j(points) * 1e12
        elif name == 'reset':
            observed['reset_energy_pj'] = right_rectangle_energy_j(points) * 1e12
        elif name == 'read-low':
            observed['read_low_ua'] = abs(points[0][2]) * 1e6
        elif name == 'read-high':
            observed['read_high_ua'] = abs(points[0][2]) * 1e6
    except Exception as exc:
        errors.append(str(exc))

rows = []
for metric, target in TARGETS.items():
    value = observed.get(metric)
    if value is None:
        rows.append({
            'metric': metric,
            'mirror_target': target,
            'xyce_value': None,
            'absolute_delta': None,
            'relative_delta_percent': None,
            'tolerance_percent': TOLERANCE_REL * 100.0,
            'verdict': 'NO_RESULT',
        })
        continue
    delta = value - target
    rel = abs(delta) / abs(target) if target else math.inf
    rows.append({
        'metric': metric,
        'mirror_target': target,
        'xyce_value': value,
        'absolute_delta': delta,
        'relative_delta_percent': rel * 100.0,
        'tolerance_percent': TOLERANCE_REL * 100.0,
        'verdict': 'PASS' if rel <= TOLERANCE_REL else 'FAIL',
    })

with (OUT / 'comparison.csv').open('w', newline='', encoding='utf-8') as handle:
    writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)

summary = {
    'integration': 'right-endpoint rectangle over accepted Xyce time points, matching the Python mirror update-and-accumulate order',
    'relative_tolerance': TOLERANCE_REL,
    'targets': TARGETS,
    'observed': observed,
    'metadata': metadata,
    'errors': errors,
    'rows': rows,
    'overall_verdict': 'PASS' if rows and all(row['verdict'] == 'PASS' for row in rows) else 'FAIL',
}
(OUT / 'comparison.json').write_text(json.dumps(summary, indent=2, sort_keys=True) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2, sort_keys=True))
PY
python "$WORK/compare.py" > "$OUT/comparison.stdout.json" 2> "$OUT/comparison.stderr.txt" || true

# Free build trees before installing the pinned sky130 PDK.
copy_logs
rm -rf \
  "$WORK/adms-build" "$WORK/suitesparse-build" "$WORK/trilinos-build" "$WORK/xyce-build" \
  "$WORK/ADMS-${ADMS_RELEASE_TAG}" "$WORK/SuiteSparse-${SUITESPARSE_COMMIT}" \
  "$WORK/Trilinos-${TRILINOS_COMMIT}" "$WORK/Xyce-${XYCE_VERSION}" \
  "$WORK/ADMS-${ADMS_VERSION}.tar.gz" "$WORK/SuiteSparse.tar.gz" \
  "$WORK/Trilinos.tar.gz" "$WORK/Xyce-${XYCE_VERSION}.tar.gz"

git ls-remote https://github.com/google/skywater-pdk.git "$PDK_VERSION" \
  > "$OUT/pdk-ls-remote.txt" 2>&1 || true
python -m pip install --no-cache-dir 'ciel==2.6.1' > "$OUT/ciel-install.log" 2>&1
ciel --version > "$OUT/ciel-version.txt" 2>&1 || true
mkdir -p "$WORK/pdk"
set +e
ciel enable --pdk-root "$WORK/pdk" --pdk-family sky130 "$PDK_VERSION" \
  > "$OUT/pdk-enable.stdout.txt" 2> "$OUT/pdk-enable.stderr.txt"
pdk_rc=$?
set -e
printf '%s\n' "$pdk_rc" > "$OUT/pdk-enable-exit-code.txt"

cat > "$OUT/1T1R.spice" <<'EOF'
* SkyWater public ReRAM example, retained as a Xyce-plugin deck.
* Source: google/skywater-pdk-libs-sky130_fd_pr_reram/examples/1T1R/1T1R.spice
* The original Lepton EDA banner was replaced by this provenance comment.
.lib "$PDK_ROOT/sky130A/libs.tech/ngspice/sky130.lib.spice" tt
.model rram2_model rram2 rram2_params.scs

.print TRAN FORMAT=RAW V(VDD) V(0) I(Vsl) V(BL - BE) V(BL) V(WL) V(sl) V(BE)
.tran 0.01ns 50ns

VVDD VDD 0 1.8V
Vbl bl 0 pwl 1ns 0V 10ns 0V 15ns 3V 20ns 0V
Vsl sl 0 pwl 0ns 0V 30ns 0V 35ns 3V 40ns 0V 50ns 0V
Vwl wl 0 pwl 0ns 0V 8ns 0V 9ns 1V 21ns 1V 22ns 0V 28ns 0V 29ns 3V 41ns 3V 42ns 0V 50ns 0V
Xwl BE wl sl 0 sky130_fd_pr__nfet_01v8 l=0.15 w=7.0
Yrram2 res0 bl BE rram2_model
.END
EOF
sed 's/^\.model rram2_model rram2 rram2_params\.scs$/.model rram2_model rram2/' \
  "$OUT/1T1R.spice" > "$OUT/1T1R.closest.spice"

run_1t1r() {
  deck=$1
  stem=$2
  set +e
  (
    cd "$OUT"
    PDK_ROOT="$WORK/pdk" Xyce -plugin "$PLUGIN_DIR/rram2.so" \
      -l "$stem.log" -r "$stem.raw" "$deck" \
      > "$stem.stdout.txt" 2> "$stem.stderr.txt"
  )
  rc=$?
  set -e
  printf '%s\n' "$rc" > "$OUT/$stem.exit-code.txt"
}

if [[ "$pdk_rc" -eq 0 ]]; then
  run_1t1r 1T1R.spice 1T1R
  run_1t1r 1T1R.closest.spice 1T1R.closest
else
  printf '%s\n' 'SKIPPED: pinned PDK installation failed; see pdk-enable stderr.' \
    > "$OUT/1T1R.skip.txt"
fi

# The characterisation result is allowed to fail its declared numerical tolerance,
# but the executable lane itself must have produced all four direct-cell outputs.
for case_name in set reset read-low read-high; do
  test "$(cat "$OUT/$case_name/exit-code.txt")" = 0
done
