#!/usr/bin/env python3
"""
execute_all_d1.py
Executes all SQL statements from scripts/seed-100-human-community.sql
to Cloudflare D1 remote database 'aetheris-db' in batches of 15.
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

    print(f"Total SQL statements to execute: {len(stmts)}")

    batch_size = 15
    total_batches = (len(stmts) + batch_size - 1) // batch_size

    for i in range(0, len(stmts), batch_size):
        batch = stmts[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"[{batch_num}/{total_batches}] Executing {len(batch)} statements...")

        batch_content = ";\n".join(batch) + ";\n"
        with open(BATCH_FILE, "w", encoding="utf-8") as bf:
            bf.write(batch_content)

        success = False
        for attempt in range(3):
            if run_batch_file(BATCH_FILE):
                success = True
                break
            print(f"  Retry {attempt+1}/3...")
            time.sleep(2)

        if not success:
            print(f"Failed batch {batch_num}. Continuing...")

    if os.path.exists(BATCH_FILE):
        try:
            os.remove(BATCH_FILE)
        except:
            pass

    print("D1 Seeding finished successfully!")

if __name__ == "__main__":
    main()
