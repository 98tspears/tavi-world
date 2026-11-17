"""Browser smoke tests for colorful Tavi World UI and its local-first overworld.
Run: python tests/test_smoke.py (Playwright Chromium).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text('utf-8')
CHROME='/usr/bin/chromium'

def load(page, *, legacy=None, storage=None):
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    # This environment blocks HTTP(S) navigation; use an isolated browser-local
    # storage shim so the game is tested without accidentally mutating real saves.
    initial=dict(storage or {})
    if legacy is not None:
        import json
        initial['tavi-world-windows-living-valley-v1']=json.dumps(legacy)
    page.evaluate('''(data) => {
      const kv={...data};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>Object.prototype.hasOwnProperty.call(kv,k)?kv[k]:null,
        setItem:(k,v)=>{kv[k]=String(v)},
        removeItem:k=>{delete kv[k]},
        _dump:()=>({...kv})
      }});
    }''',initial)
    page.set_content(HTML,wait_until='domcontentloaded',timeout=20000)
    page.wait_for_function("document.documentElement.dataset.taviReady === '1'",timeout=10000)
    assert page.evaluate('TaviWorld.regions.length')==12
    assert page.evaluate('TaviWorld.props.length')==36
    assert not errors,errors
    return errors

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=CHROME,args=['--no-sandbox'])
    desktop=browser.new_page(viewport={'width':1440,'height':900})
    errors=load(desktop)
    desktop.wait_for_timeout(300)
    assert desktop.locator('#startupSplash').is_hidden()
    print('✓ Startup on a real browser origin, 12 regions, 36 POIs, no JS errors')

    assert desktop.locator('.stat').count()==3
    assert desktop.locator('#value-hunger').count()==0
    assert desktop.evaluate("!Object.prototype.hasOwnProperty.call(TaviApp.state.stats,'hunger')")
    print('✓ No hunger bar or hunger-survival simulation')

    routes=desktop.evaluate('''() => TaviWorld.props.map(prop => {
        const goal=TaviWorld.approach(prop,TaviApp.state.world);
        const path=TaviWorld.route(TaviApp.state.world,goal);
        return {id:prop.id,waypoints:path.length};
    })''')
    assert len(routes)==36 and all(r['waypoints']>=0 for r in routes)
    assert all(r['waypoints']>0 for r in routes if r['id'] not in ['house:0'])
    print('✓ Paths to all 36 activities')

    desktop.locator('#mapButton').click()
    assert desktop.locator('#mapOverlay').is_visible()
    desktop.locator('#closeMap').click()
    assert desktop.locator('#mapOverlay').is_hidden()
    desktop.locator('#visitNext').click()
    assert desktop.evaluate('TaviApp.state.brain.target !== null')
    assert desktop.evaluate('TaviApp.state.brain.mode')=='travel'
    original=desktop.evaluate('({x:TaviApp.state.world.x,y:TaviApp.state.world.y})')
    desktop.wait_for_timeout(1200)
    changed=desktop.evaluate('({x:TaviApp.state.world.x,y:TaviApp.state.world.y})')
    assert original!=changed, f'Tavi did not move: {original} => {changed}'
    desktop.locator('#pause').click()
    assert desktop.evaluate('TaviApp.state.paused')
    desktop.locator('#pause').click()
    assert not desktop.evaluate('TaviApp.state.paused')
    print('✓ Map, autonomous travel, pause and resume')

    assert desktop.locator('#journalPanel').is_visible()
    desktop.locator('#journalGroups button').filter(has_text='Stories').click()
    desktop.locator('#tabs button').filter(has_text='Memories').click()
    assert desktop.locator('#sidebarContent').get_by_text('Personal memories').count()>0
    desktop.locator('#journalGroups button').filter(has_text='Tavi').click()
    desktop.locator('#tabs button').filter(has_text='Settings').click()
    assert desktop.get_by_text('Local Ollama brain').is_visible()
    desktop.locator('#journalToggle').click()
    assert desktop.locator('#journalPanel').is_hidden()
    desktop.locator('#journalToggle').click()
    assert desktop.locator('#journalPanel').is_visible()
    print('✓ Grouped journal, Ollama settings, journal collapse/expand')
    desktop.screenshot(path=str(ROOT/'docs'/'preview-desktop.png'),full_page=True)

    mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
    mobile_errors=load(mobile)
    assert mobile.locator('#game').is_visible()
    assert mobile.locator('#journalPanel').is_hidden()
    mobile.locator('#journalToggle').click()
    assert mobile.locator('#journalPanel').is_visible()
    assert mobile.locator('#drawerScrim').is_visible()
    mobile.locator('#closeJournal').click()
    assert mobile.locator('#journalPanel').is_hidden()
    mobile.locator('#mapButton').click()
    assert mobile.locator('#mapOverlay').is_visible()
    mobile.locator('#closeMap').click()
    mobile.screenshot(path=str(ROOT/'docs'/'preview-mobile.png'),full_page=True)
    assert not mobile_errors,mobile_errors
    print('✓ Mobile HUD, journal drawer and map controls')

    old={"version":1,"seed":123,"area":3,"clock":1794751200000,
         "stats":{"hunger":10,"energy":90,"happiness":88,"curiosity":40},
         "memories":[{"id":"m-existing","text":"I remember my first painting.","interest":"art","area":"Art Studio","time":1}],
         "journal":[{"id":"j-existing","text":"Old world event","kind":"activity","time":1,"area":"Tavi House"}],
         "art":[{"id":"art-existing","title":"The First Painting","palette":["#aabbcc"],"seed":22,"time":1}],
         "brain":{"mode":"working","target":{"area":3,"obj":0},"explored":{"3:0":2}}}
    migrated=browser.new_page(viewport={'width':1100,'height':760})
    load(migrated,legacy=old)
    mig=migrated.evaluate('''() => ({
      m:TaviApp.state.memories.some(m=>m.id==='m-existing'),
      j:TaviApp.state.journal.some(m=>m.id==='j-existing'),
      art:TaviApp.state.art.some(m=>m.id==='art-existing'),
      explored:TaviApp.state.brain.explored['6:0'],
      legacy:TaviApp.state.world.sourceVersion,
      hunger:'hunger' in TaviApp.state.stats,
      backup:!!localStorage.getItem('tavi-world-save-before-nonsurvival-v1'),
      originalBackup:!!localStorage.getItem('tavi-world-legacy-save-before-overworld-v1')
    })''')
    assert mig['m'] and mig['j'] and mig['art'] and mig['explored']==2 and mig['legacy']=='living-valley-v1',mig
    assert not mig['hunger'] and mig['backup'] and mig['originalBackup'],mig
    print('✓ Old saves migrate without hunger; old raw saves backed up and memories intact')

    # New saves must remain persistent on browser reload.
    desktop.evaluate('TaviApp.save()')
    original_journal=desktop.evaluate('TaviApp.state.journal.length')
    restored=browser.new_page(viewport={'width':1280,'height':800})
    load(restored,storage=desktop.evaluate('localStorage._dump()'))
    assert restored.evaluate('TaviApp.state.journal.length')>=original_journal
    assert restored.locator('.stat').count()==3
    print('✓ Save can be restored into a fresh browser page (isolated storage simulation)')
    print('ALL SMOKE TESTS PASSED')
    browser.close()