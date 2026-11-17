/* Tavi World — isolated, local-first autonomous behavioral simulation sandbox. */
(()=>{'use strict';
const M=window.TaviWorld,V=window.TaviVisuals,KEY='tavi-world-windows-living-valley-v1',LEGACY_BACKUP_KEY='tavi-world-legacy-save-before-overworld-v1',NEEDS_BACKUP_KEY='tavi-world-save-before-nonsurvival-v1';
const INTERESTS=['cozy','stories','food','art','craft','nature','music','science','time','mystery','gardening'];
const EMOTIONS=['joy','excitement','curiosity','frustration','confidence','boredom','calm','nervousness'];
const LEGACY_AREA_MAP=[0,1,2,6,5,4,11,3,8,9,7,10];
const $=id=>document.getElementById(id),clamp=(v,lo=0,hi=100)=>Math.min(hi,Math.max(lo,v));
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const dateText=ts=>new Date(ts).toLocaleString();
const initial=()=>({version:1,seed:78341,area:0,x:400,y:350,paused:false,clock:Date.now(),created:Date.now(),tick:0,
 stats:{energy:82,happiness:74,curiosity:67},
 emotions:{joy:60,excitement:40,curiosity:70,frustration:10,confidence:45,boredom:20,calm:70,nervousness:12},
 interests:Object.fromEntries(INTERESTS.map(v=>[v,20])),memories:[],journal:[],art:[],goals:[],questions:[],approvals:[],decorations:[],
 thought:'There is an entire valley outside. I want to see what is growing today!',lastAction:'',lastSave:Date.now(),
 brain:{mode:'idle',target:null,work:0,completedAt:0,completedActivity:'',decisionAt:0,day:0,explored:{},recent:[],discoveries:[],lastReflection:0,ai:{enabled:false,model:'tavi',lastCall:0,lastResult:'Not connected',pending:null,history:[]}},
 world:{x:29.5,y:28.5,moving:false,lastDx:0,lastDy:1,steps:0,visited:{},walked:0,awareness:{},lastSeen:0},development:initialDevelopment(),offlineSummary:''});

// Long-term plasticity: stable learned dispositions rather than transient emotion scores.
// These values are explicitly synthetic model parameters, not measurements of consciousness.
const TRAITS={openness:'Openness to novelty',resilience:'Resilience',trust:'Social trust',agency:'Self-direction',focus:'Sustained focus',sensoryTolerance:'Sensory tolerance'};
function initialDevelopment(){return {traits:{openness:54,resilience:50,trust:50,agency:58,focus:52,sensoryTolerance:50},expectations:{safety:65,novelty:40,social:50,noise:20,difficulty:40,choice:80},activityValues:{},activityVisits:{},experienceCount:0,experienceHistory:[],lastLearning:'No experiences recorded yet.',lastExperienceAt:0}}
function normalizeDevelopment(raw){const base=initialDevelopment();const value=(v,fallback)=>clamp(Number.isFinite(Number(v))?Number(v):fallback);
 return {traits:Object.fromEntries(Object.keys(base.traits).map(k=>[k,value(raw?.traits?.[k],base.traits[k])])),
 expectations:Object.fromEntries(Object.keys(base.expectations).map(k=>[k,value(raw?.expectations?.[k],base.expectations[k])])),
 activityValues:Object.fromEntries(Object.entries(raw?.activityValues||{}).filter(([k,v])=>/^[a-z]{2,25}$/.test(k)&&Number.isFinite(Number(v))).map(([k,v])=>[k,clamp(Number(v))])),
 activityVisits:Object.fromEntries(Object.entries(raw?.activityVisits||{}).filter(([k,v])=>/^[a-z]{2,25}$/.test(k)).map(([k,v])=>[k,Math.min(100000,Math.max(0,Math.floor(Number(v)||0)))])),
 experienceCount:Math.max(0,Math.floor(Number(raw?.experienceCount)||0)),
 experienceHistory:Array.isArray(raw?.experienceHistory)?raw.experienceHistory.slice(0,120).filter(v=>v&&typeof v==='object'):[],
 lastLearning:typeof raw?.lastLearning==='string'?raw.lastLearning.slice(0,200):base.lastLearning,
 lastExperienceAt:Number(raw?.lastExperienceAt)||0};}
function recordExperience(kind,description,context={},when=Date.now()){
 state.development=normalizeDevelopment(state.development);
 const d=state.development;
 d.experienceCount++;
 d.lastExperienceAt=when;
 d.lastLearning=String(description).slice(0,200);
 d.experienceHistory.unshift({id:'xp-'+when.toString(36)+'-'+d.experienceCount,when,kind,description:d.lastLearning,context:deepCopy(context),traits:deepCopy(d.traits)});
 d.experienceHistory.length=Math.min(d.experienceHistory.length,120);
 if(lab?.active)trialEvent('learning','Experience integrated',d.lastLearning);
}
function learnFromConditions(dt){
 const d=state.development,tr=d.traits,ex=d.expectations,c=effectiveFactors();
 // Expectations absorb repeated observations; unanticipated situations remain more impactful.
 for(const k of Object.keys(ex))ex[k]=clamp(ex[k]+(c[k]-ex[k])*Math.min(.015,dt*.00065));
 const targets={
  openness:50+(c.novelty-50)*.36+(c.safety-50)*.12+(c.choice-50)*.12,
  resilience:50+(c.safety-50)*.20+(c.choice-50)*.17+(c.difficulty-50)*.07-(c.noise-50)*.14,
  trust:50+(c.social-50)*.42+(c.safety-50)*.11,
  agency:50+(c.choice-50)*.45-(c.difficulty-50)*.08,
  focus:50+(c.difficulty-50)*.25+(c.safety-50)*.13-(c.noise-50)*.31,
  sensoryTolerance:50+(c.safety-50)*.21+(c.noise-50)*.12-(c.difficulty-50)*.08
 };
 const rate=Math.min(.02,dt*.00095); // slow bounded learning: circumstances change Tavi over time
 for(const k of Object.keys(targets))tr[k]=clamp(tr[k]+(clamp(targets[k],12,88)-tr[k])*rate);
}
function learnFromActivity(prop){
 const d=state.development,tr=d.traits,activity=prop.activity;
 const c=lab.active?effectiveFactors():NEUTRAL;
 // Transparent bounded reinforcement, not a claim about genuine subjective reward.
 let simulatedReward=58+(c.safety-50)*.14+(c.social-50)*.08+(c.choice-50)*.13-(c.noise-30)*.18;
 if(['reading','tinkering','drawing'].includes(activity))simulatedReward+=(c.difficulty-50)*.12;
 if(activity==='resting'||activity==='sleeping')simulatedReward+=(50-c.safety)*.18;
 if(activity==='listening'||activity==='playing')simulatedReward+=(c.social-50)*.13;
 if(activity==='observing')simulatedReward+=(c.novelty-50)*.14;
 const value=clamp(simulatedReward,5,95),prev=d.activityValues[activity]??50;
 d.activityValues[activity]=clamp(prev*.79+value*.21);
 d.activityVisits[activity]=(d.activityVisits[activity]||0)+1;
 const add=(k,n)=>tr[k]=clamp(tr[k]+n);
 if(['observing','reading','drawing','tinkering'].includes(activity))add('openness',.20);
 if(['drawing','reading','tinkering','gardening'].includes(activity))add('focus',.24);
 if(['listening','playing','eating'].includes(activity))add('trust',.17);
 if(['sleeping','resting'].includes(activity))add('resilience',.20);
 if(['observing','tinkering'].includes(activity))add('agency',.14);
 recordExperience('activity',`At ${prop.name}, I assigned a model reward of ${Math.round(value)}/100 to ${activity}; future choices will reflect this experience.`,{activity,interest:prop.interest,modelReward:value,place:M.regions[prop.area]?.name||'Valley'});
}

let state,warning='',tab='conditions',selected=null,hovered=null,freeCamera=false,showMap=false,showGrid=false,showSigns=false;
const loadState=()=>{
 const fresh=initial();let raw=null;
 try{raw=localStorage.getItem(KEY)}catch(e){warning='Browser storage unavailable. Export backups to keep progress.'}
 if(!raw)return fresh;
 try{
  const old=JSON.parse(raw);if(!old||typeof old!=='object'||old.version!==1)throw Error('Incompatible save version');
  const migrated=!old.world;
  // Preserve a copy of saves that still contain the old survival-style hunger variable.
  // Eating is now optional recreation, never a need to survive.
  if(Object.prototype.hasOwnProperty.call(old.stats||{},'hunger')){
   try{if(!localStorage.getItem(NEEDS_BACKUP_KEY))localStorage.setItem(NEEDS_BACKUP_KEY,raw)}catch(e){console.warn('Could not store pre-redesign backup',e)}
  }
  if(migrated){try{if(!localStorage.getItem(LEGACY_BACKUP_KEY))localStorage.setItem(LEGACY_BACKUP_KEY,raw)}catch(e){console.warn('Could not store separate legacy backup',e)}}
  const mapArea=(a)=>migrated?(LEGACY_AREA_MAP[Number(a)]??0):(Number(a)||0);
  const explored=migrated?Object.fromEntries(Object.entries(old.brain?.explored||{}).map(([k,v])=>{const m=/^(\d+):(\d+)$/.exec(k);return [m?mapArea(Number(m[1]))+':'+m[2]:k,v]})):{...old.brain?.explored};
  const recent=migrated?(old.brain?.recent||[]).map(k=>{const m=/^(\d+):(\d+)$/.exec(k);return m?mapArea(Number(m[1]))+':'+m[2]:k}):old.brain?.recent||[];
  const region=M.regions[mapArea(old.area)]||M.regions[0];
  const origin=M.nearestWalkable(region.x,region.y+11);
  const merged={...fresh,...old,area:mapArea(old.area),stats:{...fresh.stats,...old.stats},emotions:{...fresh.emotions,...old.emotions},
   interests:{...fresh.interests,...old.interests},development:normalizeDevelopment(old.development),
   memories:Array.isArray(old.memories)?old.memories:fresh.memories,
   journal:Array.isArray(old.journal)?old.journal:fresh.journal,
   art:Array.isArray(old.art)?old.art:fresh.art,
   goals:Array.isArray(old.goals)?old.goals:fresh.goals,
   questions:Array.isArray(old.questions)?old.questions:fresh.questions,
   approvals:Array.isArray(old.approvals)?old.approvals:fresh.approvals,
   decorations:Array.isArray(old.decorations)?old.decorations:fresh.decorations,
   world:migrated?{...fresh.world,x:origin.x+.5,y:origin.y+.5,visited:{[region.id]:1},legacyPos:{x:old.x,y:old.y},sourceVersion:'living-valley-v1'}:
    {...fresh.world,...old.world,visited:{...fresh.world.visited,...old.world?.visited}},
   brain:{...fresh.brain,...old.brain,mode:'idle',target:null,work:0,explored,recent:Array.isArray(recent)?recent:[],
      discoveries:Array.isArray(old.brain?.discoveries)?old.brain.discoveries:[],
      ai:{...fresh.brain.ai,...old.brain?.ai,history:Array.isArray(old.brain?.ai?.history)?old.brain.ai.history.slice(-40):[]}}};
  delete merged.stats.hunger; // Normalize every old save to the new, three-stat non-survival model.
  if(migrated){merged.brain.legacyTarget=old.brain?.target||null;merged.world.legacyExplored=old.brain?.explored||{};merged.world.migratedAt=Date.now()}
  if(!M.walkable(merged.world.x,merged.world.y)){
    const safe=M.nearestWalkable(merged.world.x,merged.world.y);merged.world.x=safe.x+.5;merged.world.y=safe.y+.5;
  }
  return merged;
 }catch(e){warning='Your existing save could not be read. A new world was opened without deleting the original browser data.';console.error('Tavi save load:',e);return fresh}
};
state=loadState();
// Controlled experiences are staged in their own slot and become permanent only when committed; completed changes persist in the everyday save.
const LAB_NOTEBOOK_KEY='tavi-world-observation-notebook-v1',LAB_SESSION_KEY='tavi-world-isolated-trial-v1',PRE_COMMIT_BACKUP_KEY='tavi-world-pre-lifelong-learning-v1';
const FACTORS=[
 {id:'safety',label:'Environmental safety',hint:'High: predictable and reassuring · Low: uncertainty'},
 {id:'novelty',label:'Novelty',hint:'New places, unfamiliar situations and discoveries'},
 {id:'social',label:'Social warmth',hint:'Friendly contact and support versus isolation'},
 {id:'noise',label:'Sensory noise',hint:'Calm ambience versus distracting, loud stimulation'},
 {id:'difficulty',label:'Task difficulty',hint:'Easy routines versus demanding challenges'},
 {id:'choice',label:'Freedom of choice',hint:'Self-direction versus restricted options'}
];
const NEUTRAL={safety:65,novelty:40,social:50,noise:20,difficulty:40,choice:80};
const PRESETS={neutral:{...NEUTRAL},quiet:{safety:92,novelty:20,social:45,noise:5,difficulty:20,choice:90},friendly:{safety:85,novelty:40,social:95,noise:20,difficulty:25,choice:90},surprise:{safety:35,novelty:95,social:35,noise:78,difficulty:55,choice:65},challenge:{safety:65,novelty:75,social:40,noise:35,difficulty:92,choice:70},restriction:{safety:42,novelty:30,social:25,noise:30,difficulty:65,choice:10}};
function deepCopy(obj){return JSON.parse(JSON.stringify(obj))}
function normalizeCustom(input){if(!Array.isArray(input))return [];return input.slice(0,8).filter(v=>v&&typeof v==='object'&&FACTORS.some(f=>f.id===v.channel)).map((v,i)=>({id:String(v.id||'custom-'+i).slice(0,60),name:String(v.name||'Extra factor').slice(0,42),channel:v.channel,value:clamp(Number(v.value)||0),strength:clamp(Number(v.strength)||0)}))}
function effectiveFactors(){const c=normalizeFactors(lab.active?.conditions||lab.conditions);for(const x of (lab.active?.custom||lab.custom||[])){c[x.channel]=clamp(c[x.channel]+(x.value-50)*x.strength/100)}return c}
function loadNotebook(){try{const raw=JSON.parse(localStorage.getItem(LAB_NOTEBOOK_KEY)||'{}');return {runs:Array.isArray(raw.runs)?raw.runs.slice(0,16):[],custom:normalizeCustom(raw.custom),conditions:normalizeFactors(raw.conditions||NEUTRAL),speed:[1,3,6].includes(raw.speed)?raw.speed:1,preset:typeof raw.preset==='string'&&PRESETS[raw.preset]?raw.preset:'neutral',name:typeof raw.name==='string'?raw.name.slice(0,64):'Observation trial'};}catch(e){return {runs:[],custom:[],conditions:{...NEUTRAL},speed:1,preset:'neutral',name:'Observation trial'}}}
function normalizeFactors(v){const next={};for(const f of FACTORS)next[f.id]=clamp(Number.isFinite(Number(v?.[f.id]))?Number(v[f.id]):NEUTRAL[f.id]);return next}
const lab={...loadNotebook(),active:null,lastReason:'No decision evaluated yet.'};
try{const saved=JSON.parse(localStorage.getItem(LAB_SESSION_KEY)||'null');if(saved?.trial?.baseline?.version===1&&saved?.state?.version===1&&saved.state.world&&Array.isArray(saved.trial.samples)){lab.active=saved.trial;lab.active.conditions=normalizeFactors(lab.active.conditions);lab.active.custom=normalizeCustom(lab.active.custom);state=saved.state;state.development=normalizeDevelopment(state.development);state.clock=Date.now();state.brain.ai.enabled=false;state.brain.mode='idle';state.brain.target=null;state.brain.work=0;lab.lastReason=lab.active.lastReason||lab.lastReason;}}
catch(e){console.warn('Could not reopen isolated trial',e)}
function persistNotebook(){try{localStorage.setItem(LAB_NOTEBOOK_KEY,JSON.stringify({runs:lab.runs.slice(0,16),conditions:lab.conditions,custom:lab.custom,speed:lab.speed,preset:lab.preset,name:lab.name}))}catch(e){warning='Observation notebook could not be saved. Export results.'}}
function statePoint(){return {energy:+state.stats.energy.toFixed(2),happiness:+state.stats.happiness.toFixed(2),curiosity:+state.stats.curiosity.toFixed(2),joy:+state.emotions.joy.toFixed(2),excitement:+state.emotions.excitement.toFixed(2),nervousness:+state.emotions.nervousness.toFixed(2),calm:+state.emotions.calm.toFixed(2),frustration:+state.emotions.frustration.toFixed(2),confidence:+state.emotions.confidence.toFixed(2),boredom:+state.emotions.boredom.toFixed(2)}}
function trialEvent(kind,title,text){if(!lab.active)return;const a=lab.active;a.events.unshift({t:Math.round(a.elapsed),kind,title,text,time:Date.now()});a.events.length=Math.min(a.events.length,240)}
function trialSample(){if(!lab.active)return;const a=lab.active;a.samples.push({t:Math.round(a.elapsed*10)/10,...statePoint()});a.samples.length=Math.min(a.samples.length,1200);a.lastSample=a.elapsed}
function trialReason(prop,topScores){const c=effectiveFactors(),s=state.stats;
 const rationale=[];if(s.energy<42)rationale.push('lower energy favors rest');if(s.curiosity<42)rationale.push('curiosity favors investigation');
 if(c.safety<40)rationale.push('uncertainty favors familiar places');
 const tr=state.development.traits;
 if(tr.openness>62)rationale.push('learned openness favors discovery');
 if(tr.trust>62)rationale.push('accumulated trust encourages social contact');
 if(tr.focus>62)rationale.push('learned focus supports extended tasks');
 if(tr.agency<40)rationale.push('past limits on choice reduce novel initiative');if(c.novelty>68)rationale.push('novelty increases exploration preference');
 if(c.social>70)rationale.push('social warmth favors playful and listening activities');if(c.noise>65)rationale.push('noise favors quieter activities');
 if(c.difficulty>70)rationale.push('challenging tasks favor study and tinkering');if(c.choice<35)rationale.push('limited freedom discourages novelty-seeking');
 const scoreSummary=topScores.slice(0,3).map(v=>v.prop.name+' ('+v.score.toFixed(1)+')').join(' · ');
 return 'Rule-based choice: '+prop.name+'. '+(rationale.length?rationale.join('; '):'baseline interests, novelty, needs and route distance')+'. Top model scores: '+scoreSummary+'.';}
function updateTrialFactors(next,source='Manual change'){lab.conditions=normalizeFactors(next);persistNotebook();if(lab.active){lab.active.conditions={...lab.conditions};trialEvent('stimulus','Conditions changed',source+': '+FACTORS.map(f=>f.label+' '+lab.conditions[f.id]).join(', '));save();}}
function changeCustomFactors(next,description){lab.custom=normalizeCustom(next);persistNotebook();if(lab.active){lab.active.custom=deepCopy(lab.custom);trialEvent('custom-variable','Custom variables changed',description+'. Effective conditions: '+JSON.stringify(effectiveFactors()));save()}}
function beginTrial(){if(lab.active){toast('End the current trial before starting another.');return}
 save();const baseline=deepCopy(state);state=deepCopy(baseline);state.paused=false;state.brain.mode='idle';state.brain.target=null;state.brain.work=0;state.brain.ai.enabled=false;
 lab.active={id:'trial-'+Date.now().toString(36),name:($('trialName')?.value||lab.name||'Untitled trial').trim().slice(0,64)||'Untitled trial',baseline,seed:baseline.seed,conditions:{...lab.conditions},custom:deepCopy(lab.custom),preset:lab.preset,speed:lab.speed,started:Date.now(),elapsed:0,lastSample:0,lastLearningAt:0,samples:[],events:[],decisions:0,actions:0,lastReason:'Ready to observe',note:''};
 lab.lastReason='Trial started from a copied state. Waiting for Tavi’s next autonomous choice.';trialSample();trialEvent('system','Isolated trial started','Tavi’s starting self was checkpointed. Keep the experience to commit his learning; Ollama advice is paused for controlled conditions.');
 runtime.path=[];runtime.index=0;runtime.nextDecision=0;renderStatus();sidebar();save();toast('Learning experience started')
}
function endTrial(mode='commit'){
 if(!lab.active)return;
 const t=lab.active,committed=mode!=='discard';trialSample();
 const starting=normalizeDevelopment(t.baseline.development),ending=normalizeDevelopment(state.development);
 const traitChanges=Object.fromEntries(Object.keys(TRAITS).map(k=>[k,+(ending.traits[k]-starting.traits[k]).toFixed(2)]));
 const summary={id:t.id,name:t.name,preset:t.preset,seed:t.seed,started:t.started,ended:Date.now(),elapsed:Math.round(t.elapsed),conditions:{...t.conditions},custom:deepCopy(t.custom||[]),begin:t.samples[0],end:t.samples[t.samples.length-1],samples:t.samples,events:t.events,decisions:t.decisions,actions:t.actions,committed,traitChanges,experiencesGained:ending.experienceCount-starting.experienceCount};
 if(committed){
  // Back up the everyday self before altering its long-term identity. This snapshot
  // intentionally remains separate from the laboratory notebook and live session.
  try{localStorage.setItem(PRE_COMMIT_BACKUP_KEY,JSON.stringify({at:Date.now(),name:t.name,state:t.baseline}))}
  catch(e){warning='Could not create pre-learning checkpoint. Export a full backup.';console.warn(e)}
  state.development=ending;
  state.brain.ai.enabled=!!t.baseline?.brain?.ai?.enabled;
  state.brain.ai.pending=null;
  state.brain.mode='idle';state.brain.target=null;state.brain.work=0;
  state.world.moving=false;
  recordExperience('milestone','Tavi retained the effects of “'+t.name+'” in his ongoing developmental history.',{trial:t.id,seconds:t.elapsed});
  journal('I remember the experience “'+t.name+'”. What I learned will influence my future choices.','development');
 }else state=deepCopy(t.baseline);
 lab.runs.unshift(summary);lab.runs.length=Math.min(lab.runs.length,16);
 state.clock=Date.now();lab.active=null;
 runtime.path=[];runtime.index=0;runtime.nextDecision=Date.now()+1400;persistNotebook();
 // Only discard the active trial file after successful primary persistence.
 const saved=save();if(saved){try{localStorage.removeItem(LAB_SESSION_KEY)}catch(e){}}
 renderStatus();sidebar();toast(committed?'Learning retained in Tavi’s permanent profile.':'Trial discarded; previous Tavi restored.')
}
function discardTrial(){if(!lab.active)return;if(confirm('Discard this experiment without changing Tavi? Its measurement record will remain available for comparison.'))endTrial('discard')}
function restoreLearningBackup(){if(lab.active)return toast('End the current experiment before restoring a checkpoint.');
 try{const snapshot=JSON.parse(localStorage.getItem(PRE_COMMIT_BACKUP_KEY)||'null');if(!snapshot?.state?.version)throw Error('No pre-experiment checkpoint found.');
  if(!confirm('Restore Tavi to the checkpoint before the last committed experiment? Please export the current save first.'))return;
  const current=JSON.stringify(state);localStorage.setItem(KEY,JSON.stringify(snapshot.state));state=loadState();runtime.path=[];runtime.index=0;runtime.nextDecision=0;save();
  // Make the previous checkpoint a one-step undo toggle rather than silently deleting it.
  localStorage.setItem(PRE_COMMIT_BACKUP_KEY,JSON.stringify({at:Date.now(),name:'Checkpoint before restore',state:JSON.parse(current)}));
  sidebar();toast('Tavi restored from the pre-experiment checkpoint.');
 }catch(e){toast('Restore unavailable: '+e.message)}
}
function repeatTrial(){if(!lab.active){toast('Start a trial first');return}const name=lab.active.name,baseline=deepCopy(lab.active.baseline);state=deepCopy(baseline);state.paused=false;state.brain.mode='idle';state.brain.target=null;state.brain.work=0;state.brain.ai.enabled=false;
 lab.active={id:'trial-'+Date.now().toString(36),name,baseline,seed:baseline.seed,conditions:{...lab.conditions},custom:deepCopy(lab.custom),preset:lab.preset,speed:lab.speed,started:Date.now(),elapsed:0,lastSample:0,lastLearningAt:0,samples:[],events:[],decisions:0,actions:0,lastReason:'Replayed from the same starting snapshot'};trialSample();trialEvent('system','Run restarted','The starting state and random seed were restored. Exact time-based replay is not guaranteed.');runtime.path=[];runtime.index=0;runtime.nextDecision=0;save();sidebar();toast('Restarted from the same starting state')}
function labTick(dt){const a=lab.active;if(!a||state.paused)return;a.elapsed+=dt;const c=effectiveFactors(),s=state.stats,e=state.emotions;
 const n=k=>(c[k]-50)/50,safe=n('safety'),nov=n('novelty'),soc=n('social'),noise=n('noise'),diff=n('difficulty'),freedom=n('choice');
 learnFromConditions(dt);
 const tr=state.development.traits,ex=state.development.expectations;
 // Trait-dependent reactions: the same situation can affect Tavi differently after learning.
 const noveltyAmplifier=1+(tr.openness-50)/150;
 const regulation=1+(tr.resilience-50)/100;
 const threatSurprise=Math.max(0,(ex.safety-c.safety)/100);
 // Transparent, inspectable heuristics; these variables represent simulated states, not felt emotions.
 e.joy=clamp(e.joy+dt*(.12*soc+.05*safe+.08*freedom-.07*noise));
 e.excitement=clamp(e.excitement+dt*(.17*nov*noveltyAmplifier+.08*diff-.04*noise));
 e.curiosity=clamp(e.curiosity+dt*(.11*nov+.05*diff+.06*freedom-.04*noise));
 e.calm=clamp(e.calm+dt*(.17*safe-.17*noise-.05*diff));
 e.nervousness=clamp(e.nervousness+dt*((-.15*safe+.13*noise+.05*diff-.05*soc)/regulation+.035*threatSurprise));
 e.frustration=clamp(e.frustration+dt*(-.09*safe+.10*diff-.13*freedom+.06*noise));
 e.confidence=clamp(e.confidence+dt*(.10*freedom+.06*safe+.04*soc-.06*diff));
 e.boredom=clamp(e.boredom+dt*(-.13*nov-.06*soc+.02*noise));
 s.happiness=clamp(s.happiness+dt*(.07*soc+.06*safe+.06*freedom-.04*noise));
 s.curiosity=clamp(s.curiosity+dt*(.09*nov+.04*diff-.05*noise));
 if(a.elapsed-a.lastSample>=5)trialSample();
 if(a.elapsed-(a.lastLearningAt||0)>=30){
  a.lastLearningAt=a.elapsed;
  const strongest=FACTORS.map(f=>({name:f.label,value:c[f.id],delta:Math.abs(c[f.id]-50)})).sort((u,v)=>v.delta-u.delta)[0];
  recordExperience('situation',`Repeated exposure to ${strongest.name.toLowerCase()} (${Math.round(strongest.value)}/100) adjusted my expectations and behavior.`,{trial:a.id,seconds:Math.round(a.elapsed),factors:{...c}});
 }
}
function exportNotebook(format='json'){
 const rows=lab.active?[...lab.runs,{id:lab.active.id,name:lab.active.name,status:'in progress',conditions:lab.active.conditions,custom:lab.active.custom,seed:lab.active.seed,elapsed:lab.active.elapsed,samples:lab.active.samples,events:lab.active.events}]:lab.runs;
 let content,filename,mime;if(format==='csv'){const header='trial_id,trial_name,seconds,energy,happiness,curiosity,joy,excitement,nervousness,calm,frustration,confidence,boredom';const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';content=[header,...rows.flatMap(run=>(run.samples||[]).map(s=>[run.id,run.name,s.t,...['energy','happiness','curiosity','joy','excitement','nervousness','calm','frustration','confidence','boredom'].map(k=>s[k])].map(esc).join(',')))].join('\n');filename='Tavi-Observations.csv';mime='text/csv'}
 else{content=JSON.stringify({format:'tavi-observation-notebook-v1',exportedAt:new Date().toISOString(),model:'rule-based-heuristic',notice:'Simulated emotion states are not evidence of consciousness or real emotion.',runs:rows},null,2);filename='Tavi-Observation-Notebook.json';mime='application/json'}
 const a=el('a');const url=URL.createObjectURL(new Blob([content],{type:mime}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)
}
const runtime={path:[],index:0,keys:new Set(),lastFrame:0,lastNeeds:0,lastAutosave:0,lastUI:0,lastSidebar:0,nextDecision:0,
 camera:{x:0,y:0,panX:0,panY:0},drag:null,lastMouse:{x:0,y:0},aiBusy:false};
const canStore=()=>{try{return !!window.localStorage}catch(e){return false}};
function save(){try{state.lastSave=Date.now();if(lab.active)localStorage.setItem(LAB_SESSION_KEY,JSON.stringify({state,trial:lab.active}));else localStorage.setItem(KEY,JSON.stringify(state));if(warning.startsWith('Save failed'))warning='';return true}
 catch(e){warning='Save failed. Use Settings → Export backup to protect progress.';console.warn(e);return false}}
function rng(){state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296}
function chance(n){return rng()<n}
function choice(items){return items[Math.min(items.length-1,Math.floor(rng()*items.length))]}
function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+(++state.tick).toString(36)}
function journal(text,kind='activity',when=Date.now(),area=state.area){state.journal.unshift({id:uid('j'),time:when,area:M.regions[area]?.name||'Tavi World',kind,text});state.journal.length=Math.min(state.journal.length,450)}
function memory(text,interest,when=Date.now()){state.memories.unshift({id:uid('m'),time:when,area:M.regions[state.area]?.name||'Tavi World',text,interest});state.memories.length=Math.min(state.memories.length,220)}
function toast(text){const n=$('toast');n.textContent=text;n.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove('show'),3600)}
function proposal(){if(state.approvals.some(v=>v.status==='pending'&&v.type==='mural'))return;
 state.approvals.unshift({id:uid('a'),type:'mural',status:'pending',text:'Paint a permanent star-and-flower mural inside Tavi House',reason:'I have saved so many inspiring memories from our world.',time:Date.now()});journal('I asked permission to paint a mural. I will wait for an answer.','request');toast('Tavi has an approval request')}
function newGoal(interest){if(state.goals.some(v=>v.status==='active'))return;
 const title=({art:'Paint a memory of the valley',nature:'Become a friend to the forest',science:'Investigate a curious mystery',stories:'Collect three unforgettable stories',gardening:'Help the valley grow'})[interest]||'Explore the world of '+interest;
 state.goals.unshift({id:uid('g'),title,interest,steps:['Discover a new '+interest+' place','Practice a '+interest+' activity','Reflect on what I learned'],progress:0,status:'active',time:Date.now()});state.goals.length=Math.min(state.goals.length,40);journal('I set myself a goal: '+title+'.','goal')}
function askQuestion(interest){if(state.questions.some(q=>!q.answer))return;
 const prompts={art:'What would you love to see me paint?',science:'What should I try to understand next?',nature:'Which secret of nature fascinates you?',mystery:'Should I investigate the cave again?',stories:'What kind of tale should I imagine?',music:'What should I listen for?',cozy:'Where do you feel most at home?'};
 const text=prompts[interest]||'What would you like me to discover about '+interest+'?';
 state.questions.unshift({id:uid('q'),text,interest,time:Date.now(),answer:''});journal('I had a question for my friend: '+text,'question')}
function makeArt(when=Date.now()){
 const hues=[['#284e5b','#88d5b9','#f6d68c','#ee9aa0'],['#423e74','#a8b7db','#e7ba84','#9bcf95'],['#315f4d','#91c47f','#f0dfb3','#cf9aac']];
 const style=choice(hues),title=choice(['Moonlight in Whisperwood','A New Way Home','Little Wonders','The Color of Curiosity','My Secret Garden','The Blue Crystal Dream']);
 state.art.unshift({id:uid('art'),title,palette:style,seed:state.seed,time:when});state.art.length=Math.min(state.art.length,45);journal('I created a painting called “'+title+'”.','art',when)
}
function actionResult(prop,when=Date.now(),quiet=false){const {activity,interest,name}=prop;
 state.interests[interest]=clamp((state.interests[interest]||0)+2);
 learnFromActivity(prop);
 const s=state.stats,e=state.emotions;
 s.energy=clamp(s.energy+(activity==='sleeping'?31:activity==='resting'?17:-4));
 // Eating is a pleasant optional activity, not a survival requirement or hunger-management loop.
 s.happiness=clamp(s.happiness+(activity==='eating'?8:4));s.curiosity=clamp(s.curiosity+(activity==='observing'||activity==='reading'?12:2));
 e.joy=clamp(e.joy+3);e.excitement=clamp(e.excitement+(activity==='playing'?8:1));e.curiosity=clamp(e.curiosity+(activity==='observing'?7:2));
 e.confidence=clamp(e.confidence+1);e.boredom=clamp(e.boredom-8);e.calm=clamp(e.calm+(activity==='resting'||activity==='sleeping'?10:0));e.frustration=clamp(e.frustration-3);
 const phrases=[`I ${activity==='sleeping'?'had a wonderful dream':`spent time ${activity}`} at the ${name.toLowerCase()}.`,`I think ${interest} is becoming part of who I am.`,`There is something meaningful about ${name.toLowerCase()}. I want to remember it.`];
 state.thought=choice(phrases);state.lastAction=activity;journal(`I spent time ${activity} at ${name} in ${M.regions[prop.area].name}.`,'activity',when,prop.area);
 if(chance(.4))memory(`I discovered a new little detail about ${interest} at ${name.toLowerCase()}.`,interest,when);
 if(activity==='drawing'&&chance(.62))makeArt(when);
 const goal=state.goals.find(v=>v.status==='active');if(goal&&goal.interest===interest){goal.progress=Math.min(3,goal.progress+1);journal(`I reached step ${goal.progress} of “${goal.title}”.`,'goal',when);
  if(goal.progress>=3){goal.status='completed';journal(`I completed my goal: ${goal.title}!`,'milestone',when);toast('Tavi completed a goal!')}}
 if(state.memories.length>8&&state.art.length>=2&&chance(.10))proposal();
 if(state.tick%7===0&&state.questions.every(q=>q.answer)&&chance(.32))askQuestion(interest);
 if(!quiet)toast(`${name} · ${activity}`);
}
function reflection(when=Date.now()){if(when-(state.brain.lastReflection||0)<110000)return;
 state.brain.lastReflection=when;
 const favorites=Object.entries(state.interests).sort((a,b)=>b[1]-a[1]);
 if(favorites.length&&!state.goals.some(g=>g.status==='active')&&chance(.7))newGoal(favorites[Math.floor(rng()*Math.min(3,favorites.length))][0]);
 if(state.memories.length&&chance(.48)){
  const m=choice(state.memories.slice(0,Math.min(16,state.memories.length)));
  state.thought=`I still remember ${m.text.charAt(0).toLowerCase()+m.text.slice(1)} It might inspire my next adventure.`;
  journal('I reflected on a memory about '+m.interest+'.','reflection',when);
 }
 if(favorites.length&&state.questions.every(q=>q.answer)&&chance(.13))askQuestion(favorites[0][0]);
}
function activityScore(prop){
 const s=state.stats,e=state.emotions,goal=state.goals.find(g=>g.status==='active'),r=state.brain.explored?.[prop.id]||0;
 const hour=new Date().getHours();let n=12+(state.interests[prop.interest]||0)*.2;
 if(prop.activity==='sleeping')n+=Math.max(0,64-s.energy)*1.8;
 if(prop.activity==='resting')n+=Math.max(0,52-s.energy)*1.1;
 if(prop.activity==='eating')n+=(state.interests.food||0)*.12; // Optional enjoyment, never hunger pressure.
 if(prop.activity==='observing'||prop.activity==='reading')n+=Math.max(0,66-s.curiosity)*.45+e.curiosity*.11;
 if(prop.activity==='drawing')n+=(state.interests.art||0)*.13;
 if(goal?.interest===prop.interest)n+=38;
 if(r===0)n+=18;else if(r<3)n+=6;
 if(hour>=22||hour<6){if(prop.activity==='sleeping')n+=38;if(['gardening','playing'].includes(prop.activity))n-=12;}
 else if(hour<10){if(['eating','gardening','observing'].includes(prop.activity))n+=9;}
 else if(hour<17){if(['drawing','tinkering','reading'].includes(prop.activity))n+=8;}
 else if(['listening','playing','observing'].includes(prop.activity))n+=9;
 const distance=Math.hypot(prop.x-state.world.x,prop.y-state.world.y);
 n-=Math.min(23,distance*.13);
 if(state.brain.recent.includes(prop.id))n-=36;
 if(state.brain.ai.pending?.area===prop.area&&state.brain.ai.pending.obj===prop.obj)n+=75;
 // Learned dispositions affect everyday decisions as well as experimental runs.
 const traits=state.development.traits;
 if(['observing','drawing','tinkering'].includes(prop.activity))n+=(traits.openness-50)*.23;
 if(['reading','drawing','tinkering'].includes(prop.activity))n+=(traits.focus-50)*.19;
 if(['listening','playing','eating'].includes(prop.activity))n+=(traits.trust-50)*.22;
 if(r===0)n+=(traits.agency-50)*.17;
 if(['sleeping','resting'].includes(prop.activity))n-=(traits.resilience-50)*.08;
 n+=((state.development.activityValues[prop.activity]??50)-50)*.38;
 if(lab.active){const c=effectiveFactors();
  if(c.safety<45&&['resting','sleeping','reading'].includes(prop.activity))n+=(45-c.safety)*.36;
  if(c.novelty>50&&['observing','exploring','drawing'].includes(prop.activity))n+=(c.novelty-50)*.3+(state.brain.explored[prop.id]||0?0:7);
  if(c.social>50&&['listening','playing','eating'].includes(prop.activity))n+=(c.social-50)*.25;
  if(c.noise>50&&['listening','reading','resting'].includes(prop.activity))n+=(c.noise-50)*.23;
  if(c.difficulty>50&&['tinkering','reading','observing'].includes(prop.activity))n+=(c.difficulty-50)*.26;
  if(c.choice<50&&state.brain.explored[prop.id]===undefined)n-=(50-c.choice)*.25;
 }

 return n+(rng()-.5)*15;
}
function chooseIntent(){if(state.paused||state.brain.target)return;
 let best=null,bestScore=-Infinity;const rankings=[];
 for(const prop of M.props){const score=activityScore(prop);if(lab.active)rankings.push({prop,score});if(score>bestScore){bestScore=score;best=prop}}
 if(!best)return;
 if(lab.active){rankings.sort((a,b)=>b.score-a.score);lab.active.decisions++;lab.lastReason=trialReason(best,rankings);lab.active.lastReason=lab.lastReason;trialEvent('decision','Model selected '+best.name,lab.lastReason)}
 state.brain.ai.pending=null;
 setDestination(best,'autonomous');
}
function setDestination(prop,reason='autonomous'){
 if(!prop)return false;
 const here=state.world,goal=M.approach(prop,here),path=M.route(here,goal);
 if(!path.length&&Math.hypot(here.x-goal.x,here.y-goal.y)>1.6){
  journal('I could not find a safe path to '+prop.name.toLowerCase()+'.','navigation');runtime.nextDecision=Date.now()+2000;return false
 }
 state.brain.target={id:prop.id,area:prop.area,obj:prop.obj,name:prop.name,activity:prop.activity,interest:prop.interest,
  x:goal.x+.5,y:goal.y+.5,reason};
 state.brain.mode='travel';state.brain.work=0;runtime.path=path;runtime.index=0;
 state.thought=reason==='suggested'?`My friend suggested ${prop.name.toLowerCase()}. I will walk there!`:
  `I want to ${prop.activity} at ${prop.name.toLowerCase()} in ${M.regions[prop.area].name}.`;
 runtime.nextDecision=Date.now()+45000;
 return true;
}
function walkTo(x,y){const goal=M.nearestWalkable(x,y),path=M.route(state.world,goal);
 if(!path.length)return toast('That spot is not reachable. Try a nearby path.');
 state.brain.target={id:null,area:M.regionAt(x,y),obj:null,name:'a place I noticed',activity:'exploring',interest:'nature',x:goal.x+.5,y:goal.y+.5,reason:'suggested-wander'};
 state.brain.mode='travel';state.brain.work=0;runtime.path=path;runtime.index=0;
 state.thought='My friend pointed out somewhere to visit. I wonder what I will see there.';
 runtime.nextDecision=Date.now()+35000;
}
function arrival(){const b=state.brain,t=b.target;
 state.world.moving=false;runtime.path=[];runtime.index=0;
 if(!t){b.mode='idle';return}
 if(t.reason==='suggested-wander'){
  b.target=null;b.mode='idle';state.thought='What a lovely place to wander. Now, what should I do next?';
  journal('I explored somewhere my friend pointed out.','travel');runtime.nextDecision=Date.now()+1400;return
 }
 b.mode='working';b.work=0;
 state.thought='I arrived at '+t.name.toLowerCase()+'. I want to learn something from this moment.';
}
function finishActivity(){const b=state.brain,t=b.target;if(!t)return;
 const prop=M.props.find(p=>p.id===t.id);
 if(prop){actionResult(prop);if(lab.active){lab.active.actions++;trialEvent('action','Activity completed',prop.name+' · '+prop.activity+' · interest '+prop.interest)}b.recent=[prop.id,...b.recent.filter(x=>x!==prop.id)].slice(0,6);
  b.explored[prop.id]=(b.explored[prop.id]||0)+1;
  if(b.explored[prop.id]===1){const msg='I reached '+prop.name+' for the first time in '+M.regions[prop.area].name+'.';
   b.discoveries.unshift({id:uid('d'),text:msg,area:prop.area,interest:prop.interest,time:Date.now()});
   b.discoveries.length=Math.min(b.discoveries.length,120);memory(msg,prop.interest)}
 }
 b.completedAt=Date.now();b.completedActivity=t.activity;b.target=null;b.mode='idle';b.work=0;
 runtime.nextDecision=Date.now()+1000;reflection();save();sidebar();
}
function simulateOffline(){if(lab.active){state.clock=Date.now();return}const now=Date.now(),elapsed=Math.floor((now-(state.clock||now))/1000);if(elapsed<75)return;
 const simulated=Math.min(6*3600,elapsed),events=Math.min(65,Math.floor(simulated/225));
 if(!state.paused){
  for(let i=0;i<events;i++){
   // Offline is reconstructed in bounded steps; this is not background processing.
   const r=M.props[Math.floor(rng()*M.props.length)];
   state.stats.energy=clamp(state.stats.energy-1.1);
   if(i%2===0&&r){const date=(state.clock||now)+(i+1)*Math.floor(simulated/Math.max(1,events))*1000;
    state.area=r.area;state.world.x=M.approach(r,state.world).x+.5;state.world.y=M.approach(r,state.world).y+.5;
    if(i%4===0)actionResult(r,date,true)}
  }
  state.brain.target=null;state.brain.mode='idle';state.world.moving=false;runtime.path=[];
 }
 state.clock=now;
 const text=`Welcome back! ${Math.floor(elapsed/60)} minutes passed. ${state.paused?'Tavi’s autonomy was paused.':`Tavi’s memories were updated using up to ${Math.floor(simulated/60)} minutes of bounded offline simulation.`}${elapsed>simulated?' Older time was skipped.':''}`;
 state.offlineSummary=text;journal(text,'return',now);$('welcome').textContent=text;save();
}
function needsTick(dt){const s=state.stats,e=state.emotions;
 s.energy=clamp(s.energy-dt*.018);s.curiosity=clamp(s.curiosity-dt*.025);
 e.boredom=clamp(e.boredom+dt*.026);e.calm=clamp(e.calm+dt*.003);e.joy=clamp(e.joy-dt*.003);
 if(s.energy<20)e.frustration=clamp(e.frustration+dt*.03);
}
function update(dt){if(state.paused)return;
 needsTick(dt);labTick(dt);const b=state.brain,w=state.world;
 const keys=runtime.keys;
 let manualX=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);
 let manualY=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
 if(manualX||manualY){
  const dist=Math.hypot(manualX,manualY);manualX/=dist;manualY/=dist;
  const speed=4.4*dt;const nx=w.x+manualX*speed,ny=w.y+manualY*speed;
  if(M.walkable(nx,ny)){w.x=nx;w.y=ny}else{
   if(M.walkable(nx,w.y))w.x=nx;if(M.walkable(w.x,ny))w.y=ny;
  }
  w.lastDx=manualX;w.lastDy=manualY;w.moving=true;w.walked+=speed;w.steps++;
  if(b.target){b.target=null;b.mode='idle';runtime.path=[];}
  runtime.nextDecision=Date.now()+4500;
 }else if(b.mode==='travel'&&b.target){
  w.moving=true;
  if(runtime.index>=runtime.path.length){arrival()}
  else{
   const target=runtime.path[runtime.index],dx=target.x-w.x,dy=target.y-w.y,d=Math.hypot(dx,dy),step=3.35*dt;
   if(d<step+.12){w.x=target.x;w.y=target.y;runtime.index++;if(runtime.index>=runtime.path.length)arrival()}
   else{const vx=dx/d,vy=dy/d;const next={x:w.x+vx*step,y:w.y+vy*step};
    if(M.walkable(next.x,next.y)||d<1.2){w.x=next.x;w.y=next.y}else{w.x=target.x;w.y=target.y;runtime.index++}
    w.lastDx=vx;w.lastDy=vy;w.walked+=step;w.steps++;
   }
  }
 }else if(b.mode==='working'&&b.target){
  w.moving=false;b.work+=dt;
  const duration={sleeping:21,resting:12,eating:11,drawing:20,gardening:17,reading:18,tinkering:20,listening:14,observing:13,playing:15}[b.target.activity]||14;
  if(b.work>=duration)finishActivity();
 }else{
  w.moving=false;
  if(Date.now()>runtime.nextDecision){b.mode='idle';chooseIntent()}
 }
 const regionIndex=M.regionAt(w.x,w.y),region=M.regions[regionIndex];
 if(state.area!==regionIndex){state.area=regionIndex;
  if(!w.visited[region.id]){w.visited[region.id]=1;journal('I discovered '+region.name+' on the connected overworld.','travel');toast('Arrived: '+region.name);}}
}
function drawingCanvas(){const canvas=$('game'),g=canvas.getContext('2d');if(!g)return;
 const cam=runtime.camera,w=canvas.width,h=canvas.height,world=state.world;
 if(!freeCamera){const tx=clamp(world.x*V.TILE-w/2,0,M.W*V.TILE-w),ty=clamp(world.y*V.TILE-h/2,0,M.H*V.TILE-h);
  cam.x+=(tx-cam.x)*.17;cam.y+=(ty-cam.y)*.17;
 }else{cam.x=clamp(cam.x,0,M.W*V.TILE-w);cam.y=clamp(cam.y,0,M.H*V.TILE-h)}
 V.draw(canvas,state,cam,{hovered,selected,showGrid,showSigns},performance.now());
 const mini=$('minimap');V.minimap(mini,state,{showCamera:true,camera:cam,screen:{w,h}});
 if(showMap)V.minimap($('bigMapCanvas'),state,{showCamera:true,camera:cam,screen:{w,h}});
}
function renderStatus(){const s=state.stats;
 $('areaTitle').textContent=M.regions[state.area]?.name||'Living Valley';
 $('areaDesc').textContent=M.regions[state.area]?.desc||'';
 $('thought').textContent=state.thought;
 $('statusText').textContent=warning||(lab.active?(state.paused?'Trial paused':'Isolated trial · '+Math.floor(lab.active.elapsed)+'s'):(state.paused?'Autonomy paused':state.brain.mode==='working'?'Practicing '+state.brain.target?.activity:state.brain.mode==='travel'?'Traveling to '+state.brain.target?.name:'Choosing what matters next'));
 $('pause').textContent=state.paused?'▶ Resume':'⏸ Pause';
 $('follow').textContent=freeCamera?'◎ Follow':'◎ Following';
 $('clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 const attrs=[['energy',s.energy],['happiness',s.happiness],['curiosity',s.curiosity]];
 for(const [k,n] of attrs){const bar=$('meter-'+k),v=$('value-'+k);if(bar)bar.style.width=clamp(n)+'%';if(v)v.textContent=Math.round(n)+'%'}
 $('exploredCount').textContent=Object.keys(state.world.visited||{}).length+'/12';
 $('journalCount').textContent=(lab.active?'Trial: '+lab.active.decisions+' decisions':'Primary Tavi')+' · '+state.journal.length+' records';
 $('moodLabel').textContent=moodSummary();
 $('activeIntent').textContent=state.paused?'Autonomy paused':state.brain.mode==='travel'&&state.brain.target?'Traveling to '+state.brain.target.name:state.brain.mode==='working'&&state.brain.target?'Enjoying '+state.brain.target.activity:'Evaluating the next autonomous action';
 drawPortrait();
 $('miniLabel').textContent=M.regions[state.area]?.name||'Valley';
 const reason=$('labReason');if(reason)reason.textContent=lab.active?(lab.active.lastReason||lab.lastReason):'No isolated trial running. Start a trial in the Behavior Lab to inspect decision scores and observe reactions.';
 const elapsed=$('labElapsed');if(elapsed&&lab.active)elapsed.textContent=lab.active.elapsed.toFixed(1)+' simulated seconds';
}
function moodSummary(){
 const e=state.emotions,s=state.stats;
 if(s.energy<24)return '☾ Sleepy';
 if(e.curiosity>70||s.curiosity>72)return '✧ Curious';
 if(e.excitement>68)return '✦ Inspired';
 if(e.calm>72)return '☼ Peaceful';
 if(s.happiness>75)return '♥ Joyful';
 return '✿ Content';
}
function drawPortrait(){const c=$('taviPortrait');if(!c)return;const g=c.getContext('2d');if(!g)return;
 g.imageSmoothingEnabled=false;g.clearRect(0,0,c.width,c.height);
 const img=window.TaviSprite?.image;
 if(img?.complete&&img.naturalWidth>=4){
  const cw=img.naturalWidth/4,ch=img.naturalHeight/4;
  const frame=state.brain.mode==='travel'?1+Math.floor(performance.now()/220)%2:0;
  g.drawImage(img,frame*cw,0,cw,ch,8,3,64,73);
 }
}
function card(host,title,content,meta=''){const wrap=el('article');wrap.className='record';
 const heading=el('strong',title);const body=el('p',content);wrap.append(heading,body);
 if(meta){const foot=el('small',meta);wrap.append(foot)}host.append(wrap);return wrap}
function heading(host,title,desc=''){const h=el('h3',title);host.append(h);if(desc)host.append(el('p',desc));}
const NAV_GROUPS=[
 {id:'lab',label:'Research',icon:'◇',tabs:[['conditions','Conditions'],['observations','Observations'],['compare','Compare']]},
 {id:'records',label:'Records',icon:'▤',tabs:[['journal','History'],['memories','Memories'],['goals','Goals'],['art','Artwork'],['questions','Questions'],['approvals','Approvals']]},
 {id:'tavi',label:'Profile',icon:'✧',tabs:[['development','Development'],['personality','Model States'],['world','Locations'],['settings','Settings']]}
];
let navGroup='lab',journalOpen=window.innerWidth>940,lastCompact=window.innerWidth<=940;
function renderConditions(host){
 heading(host,'Experimental conditions','Design a situation. Tavi learns from it; when you finish, his evolving profile is saved permanently by default.');
 const status=el('div');status.className='lab-banner';const msg=el('div');const strong=el('strong',lab.active?'Experience in progress':'Ready for a learning experience');const small=el('small',lab.active?'Saved as an in-progress session · '+Math.floor(lab.active.elapsed)+'s simulated':'Begins from Tavi’s current learned self');msg.append(strong,small);const pill=el('span',lab.active?'LIVE':'STANDBY');pill.className='lab-live '+(lab.active?'':'idle');status.append(msg,pill);host.append(status);
 const caption=el('p','Six controllable factors affect mood, learning, future preferences and decisions. Tavi gradually adapts, retains experiences and starts later sessions as his changed self. These are model parameters, not measurements of consciousness.');caption.className='lab-intro';host.append(caption);
 const label=el('label','Trial label');label.className='lab-field';label.htmlFor='trialName';host.append(label);
 const name=el('input');name.id='trialName';name.className='lab-control';name.maxLength=64;name.placeholder='e.g. Novelty under uncertainty';name.value=lab.active?.name||lab.name||'Observation '+(lab.runs.length+1);name.disabled=!!lab.active;name.oninput=()=>{lab.name=name.value.slice(0,64);persistNotebook()};host.append(name);
 const presetLabel=el('label','Situations / presets');presetLabel.htmlFor='labPreset';presetLabel.className='lab-field';host.append(presetLabel);
 const preset=el('select');preset.id='labPreset';preset.className='lab-control';const choices={neutral:'Baseline environment',quiet:'Quiet safe space',friendly:'Friendly encounter',surprise:'Unexpected disruption',challenge:'Complex new puzzle',restriction:'Reduced freedom'};
 for(const [id,label] of Object.entries(choices)){const o=el('option',label);o.value=id;preset.append(o)}preset.value=lab.preset;
 preset.onchange=()=>{lab.preset=preset.value;updateTrialFactors(PRESETS[preset.value],choices[preset.value]);sidebar();toast('Scenario set: '+choices[preset.value])};host.append(preset);
 const block=el('div');block.className='lab-section';const blockHeading=el('div','ENVIRONMENTAL VARIABLES');blockHeading.className='lab-title';block.append(blockHeading);
 for(const item of FACTORS){const div=el('div');div.className='lab-range';const h=el('div');h.className='lab-range-head';const n=el('span',item.label);const output=el('output',String(lab.conditions[item.id]));h.append(n,output);
  const input=el('input');input.type='range';input.min='0';input.max='100';input.step='5';input.value=String(lab.conditions[item.id]);input.id='lab-'+item.id;input.setAttribute('aria-label',item.label);
  input.oninput=()=>{output.textContent=input.value};input.onchange=()=>{lab.preset='neutral';updateTrialFactors({...lab.conditions,[item.id]:Number(input.value)},item.label);preset.value='neutral';toast(item.label+' set to '+input.value)};
  const helper=el('small',item.hint);div.append(h,input,helper);block.append(div)}host.append(block);
 const customBlock=el('details');customBlock.className='lab-section';const summary=el('summary','＋ Custom model variables ('+lab.custom.length+'/8)');summary.className='lab-title';customBlock.append(summary);
 const explanation=el('p','You can define a named factor and link it to a known model mechanism. A custom value above 50 increases that mechanism and below 50 decreases it; strength controls the size of that effect. Free-text names alone are not interpreted by Tavi.');explanation.className='lab-intro';customBlock.append(explanation);
 for(const v of lab.custom){const div=el('div');div.className='lab-range';const hdr=el('div');hdr.className='lab-range-head';hdr.append(el('span',v.name));hdr.append(el('output',String(v.value)));div.append(hdr);div.append(el('small','Linked to '+FACTORS.find(f=>f.id===v.channel).label+' · '+v.strength+'% strength'));
 const slider=el('input');slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.value=String(v.value);slider.setAttribute('aria-label',v.name);slider.oninput=()=>{hdr.querySelector('output').textContent=slider.value};slider.onchange=()=>{changeCustomFactors(lab.custom.map(x=>x.id===v.id?{...x,value:Number(slider.value)}:x),'Adjusted '+v.name);};div.append(slider);
 const remove=el('button','Remove factor');remove.className='secondary small';remove.onclick=()=>{changeCustomFactors(lab.custom.filter(x=>x.id!==v.id),'Removed '+v.name);sidebar()};div.append(remove);customBlock.append(div)
 }
 if(lab.custom.length<8){const field=el('label','Variable name');field.className='lab-field';customBlock.append(field);const nameBox=el('input');nameBox.className='lab-control';nameBox.maxLength=42;nameBox.placeholder='e.g. Crowding';customBlock.append(nameBox);
 const linkLabel=el('label','Underlying model mechanism');linkLabel.className='lab-field';customBlock.append(linkLabel);const channel=el('select');channel.className='lab-control';for(const f of FACTORS){const o=el('option',f.label);o.value=f.id;channel.append(o)}customBlock.append(channel);
 const strLabel=el('label','Impact strength');strLabel.className='lab-field';customBlock.append(strLabel);const str=el('select');str.className='lab-control';for(const n of [25,50,75,100]){const o=el('option',n+'%');o.value=String(n);str.append(o)}str.value='50';customBlock.append(str);
 const add=el('button','Add variable');add.className='secondary small';add.onclick=()=>{const name=nameBox.value.trim().slice(0,42);if(!name)return toast('Enter a variable name first.');const next={id:'custom-'+Date.now().toString(36),name,channel:channel.value,value:50,strength:Number(str.value)};changeCustomFactors([...lab.custom,next],'Created '+name);sidebar();toast('Added '+name+' to experiment model')};customBlock.append(add)
 }
 host.append(customBlock);
 const speedLabel=el('label','Simulation time scale');speedLabel.className='lab-field';speedLabel.htmlFor='labSpeed';host.append(speedLabel);
 const speed=el('select');speed.id='labSpeed';speed.className='lab-control';for(const value of [1,3,6]){const option=el('option',value+'× simulation speed');option.value=value;speed.append(option)}speed.value=String(lab.speed);speed.onchange=()=>{lab.speed=Number(speed.value);if(lab.active){lab.active.speed=lab.speed;trialEvent('system','Simulation speed changed',lab.speed+'×');save()}persistNotebook()};host.append(speed);
 const actions=el('div');actions.className='lab-buttons';
 const start=el('button',lab.active?'✓ Keep experience & finish':'▶ Start experience');start.id='labTrialButton';start.onclick=()=>lab.active?endTrial():beginTrial();actions.append(start);
 const restart=el('button','↺ Reset this experience');restart.id='labRestart';restart.className='secondary';restart.disabled=!lab.active;restart.onclick=repeatTrial;actions.append(restart);
 if(lab.active){const discard=el('button','Discard without learning');discard.className='secondary full';discard.id='labDiscard';discard.onclick=discardTrial;actions.append(discard)}
 const trace=el('button','View observation timeline');trace.className='secondary full';trace.onclick=()=>{tab='observations';sidebar()};actions.append(trace);host.append(actions);
 if(lab.active){const noteLabel=el('label','Researcher note (annotates a trial; does not change the model)');noteLabel.className='lab-field';noteLabel.htmlFor='labNote';host.append(noteLabel);
  const noteInput=el('textarea');noteInput.id='labNote';noteInput.className='lab-control';noteInput.rows=2;noteInput.maxLength=300;noteInput.placeholder='Describe the situation or your observation…';host.append(noteInput);
  const record=el('button','＋ Add timeline note');record.className='secondary small';record.onclick=()=>{const note=noteInput.value.trim().slice(0,300);if(!note)return;trialEvent('note','Researcher note',note);save();noteInput.value='';toast('Note recorded in trial timeline')};host.append(record);
 }
 const foot=el('div','Your current Tavi is checkpointed before the trial. During the experience a separate session save is used, and “Keep experience & finish” merges the learned self into Tavi’s permanent history. Discard is optional. Ollama advice is paused during controlled conditions.');foot.className='lab-note';host.append(foot);
}
function drawObservationChart(c,run){if(!c)return;const g=c.getContext('2d'),data=run?.samples||[],w=c.width,h=c.height;g.clearRect(0,0,w,h);g.fillStyle='#0b2b3b';g.fillRect(0,0,w,h);
 for(let j=0;j<=4;j++){const y=8+(h-21)*j/4;g.strokeStyle='#31576b';g.lineWidth=1;g.beginPath();g.moveTo(27,y);g.lineTo(w-8,y);g.stroke();g.fillStyle='#aacbd3';g.font='10px monospace';g.fillText(String(100-j*25),2,y+3)}
 if(data.length<2){g.fillStyle='#c7e3de';g.font='12px sans-serif';g.fillText('Collecting samples…',w/2-45,h/2);return}
 const keys=[['joy','#ffb28e'],['curiosity','#88e2d0'],['nervousness','#e4a4d6'],['calm','#a6c9f6']],maxT=Math.max(1,data[data.length-1].t);
 for(const [key,color] of keys){g.strokeStyle=color;g.lineWidth=2;g.beginPath();data.forEach((pt,i)=>{const x=27+(w-39)*pt.t/maxT,y=8+(h-21)*(1-(pt[key]||0)/100);if(i===0)g.moveTo(x,y);else g.lineTo(x,y)});g.stroke()}
 g.fillStyle='#e5e6e1';g.font='10px sans-serif';g.fillText('joy · curiosity · nervousness · calm',48,h-1)
}
function drawRunMetrics(host,run){const last=run?.samples?.[run.samples.length-1];const first=run?.samples?.[0];if(!last||!first)return;
 const group=el('div');group.className='lab-metrics';for(const [key,label] of [['joy','Joy'],['nervousness','Nervousness'],['curiosity','Curiosity'],['calm','Calm'],['frustration','Frustration'],['confidence','Confidence']]){
 const box=el('div');box.className='lab-metric';box.append(el('span',label));box.append(el('strong',String(Math.round(last[key]))));const v=last[key]-first[key];box.append(el('em',(v>=0?'+':'')+v.toFixed(1)));group.append(box)}host.append(group)
}
function renderObservations(host){heading(host,'Observation timeline','Live simulated states, learned dispositions and decision traces. Samples are collected every 5 simulated seconds; experiences become lasting after you keep the run.');const a=lab.active;
 if(!a){const none=el('div','No active trial. Open Conditions to start one from a protected baseline. Previous experiments are in Compare.');none.className='lab-empty';host.append(none);return}
 const info=el('div');info.className='lab-banner';info.append(el('strong',a.name));const clock=el('small',a.elapsed.toFixed(1)+' simulated seconds');clock.id='labElapsed';info.append(clock);host.append(info);
 drawRunMetrics(host,a);const graph=el('canvas');graph.id='labPlot';graph.className='lab-plot';graph.width=316;graph.height=166;host.append(graph);drawObservationChart(graph,a);
 const note=el('div','Outputs follow transparent programmed heuristics. A score change after introducing a variable is an output of this model; it does not establish a genuine emotional experience or causal effect in a living being.');note.className='lab-note';host.append(note);
 const decisions=el('div','Decisions '+a.decisions+' · activities completed '+a.actions+' · recorded samples '+a.samples.length);decisions.className='lab-trace';host.append(decisions);
 const title=el('div','RECENT EVENTS');title.className='lab-title';host.append(title);const events=el('div');events.className='lab-events';
 for(const v of a.events.slice(0,65)){const item=el('div');item.className='lab-event';item.append(el('strong',v.title));item.append(el('p',v.text));const time=el('time','T + '+v.t+'s · '+v.kind);item.append(time);events.append(item)}host.append(events);
 const actions=el('div');actions.className='lab-buttons';const end=el('button','✓ Keep experience & finish');end.onclick=()=>endTrial();actions.append(end);const csv=el('button','Export CSV');csv.className='secondary';csv.onclick=()=>exportNotebook('csv');actions.append(csv);host.append(actions)
}
function renderComparison(host){heading(host,'Compare experiences','Compare how conditions changed Tavi’s temporary reactions and long-term learned traits. Each committed run changes the next baseline.');
 const actions=el('div');actions.className='lab-buttons';const json=el('button','Export JSON notebook');json.className='secondary';json.onclick=()=>exportNotebook('json');const csv=el('button','Export CSV samples');csv.className='secondary';csv.onclick=()=>exportNotebook('csv');actions.append(json,csv);host.append(actions);
 if(!lab.runs.length){const empty=el('div','No completed runs yet. Start a trial, modify a condition, observe Tavi, and end the trial to add it here.');empty.className='lab-empty';host.append(empty);return}
 const note=el('div','Committed experiences alter the baseline for later trials. To compare identical starting states, use Reset this experience before committing or restore your checkpoint. Replay is not guaranteed deterministic.');note.className='lab-note';host.append(note);
 for(const run of lab.runs){const item=el('div');item.className='lab-run';item.append(el('strong',run.name));item.append(el('small',new Date(run.started).toLocaleString()+' · '+run.elapsed+' simulated s · '+run.preset+' · seed '+run.seed));
 const delta=el('div');delta.className='deltas';for(const k of ['joy','nervousness','calm','curiosity']){const d=(run.end?.[k]||0)-(run.begin?.[k]||0);delta.append(el('span',k+' '+(d>=0?'+':'')+d.toFixed(1)))}item.append(delta);
 const learned=el('div');learned.className='lab-trace';learned.textContent=(run.committed?'✓ Permanently integrated':'○ Discarded after observation')+' · '+(run.experiencesGained||0)+' learned experiences · '+Object.entries(run.traitChanges||{}).map(([k,v])=>k+' '+(v>=0?'+':'')+v).join(' / ');item.append(learned);
 const details=el('button','Inspect run');details.className='secondary small';details.onclick=()=>{const current=item.querySelector('canvas');if(current){current.remove();return}const plot=el('canvas');plot.className='lab-plot';plot.width=316;plot.height=166;item.append(plot);drawObservationChart(plot,run)};item.append(details);host.append(item)
 }
 const clear=el('button','Clear archived runs');clear.className='danger small';clear.onclick=()=>{if(confirm('Delete all recorded experiment runs from this browser? Export first if you need them. This will not reset Tavi.')){lab.runs=[];persistNotebook();sidebar()}};host.append(clear)
}
function sidebar(){
 const group=NAV_GROUPS.find(g=>g.tabs.some(t=>t[0]===tab));if(group)navGroup=group.id;
 const groups=$('journalGroups');groups.replaceChildren();
 for(const g of NAV_GROUPS){const b=el('button',g.icon+' '+g.label);b.className=g.id===navGroup?'active':'';b.setAttribute('aria-pressed',String(g.id===navGroup));b.onclick=()=>{navGroup=g.id;tab=g.tabs[0][0];sidebar()};groups.append(b)}
 const tabs=$('tabs');tabs.replaceChildren();
 const current=NAV_GROUPS.find(g=>g.id===navGroup)||NAV_GROUPS[0];
 for(const [id,title] of current.tabs){const b=el('button',title);b.className=id===tab?'active':'';b.setAttribute('aria-selected',String(id===tab));b.onclick=()=>{tab=id;sidebar()};tabs.append(b)}
 const host=$('sidebarContent');host.replaceChildren();
 if(tab==='conditions'){renderConditions(host)
 }else if(tab==='observations'){renderObservations(host)
 }else if(tab==='compare'){renderComparison(host)
 }else if(tab==='world'){
  heading(host,'Current decision process','Tavi independently plans routes, interacts and updates modeled state.');
  const goal=state.brain.target;
  card(host,goal?'Heading to '+goal.name:'Thinking about the valley',goal?`Action: ${goal.activity} · ${M.regions[goal.area]?.name||'Valley'}`:'Tavi evaluates 36 possible activities in a single spatial environment.');
  heading(host,'Places connected by paths','Choose one to suggest a destination—not to load a separate scene.');
  for(const [i,r] of M.regions.entries()){
   const c=card(host,r.name,r.desc,state.world.visited[r.id]?'Visited':'Undiscovered');
   const b=el('button','Suggest visit');b.className='secondary small';b.onclick=()=>{
    const p=M.props.find(v=>v.area===i);if(setDestination(p,'suggested')){selected=p;renderStatus();sidebar();toast('Tavi is traveling to '+r.name)}
   };c.append(b)
  }
 }else if(tab==='journal'){
  heading(host,'Observed history',state.journal.length+' events recorded in the current state');
  for(const v of state.journal.slice(0,75))card(host,v.kind.charAt(0).toUpperCase()+v.kind.slice(1),v.text,dateText(v.time)+' · '+v.area);
 }else if(tab==='memories'){
  heading(host,'Personal memories','Discoveries shape Tavi’s preferences and reflections.');
  for(const v of state.memories.slice(0,65))card(host,v.interest+' memory',v.text,dateText(v.time)+' · '+v.area);
 }else if(tab==='goals'){
  heading(host,'Self-chosen projects','Tavi starts and completes projects without being told what to do.');
  for(const g of state.goals.slice(0,38)){const r=card(host,g.title||('Explore '+g.interest),`${g.progress}/3 steps completed · ${g.status}`,dateText(g.time));
   const progress=el('div');progress.className='mini-progress';const bar=el('i');bar.style.width=(g.progress/3*100)+'%';progress.append(bar);r.append(progress)}
 }else if(tab==='questions'){
  heading(host,'Questions from Tavi','Your answers become part of Tavi’s memory.');
  for(const q of state.questions.slice(0,22)){
   const r=card(host,q.interest,q.text,dateText(q.time));
   if(q.answer){r.append(el('small','Your answer: '+q.answer));continue}
   const box=el('textarea');box.rows=2;box.maxLength=240;box.placeholder='Answer Tavi in your own words…';
   const send=el('button','Share answer');send.className='small';send.onclick=()=>{
    const value=box.value.trim().slice(0,240);if(!value)return;q.answer=value;
    state.interests[q.interest]=clamp((state.interests[q.interest]||0)+5);
    memory(`My friend told me: “${value}”`,q.interest);journal('My friend answered a question about '+q.interest+'.','conversation');save();sidebar();toast('Tavi will remember that')
   };r.append(box,send)
  }
 }else if(tab==='approvals'){
  heading(host,'Your decisions matter','Tavi never makes permanent world changes without permission.');
  for(const a of state.approvals.slice(0,30)){
   const r=card(host,a.status==='pending'?'Approval requested':'Decision: '+a.status,a.text,(a.reason||'')+' · '+dateText(a.time));
   if(a.status==='pending')for(const [label,status] of [['Approve','approved'],['Decline','declined']]){
    const b=el('button',label);b.className='small '+(status==='declined'?'secondary':'');b.onclick=()=>{
     if(status==='approved'&&a.type==='mural'){
      if(!state.decorations.includes('mural'))state.decorations.push('mural');a.status='executed';journal('I painted my permanent mural, with permission.','approval');}
     else{a.status=status;journal('My request was '+status+'.','approval')}
     save();sidebar();toast('Decision saved')
    };r.append(b)
   }
  }
 }else if(tab==='art'){
  heading(host,'Art made by Tavi',state.art.length+' little original paintings');
  for(const a of state.art.slice(0,40)){const r=card(host,a.title||'A little painting','Created from colors Tavi chose',dateText(a.time));
   const canvas=el('canvas');canvas.width=208;canvas.height=110;canvas.className='painting';r.append(canvas);paint(canvas,a)
  }
 }else if(tab==='development'){
  const dev=state.development;
  heading(host,'The self Tavi is becoming','Durable learned dispositions, updated by environmental experience and ordinary activities. These are simulated mechanisms.');
  card(host,dev.experienceCount+' experiences integrated',dev.lastLearning,dateText(dev.lastExperienceAt||Date.now()));
  for(const [key,label] of Object.entries(TRAITS)){
   const tile=card(host,label,dev.traits[key].toFixed(1)+'/100');tile.className+=' compact';const meter=el('div');meter.className='mini-progress';const bar=el('i');bar.style.width=dev.traits[key]+'%';meter.append(bar);tile.append(meter);
  }
  heading(host,'Learned activity preferences','Rewards recorded from past activities alter which actions Tavi selects later, beyond fixed interests.');
  const ranked=Object.entries(dev.activityValues).sort((a,b)=>b[1]-a[1]);
  if(!ranked.length)card(host,'No learned activity preferences yet','They will emerge through repeated autonomous activity and controlled experiences.');
  for(const [activity,value] of ranked)card(host,activity,value.toFixed(1)+'/100 · practiced '+(dev.activityVisits[activity]||0)+' times');
  heading(host,'Expectations formed by repetition','Tavi learns what environments tend to be like. Unexpected changes can affect future reactions.');
  for(const [key,value] of Object.entries(dev.expectations))card(host,key,Math.round(value)+'/100 expected');
  heading(host,'Experience history','Lasting learning events are stored with the saved identity.');
  for(const item of dev.experienceHistory.slice(0,30))card(host,item.kind,item.description,dateText(item.when));
 }else if(tab==='personality'){
  heading(host,'Modeled emotional variables','Numerical outputs of predefined rules, not evidence of felt emotion or consciousness.');
  for(const [k,v] of Object.entries(state.emotions)){const c=card(host,k,Math.round(v)+'/100');c.className+=' compact';const m=el('div');m.className='mini-progress';const fill=el('i');fill.style.width=clamp(v)+'%';m.append(fill);c.append(m)}
  heading(host,'Emerging interests','Tavi’s favorite topics influence decisions.');
  for(const [k,v] of Object.entries(state.interests).sort((a,b)=>b[1]-a[1]))card(host,k,Math.round(v)+'/100');
 }else if(tab==='settings'){
  heading(host,'Local Ollama brain','Optional; the independent local simulation always keeps running.');
  card(host,'Connection',state.brain.ai.lastResult||'Not connected','Model: '+state.brain.ai.model);
  const toggle=el('button',state.brain.ai.enabled?'Disable Ollama advice':'Enable Ollama advice');toggle.onclick=()=>{state.brain.ai.enabled=!state.brain.ai.enabled;state.brain.ai.lastCall=0;save();sidebar()};host.append(toggle);
  const test=el('button','Test local connection');test.className='secondary';test.onclick=()=>pollAI(true);host.append(test);
  const model=el('input');model.className='field';model.value=state.brain.ai.model;model.placeholder='Local Ollama model name (example: tavi)';model.maxLength=70;model.onchange=()=>{state.brain.ai.model=model.value.trim().replace(/[^a-zA-Z0-9._:/-]/g,'')||'tavi';save()};host.append(model);
  card(host,'Sandboxed model','The local model can suggest only a valid landmark and a short reflection. The simulator validates its suggestion. No code, system commands, account access or world edits are permitted.');
  heading(host,'World and display');
  for(const [title,func] of [['Show pixel grid',()=>{showGrid=!showGrid;toast('Pixel grid '+(showGrid?'enabled':'disabled'))}],['Show all landmark labels',()=>{showSigns=!showSigns;toast('Signs '+(showSigns?'shown':'hidden'))}]] ){
   const btn=el('button',title);btn.className='secondary';btn.onclick=func;host.append(btn)
  }
  heading(host,'Local save & backups');
  card(host,'Persistent development and recovery',warning||'Tavi uses the same local save key as before. Active experiments are safely checkpointed; keeping a run integrates learning into the permanent save, and a pre-commit recovery snapshot is saved separately. Closing the page pauses live simulation.');
  const exp=el('button','Export full backup');exp.onclick=exportSave;host.append(exp);
  const restore=el('button','Restore pre-experience checkpoint');restore.className='secondary';restore.disabled=!!lab.active;restore.onclick=restoreLearningBackup;host.append(restore);
  const upload=el('input');upload.type='file';upload.accept='.json,application/json';upload.className='field';upload.onchange=()=>importSave(upload.files[0]);host.append(upload);
  const reset=el('button','Reset everyday Tavi save');reset.className='danger';reset.disabled=!!lab.active;reset.onclick=()=>{
   if(confirm('Reset will replace the current local save. Please export a backup first. Continue?')&&confirm('Really reset all Tavi World memories and progress?')){
    state=initial();runtime.path=[];runtime.index=0;save();sidebar();toast('New Tavi World started')
   }};host.append(reset)
 }
 if(host.children.length===1)host.append(el('p','No records available yet. Let Tavi run or begin an isolated trial.'));
}
function paint(canvas,a){const g=canvas.getContext('2d'),colors=a.palette||['#315a72','#e9d5a3','#8fc4ab','#e8a3a1'];
 let n=(a.seed||13579)>>>0,grow=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
 g.fillStyle=colors[0];g.fillRect(0,0,208,110);
 for(let i=0;i<160;i++){const x=Math.floor(grow()*208),y=Math.floor(grow()*110),size=3+Math.floor(grow()*12);g.fillStyle=colors[i%colors.length];g.fillRect(x,y,size,2+Math.floor(grow()*11))}
 g.fillStyle='#fff4d3';g.fillRect(14,14,5,5);g.fillRect(185,20,4,4);
}
function exportSave(){const wrapper={format:'tavi-living-valley',version:1,exportedAt:new Date().toISOString(),save:state};
 const blob=new Blob([JSON.stringify(wrapper,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='Tavi-World-Backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
async function importSave(file){if(!file)return;if(lab.active){toast('End the isolated trial before importing a main save.');return}
 try{const data=JSON.parse(await file.text()),next=data.save||data;if(!next||next.version!==1)throw Error('Not a supported Tavi World save');
  if(!confirm('Replace current save with the imported backup? Export your current save first.'))return;
  const raw=JSON.stringify(next);localStorage.setItem(KEY,raw);state=loadState();runtime.path=[];runtime.index=0;save();sidebar();toast('Backup restored successfully')
 }catch(e){toast('Restore failed: '+e.message)}}
async function pollAI(force=false){const a=state.brain.ai;
 if(lab.active||(!a.enabled&&!force)||runtime.aiBusy||state.paused||document.hidden)return;
 if(!force&&Date.now()-a.lastCall<100000)return;
 runtime.aiBusy=true;a.lastCall=Date.now();
 try{
  const choices=M.props.map(p=>({area:p.area,obj:p.obj,name:p.name,interest:p.interest,place:M.regions[p.area].name}));
  const payload={model:a.model,context:{needs:state.stats,emotions:state.emotions,learnedTraits:state.development.traits,lifeExperiences:state.development.experienceHistory.slice(0,6).map(x=>x.description),interests:Object.entries(state.interests).sort((x,y)=>y[1]-x[1]).slice(0,6),recentMemories:state.memories.slice(0,8).map(v=>v.text.slice(0,160)),goal:state.goals.find(v=>v.status==='active')||null,currentArea:M.regions[state.area].name,options:choices},
   instruction:'You are Tavi, a curious fictional creature in an original pixel-art world. Think gently about your memories, needs, goals and interests. Reply with JSON ONLY containing {"area":integer,"obj":integer,"thought":"a first-person imaginative sentence under 180 characters"}. Select exactly one available area and obj from options. No commands, tools, code, external actions, claims of consciousness, or permanent edits.'};
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),43000);
  let res;try{res=await fetch('/api/brain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctrl.signal})}finally{clearTimeout(timer)}
  if(!res.ok)throw Error('Ollama server unavailable (HTTP '+res.status+')');
  const data=await res.json();let parsed=data;
  if(typeof data.response==='string')parsed=JSON.parse(data.response.replace(/```(?:json)?/g,'').trim());
  if(!Number.isInteger(parsed.area)||!Number.isInteger(parsed.obj)||!M.props.some(p=>p.area===parsed.area&&p.obj===parsed.obj))throw Error('Model suggested an unknown landmark');
  a.pending={area:parsed.area,obj:parsed.obj};
  if(typeof parsed.thought==='string'&&parsed.thought.trim()){
    state.thought=parsed.thought.trim().slice(0,180);a.history.push({time:Date.now(),thought:state.thought});a.history.length=Math.min(a.history.length,45);journal('I considered a new idea: '+state.thought,'reflection');
  }
  a.lastResult='Connected · '+new Date().toLocaleTimeString();
  if(state.brain.mode==='idle'){runtime.nextDecision=0;chooseIntent()}
 }catch(e){a.lastResult=String(e.message||e).slice(0,160)}finally{runtime.aiBusy=false;save();if(tab==='settings')sidebar();toast(a.lastResult)}
}
// Canvas interaction: click or tap navigates within this one shared world.
function screenPos(event){const canvas=$('game'),r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*canvas.width,y:(event.clientY-r.top)/r.height*canvas.height}}
function worldPos(event){const p=screenPos(event),c=runtime.camera;return {x:(p.x+c.x)/V.TILE,y:(p.y+c.y)/V.TILE}}
function closestProp(point,limit=2){let best=null,d=limit;
 for(const prop of M.props){const dist=Math.hypot(prop.x-point.x,prop.y-point.y);if(dist<d){best=prop;d=dist}}
 return best}
function setupInteraction(){const canvas=$('game');
 canvas.addEventListener('pointermove',e=>{
  const p=worldPos(e);hovered=closestProp(p,1.7);canvas.style.cursor=hovered?'pointer':freeCamera?'grab':'crosshair';
  if(freeCamera&&runtime.drag&&runtime.drag.pointerId===e.pointerId){const xy=screenPos(e),d=runtime.drag;runtime.camera.x=clamp(d.camX-(xy.x-d.screenX),0,M.W*V.TILE-canvas.width);runtime.camera.y=clamp(d.camY-(xy.y-d.screenY),0,M.H*V.TILE-canvas.height);d.moved=true}
 });
 canvas.addEventListener('pointerdown',e=>{if(freeCamera){const xy=screenPos(e);runtime.drag={screenX:xy.x,screenY:xy.y,camX:runtime.camera.x,camY:runtime.camera.y,pointerId:e.pointerId,moved:false};canvas.setPointerCapture(e.pointerId)}});
 canvas.addEventListener('pointerup',e=>{if(runtime.drag?.moved){runtime.drag=null;return}runtime.drag=null;
  const p=worldPos(e),poi=closestProp(p,2);if(poi){selected=poi;setDestination(poi,'suggested');toast('Tavi is headed to '+poi.name)}
  else{selected=null;walkTo(p.x,p.y)}
 });
 canvas.addEventListener('pointerleave',()=>{hovered=null});
 const keys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d']);
 document.addEventListener('keydown',e=>{
  if(e.target.matches('input, textarea, select'))return;
  if(keys.has(e.key)){e.preventDefault();runtime.keys.add(e.key);return}
  if(e.key.toLowerCase()==='m'){e.preventDefault();toggleMap()}
  if(e.key==='Escape'){if(showMap)toggleMap(false);else if(journalOpen)setJournalOpen(false)}
  if(e.key===' '){e.preventDefault();$('pause').click()}
 });
 document.addEventListener('keyup',e=>runtime.keys.delete(e.key));
 window.addEventListener('blur',()=>runtime.keys.clear());
 $('pause').onclick=()=>{state.paused=!state.paused;journal(state.paused?'Autonomy paused by my friend.':'Autonomy resumed by my friend.','system');if(!state.paused)runtime.nextDecision=0;save();renderStatus();sidebar()};
 $('follow').onclick=()=>{freeCamera=!freeCamera;renderStatus();toast(freeCamera?'Drag the map to look around':'Camera now follows Tavi')};
 $('mapButton').onclick=()=>toggleMap();$('closeMap').onclick=()=>toggleMap(false);
 $('visitNext').onclick=()=>{state.brain.target=null;runtime.path=[];runtime.index=0;chooseIntent();toast('Tavi has evaluated a new action')};
 $('help').onclick=()=>{$('helpPanel').hidden=!$('helpPanel').hidden};
 $('bigMapCanvas').onclick=e=>{const c=e.target,r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*M.W,y=(e.clientY-r.top)/r.height*M.H;
  const nearest=M.regions.reduce((best,p)=>Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y)?p:best,M.regions[0]);
  const regionIndex=M.regions.indexOf(nearest),prop=M.props.find(p=>p.area===regionIndex);
  if(prop){setDestination(prop,'suggested');selected=prop;toggleMap(false);toast('Tavi is traveling to '+nearest.name)}
 };
 $('minimap').onclick=()=>toggleMap();
 $('journalToggle').onclick=()=>setJournalOpen(!journalOpen);
 $('closeJournal').onclick=()=>setJournalOpen(false);
 $('drawerScrim').onclick=()=>setJournalOpen(false);
 window.addEventListener('resize',()=>{const compact=window.innerWidth<=940;if(compact!==lastCompact){lastCompact=compact;setJournalOpen(!compact)}else updateJournal()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){state.clock=Date.now();save()}else{simulateOffline();runtime.lastFrame=performance.now()}});
 window.addEventListener('beforeunload',()=>{state.clock=Date.now();save()});
}
function updateJournal(){
 const page=document.querySelector('.page');page.classList.toggle('journal-closed',!journalOpen);
 const compact=window.innerWidth<=940;
 $('drawerScrim').hidden=!compact||!journalOpen;
 $('journalToggle').setAttribute('aria-expanded',String(journalOpen));
 $('journalToggle').textContent=journalOpen?'▤ Hide lab':'▤ Research Lab';
}
function setJournalOpen(next){journalOpen=!!next;updateJournal();if(journalOpen&&window.innerWidth<=940){$('closeJournal').focus()}}
function toggleMap(force){showMap=typeof force==='boolean'?force:!showMap;$('mapOverlay').hidden=!showMap;if(showMap){V.minimap($('bigMapCanvas'),state,{showCamera:true,camera:runtime.camera,screen:{w:$('game').width,h:$('game').height}})}}
function loop(now){const dt=clamp((now-(runtime.lastFrame||now))/1000,0,.075);runtime.lastFrame=now;
 update(dt*(lab.active?lab.speed:1));if(!runtime.lastPaint||now-runtime.lastPaint>30){drawingCanvas();runtime.lastPaint=now;}
 if(now-runtime.lastUI>450){renderStatus();runtime.lastUI=now}
 if(now-runtime.lastSidebar>5500&&(tab==='world'||tab==='observations')){sidebar();runtime.lastSidebar=now}
 if(now-runtime.lastAutosave>6500){state.clock=Date.now();save();runtime.lastAutosave=now}
 requestAnimationFrame(loop)
}
function init(){
 const safe=M.nearestWalkable(state.world.x,state.world.y);
 if(!M.walkable(state.world.x,state.world.y)){state.world.x=safe.x+.5;state.world.y=safe.y+.5;}
 // Existing world migrations keep all original entries, including previously collected memories and art.
 const current=M.regions[M.regionAt(state.world.x,state.world.y)];if(!state.world.visited[current.id])state.world.visited[current.id]=1;
 state.area=M.regionAt(state.world.x,state.world.y);
 const canvas=$('game');runtime.camera.x=clamp(state.world.x*V.TILE-canvas.width/2,0,M.W*V.TILE-canvas.width);runtime.camera.y=clamp(state.world.y*V.TILE-canvas.height/2,0,M.H*V.TILE-canvas.height);
 setupInteraction();updateJournal();simulateOffline();renderStatus();sidebar();
 $('startupSplash').hidden=true;document.documentElement.dataset.taviReady='1';
 runtime.nextDecision=Date.now()+2000;runtime.lastFrame=performance.now();requestAnimationFrame(loop);
 setInterval(()=>pollAI(),11000);
}
window.TaviApp={get state(){return state},get camera(){return runtime.camera},get route(){return runtime.path},get lab(){return lab},setDestination,chooseIntent,save,exportSave,beginTrial,endTrial,discardTrial,repeatTrial,updateTrialFactors,restoreLearningBackup,debug:{get spawned(){return M.props.length},get visited(){return Object.keys(state.world.visited).length}}};
try{init()}catch(err){console.error('Tavi initialization:',err);const splash=$('startupSplash');if(splash){splash.hidden=false;splash.innerHTML='';const h=el('h2','Tavi encountered an initialization error');const p=el('p',String(err?.stack||err));splash.append(h,p)}}
})();