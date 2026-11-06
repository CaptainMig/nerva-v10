import sys, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright
FPS=30
sizes={'9x16':(1080,1920),'16x9':(1920,1080)}
REPO=Path(__file__).resolve().parent.parent          # repo root
HTML=REPO/'replay.html'                              # the one source for both aspect ratios
OUT=REPO/'media'; OUT.mkdir(exist_ok=True)
which=sys.argv[1:] or list(sizes)
with sync_playwright() as p:
    b=p.chromium.launch()
    for key in which:
        w,h=sizes[key]
        pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        pg.goto(HTML.as_uri()+'?autoplay=0&theme=dark&ui=0')
        pg.wait_for_timeout(800)
        dur=pg.evaluate("__nerva.DURATION"); hashes=pg.evaluate("__nerva.receipts.map(r=>r.hash).join(',')")
        n=int(round(dur*FPS))+1
        print(key,'duration',dur,'frames',n,'receipt hashes',hashes,flush=True)
        out=str(OUT/f'nerva-replay-{key}.mp4')
        ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-f','image2pipe','-c:v','png','-i','-',
                             '-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','fast','-movflags','+faststart',out],stdin=subprocess.PIPE)
        t0=time.time()
        for i in range(n):
            pg.evaluate(f"__nerva.render({i/FPS})")
            ff.stdin.write(pg.screenshot(type='png'))
            if i%300==0: print(key,i,'/',n,f'{time.time()-t0:.0f}s',flush=True)
        ff.stdin.close(); ff.wait(); print(key,'done',f'{time.time()-t0:.0f}s',flush=True)
        pg.close()
    b.close()
