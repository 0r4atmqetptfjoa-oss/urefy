#!/usr/bin/env python3
import json
import os
import random
import time
import subprocess

NOW_MS = int(time.time() * 1000)

with open('scripts/personas_1000_complete.json', 'r', encoding='utf-8') as f:
    personas = json.load(f)

# Also fetch all user_ids from D1 user_profiles
cmd = ["npx.cmd" if os.name == "nt" else "npx", "wrangler", "d1", "execute", "aetheris-db", "--remote", "-y", "--command=SELECT user_id FROM user_profiles;"]
res = subprocess.run(cmd, cwd='packages/client-ui', capture_output=True, text=True)
data = json.loads(res.stdout[res.stdout.find('['):])
user_ids = [r['user_id'] for r in data[0]['results']]

print(f"Total user_ids to update with activity: {len(user_ids)}")

sql_lines = [
    "INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES"
]

rows = []
for idx, uid in enumerate(user_ids):
    # Cluster activity:
    # 20% active within last 15 minutes
    # 40% active within last 2 hours
    # 30% active within last 12 hours
    # 10% active within last 3 days
    dice = (idx * 17 + 7) % 100
    if dice < 20:
        offset = random.randint(60, 900) * 1000
    elif dice < 60:
        offset = random.randint(900, 7200) * 1000
    elif dice < 90:
        offset = random.randint(7200, 43200) * 1000
    else:
        offset = random.randint(43200, 86400 * 3) * 1000
        
    last_act = NOW_MS - offset
    unread = (idx * 3) % 5
    safe_uid = uid.replace("'", "''")
    rows.append(f"('{safe_uid}', {last_act}, {unread}, {last_act})")

sql_lines.append(",\n".join(rows) + ";")

sql_file = os.path.abspath("scripts/seed_activity_summaries.sql")
with open(sql_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines) + "\n")

print(f"Written SQL to {sql_file}")

# Execute via wrangler d1 execute --file with -y
exec_cmd = ["npx.cmd" if os.name == "nt" else "npx", "wrangler", "d1", "execute", "aetheris-db", "--remote", f"--file={sql_file}", "-y"]
print("Executing on remote D1...")
exec_res = subprocess.run(exec_cmd, cwd='packages/client-ui', capture_output=True, text=True)
if exec_res.returncode == 0:
    print("✔ Activity summaries seeded successfully!")
else:
    print("❌ Error:", exec_res.stderr or exec_res.stdout)
