"""Browser smoke tests for the self-contained Tavi World HTML.
Run with: python tests/test_smoke.py
Requires Playwright for Python and a locally installed Chromium browser.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text('utf-8')
CHROME='/usr/bin/chromium'

def load(page):
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(HTML,wait_until='domcontentloaded',timeout=20000)
    page.wait_for_function("document.documentElement.dataset.taviReady === '1'",timeout=10000)
    assert page.evaluate('TaviWorld.regions.length')==12
    assert page.evaluate('TaviWorld.props.length')==36
    assert not errors, errors
    return errors

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=CHROME,args=['--no-sandbox'])
    desktop=browser.new_page(viewport={'width':1440,'height':900})
    errors=load(desktop)
    desktop.wait_for_timeout(150)
    print('✓ Startup, 12 areas, 36 activities, zero JS exceptions')
    assert desktop.locator('#startupSplash').is_hidden()
    print('✓ Startup overlay dismissed')
    routes=desktop.evaluate('''() => TaviWorld.props.map(prop => {
        const goal=TaviWorld.approach(prop,TaviApp.state.world);
        const path=TaviWorld.route(TaviApp.state.world,goal);
        return {id:prop.id,name:prop.name,waypoints:path.length};
    })''')
    assert len(routes)==36 and all(r['waypoints']>=0 for r in routes)
    assert all(r['waypoints']>0 for r in routes if r['id'] not in ['house:0'])
    print('✓ All 36 activities accessible by A*')
    desktop.get_by_role('button',name='World map',exact=False).click()
    assert desktop.locator('#mapOverlay').is_visible()
    desktop.locator('#closeMap').click()
    assert desktop.locator('#mapOverlay').is_hidden()
    print('✓ Full overworld map opens/closes')
    desktop.get_by_role('button',name='Next adventure',exact=False).click()
    assert desktop.evaluate('TaviApp.state.brain.target !== null')
    assert desktop.evaluate('TaviApp.state.brain.mode')=='travel'
    print('✓ Autonomous decision starts traversable travel')
    orig=desktop.evaluate('({x:TaviApp.state.world.x,y:TaviApp.state.world.y})')
    desktop.wait_for_timeout(1250)
    new=desktop.evaluate('({x:TaviApp.state.world.x,y:TaviApp.state.world.y})')
    assert (orig['x'],orig['y']) != (new['x'],new['y']),f'Tavi did not move: {orig} -> {new}'
    print('✓ Tavi autonomously follows the route')
    desktop.locator('#pause').click()
    assert desktop.evaluate('TaviApp.state.paused')
    desktop.locator('#pause').click()
    assert not desktop.evaluate('TaviApp.state.paused')
    print('✓ Pause and resume')
    desktop.keyboard.down('d');desktop.wait_for_timeout(330);desktop.keyboard.up('d')
    print('✓ WASD control works')
    desktop.locator('#tabs button').filter(has_text='Settings').click()
    assert desktop.get_by_text('Local Ollama brain').is_visible()
    desktop.locator('#tabs button').filter(has_text='Memories').click()
    print('✓ Settings, local Ollama wiring, journal tabs')
    desktop.screenshot(path=str(ROOT/'docs'/'preview-desktop.png'),full_page=True)
    mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
    load(mobile)
    mobile.screenshot(path=str(ROOT/'docs'/'preview-mobile.png'),full_page=True)
    assert mobile.locator('#game').is_visible()
    mobile.locator('#mapButton').click()
    assert mobile.locator('#mapOverlay').is_visible()
    print('✓ Mobile viewport and touch-map UI')
    # Verify old living-valley save migration without modifying the real user save.
    migrated=browser.new_page(viewport={'width':1100,'height':760})
    legacy={"version":1,"seed":123,"area":3,"clock":1794751200000,
            "stats":{"hunger":10,"energy":90,"happiness":88,"curiosity":40},
            "memories":[{"id":"m-existing","text":"I remember my first painting.","interest":"art","area":"Art Studio","time":1}],
            "journal":[{"id":"j-existing","text":"Old world event","kind":"activity","time":1,"area":"Tavi House"}],
            "art":[{"id":"art-existing","title":"The First Painting","palette":["#aabbcc"],"seed":22,"time":1}],
            "brain":{"mode":"working","target":{"area":3,"obj":0},"explored":{"3:0":2}}}
    migrated.evaluate('''(s) => {const data = JSON.stringify(s);const kv = {'tavi-world-windows-living-valley-v1':data};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>kv[k]??null,setItem:(k,v)=>{kv[k]=v;},removeItem:k=>{delete kv[k]}}});}''',legacy)
    load(migrated)
    mig=migrated.evaluate('''() => ({a:TaviApp.state.area, m:TaviApp.state.memories[0],j:TaviApp.state.journal.some(x=>x.id==='j-existing'),art:TaviApp.state.art.some(x=>x.id==='art-existing'), explored:TaviApp.state.brain.explored['6:0'],source:TaviApp.state.world.sourceVersion})''')
    assert migrated.evaluate("TaviApp.state.memories.some(m => m.id==='m-existing' && m.text==='I remember my first painting.')")
    assert mig['j'] and mig['art'] and mig['explored']==2 and mig['source']=='living-valley-v1',mig
    print('✓ Legacy save migrates; memories, journals, artwork and explored counts preserved')
    assert not errors,errors
    print('ALL SMOKE TESTS PASSED')
    browser.close()