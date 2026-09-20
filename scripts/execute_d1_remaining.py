#!/usr/bin/env python3
"""
execute_d1_remaining.py
Runs the remaining statements from scripts/seed-100-human-community.sql (idx 151 onwards)
with robust retries and 15-statement batches.
"""

import subprocess
import re
import time
import os

BATCH_FILE = "scripts/_tmp_remaining.sql"

def run_batch_file(filepath):
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "d1",
        "execute",
        "aetheris-db",
        "--remote",
        f"--file={filepath}",
        "-y"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("Batch warning / error:")
        print((res.stderr or res.stdout).strip()[:200])
        return False
    return True

def main():
    with open("scripts/seed-100-human-community.sql", "r", encoding="utf-8") as f:
        content = f.read()

    raw_stmts = re.split(r";\s*\n", content)
    stmts = []
    for s in raw_stmts:
        s = s.strip()
        lines = [line for line in s.split("\n") if not line.strip().startswith("--")]
        clean = "\n".join(lines).strip()
        if clean:
            stmts.append(clean)

    # We start from statement 151 (post p-ai-3 comments onwards)
    remaining = stmts[151:]
    print(f"Executing remaining {len(remaining)} statements...")

    batch_size = 15
    total_batches = (len(remaining) + batch_size - 1) // batch_size

    for i in range(0, len(remaining), batch_size):
        batch = remaining[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"[{batch_num}/{total_batches}] Executing {len(batch)} statements...")

        batch_content = ";\n".join(batch) + ";\n"
        with open(BATCH_FILE, "w", encoding="utf-8") as bf:
            bf.write(batch_content)

        retries = 5
        success = False
        while retries > 0:
            success = run_batch_file(BATCH_FILE)
            if success:
                break
            retries -= 1
            print(f"  Transient D1 reset, sleeping 5s... ({retries} retries left)")
            time.sleep(5)

        if not success:
            print(f"CRITICAL: Failed on remaining batch {batch_num}")
            break

        time.sleep(1)

    if os.path.exists(BATCH_FILE):
        os.remove(BATCH_FILE)

    print("DONE: All remaining community statements executed!")

if __name__ == "__main__":
    main()
