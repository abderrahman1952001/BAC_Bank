#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/abderrahman/BAC_Bank"
API_DIR="$ROOT_DIR/apps/api"
TS_NODE_BIN="$ROOT_DIR/node_modules/.bin/ts-node"
YEARS=("${@}")
MAX_PARALLEL="${MAX_PARALLEL:-3}"
JOB_CONCURRENCY="${JOB_CONCURRENCY:-1}"
DETAIL_PAGE_CONCURRENCY="${INGESTION_DETAIL_PAGE_CONCURRENCY:-2}"
YEAR_TIMEOUT_SECONDS="${YEAR_TIMEOUT_SECONDS:-3600}"
YEAR_RETRIES="${YEAR_RETRIES:-3}"
RUNNER_LOG="${RUNNER_LOG:-/tmp/eddirasa_backfill_runner.log}"

if [ "${#YEARS[@]}" -eq 0 ]; then
  YEARS=(2025 2024 2023 2022 2021 2020 2019 2018 2017 2016 2015 2014 2013 2012)
fi

run_year() {
  local year="$1"
  (
    set -euo pipefail
    set -a
    source "$ROOT_DIR/.env" >/dev/null 2>&1
    set +a
    export INGESTION_DETAIL_PAGE_CONCURRENCY="$DETAIL_PAGE_CONCURRENCY"
    cd "$API_DIR"
    local log_file="/tmp/eddirasa_detached_$year.log"
    : >"$log_file"

    local attempt
    for ((attempt = 1; attempt <= YEAR_RETRIES; attempt += 1)); do
      printf '[%s] year=%s attempt=%s/%s start\n' \
        "$(date -Is)" "$year" "$attempt" "$YEAR_RETRIES" \
        >>"$RUNNER_LOG"

      set +e
      timeout --signal=TERM "$YEAR_TIMEOUT_SECONDS" \
        "$TS_NODE_BIN" --transpile-only scripts/ingest-eddirasa-bac.ts \
          --stage originals \
          --listing-url "https://eddirasa.com/bac-$year/" \
          --min-year "$year" \
          --max-year "$year" \
          --job-concurrency "$JOB_CONCURRENCY" \
          >>"$log_file" 2>&1
      local exit_code=$?
      set -e

      if [ "$exit_code" -eq 0 ]; then
        printf '[%s] year=%s attempt=%s/%s ok\n' \
          "$(date -Is)" "$year" "$attempt" "$YEAR_RETRIES" \
          >>"$RUNNER_LOG"
        exit 0
      fi

      printf '[%s] year=%s attempt=%s/%s exit=%s\n' \
        "$(date -Is)" "$year" "$attempt" "$YEAR_RETRIES" "$exit_code" \
        >>"$RUNNER_LOG"
      sleep "$attempt"
    done

    printf '[%s] year=%s exhausted retries=%s\n' \
      "$(date -Is)" "$year" "$YEAR_RETRIES" \
      >>"$RUNNER_LOG"
    exit 1
  )
}

for year in "${YEARS[@]}"; do
  run_year "$year" &

  while [ "$(jobs -pr | wc -l | tr -d ' ')" -ge "$MAX_PARALLEL" ]; do
    wait -n
  done
done

wait
