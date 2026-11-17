"""Lifelong simulation sandbox integration checks; Chromium via Playwright."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text('utf-8')
KEY='tavi-world-windows-living-valley-v1'
LAB='tavi-world-isolated-trial-v1'
NB='tavi-world-observation-notebook-v1'

def open_page(browser,storage=None,viewport=None):
    page=browser.new_page(viewport=viewport or {'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate('''(init)=>{let kv={...init};Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>Object.prototype.hasOwnProperty.call(kv,k)?kv[k]:null,
        setItem:(k,v)=>{kv[k]=String(v)},removeItem:k=>{delete kv[k]},_dump:()=>({...kv})
    }})}''',storage or {})
    page.set_content(HTML,wait_until='domcontentloaded',timeout=25000)
    page.wait_for_function("document.documentElement.dataset.taviReady === '1'",timeout=12000)
    assert not errors,errors
    return page,errors

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page,errors=open_page(browser)
    assert page.locator('#labTrialButton').is_visible()
    assert page.locator('#value-hunger').count()==0
    assert len(page.evaluate('TaviWorld.props'))==36
    print('PASS startup with 36 activities, no survival hunger, visible lab')

    page.evaluate('TaviApp.save()')
    base=json.loads(page.evaluate('localStorage.getItem("'+KEY+'")'))
    page.locator('#trialName').fill('Uncertainty trial')
    page.locator('#labPreset').select_option('surprise')
    page.locator('#labSpeed').select_option('6')
    page.locator('#labTrialButton').click()
    assert page.evaluate('!!TaviApp.lab.active')
    assert page.evaluate('!TaviApp.state.brain.ai.enabled')
    assert page.evaluate('TaviApp.lab.active.conditions.noise')==78
    base=page.evaluate('TaviApp.lab.active.baseline')
    assert json.loads(page.evaluate('localStorage.getItem("'+KEY+'")'))==base
    print('PASS start trial, preset, and primary save isolation')

    page.wait_for_timeout(6000)
    page.evaluate('TaviApp.save()')
    session=json.loads(page.evaluate('localStorage.getItem("'+LAB+'")'))
    assert session['trial']['elapsed']>20,session['trial']['elapsed']
    assert len(session['trial']['samples'])>=4
    assert session['trial']['decisions']>=1
    assert len(session['trial']['events'])>=2
    vals=session['trial']['samples']
    assert vals[-1]['nervousness']>vals[0]['nervousness'],(vals[0]['nervousness'],vals[-1]['nervousness'])
    assert 'Rule-based choice' in session['trial']['lastReason']
    assert json.loads(page.evaluate('localStorage.getItem("'+KEY+'")'))==base
    print('PASS autonomous choices, rationale, exposure effects, sampling, primary save isolation')

    # Reload active session independently; ensure sample series, not main state, resumes.
    saved=page.evaluate('localStorage._dump()')
    reloaded,_=open_page(browser,storage=saved)
    assert reloaded.evaluate('!!TaviApp.lab.active')
    assert reloaded.evaluate('TaviApp.lab.active.samples.length')>=len(vals)
    print('PASS trial resumes after reload with protected main save')
    reloaded.locator('#journalGroups button').filter(has_text='Research').click()
    reloaded.locator('#tabs button').filter(has_text='Observations').click()
    assert reloaded.locator('#labPlot').is_visible()
    assert reloaded.get_by_text('RECENT EVENTS').is_visible()
    reloaded.screenshot(path=str(ROOT/'docs'/'preview-observations.png'),full_page=True)
    print('PASS observation timeline and chart')

    reloaded.locator('#labTrialButton').count()==0 # conditions tab not active
    reloaded.locator('#tabs button').filter(has_text='Conditions').click()
    reloaded.locator('#labTrialButton').click()
    assert not reloaded.evaluate('!!TaviApp.lab.active')
    assert reloaded.evaluate('TaviApp.lab.runs.length')>=1
    assert reloaded.evaluate('localStorage.getItem("'+LAB+'")') is None
    committed=json.loads(reloaded.evaluate('localStorage.getItem("'+KEY+'")'))
    assert committed['development']['traits'] != base['development']['traits']
    assert committed['development']['experienceCount'] > base['development']['experienceCount']
    assert reloaded.evaluate('!!localStorage.getItem("tavi-world-pre-lifelong-learning-v1")')
    assert reloaded.evaluate('!!localStorage.getItem("'+NB+'")')
    reloaded.locator('#tabs button').filter(has_text='Compare').click()
    assert reloaded.get_by_text('Uncertainty trial').is_visible()
    reloaded.screenshot(path=str(ROOT/'docs'/'preview-compare.png'),full_page=True)
    print('PASS committed experience changes future Tavi, checkpoint exists, archive + compare')

    mobile,_=open_page(browser,viewport={'width':390,'height':844})
    assert mobile.locator('#journalPanel').is_hidden()
    mobile.locator('#journalToggle').click()
    assert mobile.locator('#labTrialButton').is_visible()
    mobile.screenshot(path=str(ROOT/'docs'/'preview-mobile.png'),full_page=True)
    print('PASS mobile lab drawer')
    assert not errors,errors
    browser.close()
    print('ALL SANDBOX CHECKS PASSED')