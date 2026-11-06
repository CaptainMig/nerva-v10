# tools

## render-mp4.py

Renders `replay.html` (repo root) to MP4 frame by frame with headless Chromium
and ffmpeg. Both aspect ratios are rendered from the same HTML file; the page
switches layout on portrait vs landscape and the underlying replay data is
identical in both.

Setup:

```bash
pip install playwright && playwright install chromium
```

ffmpeg must be on PATH.

Render both sizes (run from the repo root):

```bash
python tools/render-mp4.py 9x16 16x9
```

Output goes to `media/nerva-replay-9x16.mp4` (1080x1920) and
`media/nerva-replay-16x9.mp4` (1920x1080), 30 fps, H.264.

The script prints the replay duration and the receipt hashes before rendering
each size. The replay is deterministic (one fixed seed), so the hashes should
match across runs and across the two aspect ratios. If they differ, the HTML
changed; do not ship the videos until the cause is understood.

Built by Starpoint LLC · miglanthony@gmail.com
