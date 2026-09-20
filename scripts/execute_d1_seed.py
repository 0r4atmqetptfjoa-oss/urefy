#!/usr/bin/env python3
"""
execute_d1_seed.py
Reads scripts/seed-100-human-community.sql, chunks into small files of 25 statements,
and executes via npx wrangler d1 execute aetheris-db --remote --file=... -y
"""

import subprocess
import re
import time
import os

BATCH_FILE = "scripts/_tmp_batch.sql"

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
        print("ERROR executing batch:")
        print(res.stderr or res.stdout)
        return False
    return True

def main():
    with open("scripts/seed-100-human-community.sql", "r", encoding="utf-8") as f:
        content = f.read()

    # Split by semicolon
    raw_stmts = re.split(r";\s*\n", content)
    stmts = []
    for s in raw_stmts:
        s = s.strip()
        lines = [line for line in s.split("\n") if not line.strip().startswith("--")]
        clean = "\n".join(lines).strip()
        if clean:
            stmts.append(clean)

    total_stmts = len(stmts)
    print(f"Total SQL statements to execute: {total_stmts}")

    batch_size = 20
    total_batches = (total_stmts + batch_size - 1) // batch_size

    for i in range(0, total_stmts, batch_size):
        batch = stmts[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"[{batch_num}/{total_batches}] Executing {len(batch)} statements...")

        batch_content = ";\n".join(batch) + ";\n"
        with open(BATCH_FILE, "w", encoding="utf-8") as bf:
            bf.write(batch_content)

        retries = 3
        success = False
        while retries > 0:
            success = run_batch_file(BATCH_FILE)
            if success:
                break
            retries -= 1
            print(f"  Batch failed, retrying in 3 seconds... ({retries} retries left)")
            time.sleep(3)

        if not success:
            print(f"CRITICAL: Failed on batch {batch_num}")
            break

        time.sleep(0.5)

    if os.path.exists(BATCH_FILE):
        os.remove(BATCH_FILE)

    print("SUCCESS: Finished seeding 100 human personas and discussions into Cloudflare D1!")

if __name__ == "__main__":
    main()
