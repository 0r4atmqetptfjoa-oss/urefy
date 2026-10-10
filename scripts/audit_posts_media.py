import json
import subprocess
import urllib.request
import urllib.error
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_query(sql):
    cmd = [
        "npx.cmd", "wrangler", "d1", "execute", "aetheris-db", "--remote",
        "--command=" + sql, "--json"
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8", errors="replace", cwd="d:\\proiect site total")
    if p.returncode != 0:
        print("Error executing wrangler:", p.stderr)
        return []
    try:
        raw = p.stdout
        idx = raw.find('[')
        if idx != -1:
            data = json.loads(raw[idx:])
            return data[0].get("results", [])
    except Exception as e:
        print("JSON parse error:", e)
    return []

def check_youtube(video_id):
    if not video_id or len(video_id) < 5:
        return False, "invalid_id"
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                body = response.read().decode('utf-8', errors='ignore')
                info = json.loads(body)
                return True, info.get("title", "")
            return False, f"status_{response.status}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP_{e.code}"
    except Exception as e:
        return False, str(e)

def check_url_head(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200, resp.headers.get('Content-Type', '')
    except urllib.error.HTTPError as e:
        return False, f"HTTP_{e.code}"
    except Exception as e:
        return False, str(e)

def extract_yt_id(url):
    if not url:
        return None
    m = re.search(r'(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})', url)
    if m:
        return m.group(1)
    return None

def main():
    print("Fetching posts from D1...")
    posts = run_query("SELECT id, title, channel_id, content, video_json, images_json FROM posts;")
    print(f"Total posts in DB: {len(posts)}")

    results = []

    for post in posts:
        pid = post.get("id")
        title = post.get("title", "")
        ch = post.get("channel_id", "")
        v_json = post.get("video_json")
        i_json = post.get("images_json")

        v_status = None
        yt_id = None
        v_err = None
        v_src = None
        v_poster = None

        if v_json:
            try:
                v_data = json.loads(v_json) if isinstance(v_json, str) else v_json
                if isinstance(v_data, dict):
                    v_src = v_data.get("src", "")
                    v_poster = v_data.get("poster", "")
                    if not v_src:
                        v_status = "empty_src"
                        v_err = "Video src is empty string"
                    else:
                        yt_id = extract_yt_id(v_src)
                        if not yt_id:
                            v_status = "not_youtube"
                            v_err = f"Non-YouTube URL: {v_src}"
                        else:
                            ok, t_or_err = check_youtube(yt_id)
                            if ok:
                                v_status = "valid"
                                v_err = t_or_err
                            else:
                                v_status = "broken"
                                v_err = t_or_err
                else:
                    v_status = "invalid_format"
                    v_err = "video_json is not an object"
            except Exception as e:
                v_status = "json_error"
                v_err = str(e)

        imgs_status = []
        if i_json:
            try:
                imgs = json.loads(i_json) if isinstance(i_json, str) else i_json
                if isinstance(imgs, list):
                    for img in imgs:
                        ok, info = check_url_head(img)
                        imgs_status.append({"url": img, "ok": ok, "info": info})
            except Exception as e:
                imgs_status.append({"url": str(i_json), "ok": False, "info": f"JSON error: {e}"})

        results.append({
            "id": pid,
            "title": title,
            "channel_id": ch,
            "video_status": v_status,
            "video_src": v_src,
            "video_poster": v_poster,
            "video_yt_id": yt_id,
            "video_err_or_title": v_err,
            "images": imgs_status
        })

    with open("scripts/audit_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    broken_vids = [r for r in results if r["video_status"] in ("broken", "empty_src", "not_youtube", "invalid_format", "json_error")]
    valid_vids = [r for r in results if r["video_status"] == "valid"]
    print(f"\nAudit complete!")
    print(f"Total posts: {len(results)}")
    print(f"Valid videos: {len(valid_vids)}")
    print(f"Broken / empty / non-youtube videos: {len(broken_vids)}")
    for b in broken_vids:
        print(f"  [FIX NEEDED] {b['id']} | status: {b['video_status']} | src: {b['video_src']} | info: {b['video_err_or_title']}")

if __name__ == "__main__":
    main()
