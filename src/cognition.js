/* Tavi Cognition v1: an inspectable, brain-inspired cognitive architecture.
 * Functional analogies: attention/working memory, appraisal, autobiographical
 * episodes, semantic association, reinforcement, habit, executive planning and
 * sleep-like consolidation. These are computational models, not neural tissue.
 */
(()=>{'use strict';
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,Number(x)||0));
const keys=['cozy','stories','food','art','craft','nature','music','science','time','mystery','gardening'];
const now=()=>Date.now();
const words=t=>String(t||'').toLowerCase().match(/[a-z]{4,}/g)||[];
const safe=o=>o&&typeof o==='object'&&!Array.isArray(o)?o:{};
const initial=()=>({version:1,workspace:{focus:'exploring',candidates:[],reason:'No decision evaluated yet',lastUpdated:0},
 appraisal:{valence:0,arousal:35,control:60,uncertainty:30,predictionError:0},
 episodes:[],semantic:{},actionValues:{},habits:{},goalBias:{},
 predictionHistory:[],metacognition:{reflections:0,lastReflection:0,insight:'I am beginning to form expectations.'}});
function normalize(raw){const base=initial(),s=safe(raw),w=safe(s.workspace),a=safe(s.appraisal);
 const numeric=o=>Object.fromEntries(Object.entries(safe(o)).filter(([k,v])=>/^[a-z0-9_-]{2,60}$/i.test(k)&&Number.isFinite(Number(v))).slice(0,100).map(([k,v])=>[k,clamp(v)]));
 return {version:1,workspace:{focus:String(w.focus||'exploring').slice(0,60),candidates:Array.isArray(w.candidates)?w.candidates.slice(0,5).map(v=>({name:String(v.name||'').slice(0,65),score:Number(v.score)||0})):[],reason:String(w.reason||base.workspace.reason).slice(0,260),lastUpdated:Number(w.lastUpdated)||0},
 appraisal:Object.fromEntries(Object.entries(base.appraisal).map(([k,v])=>[k,clamp(a[k]===undefined?v:a[k],k==='valence'?-100:0,k==='valence'?100:100)])),
 episodes:Array.isArray(s.episodes)?s.episodes.slice(0,160).filter(e=>e&&typeof e.text==='string').map(e=>({...e,text:e.text.slice(0,260),topic:String(e.topic||'').slice(0,30),weight:clamp(e.weight===undefined?50:e.weight),time:Number(e.time)||now()})):[],
 semantic:Object.fromEntries(Object.entries(safe(s.semantic)).filter(([k,v])=>keys.includes(k)).map(([k,v])=>[k,{count:Math.max(0,Math.min(10000,Number(v.count)||0)),value:clamp(v.value===undefined?50:v.value),confidence:clamp(v.confidence===undefined?0:v.confidence)}])),
 actionValues:numeric(s.actionValues),habits:numeric(s.habits),goalBias:numeric(s.goalBias),
 predictionHistory:Array.isArray(s.predictionHistory)?s.predictionHistory.slice(0,40).map(v=>({activity:String(v.activity||''),expected:clamp(v.expected),received:clamp(v.received),error:Number(v.error)||0,time:Number(v.time)||now()})):[],
 metacognition:{reflections:Math.max(0,Number(s.metacognition?.reflections)||0),lastReflection:Number(s.metacognition?.lastReflection)||0,insight:String(s.metacognition?.insight||base.metacognition.insight).slice(0,240)}};
}
function episode(c,kind,text,topic='',reward=null,context={}){
 c.episodes.unshift({id:'ep-'+now().toString(36)+'-'+c.episodes.length,time:now(),kind:String(kind).slice(0,30),text:String(text).slice(0,260),topic:keys.includes(topic)?topic:'',weight:clamp(40+(reward===null?5:Math.abs(reward-50)*1.25)),reward:reward===null?null:clamp(reward),context:{place:String(context.place||'').slice(0,80),source:String(context.source||'simulation').slice(0,55)}});
 c.episodes.length=Math.min(c.episodes.length,160);
}
function appraise(c,st,factors){const e=st.emotions||{},tr=st.development?.traits||{},f=factors||{};
 const prior=c.appraisal;
 const expectedSafety=st.development?.expectations?.safety??65;
 const surprise=Math.max(0,expectedSafety-(f.safety??expectedSafety));
 prior.valence=clamp(((e.joy||50)+(e.calm||50)-(e.frustration||0)-(e.nervousness||0))*.48,-100,100);
 prior.arousal=clamp(((e.excitement||40)+(e.nervousness||10)+(e.curiosity||50))*.38);
 prior.control=clamp((tr.agency??50)*.65+(f.choice??70)*.35);
 prior.uncertainty=clamp((f.novelty??40)*.28+(f.difficulty??40)*.22+(100-(tr.resilience??50))*.20+surprise*.30);
 return prior;
}
function recall(c,query,limit=5){const terms=new Set(words(query)),time=now();return c.episodes.map(e=>{
 const ew=new Set(words(e.text+' '+e.topic));let overlap=0;for(const k of terms){if(ew.has(k))overlap+=3;else if([...ew].some(x=>x.startsWith(k.slice(0,5))))overlap+=.6;}
 const recency=Math.max(0,2-(time-e.time)/86400000*.05);
 return {...e,relevance:overlap+recency+(e.weight||50)*.015};
 }).sort((a,b)=>b.relevance-a.relevance).slice(0,limit).map(e=>({kind:e.kind,text:e.text,topic:e.topic,when:e.time,significance:e.weight,relevance:Math.round(e.relevance*10)/10}));}
function score(c,prop,st){const activity=prop.activity,topic=prop.interest;
 const expected=c.actionValues[activity]??50;
 const practice=c.habits[activity]??0;
 const goal=st.goals?.find(g=>g.status==='active'&&g.interest===topic);
 const salient=recall(c,topic+' '+activity,2).filter(m=>m.topic===topic);
 const emotion=c.appraisal;
 let score=(expected-50)*.30+(practice-50)*.09+((c.goalBias[topic]??50)-50)*.05;
 if(goal)score+=Math.max(0,10-(goal.progress||0)*2);
 if(salient.some(m=>m.kind==='reward'&&m.significance>62))score+=Math.min(7,salient[0].significance*.08);
 if(activity==='observing'&&emotion.uncertainty<60)score+=(st.stats?.curiosity??50)*.08;
 if(activity==='resting'||activity==='sleeping')score+=Math.max(0,60-(st.stats?.energy??70))*.18;
 if(activity==='drawing'&&topic==='art'&&(st.interests?.art??20)>55)score+=7;
 if(activity==='reading'&&emotion.arousal<55)score+=4;
 if(emotion.arousal>72&&['resting','reading'].includes(activity))score+=7;
 return Math.max(-25,Math.min(35,score));
}
function decision(c,alternatives,st){const sorted=[...alternatives].sort((a,b)=>b.score-a.score).slice(0,5);
 c.workspace.candidates=sorted.map(v=>({name:v.prop.name,score:Math.round(v.score*10)/10}));
 const best=sorted[0];if(!best)return;
 const expected=c.actionValues[best.prop.activity]??50;
 const goal=st.goals?.find(v=>v.status==='active'&&v.interest===best.prop.interest);
 c.workspace.focus=best.prop.interest;
 c.workspace.reason=goal?`I am pursuing ${goal.title}. The expected value of ${best.prop.activity} is ${Math.round(expected)}/100.`:`I am attending to ${best.prop.interest}; I expect ${best.prop.activity} to be worth about ${Math.round(expected)}/100 based on past outcomes.`;
 c.workspace.lastUpdated=now();
}
function outcome(c,prop,st){const activity=prop.activity,topic=prop.interest;const old=c.actionValues[activity]??50;
 const energy=st.stats?.energy??70,joy=st.emotions?.joy??50,frustration=st.emotions?.frustration??20;
 const reward=clamp(48+(joy-50)*.18-(frustration-25)*.14+(energy-50)*.11+((st.development?.activityValues?.[activity]??50)-50)*.25);
 const error=reward-old;
 c.appraisal.predictionError=clamp(error,-100,100);
 c.actionValues[activity]=clamp(old+.24*error);
 c.habits[activity]=clamp((c.habits[activity]??10)*.96+4.5);
 c.goalBias[topic]=clamp((c.goalBias[topic]??50)+error*.04);
 c.predictionHistory.unshift({activity,expected:old,received:reward,error:Math.round(error*10)/10,time:now()});
 c.predictionHistory.length=Math.min(40,c.predictionHistory.length);
 episode(c,'reward',`I tried ${activity} at ${prop.name}. I predicted ${Math.round(old)}/100 and observed a simulated reward of ${Math.round(reward)}/100.`,topic,reward,{place:prop.name});
 return {expected:old,reward,error};
}
function conversation(c,utterance,focus='',source='dialogue'){
 const topic=keys.includes(focus)?focus:(keys.find(k=>String(utterance).toLowerCase().includes(k))||'');
 episode(c,'conversation',String(utterance).slice(0,240),topic,null,{source});
 c.workspace.focus=topic||c.workspace.focus;
 if(topic)c.goalBias[topic]=clamp((c.goalBias[topic]??50)+.35);
}
function milestone(c,text,topic='art',reward=80){episode(c,'milestone',text,topic,reward,{source:'approved-project'});if(keys.includes(topic))c.goalBias[topic]=clamp((c.goalBias[topic]??50)+3);}
function consolidate(c){if(c.episodes.length<1)return;const recent=c.episodes.slice(0,24),groups={};
 for(const e of recent){if(!e.topic)continue;(groups[e.topic]??=[]).push(e);}
 for(const [topic,list] of Object.entries(groups)){
  const old=c.semantic[topic]||{count:0,value:50,confidence:0},rewards=list.filter(e=>e.reward!==null&&e.reward!==undefined);
  const avg=rewards.length?rewards.reduce((n,e)=>n+e.reward,0)/rewards.length:old.value;
  old.count=Math.min(10000,old.count+list.length);old.value=clamp(old.value*.82+avg*.18);
  old.confidence=clamp(Math.min(95,old.confidence+Math.log1p(list.length)*2));c.semantic[topic]=old;
 }
 const strongest=Object.entries(c.semantic).sort((a,b)=>b[1].confidence-a[1].confidence)[0];
 if(strongest)c.metacognition.insight=`My strongest recorded subject is ${strongest[0]}; confidence ${Math.round(strongest[1].confidence)}/100 based on ${strongest[1].count} accumulated observations.`;
 c.metacognition.reflections++;c.metacognition.lastReflection=now();
}
function context(c,query){return {currentAttention:c.workspace,appraisal:c.appraisal,associations:recall(c,query,4),learnedActionValues:Object.entries(c.actionValues).sort((a,b)=>b[1]-a[1]).slice(0,7),semantic:Object.entries(c.semantic).sort((a,b)=>b[1].confidence-a[1].confidence).slice(0,5).map(([topic,v])=>({topic,value:Math.round(v.value),confidence:Math.round(v.confidence)})),latestReflection:c.metacognition.insight};}
window.TaviCognition={initial,normalize,appraise,recall,score,decision,outcome,episode,conversation,milestone,consolidate,context};
})();