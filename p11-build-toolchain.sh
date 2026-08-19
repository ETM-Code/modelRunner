#!/usr/bin/env bash
set -euo pipefail

ROOT="${RUNNER_TEMP:?}/p11-toolchain"
SRC="$ROOT/src"
PREFIX="$ROOT/prefix"
LOGS="$ROOT/logs"
OUT="${RUNNER_TEMP:?}/p11-toolchain-out"
XYCE_VERSION=7.10
XYCE_SOURCE_URL='https://xyce.sandia.gov/download/1812/'
XYCE_SOURCE_SHA256='93027b1e7dc195538bfb1886f07057ccd6d4be19b7b45943475108c7fb1e587b'
TRILINOS_COMMIT='975307431d60d0859ebaa27c9169cbb1d4287513'
TRILINOS_SOURCE_SHA256='56ccacb1ae0033d85b19f71dc1945a4aaf3d43ab17b8f7f0bde6ee4a21f33cfe'
SUITESPARSE_COMMIT='d3c4926d2c47fd6ae558e898bfc072ade210a2a1'
SUITESPARSE_SOURCE_SHA256='d1ddf6027190821091198682a6b880cd5cb905fece9bf81aaa5379b415ab32c9'
ADMS_VERSION=2.3.7
ADMS_SOURCE_SHA256='0d24f645d7ce0daa447af1b0cff1123047f3b73cc41cf403650f469721f95173'

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  build-essential bison flex curl ca-certificates cmake ninja-build gfortran \
  libblas-dev liblapack-dev libfftw3-dev libfl-dev bc libxml-libxml-perl \
  autoconf automake libtool pkg-config zstd
mkdir -p "$SRC" "$PREFIX" "$LOGS" "$OUT"
cd "$SRC"

curl -fL --retry 5 -o "Xyce-${XYCE_VERSION}.tar.gz" "$XYCE_SOURCE_URL"
echo "$XYCE_SOURCE_SHA256  Xyce-${XYCE_VERSION}.tar.gz" | sha256sum -c -
curl -fL --retry 5 -o Trilinos.tar.gz \
  "https://codeload.github.com/trilinos/Trilinos/tar.gz/${TRILINOS_COMMIT}"
echo "$TRILINOS_SOURCE_SHA256  Trilinos.tar.gz" | sha256sum -c -
curl -fL --retry 5 -o SuiteSparse.tar.gz \
  "https://codeload.github.com/DrTimothyAldenDavis/SuiteSparse/tar.gz/${SUITESPARSE_COMMIT}"
echo "$SUITESPARSE_SOURCE_SHA256  SuiteSparse.tar.gz" | sha256sum -c -
curl -fL --retry 5 -o "ADMS-${ADMS_VERSION}.tar.gz" \
  "https://codeload.github.com/Qucs/ADMS/tar.gz/refs/tags/release-${ADMS_VERSION}"
echo "$ADMS_SOURCE_SHA256  ADMS-${ADMS_VERSION}.tar.gz" | sha256sum -c -
curl -fL --retry 5 -o ngspice-47.tar.gz \
  'https://downloads.sourceforge.net/project/ngspice/ng-spice-rework/47/ngspice-47.tar.gz'
sha256sum ngspice-47.tar.gz > "$LOGS/ngspice-source-sha256.txt"
tar -xzf "Xyce-${XYCE_VERSION}.tar.gz"
tar -xzf Trilinos.tar.gz
tar -xzf SuiteSparse.tar.gz
tar -xzf "ADMS-${ADMS_VERSION}.tar.gz"
tar -xzf ngspice-47.tar.gz

SS="$PREFIX/suitesparse"
TRI="$PREFIX/trilinos"
XY="$PREFIX/xyce"
AD="$PREFIX/adms"
NG="$PREFIX/ngspice"
cmake -S "$SRC/SuiteSparse-${SUITESPARSE_COMMIT}" -B "$ROOT/suitesparse-build" -G Ninja \
  -D CMAKE_BUILD_TYPE=Release -D CMAKE_INSTALL_PREFIX="$SS" \
  -D 'SUITESPARSE_ENABLE_PROJECTS=suitesparse_config;amd' -D BUILD_SHARED_LIBS=ON \
  > "$LOGS/suitesparse-configure.log"
cmake --build "$ROOT/suitesparse-build" -j2 -t install > "$LOGS/suitesparse-build.log"

PATCH_TARGET="$SRC/Trilinos-${TRILINOS_COMMIT}/packages/kokkos-kernels/sparse/src/KokkosSparse_spadd_handle.hpp"
test "$(sha256sum "$PATCH_TARGET" | cut -d' ' -f1)" = \
  '3ea7e98bfa5709d65d597d16797d3330f89d631552a377b94922826db813c22d'
sed -i '/void set_sort_option(int option)/,+3d' "$PATCH_TARGET"
test "$(sha256sum "$PATCH_TARGET" | cut -d' ' -f1)" = \
  'bc9eca5f975d418a378f048913125b41a6a609062b1fe543430f77eacdc7962d'
cmake -S "$SRC/Trilinos-${TRILINOS_COMMIT}" -B "$ROOT/trilinos-build" -G Ninja \
  -C "$SRC/Xyce-${XYCE_VERSION}/cmake/trilinos/trilinos-base.cmake" \
  -D CMAKE_BUILD_TYPE=Release -D CMAKE_INSTALL_PREFIX="$TRI" \
  -D CMAKE_PREFIX_PATH="$SS" -D AMD_LIBRARY_DIRS="$SS/lib" \
  -D AMD_INCLUDE_DIRS="$SS/include/suitesparse" \
  -D TPL_AMD_LIBRARY_DIRS="$SS/lib" \
  -D TPL_AMD_INCLUDE_DIRS="$SS/include/suitesparse" \
  -D CMAKE_POLICY_VERSION_MINIMUM=3.5 -D TPL_ENABLE_MPI=OFF \
  > "$LOGS/trilinos-configure.log"
cmake --build "$ROOT/trilinos-build" -j2 -t install > "$LOGS/trilinos-build.log" || {
  tail -n 300 "$LOGS/trilinos-build.log"
  exit 1
}

cmake -S "$SRC/Xyce-${XYCE_VERSION}" -B "$ROOT/xyce-build" -G Ninja \
  -D CMAKE_BUILD_TYPE=Release -D CMAKE_INSTALL_PREFIX="$XY" \
  -D Trilinos_ROOT="$TRI" -D CMAKE_PREFIX_PATH="$SS" > "$LOGS/xyce-configure.log"
cmake --build "$ROOT/xyce-build" -j2 -t install > "$LOGS/xyce-build.log"
cmake -S "$SRC/ADMS-release-${ADMS_VERSION}" -B "$ROOT/adms-build" -G Ninja \
  -D CMAKE_BUILD_TYPE=Release -D CMAKE_INSTALL_PREFIX="$AD" \
  -D CMAKE_POLICY_VERSION_MINIMUM=3.5 > "$LOGS/adms-configure.log"
cmake --build "$ROOT/adms-build" -j2 -t install > "$LOGS/adms-build.log" || {
  tail -n 300 "$LOGS/adms-build.log"
  exit 1
}
export PATH="$AD/bin:$PATH"
cmake -S "$SRC/Xyce-${XYCE_VERSION}" -B "$ROOT/xyce-build" -G Ninja \
  -D CMAKE_BUILD_TYPE=Release -D CMAKE_INSTALL_PREFIX="$XY" \
  -D Trilinos_ROOT="$TRI" -D CMAKE_PREFIX_PATH="$SS" \
  -D Xyce_PLUGIN_SUPPORT=ON -D BUILD_SHARED_LIBS=ON > "$LOGS/xyce-plugin-configure.log"
grep -q 'Plugin compatibility enabled' "$LOGS/xyce-plugin-configure.log"
cmake --build "$ROOT/xyce-build" -j2 -t install > "$LOGS/xyce-plugin-build.log" || {
  tail -n 300 "$LOGS/xyce-plugin-build.log"
  exit 1
}

cd "$SRC/ngspice-47"
./configure --prefix="$NG" --disable-debug --without-x --with-readline=no --disable-openmp \
  > "$LOGS/ngspice-configure.log"
make -j"$(nproc)" > "$LOGS/ngspice-build.log"
make install > "$LOGS/ngspice-install.log"
"$XY/bin/Xyce" -v | tee "$LOGS/xyce-version.txt"
"$NG/bin/ngspice" --version 2>&1 | tee "$LOGS/ngspice-version.txt"

BUNDLE="$ROOT/bundle"
mkdir -p "$BUNDLE/toolchain" "$BUNDLE/runtime-libs" "$BUNDLE/runtime" "$BUNDLE/bin"
cp -a "$XY" "$TRI" "$SS" "$AD" "$NG" "$BUNDLE/toolchain/"
cp -a "$LOGS/." "$BUNDLE/runtime/"
ldd "$XY/bin/Xyce" > "$BUNDLE/runtime/xyce-ldd.txt"
ldd "$NG/bin/ngspice" > "$BUNDLE/runtime/ngspice-ldd.txt"
for executable in "$XY/bin/Xyce" "$NG/bin/ngspice"; do
  ldd "$executable" | awk '/=> \/.*\(/ {print $3} /^\/.*\(/ {print $1}' | while read -r lib; do
    case "$(basename "$lib")" in
      libc.so.*|libm.so.*|libpthread.so.*|libdl.so.*|librt.so.*|ld-linux-*.so.*) continue ;;
    esac
    cp -L --no-clobber "$lib" "$BUNDLE/runtime-libs/"
  done
done
cat > "$BUNDLE/bin/Xyce" <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export LD_LIBRARY_PATH="$ROOT/runtime-libs:$ROOT/toolchain/xyce/lib:$ROOT/toolchain/xyce/lib64:$ROOT/toolchain/trilinos/lib:$ROOT/toolchain/trilinos/lib64:$ROOT/toolchain/suitesparse/lib:$ROOT/toolchain/suitesparse/lib64${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$ROOT/toolchain/xyce/bin/Xyce" "$@"
WRAPPER
cat > "$BUNDLE/bin/ngspice" <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export LD_LIBRARY_PATH="$ROOT/runtime-libs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$ROOT/toolchain/ngspice/bin/ngspice" "$@"
WRAPPER
chmod +x "$BUNDLE/bin/Xyce" "$BUNDLE/bin/ngspice"
export ROOT BUNDLE XYCE_VERSION XYCE_SOURCE_SHA256 TRILINOS_COMMIT TRILINOS_SOURCE_SHA256
export SUITESPARSE_COMMIT SUITESPARSE_SOURCE_SHA256 ADMS_VERSION ADMS_SOURCE_SHA256
python3 - <<'PY'
import hashlib
import json
import os
import platform
import subprocess
from pathlib import Path

bundle = Path(os.environ['BUNDLE'])
def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()
manifest = {
    'schema': 'p11.toolchain.v1',
    'image_id': f"github-actions:ETM-Code/modelRunner:{os.environ['GITHUB_RUN_ID']}:{os.environ['GITHUB_RUN_ATTEMPT']}",
    'platform': platform.platform(),
    'machine': platform.machine(),
    'compiler': subprocess.run(['gcc', '--version'], check=True, capture_output=True, text=True).stdout.splitlines()[0],
    'source_pins': {
        'xyce_version': os.environ['XYCE_VERSION'],
        'xyce_source_sha256': os.environ['XYCE_SOURCE_SHA256'],
        'trilinos_commit': os.environ['TRILINOS_COMMIT'],
        'trilinos_source_sha256': os.environ['TRILINOS_SOURCE_SHA256'],
        'suitesparse_commit': os.environ['SUITESPARSE_COMMIT'],
        'suitesparse_source_sha256': os.environ['SUITESPARSE_SOURCE_SHA256'],
        'adms_version': os.environ['ADMS_VERSION'],
        'adms_source_sha256': os.environ['ADMS_SOURCE_SHA256'],
    },
    'executables': {
        'xyce_sha256': sha(bundle / 'toolchain/xyce/bin/Xyce'),
        'ngspice_sha256': sha(bundle / 'toolchain/ngspice/bin/ngspice'),
    },
}
(bundle / 'runtime/manifest.json').write_text(
    json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8'
)
PY
"$BUNDLE/bin/Xyce" -v > "$BUNDLE/runtime/relocation-probe-xyce.txt"
"$BUNDLE/bin/ngspice" --version > "$BUNDLE/runtime/relocation-probe-ngspice.txt" 2>&1
tar --zstd -cf "$OUT/p11-toolchain-linux-x86_64.tar.zst" -C "$BUNDLE" .
sha256sum "$OUT/p11-toolchain-linux-x86_64.tar.zst" > "$OUT/p11-toolchain-linux-x86_64.tar.zst.sha256"
du -sh "$BUNDLE" "$OUT" | tee "$OUT/sizes.txt"
