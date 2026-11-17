"""Integration smoke: bridge contract, non-mutating connection test and JSON diagnostics.
Windows PowerShell execution itself must still be tested on the user's PC.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
SERVER=(ROOT/'Start-TaviWorld.ps1').read_text('utf-8')
CLIENT=(ROOT/'src/app.js').read_text('utf-8')
HTML=(ROOT/'game/index.html').read_text('utf-8')
assert 'function Send-TaviJson' in SERVER
assert "[System.IO.StreamReader]::new($context.Request.InputStream" in SERVER
assert 'think=$false' in SERVER
assert "code='BRIDGE_EXCEPTION'" in SERVER
assert '[TAVI BRIDGE ERROR]' in SERVER
assert 'OLLAMA_EMPTY_ANSWER' in SERVER
assert 'async function testLocalOllama()' in CLIENT
assert "test.onclick=()=>testLocalOllama()" in CLIENT
print('PASS: server has a JSON error body, explicit request stream and Ollama think:false')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1350,'height':870})
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(HTML,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=15000)
    page.locator('#journalGroups button').filter(has_text='Profile').click()
    page.locator('#tabs button').filter(has_text='Settings').click()
    test=page.get_by_role('button',name='Test local connection')
    assert test.count()==1
    def use(body,status):
        page.evaluate('''({body,status})=>{
          window.__bridgeRequests=[];
          window.fetch=async (url,opts)=>{
            window.__bridgeRequests.push({url,body:opts.body});
            if(url==='/api/brain')return {status,ok:status<400,text:async()=>body};
            throw Error('Unexpected URL '+url)
          };
          TaviApp.state.brain.ai.lastResult='Not connected';
          TaviApp.state.paused=false;
        }''',{'body':body,'status':status})
        old=page.evaluate('JSON.stringify({target:TaviApp.state.brain.target,thought:TaviApp.state.thought})')
        test.click()
        page.wait_for_function("TaviApp.state.brain.ai.lastResult !== 'Checking local Ollama connection…' && TaviApp.state.brain.ai.lastResult !== 'Not connected'",timeout=8000)
        result=page.evaluate('TaviApp.state.brain.ai.lastResult')
        req=page.evaluate('window.__bridgeRequests[0]')
        assert req['url']=='/api/brain'
        assert len(req['body'])<1500, len(req['body'])
        assert page.evaluate('JSON.stringify({target:TaviApp.state.brain.target,thought:TaviApp.state.thought})')==old
        return result
    result=use('{"error":"Local bridge exception. Read the PowerShell diagnostic.","code":"BRIDGE_EXCEPTION"}',500)
    assert 'Local bridge exception' in result and '500' in result,result
    print('PASS: HTTP 500 with valid JSON is explained instead of empty response')
    result=use('{"error":"Ollama generated no final answer","code":"OLLAMA_EMPTY_ANSWER"}',502)
    assert 'Ollama generated no final answer' in result,result
    print('PASS: structured upstream error is surfaced')
    result=use('{"response":"{\\"area\\":0,\\"obj\\":0,\\"thought\\":\\"Ready.\\"}"}',200)
    assert result.startswith('Connected'),result
    print('PASS: successful lightweight connection test does not change Tavi state')
    assert not errors,errors
    browser.close()
print('ALL BRIDGE HARDENING TESTS PASSED')