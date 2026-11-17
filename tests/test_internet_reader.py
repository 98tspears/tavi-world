"""Browser regression for read-only, source-attributed internet learning.

Tests the browser's strict client URL policy and source-note persistence with
mocked /api/read. The native Windows PowerShell GET proxy needs a Windows test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text('utf-8')

def load(page, saved=None):
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.evaluate('''(state)=>{const store={...state};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k],_dump:()=>({...store})}})}''',saved or {})
    page.set_content(HTML,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'",timeout=10000)
    assert not errors,errors
    return errors

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1400,'height':940})
    errs=load(page)
    page.evaluate('''() => {
       window.__readerRequests=[];
       const originalFetch=window.fetch;
       window.fetch=async (url,init)=>{
          if(url==='/api/read'){
             const input=JSON.parse(init.body);
             window.__readerRequests.push({url:input.url,method:init.method,payload:init.body});
             return {ok:true,status:200,json:async()=>({url:input.url,title:'Color theory',text:'Color theory is a visual arts field. '.repeat(12),retrievedAt:new Date().toISOString()})};
          }
          return originalFetch(url,init);
       };
       TaviApp.state.paused=true;
    }''')
    invalid=[
      'http://en.wikipedia.org/wiki/Color_theory',
      'https://evil.example/wiki/Test',
      'https://en.wikipedia.org.evil.example/wiki/Test',
      'https://127.0.0.1/wiki/Test',
      'https://en.wikipedia.org:8443/wiki/Test',
      'https://en.wikipedia.org/wiki/Test?q=1',
      'https://en.wikipedia.org/wiki/Test#fragment',
      'https://en.wikipedia.org/api/rest_v1/',
      'file:///etc/passwd',
      'https://user:secret@en.wikipedia.org/wiki/Art',
      'https://www.gutenberg.org/admin/',
    ]
    for url in invalid:
      failure=page.evaluate('''async url=>{try{await TaviApp.researchUrl(url);return null}catch(e){return e.message}}''',url)
      assert failure and ('allowed' in failure or 'Only HTTPS' in failure), (url,failure)
    assert page.evaluate('window.__readerRequests.length')==0
    print('✓ Disallowed hosts, schemes, credentials, ports and URL forms rejected without network request')

    # Explicit user research works even with autonomous research off.
    page.evaluate('TaviApp.state.paused=false')
    before=page.evaluate('TaviApp.state.learning.internet.reads.length')
    result=page.evaluate("async()=>await TaviApp.researchUrl('https://en.wikipedia.org/wiki/Color_theory')")
    assert result['url']=='https://en.wikipedia.org/wiki/Color_theory'
    assert result['kind']=='encyclopedia' and 'unverified' not in result['excerpt'].lower()
    assert page.evaluate('TaviApp.state.learning.internet.reads.length')==before+1
    calls=page.evaluate('window.__readerRequests')
    assert len(calls)==1 and calls[0]['method']=='POST' and len(calls[0]['payload'])<512
    assert 'conversation' not in calls[0]['payload'] and 'memories' not in calls[0]['payload']
    print('✓ Approved public source generates attributed note without sending private state')

    before=page.evaluate('window.__readerRequests.length')
    page.evaluate('TaviApp.autonomousResearch()')
    page.wait_for_timeout(100)
    assert page.evaluate('window.__readerRequests.length')==before
    page.evaluate('TaviApp.state.learning.internet.enabled=true;TaviApp.state.learning.internet.lastCall=0')
    page.evaluate('TaviApp.autonomousResearch()')
    page.wait_for_function('window.__readerRequests.length===2',timeout=5000)
    page.evaluate('TaviApp.autonomousResearch()')
    page.wait_for_timeout(100)
    assert page.evaluate('window.__readerRequests.length')==2
    print('✓ Independent research is opt-in and throttled to a ten-minute interval')

    page.evaluate('TaviApp.save()')
    saved=page.evaluate('localStorage._dump()')
    other=browser.new_page(viewport={'width':1200,'height':800})
    load(other,saved)
    assert other.evaluate('TaviApp.state.learning.internet.reads.length')>=2
    assert other.evaluate('TaviApp.state.learning.internet.reads[0].url').startswith('https://en.wikipedia.org/wiki/')
    assert not errs
    other.close();browser.close()
    print('✓ Read-only research notes survive a page reload with source URLs intact')
    print('ALL INTERNET READER BROWSER TESTS PASSED')