"""Lifecycle tests for Tavi's committed long-term development, reversible checkpoints and experiment notebook.
Run: python tests/test_lifelong.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text('utf-8')
KEY='tavi-world-windows-living-valley-v1'

def setup(page,storage=None):
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate('''(data)=>{
      const kv={...data};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
       getItem:k=>Object.prototype.hasOwnProperty.call(kv,k)?kv[k]:null,
       setItem:(k,v)=>{kv[k]=String(v)},removeItem:k=>{delete kv[k]},
       _dump:()=>({...kv})}})
    }''',storage or {})
    page.set_content(HTML,wait_until='domcontentloaded',timeout=20000)
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=15000)
    assert not errors,errors
    return errors

with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1360,'height':850})
    errors=setup(page)
    assert page.locator('#journalGroups').get_by_text('Profile').is_visible()
    assert page.evaluate('TaviApp.state.development.traits.trust')==50
    assert page.evaluate('TaviApp.state.development.experienceCount')==0
    print('✓ Backward-compatible lifelong profile initialized')

    page.evaluate('''() => {TaviApp.lab.speed=6;TaviApp.updateTrialFactors({safety:95,novelty:70,social:100,noise:0,difficulty:45,choice:100},'Welcoming and safe');TaviApp.beginTrial()}''')
    before=page.evaluate('''() => ({primary:JSON.parse(localStorage.getItem('tavi-world-windows-living-valley-v1')),trait:TaviApp.state.development.traits.trust})''')
    page.wait_for_timeout(5800)
    trial=page.evaluate('''() => ({elapsed:TaviApp.lab.active.elapsed,trust:TaviApp.state.development.traits.trust,experiences:TaviApp.state.development.experienceCount,events:TaviApp.lab.active.events.length,primary:JSON.parse(localStorage.getItem('tavi-world-windows-living-valley-v1'))})''')
    assert trial['elapsed']>28,trial
    assert trial['trust']>before['trait']+.15,(before,trial)
    assert trial['experiences']>=1,trial
    assert trial['primary']['development']['traits']['trust']==before['primary']['development']['traits']['trust'],'Main save was modified before commit'
    page.evaluate('TaviApp.endTrial()')
    result=page.evaluate('''() => ({active:!!TaviApp.lab.active,trait:TaviApp.state.development.traits.trust,count:TaviApp.state.development.experienceCount,primary:JSON.parse(localStorage.getItem('tavi-world-windows-living-valley-v1')),checkpoint:!!localStorage.getItem('tavi-world-pre-lifelong-learning-v1'),runs:TaviApp.lab.runs})''')
    assert not result['active'] and result['checkpoint']
    assert result['trait']>before['trait']+.15
    assert result['primary']['development']['traits']['trust']==result['trait']
    assert result['runs'][0]['committed'] and result['runs'][0]['experiencesGained']>=1
    print('✓ Controlled situation produces measurable lifelong learning; explicit finish commits and checkpoints prior self')

    # A different page running from the same saved storage inherits the evolved self.
    storage=page.evaluate('localStorage._dump()')
    restored=b.new_page(viewport={'width':1150,'height':780})
    new_errors=setup(restored,storage)
    assert restored.evaluate('TaviApp.state.development.traits.trust')>before['trait']+.15
    assert restored.evaluate('TaviApp.state.development.experienceCount')>=1
    restored.locator('#journalGroups button').filter(has_text='Profile').click()
    restored.locator('#tabs button').filter(has_text='Development').click()
    assert restored.get_by_text('Learned activity preferences').count()==1
    assert restored.get_by_text('Expectations formed by repetition').count()==1
    print('✓ Learned identity survives page reload and can be inspected under Profile → Development')

    # An activity changes action-value preferences, independent of temporary bar gauges.
    restored.evaluate('''() => {
      const prop=TaviWorld.props.find(p=>p.activity==='reading');
      const goal=TaviWorld.approach(prop,TaviApp.state.world);
      TaviApp.state.world.x=goal.x+.5;TaviApp.state.world.y=goal.y+.5;
      TaviApp.setDestination(prop);
      TaviApp.state.brain.mode='working';TaviApp.state.brain.work=50;
    }''')
    restored.wait_for_timeout(180)
    policy=restored.evaluate('''() => ({value:TaviApp.state.development.activityValues.reading||0,visits:TaviApp.state.development.activityVisits.reading||0,count:TaviApp.state.development.experienceCount})''')
    assert policy['visits']>=1 and policy['value']>50 and policy['count']>=2,policy
    print('✓ Completed activities update persistent action-reward preferences used in later decisions')

    # Discarded run returns exactly to pre-trial developmental state, but preserves result log.
    restored.evaluate('TaviApp.save()')
    baseline=restored.evaluate('JSON.stringify(TaviApp.state.development)')
    restored.evaluate('''() => {TaviApp.lab.speed=6;TaviApp.updateTrialFactors({safety:10,novelty:100,social:0,noise:100,difficulty:100,choice:0},'Disruptive test');TaviApp.beginTrial()}''')
    restored.wait_for_timeout(2500)
    assert restored.evaluate('TaviApp.state.development.traits.trust')<result['trait']
    restored.evaluate("TaviApp.endTrial('discard')")
    end=restored.evaluate('''() => ({development:JSON.stringify(TaviApp.state.development),run:TaviApp.lab.runs[0],primary:JSON.parse(localStorage.getItem('tavi-world-windows-living-valley-v1')).development})''')
    assert end['development']==baseline,'Discard did not restore trait and memory profile exactly'
    assert end['run']['committed'] is False
    print('✓ Optional discard restores the baseline while retaining observation data')

    # Repeated experiment can also be recovered from session storage after page reload.
    restored.evaluate('''() => {TaviApp.lab.speed=6;TaviApp.beginTrial()}''')
    restored.wait_for_timeout(200)
    restored.evaluate('TaviApp.save()')
    inprogress=restored.evaluate('localStorage._dump()')
    resumed=b.new_page(viewport={'width':1150,'height':780})
    final_errors=setup(resumed,inprogress)
    assert resumed.evaluate('TaviApp.lab.active!==null')
    assert resumed.evaluate('TaviApp.lab.active.baseline.development.experienceCount')>=1
    resumed.evaluate("TaviApp.endTrial('discard')")
    assert not final_errors and not new_errors and not errors,(errors,new_errors,final_errors)
    print('✓ In-progress experience resumes across page reload and can still be discarded safely')

    # User-controlled recovery checkpoint restores the state before the first commit.
    recovery=b.new_page(viewport={'width':1120,'height':780})
    setup(recovery,storage)
    recovery.on('dialog',lambda dialog: dialog.accept())
    recovery.evaluate('TaviApp.restoreLearningBackup()')
    profile=recovery.evaluate('TaviApp.state.development')
    assert abs(profile['traits']['trust']-before['trait'])<.001,profile
    assert profile['experienceCount']==0
    print('✓ Pre-commit checkpoint restores the original Tavi profile with confirmation')
    b.close()
    print('ALL LIFELONG TESTS PASSED')