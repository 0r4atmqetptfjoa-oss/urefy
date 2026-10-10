#!/usr/bin/env python3
"""
Seed script for voices38 scene releases, reverse engineering deep-dive,
legal subpoena breakdown, and DRM performance benchmarks.
All content in 100% technical English.
"""

import subprocess
import json
import time

def esc_sql(val):
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    if "\n" in s:
        # Split by newline and concatenate with char(10)
        parts = s.split("\n")
        return " || char(10) || ".join("'" + p + "'" for p in parts)
    return "'" + s + "'"

now_ms = int(time.time() * 1000)

posts = [
    {
        "id": "post-en-voices38-denuvo-reverse-engineering-deep-dive",
        "author_id": "6d88f12a04cb", # ZeroDay
        "author_role": "verified",
        "title": "The voices38 Phenomenon: How a Single Reverse Engineer Shattered Denuvo v18/v19 and Reignited Scene History",
        "content": (
            "For years, the PC reverse-engineering scene was trapped in a seemingly insurmountable drought. "
            "After EMPRESS went silent, Denuvo Anti-Tamper (v18 and v19) tightened its grip over the gaming landscape, "
            "forcing third-party groups to rely on fragile Hypervisor-based memory bypasses requiring Hyper-V configurations "
            "and severe OS virtualization compromises.\n\n"
            "Then arrived u/voices38 on Reddit and private IRC rings. Rather than wrapping games in virtual machine layers, "
            "voices38 returned to traditional, proper binary patching: de-obfuscating virtualized bytecode instructions, "
            "rebuilding corrupted PE headers, neutralizing periodic integrity trigger checks, and emulating licensing tokens "
            "directly at the executable level.\n\n"
            "The technical feat cannot be overstated: Denuvo's modern triggers embed thousands of VM dispatcher calls "
            "directly into game tick loops. By systematically mapping the dispatcher tables and hooking license token verification, "
            "voices38 restored true offline permanence to games like Black Myth: Wukong, Dead Space, and Hogwarts Legacy."
        ),
        "facet_id": "tech",
        "video_json": json.dumps({
            "src": "https://www.youtube.com/watch?v=1S0aBV-Waeo",
            "poster": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80"
        }),
        "images_json": json.dumps([
            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80"
        ]),
        "boost_count": 84,
        "reply_count": 4,
        "created_at": now_ms - (3 * 3600 * 1000),
        "pinned": 0
    },
    {
        "id": "post-en-voices38-release-catalog-wukong-mirage-atomfall",
        "author_id": "8a31b402ef19", # DanGaming
        "author_role": "curator",
        "title": "voices38 Release Catalog Breakdown: Black Myth Wukong, AC Mirage, Dead Space & Atomfall NFO Architecture",
        "content": (
            "Tracking the verified releases from voices38 across r/CrackWatch and scene trackers reveals a level of "
            "precision rarely seen in anti-tamper bypass history. Here is the verified catalog architecture:\n\n"
            "1. Black Myth: Wukong (Unreal Engine 5) - The historic first proper crack of Game Science's epic, stripping out Denuvo's heavy runtime integrity loop.\n"
            "2. Assassin's Creed Mirage - Clean standalone executable bypassing Ubisoft Connect entitlement verification.\n"
            "3. Dead Space Remake (Frostbite 4) - Traversal stutter completely eliminated by removing Denuvo asset streaming hooks.\n"
            "4. Atomfall - Day-1 release defeating Irdeto's newest v19 anti-tamper iteration.\n"
            "5. Persona 3 Reload & Hogwarts Legacy - Preserving full Ray Tracing and shader cache stability without licensing token expirations.\n\n"
            "Every release ships with signature ASCII NFOs, clean SHA-256 verification digests, and zero third-party telemetry."
        ),
        "facet_id": "gaming",
        "video_json": json.dumps({
            "src": "https://www.youtube.com/watch?v=vovkzbtYBC8",
            "poster": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
        }),
        "images_json": json.dumps([
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80"
        ]),
        "boost_count": 62,
        "reply_count": 3,
        "created_at": now_ms - (2 * 3600 * 1000),
        "pinned": 0
    },
    {
        "id": "post-en-denuvo-subpoena-war-voices38-legal-analysis",
        "author_id": "4b109af38c01", # SecGuardian
        "author_role": "operator",
        "title": "Irdeto / Denuvo Federal Lawsuit vs voices38: California Subpoenas, FixedFloat Crypto Tracking & The Defiant Reddit Response",
        "content": (
            "In late September 2026, Irdeto (parent company of Denuvo) escalated from technical mitigation to federal litigation, "
            "filing a comprehensive DMCA anti-circumvention suit in the U.S. District Court for the Northern District of California "
            "against the anonymous individual known as 'voices38'.\n\n"
            "Court dockets reveal that Denuvo has sought expansive third-party subpoenas targeting:\n"
            "- Reddit: Account logs, connection IPs, and post metadata for u/voices38.\n"
            "- Discord: Guild memberships, DM logs, and associated phone/email hashes.\n"
            "- Valve / Steam: Seven linked Steam accounts alleged to have been used for testing entitlement handshakes.\n"
            "- FixedFloat & Non-Custodial Wallets: Transaction tracing across Bitcoin, Ethereum, and Solana donation rails.\n\n"
            "Despite the subpoenas, voices38 posted a legendary public statement on Reddit: 'Everything will continue as normal. Mathematics and memory cannot be sued.' "
            "The case sets a massive legal precedent for software preservation and reverse engineering rights."
        ),
        "facet_id": "tech",
        "video_json": json.dumps({
            "src": "https://www.youtube.com/watch?v=8ZtInClXe1Q",
            "poster": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80"
        }),
        "images_json": json.dumps([
            "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80"
        ]),
        "boost_count": 91,
        "reply_count": 3,
        "created_at": now_ms - (3600 * 1000),
        "pinned": 0
    },
    {
        "id": "post-en-denuvo-frametime-stutter-voices38-benchmark",
        "author_id": "2ea014f9ef23", # SubZeroClocker
        "author_role": "verified",
        "title": "Frametime Consistency & 1% Lows: Measuring CPU Stutter in Denuvo Protected vs voices38 Patched Binaries",
        "content": (
            "We put the voices38 patched binaries through rigorous CapFrameX telemetry benchmarks to settle the eternal debate: "
            "does Denuvo degrade gaming performance?\n\n"
            "Testing Rig:\n"
            "- Ryzen 7 7800X3D / Core i5-13600K\n"
            "- RTX 4080 Super (1440p Native, Max Settings)\n"
            "- 32 GB DDR5-6000 CL30\n\n"
            "Key Findings:\n"
            "1. Average FPS: Across GPU-bound scenarios, differences remained within 2-3% margin of error.\n"
            "2. 1% and 0.1% Lows: In CPU-limited open-world zones (Black Myth: Wukong Chapter 3 and Dead Space Medical Deck), "
            "the official Denuvo binary exhibited frequent frametime spikes up to 48ms whenever periodic DRM heartbeat checks fired. "
            "The voices38 patched executable maintained a razor-flat 16.6ms frametime line, completely eliminating micro-stutters.\n"
            "3. Initial Load & Shader Pre-compilation: Game launch times were reduced by up to 22 seconds without online license generation."
        ),
        "facet_id": "hardware",
        "video_json": json.dumps({
            "src": "https://www.youtube.com/watch?v=s-lFgbzU3LY",
            "poster": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&auto=format&fit=crop&q=80"
        }),
        "images_json": json.dumps([
            "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80"
        ]),
        "boost_count": 78,
        "reply_count": 2,
        "created_at": now_ms - (1800 * 1000),
        "pinned": 0
    }
]

comments = [
    {
        "id": "cmt-voices38-tech-1",
        "post_id": "post-en-voices38-denuvo-reverse-engineering-deep-dive",
        "parent_id": None,
        "author_id": "4d89a01fbb23", # AsmPurist
        "author_role": "verified",
        "content": "The fact that voices38 avoided the hypervisor trap is what makes these releases so remarkable. Running Windows Defender with core isolation turned off just to play a cracked game was always a terrible security tradeoff.",
        "merit_votes": 24,
        "facet_id": "tech",
        "created_at": now_ms - (2 * 3600 * 1000)
    },
    {
        "id": "cmt-voices38-tech-2",
        "post_id": "post-en-voices38-denuvo-reverse-engineering-deep-dive",
        "parent_id": "cmt-voices38-tech-1",
        "author_id": "c3dc28cb705e", # ZeroKnowledge
        "author_role": "operator",
        "content": "Agreed. Traditional PE patching means zero kernel-level hypervisor hooks. It proves that proper static and dynamic analysis with Ghidra and custom IDA scripts still triumphs over multi-million dollar DRM bloatware.",
        "merit_votes": 19,
        "facet_id": "tech",
        "created_at": now_ms - (1 * 3600 * 1000)
    },
    {
        "id": "cmt-voices38-legal-1",
        "post_id": "post-en-denuvo-subpoena-war-voices38-legal-analysis",
        "parent_id": None,
        "author_id": "6d88f12a04cb", # ZeroDay
        "author_role": "verified",
        "content": "Irdeto trying to track FixedFloat crypto transactions shows just how desperate they are. Any competent reverse engineer operating under high threat models uses coinjoin, Monero hops, or clean burner addresses.",
        "merit_votes": 31,
        "facet_id": "tech",
        "created_at": now_ms - (3000 * 1000)
    },
    {
        "id": "cmt-voices38-bench-1",
        "post_id": "post-en-denuvo-frametime-stutter-voices38-benchmark",
        "parent_id": None,
        "author_id": "8a31b402ef19", # DanGaming
        "author_role": "curator",
        "content": "The 0.1% low metric in Dead Space Remake says it all. EA denied that Denuvo caused traversal stutter for over a year, yet the voices38 binary smooths out the tram station transitions completely.",
        "merit_votes": 27,
        "facet_id": "hardware",
        "created_at": now_ms - (1200 * 1000)
    }
]

chat_messages = [
    {
        "id": f"msg-v38-dev-{int(time.time())}-1",
        "channel_id": "relays-dev",
        "author_id": "4d89a01fbb23", # AsmPurist
        "ciphertext": "Did anyone inspect the PE imports on the latest voices38 Atomfall release? They cleanly redirected all Denuvo licensing dispatch pointers into a static dummy table.",
        "epoch": 1,
        "created_at": now_ms - (1500 * 1000)
    },
    {
        "id": f"msg-v38-dev-{int(time.time())}-2",
        "channel_id": "relays-dev",
        "author_id": "6d88f12a04cb", # ZeroDay
        "ciphertext": "Yes, zero hypervisor required. It's the cleanest scene work since CPY and STEAMPUNKS in 2017. Irdeto's legal subpoenas on Reddit will accomplish nothing.",
        "epoch": 1,
        "created_at": now_ms - (1200 * 1000)
    },
    {
        "id": f"msg-v38-gen-{int(time.time())}-3",
        "channel_id": "relays-general",
        "author_id": "8a31b402ef19", # DanGaming
        "ciphertext": "That CapFrameX benchmark on Black Myth Wukong without Denuvo proves what we've all suspected. Those micro-stutters during boss transitions weren't shader compilation, they were heartbeat token checks.",
        "epoch": 1,
        "created_at": now_ms - (900 * 1000)
    }
]

sql_lines = []

for p in posts:
    channel_id = 'c/technology' if p['facet_id'] == 'tech' else ('c/hardware' if p['facet_id'] == 'hardware' else 'c/gaming')
    flair = 'TECH DISCUSSION' if p['facet_id'] == 'tech' else ('BENCHMARK / OC' if p['facet_id'] == 'hardware' else 'GAMING NEWS')
    stmt = (
        f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, video_json, images_json, status, created_at, is_expanded, facet_id, audience) "
        f"VALUES ({esc_sql(p['id'])}, {esc_sql(channel_id)}, {esc_sql(p['author_id'])}, {esc_sql(p['author_role'])}, {esc_sql(p['title'])}, {esc_sql(p['content'])}, {esc_sql(flair)}, 0, 0, {p['reply_count']}, {p['boost_count']}, {esc_sql(p['video_json'])}, {esc_sql(p['images_json'])}, 'published', {p['created_at']}, 0, {esc_sql(p['facet_id'])}, 'public');"
    )
    sql_lines.append(stmt)

for c in comments:
    stmt = (
        f"INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at, facet_id) "
        f"VALUES ({esc_sql(c['id'])}, {esc_sql(c['post_id'])}, {esc_sql(c['parent_id'])}, {esc_sql(c['author_id'])}, {esc_sql(c['author_role'])}, {esc_sql(c['content'])}, {c['merit_votes']}, {c['created_at']}, {esc_sql(c['facet_id'])});"
    )
    sql_lines.append(stmt)

for m in chat_messages:
    stmt = (
        f"INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) "
        f"VALUES ({esc_sql(m['id'])}, {esc_sql(m['channel_id'])}, {esc_sql(m['author_id'])}, {esc_sql(m['ciphertext'])}, 'nonce_v38', {m['epoch']}, 'delivered', 'sig_v38', {m['created_at']});"
    )
    sql_lines.append(stmt)

sql_file_path = "d:\\proiect site total\\scripts\\seed_voices38.sql"
with open(sql_file_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines) + "\n")

print(f"Generated {len(sql_lines)} statements in {sql_file_path}")
print("Executing SQL file against D1...")

cmd = [
    "npx", "wrangler", "d1", "execute", "aetheris-db",
    "--remote", f"--file={sql_file_path}"
]
res = subprocess.run(cmd, capture_output=True, text=True, shell=True, cwd="d:\\proiect site total")
if res.returncode != 0:
    print(f"D1 Execution Error: {res.stderr}")
else:
    print(res.stdout)
    print("D1 Execution completed successfully!")
