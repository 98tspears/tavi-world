"""Grounded local-Ollama conversations and independent initiative, mocked at the HTTP bridge.

Real Windows/Ollama throughput and subjective experience are not measured here.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'game'/'index.html').read_text('utf-8')


def bootstrap(page, data=None):
    page.evaluate('''(data) => {
      const items={...data};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>Object.hasOwn(items,k)?items[k]:null,
        setItem:(k,v)=>{items[k]=String(v)},removeItem:k=>delete items[k],
        _dump:()=>({...items})
      }});
    }''', data or {})
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.set_content(HTML, wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.taviReady==='1'", timeout=12000)
    return errors

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':850})
    errors=bootstrap(page)
    page.evaluate('''() => {
      const s=TaviApp.state;
      s.brain.ai.enabled=true;
      s.memories.unshift({id:'test-blue-pond',time:Date.now(),text:'I observed glowing blue stones beside a pond and wanted to paint that unusual light.',interest:'art',area:'Whisperwood Forest'});
      s.development.traits.openness=84;
      s.interests.art=86;
      s.goals.unshift({id:'goal-paint',title:'Paint the blue glow from my pond memory',interest:'art',progress:1,status:'active',time:Date.now()});
      window.__brainPayloads=[];
      window.fetch=async(url,opts)=>{
        if(url!=='/api/brain') throw Error('Unexpected request '+url);
        const sent=JSON.parse(opts.body);window.__brainPayloads.push(sent);
        await new Promise(resolve=>setTimeout(resolve,100));
        const answer={reply:'The blue stones I saw beside the pond still puzzle me. I want to try layering those colors in my next painting, but I am not sure how to capture their glow.',focus:'art'};
        return {ok:true,status:200,text:async()=>JSON.stringify({response:JSON.stringify(answer)})};
      }
    }''')
    page.locator('#talkShortcut').click()
    page.evaluate("TaviApp.talkToTavi('What are you curious about painting after seeing the blue stones?')")
    pending=page.evaluate('TaviApp.state.conversation.at(-1)')
    assert pending['source']=='pending' and pending['text']=='Considering your question…',pending
    page.wait_for_function('TaviApp.state.conversation.at(-1).source==="ollama"',timeout=10000)
    r=page.evaluate('''() => ({reply:TaviApp.state.conversation.at(-1),sent:window.__brainPayloads.at(-1),history:TaviApp.state.development.experienceHistory.slice(0,2),art:TaviApp.state.interests.art})''')
    assert 'blue stones' in r['reply']['text'].lower(),r
    assert r['art']>86,r
    assert r['history'][0]['kind']=='conversation',r['history']
    assert r['sent']['context']['latestUserMessage'].startswith('What are you curious'),r
    assert not any(x['message'].startswith('Considering your question') for x in r['sent']['context']['recentConversation']),r
    assert any('blue stones' in x['text'].lower() for x in r['sent']['context']['evidence']['memories']),r
    assert r['sent']['context']['tavi']['currentGoal']['title'].startswith('Paint the blue glow'),r
    assert r['sent']['context']['tavi']['learnedDisposition']['openness']==84,r
    assert len(r['reply']['text'])>110
    assert page.locator('text=Context supplied to the model').count()>0
    print('PASS: unscripted model response receives real memories/goals/traits, no canned answer, and persists as an experience')

    page.evaluate('TaviApp.save()')
    saved=page.evaluate('localStorage._dump()')
    other=browser.new_page(viewport={'width':1140,'height':850})
    other_errors=bootstrap(other,saved)
    last=other.evaluate('TaviApp.state.conversation.at(-1)')
    assert last['text']==r['reply']['text'] and last['source']=='ollama',last
    print('PASS: generated reply and development history survive browser save/reload')

    # The model can give a natural reply to a suggestion even when it avoids stock 'going to' wording.
    page.evaluate('''() => {
      window.fetch=async(url,opts)=>{
        const sent=JSON.parse(opts.body);window.__brainPayloads.push(sent);
        const answer={reply:'That would connect the pond memory with my art goal. I would rather experiment with shades of blue than rush to finish it.',focus:'art'};
        return {ok:true,status:200,text:async()=>JSON.stringify({response:JSON.stringify(answer)})};
      }
    }''')
    page.evaluate("TaviApp.talkToTavi('Could you paint something about the pond?')")
    page.wait_for_function('TaviApp.state.conversation.at(-1).source==="ollama"',timeout=10000)
    suggestion=page.evaluate('TaviApp.state.conversation.at(-1)')
    assert suggestion['suggestion'] and suggestion['suggestion']['accepted'],suggestion
    assert 'would rather experiment' in suggestion['text'],suggestion
    sent=page.evaluate('window.__brainPayloads.at(-1)')
    assert sent['context']['suggestionDecision']['accepted'] is True
    print('PASS: action decisions remain deterministic and model can explain them without mandatory canned keywords')

    # Model-initiated question from actual personal memory, validated action and reason.
    page.evaluate('''() => {
      const s=TaviApp.state;
      s.brain.target=null;s.brain.mode='idle';s.paused=false;s.brain.ai.lastInitiativeAt=0;
      s.brain.recent=[];
      window.fetch=async(url,opts)=>{
        const input=JSON.parse(opts.body);window.__brainPayloads.push(input);
        const p=TaviWorld.props.find(x=>x.activity==='drawing');
        const answer={area:p.area,obj:p.obj,thought:'The pond memory still has me wondering how light changes colors. I want to practice painting it.',question:'Could you show me a painting technique for making blue light glow?'};
        return {ok:true,status:200,text:async()=>JSON.stringify({response:JSON.stringify(answer)})};
      }
    }''')
    page.evaluate('TaviApp.pollAI(true)')
    page.wait_for_function('TaviApp.state.brain.ai.history.length>0',timeout=10000)
    result=page.evaluate('''() => ({thought:TaviApp.state.thought,question:TaviApp.state.conversation.at(-1),target:TaviApp.state.brain.target,requested:window.__brainPayloads.at(-1)})''')
    assert result['question']['source']=='ollama-initiative',result
    assert 'blue light' in result['question']['text'].lower(),result
    assert result['target'] and result['target']['reason']=='ollama-reasoned',result
    assert 'pond memory' in result['thought'],result
    assert result['requested']['context']['tavi']['currentGoal']['interest']=='art',result
    print('PASS: Ollama can initiate a grounded question and choose a verified destination without losing its chosen reason')

    assert not errors and not other_errors,(errors,other_errors)
    browser.close()
    print('ALL GROUNDED VOICE TESTS PASSED')