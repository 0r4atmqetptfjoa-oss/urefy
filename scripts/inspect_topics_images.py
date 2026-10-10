import json
import sys

with open('scripts/audit_results.json', encoding='utf-8') as f:
    data = json.load(f)

lines = []
lines.append(f"Total posts: {len(data)}")
for p in data:
    imgs = p.get('images', [])
    v_src = p.get('video_src')
    v_st = p.get('video_status')
    if imgs or v_src:
        lines.append(f"[{p['id']}] ch:{p['channel_id']} | title: {p['title']}")
        if v_src:
            lines.append(f"  VIDEO: status={v_st} | src={v_src} | info={p.get('video_err_or_title')}")
        if imgs:
            for img in imgs:
                lines.append(f"  IMAGE: ok={img.get('ok')} | url={img.get('url')}")

with open('scripts/topics_media_summary.txt', 'w', encoding='utf-8') as out:
    out.write("\n".join(lines))

print("Wrote scripts/topics_media_summary.txt")
