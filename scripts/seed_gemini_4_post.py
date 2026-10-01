#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/seed_gemini_4_post.py
Generates and deploys a comprehensive, viral post and community thread about
Google DeepMind's newly released frontier model: Gemini 4 Argon (Announced Sept 30, 2026).

Includes:
- Detailed breakdown of Gemini 4 Argon (1M output tokens, 77.9% DeepSWE, Gray Swan 0.7% prompt injection resistance)
- Benchmark comparison table against GPT-6 Astra and Claude Opus 5.5
- Video embed and high-res benchmark images
- Live clickable source links (blog.google, deepmind.google, artificialanalysis.ai, vals.ai)
- Threaded feuds, fanboy debates, open-source local AI comparisons, and trolls
- Live chat messages across relays-dev and pulse-global discussing the drop
"""

import os
import sys
import json
import time
import random
import subprocess

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
CLIENT_UI_DIR = os.path.join(PROJECT_ROOT, "packages", "client-ui")

NOW_MS = int(time.time() * 1000)
H_MS = 3600 * 1000
M_MS = 60 * 1000

print(f"=== UREfy Gemini 4 Argon Launch Seeder ===")
print(f"Current Time: {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(NOW_MS / 1000))} UTC\n")

# Load Personas
personas_file = os.path.join(BASE_DIR, "personas_1000_complete.json")
with open(personas_file, "r", encoding="utf-8") as f:
    PERSONAS = json.load(f)

USER_MAP = {p["handle"]: p for p in PERSONAS}
USER_IDS = [p["user_id"] for p in PERSONAS]

def sql_esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    v_str = str(v).replace("'", "''")
    return f"'{v_str}'"

# Pick Author: A prominent AI researcher / tech analyst persona
author_candidates = [p for p in PERSONAS if any(w in p.get("bio", "").lower() for w in ["ai", "research", "engineer", "dev", "neural"])]
author = author_candidates[0] if author_candidates else PERSONAS[0]

POST_ID = "post-gemini-4-argon-launch-2026"
CHANNEL_ID = "c/privacy-ai"

# Timestamp: Yesterday evening / earlier today (e.g. 14 hours ago, when the announcement dropped)
POST_TIME = NOW_MS - int(14.5 * H_MS) + random.randint(10000, 50000)

POST_TITLE = "🔥 [BREAKING] Google DeepMind Drops Gemini 4 Argon: 1 Million Output Tokens, 77.9% DeepSWE & 0.7% Prompt Injection Vulnerability"

POST_CONTENT = """Last night, Google DeepMind officially unveiled its next-generation frontier intelligence model: **Gemini 4 Argon**. 

Engineered specifically for long-horizon autonomous workflows, full-scale software engineering, and mission-critical cybersecurity defense, Argon is Google's most radical architectural leap since the original Gemini release.

Here is the complete technical breakdown of the announcement, benchmarks, and community analysis.

---

### 1. The 1 Million Output Token Breakthrough
While previous generation models (including Gemini 1.5/2.0, Claude 3.5, and GPT-4o) were capped at 8,192 to 64,000 output tokens, **Gemini 4 Argon can generate up to 1,000,000 output tokens in a single generation response**.
* **What this means in practice**: An agent can now synthesize an entire multi-repository production application, generate hundreds of pages of mathematically proven formal verification proofs, or decompile and refactor legacy enterprise systems without chunking or context degradation.
* Under the hood, DeepMind utilizes dynamic sparse attention routing with native FP8 KV-caching to keep generational latency manageable.

---

### 2. Comprehensive Benchmark Results
Google released side-by-side evaluations against its primary frontier rivals: OpenAI's **GPT-6 Astra** and Anthropic's **Claude Opus 5.5**.

| Benchmark Suite | Gemini 4 Argon | Claude Opus 5.5 | GPT-6 Astra | Category / Focus |
| :--- | :---: | :---: | :---: | :--- |
| **DeepSWE v1.1** | **77.9%** 🥇 | 74.2% | 74.1% | Real-world software engineering & repo bug-fixing |
| **Artificial Analysis Index** | **53** 🥇 (Tie) | 51 | **53** 🥇 (Tie) | Overall intelligence composite index |
| **Vals Index** | **68.9%** 🥇 | 63.4% | 66.1% | Enterprise knowledge, finance & legal workflows |
| **LVBench (Long Video)** | **91.7%** 🥇 | 82.5% | 85.0% | Multimodal temporal reasoning over 2hr+ video |
| **AutomationBench** | **51.3%** 🥇 | 42.2% | 46.8% | Autonomous browser & operating system task completion |
| **Gray Swan Injection** | **0.7%** 🛡️ (Lowest) | 3.4% | 2.9% | Indirect prompt injection attack success rate |

*Out of 19 disclosed head-to-head frontier benchmarks, Gemini 4 Argon holds an outright lead in 13 categories and ties for first in 4.*

---

### 3. Cyber Defense & The Gray Swan 0.7% Score
One of the most remarkable security milestones is Argon's performance on **Gray Swan's 2026 Indirect Prompt Injection benchmark**:
* Traditional LLM agents succumb to hidden malicious prompts inside PDFs, web pages, or email bodies 3% to 15% of the time.
* Gemini 4 Argon demonstrated an attack success rate of just **0.7%** across thousands of adversarial jailbreak vectors—the lowest score ever recorded across all 13 major frontier models tested.

---

### 4. Rollout Strategy & API Pricing
Google is taking a security-first deployment approach:
* **Fairwind Program**: Initial access is currently restricted to vetted cybersecurity defenders, critical infrastructure teams, and select enterprise partners.
* **General Availability**: Wider rollout to Google AI Ultra subscribers and Vertex AI / Gemini API enterprise customers is slated for coming weeks.
* **Pricing Structure**:
  - *Introductory Rate*: **$2.00 / 1M input tokens** and **$10.00 / 1M output tokens**.
  - *Standard Rate (Post-Introductory)*: **$4.00 / 1M input** and **$20.00 / 1M output**.

---

### Official References & Research Papers
* [Google Official Announcement on DeepMind Blog](https://blog.google)
* [DeepMind Gemini 4 Technical System Card](https://deepmind.google)
* [Artificial Analysis Intelligence Leaderboard](https://artificialanalysis.ai)
* [Vals AI Independent Enterprise Benchmarks](https://vals.ai)
* [Decrypt Technology Coverage](https://decrypt.co)

What are your thoughts on the 1M output token window? Is this the tipping point where autonomous coding agents fully replace traditional junior development pipelines, or are closed-model API bills going to make local open models like DeepSeek-R1 the true winner?"""

VIDEO_DATA = {
    "title": "Google DeepMind Gemini 4 Argon Keynote & Live 1M Token Demonstration",
    "embed_url": "https://www.youtube-nocookie.com/embed/aircAruvnKk",
    "provider": "youtube",
    "duration": "24:18"
}

IMAGES_DATA = [
    {
        "url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
        "caption": "Gemini 4 Argon Benchmark Performance: Leading DeepSWE v1.1 (77.9%) and AutomationBench (51.3%)",
        "alt": "AI benchmark data visualization"
    },
    {
        "url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
        "caption": "DeepMind multi-head sparse attention architecture enabling 1,000,000 output tokens in a single stream",
        "alt": "Neural network architecture diagram"
    },
    {
        "url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
        "caption": "Gray Swan Indirect Prompt Injection Benchmark: Gemini 4 Argon sets all-time record of 0.7% attack success",
        "alt": "Cybersecurity defense chart"
    }
]

# 12+ Threaded Comments with realistic feuds, trolls, questions, and insights
COMMENTS_DATA = [
    (
        "cluj_coder",
        "1 MILLION output tokens in a single response?! Do people realize what this actually unlocks? You can literally feed an entire legacy Java backend with 50,000 lines of spaghetti code and tell it to rewrite the entire thing in idiomatic Rust with full unit test coverage in ONE API call.",
        [
            ("rust_coder", "Bro imagine the memory footprint of that KV cache on Google's TPU v6 pods. Generating 1M tokens at 50 t/s would take like 5 hours of continuous streaming if the generation rate isn't parallelized!"),
            ("tensor_max", "They explicitly mentioned speculative parallel decoding and hierarchical tree routing in the technical report. It's not standard auto-regressive next-token prediction from start to finish.")
        ]
    ),
    (
        "openai_fanboy",
        "Cherry picked benchmarks as usual from Google lmao. Notice how they compared against GPT-6 Astra's standard mode instead of Astra with Extended Reflection? Wait until Sam Altman drops the 6.5 update next week. OpenAI still has the reasoning crown.",
        [
            ("clown_emoji", "Bro is coping so hard 🤡 GPT-6 Astra couldn't even pass 75% on DeepSWE and here Argon is casually sitting at 77.9%. Take the L gracefully."),
            ("openai_fanboy", "DeepSWE is biased towards multi-file refactoring. On pure competitive coding (Codeforces Elo), Astra is still 200 rating points ahead.")
        ]
    ),
    (
        "anthropic_stan",
        "Opus 5.5 still writes infinitely better prose and architectural documentation. Every time I use Gemini models for complex technical writing, it sounds like an excited corporate PR spokesperson.",
        [
            ("dev_bogdan", "I care about whether my code compiles and passes regression suites, not whether the AI writes Shakespearean sonnets while fixing a memory leak haha. 77.9% on DeepSWE is what pays the bills.")
        ]
    ),
    (
        "local_ai_purist",
        "All this closed API hype is nice until you realize they are charging $20 per million output tokens on standard pricing. If you generate a 500k token response, that's $10 for a single query! I'll stick to running DeepSeek-R1 70B and Qwen 2.5 on my own local 3090 rig. Free, zero telemetry, zero censorship.",
        [
            ("ai_hacker", "Based and sovereign-pilled. Plus Google's 'Fairwind Program' means regular developers won't even get API access for weeks while corporate cyber defense partners get first dibs.")
        ]
    ),
    (
        "security_analyst",
        "The 0.7% prompt injection rate on Gray Swan is honestly the biggest headline here. Autonomous agents have been an absolute liability in production because any malicious string in an email could hijack tool-calling permissions. If Argon really solved indirect injection, this unlocks true autonomous enterprise workflows.",
        [
            ("whitehat_dan", "Agreed. Dual-stream context isolation where data tokens and instruction tokens run through orthogonal attention heads seems to be how they pulled it off. Brilliant paper.")
        ]
    ),
    (
        "casual_dev",
        "Wait, when can normal people use this on Google AI Studio? I have an AI Ultra sub and it's still showing Gemini 1.5 Pro and Flash.",
        [
            ("tech_watcher", "Rolling out gradually over the next 2-3 weeks. Right now only Fairwind partners and select enterprise preview tenants have the model dropdown enabled.")
        ]
    )
]

# Live Chat Messages about the Gemini 4 drop
CHAT_MESSAGES = [
    # pulse-global: Breaking news hype
    ("pulse-global", "gpu_watcher", "DID YOU GUYS SEE THE DEEPMIND ANNOUNCEMENT LAST NIGHT??? GEMINI 4 ARGON IS REAL"),
    ("pulse-global", "london_peer", "1 MILLION output tokens wtf is that architecture"),
    ("pulse-global", "troll_god", "Sam Altman woke up in a cold sweat this morning seeing that 77.9% DeepSWE score 💀"),
    ("pulse-global", "prompt_ninja", "77.9% beats Claude Opus 5.5 and GPT-6 Astra. Google finally took the top spot back"),
    ("pulse-global", "bucharest_node", "is it live in the api yet or waitlist only?"),
    ("pulse-global", "prompt_ninja", "waitlist through Fairwind for cyber partners first, public api coming in a couple weeks"),
    ("pulse-global", "cloud_cynic", "$10/M output tokens introductory rate is actually crazy cheap for frontier reasoning"),
    
    # relays-dev: Deep technical debate
    ("relays-dev", "tensor_max", "reading through the gemini 4 argon system card right now. the 1M output window uses dynamic sparse KV routing"),
    ("relays-dev", "rust_coder", "how do they prevent context drifting over 1M output tokens? usually models start hallucinating or repeating loops after 32k"),
    ("relays-dev", "tensor_max", "they added recurrent memory checkpointing during generation. every 16k tokens it compresses state into an anchor latent vector"),
    ("relays-dev", "ai_hacker", "that Gray Swan 0.7% prompt injection metric is the real killer feature. indirect injection was the only thing stopping agents from production"),
    ("relays-dev", "whitehat_dan", "yep, if you can't trick the model with poisoned website scraping, autonomous web browsing is finally safe"),
    ("relays-dev", "linux_dan", "still waiting to see if open source can replicate this. DeepSeek team probably cooking R2 as we speak haha"),
    ("relays-dev", "tensor_max", "100%. open source always catches up in 6 months")
]

def generate_sql():
    statements = []
    
    # 1. Post insertion
    merit_votes = random.randint(1420, 2890)
    boost_count = random.randint(310, 780)
    video_json = json.dumps(VIDEO_DATA)
    images_json = json.dumps(IMAGES_DATA)
    total_comments = sum(1 + len(replies) for _, _, replies in COMMENTS_DATA)

    post_row = f"({sql_esc(POST_ID)}, {sql_esc(CHANNEL_ID)}, {sql_esc(author['user_id'])}, {sql_esc(author.get('role', 'MODERATOR'))}, {sql_esc(POST_TITLE)}, {sql_esc(POST_CONTENT)}, 'AI & LLM BREAKTHROUGH', {merit_votes}, 0, {total_comments}, {boost_count}, NULL, {sql_esc(video_json)}, {sql_esc(images_json)}, NULL, NULL, 'published', {POST_TIME}, 0)"
    statements.append(f"INSERT OR REPLACE INTO posts (id, channel_id, author_id, author_role, title, content, flair, merit_votes, user_voted, reply_count, boost_count, attachment_json, video_json, images_json, poll_id, quoted_post_json, status, created_at, is_expanded) VALUES {post_row};")

    # Reactions on post
    reactors = random.sample(USER_IDS, k=25)
    for r_i, r_uid in enumerate(reactors):
        if r_uid == author["user_id"]:
            continue
        emoji = random.choice(['🔥', '🚀', '🧠', '👀', '💯', '❤️', '👏', '💀'])
        r_time = POST_TIME + (r_i + 1) * 28000 + random.randint(100, 999)
        int_id = f"int-gem4-{r_uid[:6]}-{r_i}"
        v_id = f"v-gem4-{r_uid[:6]}"
        statements.append(f"INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ({sql_esc(int_id)}, 'post', {sql_esc(POST_ID)}, {sql_esc(r_uid)}, 'reaction', {sql_esc(emoji)}, {r_time});")
        statements.append(f"INSERT OR REPLACE INTO votes (id, target_type, target_id, user_fingerprint, direction, created_at) VALUES ({sql_esc(v_id)}, 'post', {sql_esc(POST_ID)}, {sql_esc(r_uid)}, 1, {r_time});")

    # 2. Threaded Comments
    comm_counter = 0
    current_time = POST_TIME
    for main_handle, main_text, replies in COMMENTS_DATA:
        comm_counter += 1
        cid = f"comm-gem4-{comm_counter}"
        current_time += random.randint(120, 900) * 1000 + random.randint(10, 990)
        c_author = USER_MAP.get(main_handle, random.choice(PERSONAS))
        c_merit = random.randint(35, 340)

        c_row = f"({sql_esc(cid)}, {sql_esc(POST_ID)}, NULL, {sql_esc(c_author['user_id'])}, {sql_esc(c_author.get('role', 'MEMBER'))}, {sql_esc(main_text)}, {c_merit}, {current_time})"
        statements.append(f"INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES {c_row};")

        # Comment reaction
        c_reactor = random.choice(USER_IDS)
        statements.append(f"INSERT OR REPLACE INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES ({sql_esc(f'intc-{cid[:12]}-{c_reactor[:4]}')}, 'comment', {sql_esc(cid)}, {sql_esc(c_reactor)}, 'reaction', {sql_esc(random.choice(['🔥', '💯', '👏', '🧠']))}, {current_time + 12000});")

        # Replies to this comment
        parent_id = cid
        for rep_handle, rep_text in replies:
            comm_counter += 1
            rep_cid = f"comm-gem4-{comm_counter}"
            current_time += random.randint(60, 450) * 1000 + random.randint(10, 990)
            rep_author = USER_MAP.get(rep_handle, random.choice(PERSONAS))
            rep_merit = random.randint(15, 180)

            rep_row = f"({sql_esc(rep_cid)}, {sql_esc(POST_ID)}, {sql_esc(parent_id)}, {sql_esc(rep_author['user_id'])}, {sql_esc(rep_author.get('role', 'MEMBER'))}, {sql_esc(rep_text)}, {rep_merit}, {current_time})"
            statements.append(f"INSERT OR REPLACE INTO comments (id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at) VALUES {rep_row};")

    # 3. Live Chat Messages
    msg_base_time = POST_TIME + int(1.5 * H_MS)
    for idx, (chan_id, handle, text) in enumerate(CHAT_MESSAGES):
        mid = f"msg-gem4-{idx+1}"
        msg_base_time += random.randint(25, 140) * 1000 + random.randint(10, 990)
        m_user = USER_MAP.get(handle, random.choice(PERSONAS))
        m_row = f"({sql_esc(mid)}, {sql_esc(chan_id)}, {sql_esc(m_user['user_id'])}, {sql_esc(text)}, NULL, '#429', 'verified', NULL, {msg_base_time})"
        statements.append(f"INSERT OR REPLACE INTO messages (id, channel_id, author_id, ciphertext, nonce, epoch, status, signature, created_at) VALUES {m_row};")

    # 4. Activity summaries
    statements.append(f"INSERT OR REPLACE INTO user_activity_summaries (fingerprint, last_active, unread_notifs, updated_at) VALUES ({sql_esc(author['user_id'])}, {POST_TIME}, 4, {NOW_MS});")

    return statements

def main():
    statements = generate_sql()
    print(f"[+] Prepared {len(statements)} SQL statements for Gemini 4 Argon release.")

    sql_path = os.path.join(BASE_DIR, "seed_gemini_4.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("-- ========================================================================\n")
        f.write("-- UREfy Gemini 4 Argon Launch Post, Comments & Live Chat\n")
        f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(NOW_MS / 1000))} UTC\n")
        f.write("-- ========================================================================\n\n")
        for s in statements:
            f.write(s + "\n")

    print(f"[+] Written to {sql_path} ({os.path.getsize(sql_path) / 1024:.1f} KB).")

if __name__ == "__main__":
    main()
