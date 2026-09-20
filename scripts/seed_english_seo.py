#!/usr/bin/env python3
# scripts/seed_english_seo.py
# High-SEO English Developer Discussions & Interactions Seed
# Date: September 18, 2026
# Cloudflare D1: aetheris-db

import json
import time
import os
import subprocess
import random

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.getcwd())

try:
    from data_english_posts import POSTS_PART1
    from data_english_posts_part2 import POSTS_PART2
except ImportError:
    from scripts.data_english_posts import POSTS_PART1
    from scripts.data_english_posts_part2 import POSTS_PART2

ALL_POSTS = POSTS_PART1 + POSTS_PART2

ALL_PERSONAS = [
    "4e198a00b215", "7f8a910c2b44", "29c40e11a8b2", "62df0912cb88", "1bf08912ea56",
    "b1409ea28c99", "99df012aa4c3", "44df9012a8bc", "22c88f01a9df", "1df08912de78",
    "91df9012cb78", "3db014ea9e12", "18df01a2eb34", "83d2019fab66", "61c8012afa34",
    "7ac901afcd67", "5fc4018fab23", "8d104fb2a901", "79c901affa01", "aa0194f2cd01",
    "70a40f91b2df", "2d89b14c99a0", "a500912fa8cc", "5b2041e8d902", "a0914e21fc88",
    "88b4012ce9fa", "77e1029ba4c0", "87a01fa29cb5", "50c4018fef89", "a7df9012bc23",
    "6f1084ea2b99", "3e901a88fb22", "88f019ab4c21", "6d88f12a04cb", "94df0218ab44",
    "91c24f00ba11", "1cf08912fa12", "24cb9011af33", "55a019ef44cc", "12df9011ac89"
]

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"

def generate_sql():
    statements = []
    
    # 1. Insert Posts
    for p in ALL_POSTS:
        stmt = f"""INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            {escape_sql(p['id'])},
            {escape_sql(p['channel_id'])},
            {escape_sql(p['author_id'])},
            {escape_sql(p['author_role'])},
            {escape_sql(p['title'])},
            {escape_sql(p['content'])},
            {escape_sql(p['flair'])},
            {p['merit_votes']},
            0,
            {p['reply_count']},
            {p['boost_count']},
            NULL, NULL, NULL, NULL, NULL,
            'published',
            {p['created_at']},
            0
        );"""
        statements.append(stmt)
        
        # Post Tags
        for tag in p.get("tags", []):
            clean_tag = tag.strip().lstrip("#").lower()
            tag_stmt = f"INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ({escape_sql(p['id'])}, {escape_sql(clean_tag)}, {p['created_at']});"
            statements.append(tag_stmt)

        # Comments
        for c in p.get("comments", []):
            parent_val = escape_sql(c['parent_id']) if c['parent_id'] else "NULL"
            c_stmt = f"""INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                {escape_sql(c['id'])},
                {escape_sql(p['id'])},
                {parent_val},
                {escape_sql(c['author_id'])},
                {escape_sql(c['author_role'])},
                {escape_sql(c['content'])},
                {c['merit_votes']},
                {c['created_at']}
            );"""
            statements.append(c_stmt)
            
            # Reactions on comments (4-7 reactions per comment)
            comment_reactors = random.sample(ALL_PERSONAS, k=min(len(ALL_PERSONAS), random.randint(4, 7)))
            for idx, reactor_id in enumerate(comment_reactors):
                if reactor_id == c['author_id']:
                    continue
                r_type = random.choice(['like', 'reaction'])
                r_val = random.choice(['🔥', '🧠', '🚀', '❤️', '👍', '💡', '🛡️'])
                r_time = c['created_at'] + (idx + 1) * 30000
                int_id = f"int-c-{c['id']}-{reactor_id[:6]}-{idx}"
                int_stmt = f"""INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    {escape_sql(int_id)},
                    'comment',
                    {escape_sql(c['id'])},
                    {escape_sql(reactor_id)},
                    {escape_sql(r_type)},
                    {escape_sql(r_val)},
                    {r_time}
                );"""
                statements.append(int_stmt)

        # Reactions on Posts (20-30 reactions per post)
        post_reactors = random.sample(ALL_PERSONAS, k=min(len(ALL_PERSONAS), random.randint(22, 32)))
        for idx, reactor_id in enumerate(post_reactors):
            if reactor_id == p['author_id']:
                continue
            r_type = random.choice(['like', 'reaction', 'bookmark'])
            r_val = random.choice(['🔥', '🚀', '🧠', '❤️', '👍', '💡', '🛡️', '⚡'])
            r_time = p['created_at'] + (idx + 1) * 60000
            int_id = f"int-p-{p['id']}-{reactor_id[:6]}-{idx}"
            int_stmt = f"""INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                {escape_sql(int_id)},
                'post',
                {escape_sql(p['id'])},
                {escape_sql(reactor_id)},
                {escape_sql(r_type)},
                {escape_sql(r_val)},
                {r_time}
            );"""
            statements.append(int_stmt)
            
            # Votes table
            v_id = f"v-p-{p['id']}-{reactor_id[:6]}"
            vote_stmt = f"""INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                {escape_sql(v_id)},
                'post',
                {escape_sql(p['id'])},
                {escape_sql(reactor_id)},
                1,
                {r_time}
            );"""
            statements.append(vote_stmt)

    return statements

def execute_in_batches(statements):
    batch_size = 50
    total_stmts = len(statements)
    total_batches = (total_stmts + batch_size - 1) // batch_size
    print(f"Total SQL statements to execute: {total_stmts} across {total_batches} batches.")
    
    tmp_file = "scripts/_tmp_en_seo_batch.sql"
    success_count = 0
    
    for i in range(0, total_stmts, batch_size):
        batch = statements[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"[{batch_num}/{total_batches}] Executing {len(batch)} statements...", flush=True)
        
        batch_content = "\n".join(batch) + "\n"
        with open(tmp_file, "w", encoding="utf-8") as bf:
            bf.write(batch_content)
            
        cmd = [
            "npx.cmd" if os.name == "nt" else "npx",
            "wrangler",
            "d1",
            "execute",
            "aetheris-db",
            "--remote",
            f"--file={tmp_file}",
            "-y"
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"ERROR on batch {batch_num}:", flush=True)
            print(res.stderr or res.stdout, flush=True)
            # Retry once
            time.sleep(1.5)
            res2 = subprocess.run(cmd, capture_output=True, text=True)
            if res2.returncode != 0:
                print(f"Failed retry on batch {batch_num}, aborting.", flush=True)
                return False
        success_count += len(batch)
        time.sleep(0.3)
        
    if os.path.exists(tmp_file):
        os.remove(tmp_file)
        
    print(f"ALL {success_count} English SEO statements successfully committed to remote D1!", flush=True)
    return True

if __name__ == "__main__":
    stmts = generate_sql()
    with open("scripts/seed_english_seo.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(stmts) + "\n")
    print(f"Generated scripts/seed_english_seo.sql with {len(stmts)} statements.")
    execute_in_batches(stmts)
