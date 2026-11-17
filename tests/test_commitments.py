"""Behavioral checks for a general, durable request→approval→execution ledger.
The test runs in Chromium against the self-contained Tavi build.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game/index.html').read_text('utf8')

def open_game(browser, snapshot=None):
 page=browser.new_page(viewport={'width':1400,'height':850});errors=[]
 page.on('pageerror', lambda e:errors.append(str(e)))
 page.evaluate('''(data) => { const store={...data};
   Object.defineProperty(window,'localStorage',{configurable:true,value:{
     getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),
     removeItem:k=>delete store[k],_dump:()=>({...store})}});
 }''', snapshot or {})
 page.set_content(HTML,wait_until='domcontentloaded')
 page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=18000)
 return page,errors

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page,errors=open_game(browser)
 assert page.evaluate('typeof TaviCommitments.request')=='function'
 # Duplicate pending requests must reuse the original id and not multiply approvals.
 req=page.evaluate('''() => {
   const task={type:'mural',scope:'house:stars-and-flowers:v1',intentKey:'mural:house:stars-and-flowers:v1',text:'Paint a permanent star-and-flower mural inside Tavi House',reason:'A proposed project'};
   const first=TaviApp.requestApproval(task,{repeatable:false});
   const second=TaviApp.requestApproval(task,{repeatable:false});
   return {first:first.item.id,second:second.item.id,created:second.created,count:TaviApp.state.approvals.length};
 }''')
 assert req['first']==req['second'] and not req['created'] and req['count']==1,req
 print('PASS: requesting the same open project is idempotent')
 page.get_by_role('button',name='Records').click()
 page.get_by_role('button',name='Approvals').click()
 page.get_by_role('button',name='Approve').click()
 before=page.evaluate('''() => ({a:TaviApp.state.approvals[0],target:TaviApp.state.brain.target})''')
 assert before['a']['status']=='approved' and before['a']['stage']=='traveling',before
 assert before['target']['approvalId']==req['first'],before
 assert before['a']['history'][-1]['event']=='traveling',before
 # An alternative destination interrupts activity but does not revoke authorization.
 interruption=page.evaluate('''() => {
   const a=TaviApp.state.approvals[0];
   const other=TaviWorld.props.find(v=>v.area!==TaviWorld.props.find(p=>p.id===TaviApp.state.brain.target.id)?.area);
   const moved=TaviApp.setDestination(other,'suggested');
   const snapshot={moved,status:a.status,stage:a.stage,ledger:a.history.map(v=>v.event),count:TaviApp.state.approvals.length};
   TaviApp.state.brain.target=null;TaviApp.state.brain.mode='idle';
   TaviApp.chooseIntent();
   return {...snapshot,next:TaviApp.state.brain.target};
 }''')
 assert interruption['moved'] and interruption['status']=='approved' and interruption['stage']=='queued',interruption
 assert 'interrupted' in interruption['ledger'] and interruption['count']==1,interruption
 assert interruption['next']['approvalId']==req['first'],interruption
 print('PASS: interruptions preserve permission and the unfinished project resumes first')
 # Reload while traveling. No new approval required and no phantom completion.
 page.evaluate('''() => {TaviApp.save()}''')
 snapshot=page.evaluate('localStorage._dump()')
 other,errs2=open_game(browser,snapshot)
 loaded=other.evaluate('''() => ({a:TaviApp.state.approvals[0],art:TaviApp.state.art.length, count:TaviApp.state.approvals.length})''')
 assert loaded['a']['status']=='approved' and loaded['count']==1 and loaded['art']==0,loaded
 other.evaluate('TaviApp.chooseIntent()')
 resumed=other.evaluate('''() => ({a:TaviApp.state.approvals[0],target:TaviApp.state.brain.target})''')
 assert resumed['target']['approvalId']==req['first'],resumed
 print('PASS: approved work survives browser reload without being approved again')
 # Force completion through the simulation's existing working-phase logic.
 other.evaluate('''() => {TaviApp.state.brain.mode='working';TaviApp.state.brain.work=25}''')
 other.wait_for_function("TaviApp.state.approvals[0].status==='executed'",timeout=8000)
 done=other.evaluate('''() => ({a:TaviApp.state.approvals[0],art:TaviApp.state.art.filter(a=>a.commissionId===TaviApp.state.approvals[0].id),decor:TaviApp.state.decorations})''')
 assert done['a']['stage']=='completed' and len(done['art'])==1 and done['a']['evidence']['id']==done['art'][0]['id'],done
 assert done['decor'].count('mural')==1,done
 old_req=other.evaluate('''() => TaviApp.requestApproval({type:'mural',intentKey:'mural:house:stars-and-flowers:v1',text:'Paint a permanent star-and-flower mural inside Tavi House'},{repeatable:false})''')
 assert not old_req['created'],old_req
 print('PASS: completion has evidence, no duplicate artwork and the same permanent mural is not requested anew')
 # The general engine does allow future repeatable projects after completion,
 # and does not silently mark an unimplemented approval complete.
 general=other.evaluate('''() => {
   const task={type:'science_project',intentKey:'study:forest:sample-1',text:'Study a forest sample'};
   const first=TaviApp.requestApproval(task,{repeatable:true,cooldownMs:0});
   TaviApp.approveRequest(first.item); // No executor; this must BLOCK, not fake completion.
   const blocked={status:first.item.status,stage:first.item.stage,blocker:first.item.blocker};
   const repeatWhileOpen=TaviApp.requestApproval(task,{repeatable:true,cooldownMs:0});
   TaviCommitments.complete(first.item,{evidence:{id:'test-observation-1',kind:'lab-record'}});
   const repeatAfterDone=TaviApp.requestApproval(task,{repeatable:true,cooldownMs:0});
   return {blocked,whileOpen:repeatWhileOpen.created,afterDone:repeatAfterDone.created,ids:[first.item.id,repeatAfterDone.item.id]};
 }''')
 assert general['blocked']['status']=='approved' and general['blocked']['stage']=='blocked' and 'No executor' in general['blocked']['blocker'],general
 assert not general['whileOpen'] and general['afterDone'] and general['ids'][0]!=general['ids'][1],general
 print('PASS: unknown work blocks honestly; repeatable project can be newly proposed after completion')
 assert not errors and not errs2,(errors,errs2)
 browser.close()
print('ALL GENERAL COMMITMENT TESTS PASSED')