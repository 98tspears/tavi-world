"""Behavioral regression for persistent cognitive architecture + mural commission.
Uses actual Chromium, not a mocked state machine. No claim of artificial consciousness.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game/index.html').read_text('utf8')

def bootstrap(browser, seeded=None):
    page=browser.new_page(viewport={'width':1450,'height':850})
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    if seeded:
        page.evaluate('''(snapshot) => {
         Object.defineProperty(window,'localStorage',{configurable:true,value:{
          getItem:k=>Object.hasOwn(snapshot,k)?snapshot[k]:null,
          setItem:(k,v)=>{snapshot[k]=String(v)},removeItem:k=>delete snapshot[k],
          _dump:()=>({...snapshot})}});
        }''',seeded)
    else:
        page.evaluate('''() => {
         const store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{
          getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},
          removeItem:k=>delete store[k],_dump:()=>({...store})}})
        }''')
    page.set_content(HTML,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=14000)
    return page,errors

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page,errors=bootstrap(browser)
 # Cognitive model is initialized in a backward-compatible save.
 before=page.evaluate('''() => ({
    version:TaviApp.state.version,
    attention:TaviApp.state.cognition.workspace,
    weights:TaviApp.state.cognition.actionValues,
    brain:TaviCognition.context(TaviApp.state.cognition,'painting')
 })''')
 assert before['version']==1 and isinstance(before['attention'],dict), before
 assert before['brain']['associations']==[],before
 page.evaluate('''() => {
   const s=TaviApp.state;
   s.approvals.unshift({id:'mural-regression',type:'mural',status:'pending',text:'Paint a permanent star-and-flower mural inside Tavi House',reason:'Inspired by my art memories',time:Date.now()});
   s.brain.mode='idle';s.brain.target=null;s.paused=false;
   TaviApp.save();
 }''')
 page.get_by_role('button',name='Records').click()
 page.get_by_role('button',name='Approvals').click()
 assert page.get_by_role('button',name='Approve').count()==1
 page.get_by_role('button',name='Approve').click()
 queued=page.evaluate('''() => ({a:TaviApp.state.approvals[0],t:TaviApp.state.brain.target,art:TaviApp.state.art.length,decor:TaviApp.state.decorations})''')
 assert queued['a']['status']=='approved' and queued['t']['reason']=='approved-mural',queued
 assert not queued['decor'] and not queued['art'],queued
 assert queued['t']['activity']=='drawing' and queued['t']['approvalId']=='mural-regression',queued
 assert page.get_by_text('Continue mural project').count()>0
 print('PASS: approval starts real travel-and-paint task, not instant fake completion')
 # Restart in the middle: no active target survives (by design), but the queued
 # permission does. Tavi must resume it through executive planning.
 page.evaluate('TaviApp.save()')
 snapshot=page.evaluate('localStorage._dump()')
 other,other_errors=bootstrap(browser,snapshot)
 other.evaluate('''() => {TaviApp.state.brain.target=null;TaviApp.state.brain.mode='idle';TaviApp.chooseIntent()}''')
 renewed=other.evaluate('TaviApp.state.brain.target')
 assert renewed and renewed['reason']=='approved-mural' and renewed['approvalId']=='mural-regression',renewed
 print('PASS: approved but uncompleted painting survives reload and resumes as a task')
 # Fast-forward the simulated working phase; the actual update loop executes the
 # same finishActivity that normal movement/working would call.
 other.evaluate('''() => {TaviApp.state.brain.mode='working';TaviApp.state.brain.work=30;}''')
 other.wait_for_function("TaviApp.state.approvals[0].status==='executed'",timeout=4000)
 completed=other.evaluate('''() => ({approval:TaviApp.state.approvals[0],decor:TaviApp.state.decorations,
   artwork:TaviApp.state.art.filter(a=>a.commissionId==='mural-regression'),
   cognition:TaviApp.state.cognition,
   journal:TaviApp.state.journal.filter(j=>j.text.includes('finished my approved house mural'))})''')
 assert completed['decor'].count('mural')==1,completed
 assert len(completed['artwork'])==1 and completed['approval']['artId']==completed['artwork'][0]['id'],completed
 assert len(completed['journal'])==1,completed
 assert completed['cognition']['episodes'][0]['kind']=='milestone',completed['cognition']['episodes'][:2]
 assert completed['approval']['completedAt']>0,completed
 print('PASS: painting creates exactly one permanent mural, visible decoration, art entry and learned milestone')
 # Activity outcomes directly change predicted reward (not merely a printed score).
 prop=other.evaluate("TaviWorld.props.find(p=>p.activity==='drawing')")
 learning=other.evaluate('''(prop) => {
   const c=TaviApp.state.cognition,s=TaviApp.state;
   const previous=c.actionValues.drawing??50;
   const prediction=TaviCognition.score(c,prop,s);
   const outcome=TaviCognition.outcome(c,prop,s);
   return {previous,next:c.actionValues.drawing,prediction,after:TaviCognition.score(c,prop,s),
           episode:TaviCognition.recall(c,'drawing',1)[0],outcome};
 }''',prop)
 assert learning['next']!=learning['previous'],learning
 assert learning['episode']['topic']=='art',learning
 assert learning['after']!=learning['prediction'],learning
 print('PASS: experienced outcomes update future activity value, habit and autobiographical retrieval')
 other.evaluate('TaviApp.save()')
 state_saved=other.evaluate('localStorage._dump()')
 third,third_errors=bootstrap(browser,state_saved)
 third_state=third.evaluate('''() => ({approvals:TaviApp.state.approvals,art:TaviApp.state.art,
   decorations:TaviApp.state.decorations,c:TaviApp.state.cognition})''')
 assert third_state['approvals'][0]['status']=='executed',third_state
 assert len([a for a in third_state['art'] if a.get('commissionId')=='mural-regression'])==1
 assert third_state['decorations'].count('mural')==1
 assert len(third_state['c']['episodes'])>0 and len(third_state['c']['predictionHistory'])>0
 print('PASS: mural, history, and cognitive learning all survive reload without re-request')
 assert not errors and not other_errors and not third_errors,(errors,other_errors,third_errors)
 browser.close()
print('ALL COGNITION + MURAL TESTS PASSED')