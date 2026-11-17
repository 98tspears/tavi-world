"""Rendering regression for the continuous, procedural 32px pixel-art map.

No external assets, subscriptions, user saves, or Ollama instance are required.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game/index.html').read_text(encoding='utf-8')
assert '__INLINE_DETAIL_ART__' not in HTML
assert 'window.TaviDetailArt=' in HTML
assert 'game/art/' not in HTML
assert 'drawIllustrated' not in HTML
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1450,'height':930},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=30000)
    setup=page.evaluate('''() => ({
      atlasTypes:Object.keys(TaviDetailArt.tileAtlas({'0':['#111111','#222222','#333333','#444444','#555555']})).length,
      tileSize:TaviDetailArt.makeTile(0,0,['#338844','#227733','#66bb66','#bbdd99','#115522'].reduce((acc,c,i)=>(acc[0]=acc[0]||[],acc[0][i]=c,acc),{})).width,
      treeTypes:TaviDetailArt.trees.length,
      scenery:TaviDetailArt.scenery.length,
      mapCount:TaviWorld.regions.length,
      activities:TaviWorld.objects.length,
      mapSize:[TaviWorld.W,TaviWorld.H]
    })''')
    assert setup['tileSize']==32,setup
    assert setup['treeTypes']>=8,setup
    assert setup['scenery']>=250,setup
    assert setup['mapCount']==12 and setup['activities']==36,setup
    print('PASS: 32px native terrain, 8 original tree variants, anchored small scenery, 12 regions, 36 activities')

    # Force a deterministic camera position. The camera is independently owned by the UI.
    page.evaluate('''() => {
      TaviApp.state.world.x=68;TaviApp.state.world.y=80;
      TaviApp.zoomTo(.3,{x:480,y:300});
      TaviApp.camera.x=3000;TaviApp.camera.y=1700;
    }''')
    page.wait_for_timeout(350)
    page.screenshot(path=str(ROOT/'docs'/'continuous-overworld-wide.png'))
    metrics=page.evaluate('''() => {
      const v=document.getElementById('game'),cam={x:3000,y:1800};let times={};
      for(let z of [.3,1,2.4]){
        const ui={zoom:z,showGrid:false,showSigns:false};const t=performance.now();
        for(let k=0;k<4;k++)TaviVisuals.draw(v,TaviApp.state,cam,ui,t);
        times[String(z)]=(performance.now()-t)/4;
      }
      return {times,hasFrames:v.width>0&&v.height>0}
    }''')
    assert metrics['hasFrames'] and all(v<250 for v in metrics['times'].values()),metrics
    assert not errors,errors
    print('PASS: free camera at 30%, 100%, 240%, no JavaScript exceptions')
    print('Chromium renderer draw times in ms (non-production environment):', {k:round(v,2) for k,v in metrics['times'].items()})
    browser.close()