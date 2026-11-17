"""Regression for large grounded contexts and HTTP-400 repair visibility.

Browser Ollama responses are mocked. PowerShell/Ollama behavior must be tested on Windows.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

ROOT=Path(__file__).resolve().parents[1]
app=(ROOT/'src/app.js').read_text('utf8')
server=(ROOT/'Start-TaviWorld.ps1').read_text('utf8')
html=(ROOT/'game/index.html').read_text('utf8')
assert 'function serializeBrainRequest(payload)' in app
assert "byteLength=()=>new TextEncoder().encode(encode()).byteLength" in app
assert 'Get-TaviOllamaFailure' in server
assert "'OLLAMA_BAD_REQUEST'" in server
assert "GetResponseStream()" in server
assert "Retrying without optional think field" in server
assert "Send-TaviJson $context.Response 502" in server

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1360,'height':850})
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=12000)
    page.evaluate('''() => {
      const s=TaviApp.state;
      s.paused=false;
      s.brain.ai.enabled=true;
      s.brain.ai.model='tavi';
      const long='Several colors, a difficult painting, and a question about what makes this memory special. '.repeat(20);
      for(let i=0;i<50;i++){
       s.conversation.unshift({id:'long'+i,source:'ollama',role:i%2?'tavi':'user',text:long,time:Date.now()-i*10000});
       s.memories.unshift({id:'m'+i,text:long,time:Date.now(),interest:'art',area:'studio'});
       s.journal.unshift({id:'j'+i,text:long,time:Date.now(),kind:'reflection'});
       s.development.experienceHistory.unshift({id:'x'+i,description:long,time:Date.now(),kind:'reflection'});
      }
      window.__requests=[];
      window.fetch=async (url,opts)=>{
        if(url!=='/api/brain') throw Error('Unexpected URL: '+url);
        const obj=JSON.parse(opts.body);
        window.__requests.push({obj,bytes:new TextEncoder().encode(opts.body).byteLength});
        const answer=('latestUserMessage' in obj.context)?
           {reply:'I keep thinking about the colors I used in my most recent painting, and how their contrast might change next time.',focus:'art'}:
           {area:TaviWorld.props[0].area,obj:TaviWorld.props[0].obj,thought:'I will practice again, to compare the colors.',question:''};
        return {ok:true,status:200,text:async()=>JSON.stringify({response:JSON.stringify(answer)})};
      };
    }''')
    page.evaluate("TaviApp.talkToTavi('What do you remember about your painting?')")
    page.wait_for_function("TaviApp.state.conversation.at(-1).source === 'ollama'",timeout=10000)
    result=page.evaluate('''() => ({requests:window.__requests,memories:TaviApp.state.memories.length,dialogue:TaviApp.state.conversation.length})''')
    chat=result['requests'][0]
    assert chat['bytes']<=12288,chat['bytes']
    assert chat['obj']['context']['evidence']['memories'],chat
    assert chat['obj']['context']['latestUserMessage'].startswith('What do you remember'),chat
    assert result['memories']>=50,result
    print('PASS: memory-rich conversational payload bounded while persistent memories remain intact')

    page.evaluate('''() => {
      const s=TaviApp.state;
      s.brain.ai.lastCall=0;
      s.brain.ai.lastResult='Not connected';
      s.brain.mode='idle';s.brain.target=null;
    }''')
    page.evaluate('TaviApp.pollAI(true)')
    page.wait_for_function("TaviApp.state.brain.ai.lastResult.startsWith('Connected')",timeout=10000)
    decision=page.evaluate('window.__requests.at(-1)')
    assert decision['bytes']<=12288,decision['bytes']
    assert len(decision['obj']['context']['options'])==36,len(decision['obj']['context']['options'])
    print('PASS: autonomous payload preserves all 36 valid actions and stays within bridge limit')

    # An HTTP 502 with Ollama's explicit 400 cause should be visible instead of
    # silently claiming connection or saving a model-generated response.
    page.evaluate('''() => {
      window.fetch=async()=>({ok:false,status:502,text:async()=>JSON.stringify({
        code:'OLLAMA_BAD_REQUEST',error:'Ollama rejected this model request (HTTP 400): example context window too small'
      })});
    }''')
    page.evaluate("TaviApp.talkToTavi('What is your next goal?')")
    page.wait_for_function("TaviApp.state.conversation.at(-1).source === 'local'",timeout=10000)
    last=page.evaluate('TaviApp.state.conversation.at(-1)')
    assert last['source']=='local' and 'context window too small' in last['error'],last
    print('PASS: HTTP 400 upstream explanation displayed; local fallback remains clearly identified')
    assert not errors,errors
    browser.close()
print('ALL OLLAMA 400 TESTS PASSED')