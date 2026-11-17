/* Tavi World — local-first autonomous living overworld. No mandatory cloud services. */
(()=>{'use strict';
const M=window.TaviWorld,V=window.TaviVisuals,KEY='tavi-world-windows-living-valley-v1',LEGACY_BACKUP_KEY='tavi-world-legacy-save-before-overworld-v1';
const INTERESTS=['cozy','stories','food','art','craft','nature','music','science','time','mystery','gardening'];
const EMOTIONS=['joy','excitement','curiosity','frustration','confidence','boredom','calm','nervousness'];
const LEGACY_AREA_MAP=[0,1,2,6,5,4,11,3,8,9,7,10];
const $=id=>document.getElementById(id),clamp=(v,lo=0,hi=100)=>Math.min(hi,Math.max(lo,v));
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const dateText=ts=>new Date(ts).toLocaleString();
const initial=()=>({version:1,seed:78341,area:0,x:400,y:350,paused:false,clock:Date.now(),created:Date.now(),tick:0,
 stats:{hunger:20,energy:82,happiness:74,curiosity:67},
 emotions:{joy:60,excitement:40,curiosity:70,frustration:10,confidence:45,boredom:20,calm:70,nervousness:12},
 interests:Object.fromEntries(INTERESTS.map(v=>[v,20])),memories:[],journal:[],art:[],goals:[],questions:[],approvals:[],decorations:[],
 thought:'There is an entire valley outside. I want to see what is growing today!',lastAction:'',lastSave:Date.now(),
 brain:{mode:'idle',target:null,work:0,completedAt:0,completedActivity:'',decisionAt:0,day:0,explored:{},recent:[],discoveries:[],lastReflection:0,ai:{enabled:false,model:'tavi',lastCall:0,lastResult:'Not connected',pending:null,history:[]}},
 world:{x:29.5,y:28.5,moving:false,lastDx:0,lastDy:1,steps:0,visited:{},walked:0,awareness:{},lastSeen:0},offlineSummary:''});
let state,warning='',tab='world',selected=null,hovered=null,freeCamera=false,showMap=false,showGrid=false,showSigns=false;
const loadState=()=>{
 const fresh=initial();let raw=null;
 try{raw=localStorage.getItem(KEY)}catch(e){warning='Browser storage unavailable. Export backups to keep progress.'}
 if(!raw)return fresh;
 try{
  const old=JSON.parse(raw);if(!old||typeof old!=='object'||old.version!==1)throw Error('Incompatible save version');
  const migrated=!old.world;
  if(migrated){try{if(!localStorage.getItem(LEGACY_BACKUP_KEY))localStorage.setItem(LEGACY_BACKUP_KEY,raw)}catch(e){console.warn('Could not store separate legacy backup',e)}}
  const mapArea=(a)=>migrated?(LEGACY_AREA_MAP[Number(a)]??0):(Number(a)||0);
  const explored=migrated?Object.fromEntries(Object.entries(old.brain?.explored||{}).map(([k,v])=>{const m=/^(\d+):(\d+)$/.exec(k);return [m?mapArea(Number(m[1]))+':'+m[2]:k,v]})):{...old.brain?.explored};
  const recent=migrated?(old.brain?.recent||[]).map(k=>{const m=/^(\d+):(\d+)$/.exec(k);return m?mapArea(Number(m[1]))+':'+m[2]:k}):old.brain?.recent||[];
  const region=M.regions[mapArea(old.area)]||M.regions[0];
  const origin=M.nearestWalkable(region.x,region.y+11);
  const merged={...fresh,...old,area:mapArea(old.area),stats:{...fresh.stats,...old.stats},emotions:{...fresh.emotions,...old.emotions},
   interests:{...fresh.interests,...old.interests},
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
  if(migrated){merged.brain.legacyTarget=old.brain?.target||null;merged.world.legacyExplored=old.brain?.explored||{};merged.world.migratedAt=Date.now()}
  if(!M.walkable(merged.world.x,merged.world.y)){
    const safe=M.nearestWalkable(merged.world.x,merged.world.y);merged.world.x=safe.x+.5;merged.world.y=safe.y+.5;
  }
  return merged;
 }catch(e){warning='Your existing save could not be read. A new world was opened without deleting the original browser data.';console.error('Tavi save load:',e);return fresh}
};
state=loadState();
const runtime={path:[],index:0,keys:new Set(),lastFrame:0,lastNeeds:0,lastAutosave:0,lastUI:0,lastSidebar:0,nextDecision:0,
 camera:{x:0,y:0,panX:0,panY:0},drag:null,lastMouse:{x:0,y:0},aiBusy:false};
const canStore=()=>{try{return !!window.localStorage}catch(e){return false}};
function save(){try{state.lastSave=Date.now();localStorage.setItem(KEY,JSON.stringify(state));if(warning.startsWith('Save failed'))warning='';return true}
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
 const s=state.stats,e=state.emotions;
 s.energy=clamp(s.energy+(activity==='sleeping'?31:activity==='resting'?17:-4));
 s.hunger=clamp(s.hunger+(activity==='eating'?-29:4));
 s.happiness=clamp(s.happiness+4);s.curiosity=clamp(s.curiosity+(activity==='observing'||activity==='reading'?12:2));
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
 if(prop.activity==='eating')n+=Math.max(0,s.hunger-31)*2;
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
 return n+(rng()-.5)*15;
}
function chooseIntent(){if(state.paused||state.brain.target)return;
 let best=null,bestScore=-Infinity;
 for(const prop of M.props){const s=activityScore(prop);if(s>bestScore){bestScore=s;best=prop}}
 if(!best)return;
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
 if(prop){actionResult(prop);b.recent=[prop.id,...b.recent.filter(x=>x!==prop.id)].slice(0,6);
  b.explored[prop.id]=(b.explored[prop.id]||0)+1;
  if(b.explored[prop.id]===1){const msg='I reached '+prop.name+' for the first time in '+M.regions[prop.area].name+'.';
   b.discoveries.unshift({id:uid('d'),text:msg,area:prop.area,interest:prop.interest,time:Date.now()});
   b.discoveries.length=Math.min(b.discoveries.length,120);memory(msg,prop.interest)}
 }
 b.completedAt=Date.now();b.completedActivity=t.activity;b.target=null;b.mode='idle';b.work=0;
 runtime.nextDecision=Date.now()+1000;reflection();save();sidebar();
}
function simulateOffline(){const now=Date.now(),elapsed=Math.floor((now-(state.clock||now))/1000);if(elapsed<75)return;
 const simulated=Math.min(6*3600,elapsed),events=Math.min(65,Math.floor(simulated/225));
 if(!state.paused){
  for(let i=0;i<events;i++){
   // Offline is reconstructed in bounded steps; this is not background processing.
   const r=M.props[Math.floor(rng()*M.props.length)];
   state.stats.hunger=clamp(state.stats.hunger+1.3);state.stats.energy=clamp(state.stats.energy-1.1);
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
 s.hunger=clamp(s.hunger+dt*.025);s.energy=clamp(s.energy-dt*.018);s.curiosity=clamp(s.curiosity-dt*.025);
 e.boredom=clamp(e.boredom+dt*.026);e.calm=clamp(e.calm+dt*.003);e.joy=clamp(e.joy-dt*.003);
 if(s.energy<20)e.frustration=clamp(e.frustration+dt*.03);
}
function update(dt){if(state.paused)return;
 needsTick(dt);const b=state.brain,w=state.world;
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
 $('statusText').textContent=warning||(state.paused?'Autonomy paused':state.brain.mode==='working'?'Practicing '+state.brain.target?.activity:state.brain.mode==='travel'?'Traveling to '+state.brain.target?.name:'Choosing what matters next');
 $('pause').textContent=state.paused?'▶ Resume Tavi':'⏸ Pause Tavi';
 $('follow').textContent=freeCamera?'◎ Follow Tavi':'◎ Following Tavi';
 $('clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 const attrs=[['energy',s.energy],['hunger',100-s.hunger],['happiness',s.happiness],['curiosity',s.curiosity]];
 for(const [k,n] of attrs){const bar=$('meter-'+k),v=$('value-'+k);if(bar)bar.style.width=clamp(n)+'%';if(v)v.textContent=Math.round(n)+'%'}
 $('exploredCount').textContent=Object.keys(state.world.visited||{}).length+'/12';
 $('journalCount').textContent=state.journal.length+' memories in motion';
 $('miniLabel').textContent=M.regions[state.area]?.name||'Valley';
}
function card(host,title,content,meta=''){const wrap=el('article');wrap.className='record';
 const heading=el('strong',title);const body=el('p',content);wrap.append(heading,body);
 if(meta){const foot=el('small',meta);wrap.append(foot)}host.append(wrap);return wrap}
function heading(host,title,desc=''){const h=el('h3',title);host.append(h);if(desc)host.append(el('p',desc));}
const TABS=[['world','World'],['journal','Journal'],['memories','Memories'],['goals','Goals'],['questions','Questions'],['approvals','Approvals'],['art','Artwork'],['personality','Personality'],['settings','Settings']];
function sidebar(){const tabs=$('tabs');tabs.replaceChildren();for(const [id,title] of TABS){const b=el('button',title);b.className=id===tab?'active':'';b.onclick=()=>{tab=id;sidebar()};tabs.append(b)}
 const host=$('sidebarContent');host.replaceChildren();
 if(tab==='world'){
  heading(host,'Tavi’s next intention','Tavi independently plans routes, explores, creates and learns.');
  const goal=state.brain.target;
  card(host,goal?'Heading to '+goal.name:'Thinking about the valley',goal?`Action: ${goal.activity} · ${M.regions[goal.area]?.name||'Valley'}`:'Tavi is choosing from 36 activities across one continuous map.');
  heading(host,'Places connected by paths','Choose one to suggest a destination—not to load a separate scene.');
  for(const [i,r] of M.regions.entries()){
   const c=card(host,r.name,r.desc,state.world.visited[r.id]?'Visited':'Undiscovered');
   const b=el('button','Suggest visit');b.className='secondary small';b.onclick=()=>{
    const p=M.props.find(v=>v.area===i);if(setDestination(p,'suggested')){selected=p;renderStatus();sidebar();toast('Tavi is traveling to '+r.name)}
   };c.append(b)
  }
 }else if(tab==='journal'){
  heading(host,'Tavi’s journal',state.journal.length+' recorded experiences');
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
 }else if(tab==='personality'){
  heading(host,'Simulated emotions','These are game-state values, not evidence of consciousness.');
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
  card(host,'Saved in this browser',warning||'Save is local to this browser and http://localhost:8765/. Closing the browser pauses live simulation; up to six hours are approximated on reopen.');
  const exp=el('button','Export full backup');exp.onclick=exportSave;host.append(exp);
  const upload=el('input');upload.type='file';upload.accept='.json,application/json';upload.className='field';upload.onchange=()=>importSave(upload.files[0]);host.append(upload);
  const reset=el('button','Reset Tavi World save');reset.className='danger';reset.onclick=()=>{
   if(confirm('Reset will replace the current local save. Please export a backup first. Continue?')&&confirm('Really reset all Tavi World memories and progress?')){
    state=initial();runtime.path=[];runtime.index=0;save();sidebar();toast('New Tavi World started')
   }};host.append(reset)
 }
 if(host.children.length===1)host.append(el('p','Nothing to show yet. Tavi will discover new things while exploring.'));
}
function paint(canvas,a){const g=canvas.getContext('2d'),colors=a.palette||['#315a72','#e9d5a3','#8fc4ab','#e8a3a1'];
 let n=(a.seed||13579)>>>0,grow=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
 g.fillStyle=colors[0];g.fillRect(0,0,208,110);
 for(let i=0;i<160;i++){const x=Math.floor(grow()*208),y=Math.floor(grow()*110),size=3+Math.floor(grow()*12);g.fillStyle=colors[i%colors.length];g.fillRect(x,y,size,2+Math.floor(grow()*11))}
 g.fillStyle='#fff4d3';g.fillRect(14,14,5,5);g.fillRect(185,20,4,4);
}
function exportSave(){const wrapper={format:'tavi-living-valley',version:1,exportedAt:new Date().toISOString(),save:state};
 const blob=new Blob([JSON.stringify(wrapper,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='Tavi-World-Backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
async function importSave(file){if(!file)return;
 try{const data=JSON.parse(await file.text()),next=data.save||data;if(!next||next.version!==1)throw Error('Not a supported Tavi World save');
  if(!confirm('Replace current save with the imported backup? Export your current save first.'))return;
  const raw=JSON.stringify(next);localStorage.setItem(KEY,raw);state=loadState();runtime.path=[];runtime.index=0;save();sidebar();toast('Backup restored successfully')
 }catch(e){toast('Restore failed: '+e.message)}}
async function pollAI(force=false){const a=state.brain.ai;
 if((!a.enabled&&!force)||runtime.aiBusy||state.paused||document.hidden)return;
 if(!force&&Date.now()-a.lastCall<100000)return;
 runtime.aiBusy=true;a.lastCall=Date.now();
 try{
  const choices=M.props.map(p=>({area:p.area,obj:p.obj,name:p.name,interest:p.interest,place:M.regions[p.area].name}));
  const payload={model:a.model,context:{needs:state.stats,emotions:state.emotions,interests:Object.entries(state.interests).sort((x,y)=>y[1]-x[1]).slice(0,6),recentMemories:state.memories.slice(0,8).map(v=>v.text.slice(0,160)),goal:state.goals.find(v=>v.status==='active')||null,currentArea:M.regions[state.area].name,options:choices},
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
  if(e.key==='Escape'&&showMap)toggleMap(false);
  if(e.key===' '){e.preventDefault();$('pause').click()}
 });
 document.addEventListener('keyup',e=>runtime.keys.delete(e.key));
 window.addEventListener('blur',()=>runtime.keys.clear());
 $('pause').onclick=()=>{state.paused=!state.paused;journal(state.paused?'Autonomy paused by my friend.':'Autonomy resumed by my friend.','system');if(!state.paused)runtime.nextDecision=0;save();renderStatus();sidebar()};
 $('follow').onclick=()=>{freeCamera=!freeCamera;renderStatus();toast(freeCamera?'Drag the map to look around':'Camera now follows Tavi')};
 $('mapButton').onclick=()=>toggleMap();$('closeMap').onclick=()=>toggleMap(false);
 $('visitNext').onclick=()=>{state.brain.target=null;runtime.path=[];runtime.index=0;chooseIntent();toast('Tavi is choosing another adventure')};
 $('help').onclick=()=>{$('helpPanel').hidden=!$('helpPanel').hidden};
 $('bigMapCanvas').onclick=e=>{const c=e.target,r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*M.W,y=(e.clientY-r.top)/r.height*M.H;
  const nearest=M.regions.reduce((best,p)=>Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y)?p:best,M.regions[0]);
  const regionIndex=M.regions.indexOf(nearest),prop=M.props.find(p=>p.area===regionIndex);
  if(prop){setDestination(prop,'suggested');selected=prop;toggleMap(false);toast('Tavi is traveling to '+nearest.name)}
 };
 $('minimap').onclick=()=>toggleMap();
 document.addEventListener('visibilitychange',()=>{if(document.hidden){state.clock=Date.now();save()}else{simulateOffline();runtime.lastFrame=performance.now()}});
 window.addEventListener('beforeunload',()=>{state.clock=Date.now();save()});
}
function toggleMap(force){showMap=typeof force==='boolean'?force:!showMap;$('mapOverlay').hidden=!showMap;if(showMap){V.minimap($('bigMapCanvas'),state,{showCamera:true,camera:runtime.camera,screen:{w:$('game').width,h:$('game').height}})}}
function loop(now){const dt=clamp((now-(runtime.lastFrame||now))/1000,0,.075);runtime.lastFrame=now;
 update(dt);if(!runtime.lastPaint||now-runtime.lastPaint>30){drawingCanvas();runtime.lastPaint=now;}
 if(now-runtime.lastUI>450){renderStatus();runtime.lastUI=now}
 if(now-runtime.lastSidebar>6300&&tab==='world'){sidebar();runtime.lastSidebar=now}
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
 setupInteraction();simulateOffline();renderStatus();sidebar();
 $('startupSplash').hidden=true;document.documentElement.dataset.taviReady='1';
 runtime.nextDecision=Date.now()+2000;runtime.lastFrame=performance.now();requestAnimationFrame(loop);
 setInterval(()=>pollAI(),11000);
}
window.TaviApp={get state(){return state},get camera(){return runtime.camera},get route(){return runtime.path},setDestination,chooseIntent,save,exportSave,debug:{get spawned(){return M.props.length},get visited(){return Object.keys(state.world.visited).length}}};
try{init()}catch(err){console.error('Tavi initialization:',err);const splash=$('startupSplash');if(splash){splash.hidden=false;splash.innerHTML='';const h=el('h2','Tavi encountered an initialization error');const p=el('p',String(err?.stack||err));splash.append(h,p)}}
})();