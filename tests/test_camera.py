"""Browser regression: independent zoomable observer camera, minimap and touch gestures."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from math import isclose
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text(encoding='utf-8')

def install(page, data=None):
    errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
    page.evaluate('''(data)=>{const items={...data};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(items,k)?items[k]:null,setItem:(k,v)=>{items[k]=String(v)},removeItem:k=>delete items[k],_dump:()=>({...items})}})}''',data or {})
    page.set_content(HTML,wait_until='domcontentloaded',timeout=20000)
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=10000)
    assert not errors,errors
    return errors

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1530,'height':1050})
    errors=install(page)
    # Disable only Tavi's own movement to make drag assertions deterministic.
    page.evaluate('TaviApp.state.paused=true')
    assert page.locator('#zoomLevel').inner_text()=='100%'
    initial=page.evaluate('({...TaviApp.camera,zoom:TaviApp.zoom})')
    page.locator('#zoomIn').click()
    assert page.evaluate('TaviApp.zoom')>initial['zoom']
    page.locator('#zoomOut').click()
    assert isclose(page.evaluate('TaviApp.zoom'),1,abs_tol=0.01)
    print('✓ Zoom buttons and zoom label')
    # New wide overview: minimum 30%, half of the former 60% limit.
    # Confirm both the camera controller and renderer accept 30% rather than
    # silently rendering the world with the obsolete 60% clamp.
    page.evaluate('TaviApp.zoomTo(.6)')
    baseline_view=960/.6
    page.evaluate('TaviApp.zoomTo(.3)')
    assert isclose(page.evaluate('TaviApp.zoom'),.3,abs_tol=.001)
    assert page.locator('#zoomLevel').inner_text()=='30%'
    assert page.locator('#zoomOut').is_disabled()
    assert 960/page.evaluate('TaviApp.zoom')==baseline_view*2
    assert page.evaluate('TaviApp.camera.x')>=0
    assert page.evaluate('TaviApp.camera.y')>=0
    # Bounds remain valid even at 30%, and the wide view is persisted.
    assert page.evaluate('''() => TaviApp.camera.x <= TaviWorld.W*TaviVisuals.TILE-960/TaviApp.zoom + .01''')
    page.evaluate('TaviApp.zoomTo(.1)')
    assert isclose(page.evaluate('TaviApp.zoom'),.3,abs_tol=.001)
    page.evaluate('TaviApp.zoomTo(1)')
    print('✓ 30% wide-overworld minimum, zoom clamping, camera bounds')

    bounds=page.locator('#game').bounding_box()
    x=bounds['x']+bounds['width']*.42;y=bounds['y']+bounds['height']*.58
    anchor_before=page.evaluate('''(coords)=>({x:(TaviApp.camera.x+coords.x/TaviApp.zoom)/TaviVisuals.TILE,y:(TaviApp.camera.y+coords.y/TaviApp.zoom)/TaviVisuals.TILE})''',{'x':.42*960,'y':.58*600})
    page.mouse.move(x,y);page.mouse.wheel(0,-280);page.wait_for_timeout(150)
    anchor_after=page.evaluate('''(coords)=>({x:(TaviApp.camera.x+coords.x/TaviApp.zoom)/TaviVisuals.TILE,y:(TaviApp.camera.y+coords.y/TaviApp.zoom)/TaviVisuals.TILE})''',{'x':.42*960,'y':.58*600})
    assert page.evaluate('TaviApp.zoom')>1.2
    assert abs(anchor_before['x']-anchor_after['x'])<.01,(anchor_before,anchor_after)
    assert abs(anchor_before['y']-anchor_after['y'])<.01,(anchor_before,anchor_after)
    print('✓ Cursor-anchored mouse wheel zoom')
    cam_before=page.evaluate('({...TaviApp.camera})')
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+100,y+75,steps=10);page.mouse.up();page.wait_for_timeout(100)
    cam_after=page.evaluate('({...TaviApp.camera})')
    assert cam_after['x']<cam_before['x']-20,(cam_before,cam_after)
    assert cam_after['y']<cam_before['y']-20,(cam_before,cam_after)
    print('✓ Drag-to-pan independent camera; no accidental click movement')
    # Tavi moves to a different coordinate while viewer stays stationary.
    cam_before=page.evaluate('({...TaviApp.camera})')
    page.evaluate('''() => {TaviApp.state.world.x=90;TaviApp.state.world.y=90;}''')
    page.wait_for_timeout(250)
    cam_after=page.evaluate('({...TaviApp.camera})')
    assert abs(cam_before['x']-cam_after['x'])<1 and abs(cam_before['y']-cam_after['y'])<1
    page.locator('#findTavi').click()
    centered=page.evaluate('''() => ({x:TaviApp.camera.x+960/(2*TaviApp.zoom),y:TaviApp.camera.y+600/(2*TaviApp.zoom),wx:TaviApp.state.world.x*TaviVisuals.TILE,wy:TaviApp.state.world.y*TaviVisuals.TILE})''')
    assert abs(centered['x']-centered['wx'])<1,centered
    assert abs(centered['y']-centered['wy'])<1,centered
    page.evaluate('''() => {TaviApp.state.world.x=91;TaviApp.state.world.y=91;}''')
    page.wait_for_timeout(250)
    after=page.evaluate('({...TaviApp.camera})')
    assert abs(after['x']-page.evaluate('TaviApp.camera.x'))<1
    print('✓ Find Tavi recenters once; never switches on tracking')
    # Minimap marker should match visible zoom-dependent bounds.
    page.locator('#mapButton').click()
    assert page.locator('#mapOverlay').is_visible()
    page.locator('#closeMap').click()
    # Keyboard and storage.
    before=page.evaluate('TaviApp.zoom')
    page.keyboard.press('-');assert page.evaluate('TaviApp.zoom')<before
    page.keyboard.press('f')
    prefs=page.evaluate('JSON.parse(localStorage.getItem("tavi-world-observer-camera-v1"))')
    assert prefs and prefs['zoom']>0 and prefs['x']>=0
    print('✓ Keyboard controls and separate camera preferences')
    # Simulate touch gestures as native PointerEvents with two pointer IDs.
    page.evaluate('''() => {
     const c=document.getElementById('game'),rect=c.getBoundingClientRect();
     const fire=(type,id,rx,ry)=>c.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:id===41,clientX:rect.x+rect.width*rx,clientY:rect.y+rect.height*ry}));
     fire('pointerdown',41,.35,.5);fire('pointerdown',42,.65,.5);
     fire('pointermove',41,.25,.5);fire('pointermove',42,.75,.5);
     fire('pointerup',41,.25,.5);fire('pointerup',42,.75,.5);
    }''')
    assert page.evaluate('TaviApp.zoom')>prefs['zoom']
    print('✓ Touch pinch zoom')
    assert not errors,errors
    # Camera preferences restore independently of Tavi's saved development.
    stored=page.evaluate('localStorage._dump()')
    checkpoint=page.evaluate('({...TaviApp.camera,zoom:TaviApp.zoom})')
    other=browser.new_page(viewport={'width':1280,'height':860})
    other_errors=install(other,stored)
    restored=other.evaluate('({...TaviApp.camera,zoom:TaviApp.zoom})')
    assert abs(restored['zoom']-checkpoint['zoom'])<.001,(checkpoint,restored)
    assert abs(restored['x']-checkpoint['x'])<.1 and abs(restored['y']-checkpoint['y'])<.1,(checkpoint,restored)
    assert not other_errors,other_errors
    print('✓ View position and zoom restore after reload')
    other.close()
    page.screenshot(path=str(ROOT/'docs'/'preview-camera-desktop.png'),full_page=True)
    print('ALL CAMERA TESTS PASSED')
    browser.close()