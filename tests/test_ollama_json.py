"""Regression checks for valid, empty, and malformed Ollama bridge/model responses.

No live Ollama or Windows install is required; browser fetch is mocked.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text('utf-8')

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1350,'height':870})
 errors=[]
 page.on('pageerror',lambda err: errors.append(str(err)))
 page.set_content(HTML,wait_until='domcontentloaded')
 page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=15000)
 page.locator('#journalGroups button').filter(has_text='Profile').click()
 page.locator('#tabs button').filter(has_text='Settings').click()
 button=page.get_by_role('button',name='Test local connection')
 assert button.count()==1

 def scenario(body,status=200):
  page.evaluate('''({body,status})=>{
    window.__modelTests={body,status};
    window.fetch=async (url,opts)=>{
       if(url==='/api/brain')return {
         ok:status>=200&&status<300,status,
         text:async()=>body,
         json:async()=>JSON.parse(body)
       };
       throw new Error('Unexpected URL '+url);
    };
    TaviApp.state.brain.ai.lastCall=0;
    TaviApp.state.paused=false;
  }''',{'body':body,'status':status})
  button.click()
  page.wait_for_function('TaviApp.state.brain.ai.lastResult !== "Not connected" && !!TaviApp.state.brain.ai.lastResult',timeout=8000)
  return page.evaluate('TaviApp.state.brain.ai.lastResult')

 valid=json.dumps({'response':json.dumps({'area':0,'obj':0,'thought':'I am eager to explore.'})})
 msg=scenario(valid)
 assert 'Connected' in msg, msg
 print('PASS: nested model JSON parsed without error')

 thinking=json.dumps({'response':'<think>consider options</think>```json\\n{"area":0,"obj":0,"thought":"I love to learn"}\\n```'.replace('\\n','\n')})
 msg=scenario(thinking)
 assert 'Connected' in msg,msg
 print('PASS: optional thinking blocks and fenced JSON parsed')

 for raw in ['undefined','','null','Something is wrong']:
  bad=json.dumps({'response':raw})
  msg=scenario(bad)
  assert ('empty' in msg.lower() or 'json' in msg.lower() or 'text' in msg.lower()),(raw,msg)
  assert 'Unexpected' not in msg,(raw,msg)
 print('PASS: undefined, empty, null, and plain text model replies produce friendly errors')

 msg=scenario(json.dumps({'error':'The requested model is not available'}),503)
 assert '503' in msg and 'model is not available' in msg,msg
 print('PASS: HTTP errors report the upstream error message')

 msg=scenario('<html>problem</html>',200)
 assert 'non-JSON' in msg,msg
 print('PASS: a non-JSON local bridge response produces a friendly error')

 # Test dialogue fallback and a valid model-generated reply.
 page.evaluate('''() => {TaviApp.state.brain.ai.enabled=true;window.fetch=async (url,opts)=>({ok:true,status:200,text:async()=>JSON.stringify({response:'undefined'})})}''')
 page.locator('#talkShortcut').click()
 page.evaluate("TaviApp.talkToTavi('Hello Tavi, what have you learned?')")
 page.wait_for_function('TaviApp.state.brain.ai.lastResult.includes("Conversation used local fallback")',timeout=8000)
 assert page.evaluate('TaviApp.state.conversation.at(-1).source')=='local'
 print('PASS: malformed Ollama conversation preserves local dialogue')

 page.evaluate('''() => {
  window.fetch=async (url,opts)=>({ok:true,status:200,text:async()=>JSON.stringify({response:'{"reply":"I remember our earlier discoveries."}'})});
 }''')
 page.evaluate("TaviApp.talkToTavi('What do you remember?')")
 page.wait_for_function('TaviApp.state.conversation.at(-1).source==="ollama"',timeout=8000)
 assert 'I remember' in page.evaluate('TaviApp.state.conversation.at(-1).text')
 print('PASS: valid Ollama conversation updates the response')
 assert not errors,errors
 browser.close()
 print('ALL OLLAMA JSON TESTS PASSED')