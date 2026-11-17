/* Tavi Commitments v1. An explicit, inspectable lifecycle for permission + follow-through.
 * An approval is authorization, not proof of completion. Never fabricate effects.
 * Open work survives interruption/restart; repeat requests are matched by intent, not type.
 */
(()=>{'use strict';
const OPEN=new Set(['pending','approved','in_progress','blocked']);
const COMPLETE=new Set(['completed','executed']);
const TERMINAL=new Set(['completed','executed','declined','cancelled','failed']);
const STAGES=new Set(['awaiting_permission','queued','traveling','working','blocked','completed','declined','cancelled','failed']);
const asText=(v,max=230)=>String(v??'').slice(0,max);
const intentOf=a=>asText(a?.intentKey||[a?.type||'unspecified',a?.scope||'',a?.text||''].join(':'),160).trim().toLowerCase().replace(/\s+/g,' ');
const time=()=>Date.now();
function trace(a,event,detail=''){
 a.history=Array.isArray(a.history)?a.history:[];
 a.history.push({at:time(),event:asText(event,35),detail:asText(detail,170)});
 a.history=a.history.slice(-30);
}
function normalizeOne(a){
 if(!a||typeof a!=='object')return null;
 const stage=STAGES.has(a.stage)?a.stage:(COMPLETE.has(a.status)?'completed':a.status==='declined'?'declined':a.status==='pending'?'awaiting_permission':a.status==='blocked'?'blocked':'queued');
 return {...a,id:asText(a.id,90),type:asText(a.type||'unknown',55),text:asText(a.text,250),reason:asText(a.reason,300),intentKey:intentOf(a),stage,
  status:asText(a.status||'pending',30),time:Number(a.time)||time(),
  attempts:Math.max(0,Math.min(200,Number(a.attempts)||0)),
  history:Array.isArray(a.history)?a.history.slice(-30).filter(x=>x&&typeof x.event==='string').map(x=>({at:Number(x.at)||0,event:asText(x.event,35),detail:asText(x.detail,170)})):[],
  blocker:asText(a.blocker,220),approvedAt:Number(a.approvedAt)||0,startedAt:Number(a.startedAt)||0,completedAt:Number(a.completedAt)||0};
}
function normalize(list){return Array.isArray(list)?list.slice(0,150).map(normalizeOne).filter(Boolean):[]}
function isOpen(a){return !!a&&OPEN.has(a.status)}
function outstanding(list){return (Array.isArray(list)?list:[]).filter(x=>x&&x.status==='approved'&&x.stage!=='blocked').sort((a,b)=>(a.approvedAt||a.time)-(b.approvedAt||b.time))}
function findActive(list,key){return (list||[]).find(a=>intentOf(a)===String(key).toLowerCase()&&isOpen(a))||null}
function request(list,spec,{id,repeatable=true,cooldownMs=86400000}={}){
 if(!Array.isArray(list))throw Error('A persistent approval ledger is required');
 const key=intentOf(spec),existing=findActive(list,key);
 if(existing)return {item:existing,created:false,reason:'Existing request is not finished; retain its original approval.'};
 const prior=list.find(a=>intentOf(a)===key&&TERMINAL.has(a.status));
 if(prior&&(!repeatable||time()-(prior.completedAt||prior.decidedAt||prior.time)<cooldownMs))
  return {item:prior,created:false,reason:'A previous request covers this exact intent; use a new scope or a repeatable task.'};
 const item=normalizeOne({...spec,id:id||('task-'+time().toString(36)),status:'pending',stage:'awaiting_permission',time:time(),history:[]});
 trace(item,'requested','Awaiting a human decision');list.unshift(item);
 return {item,created:true,reason:'New distinct request created'};
}
function approve(a){if(!a||a.status!=='pending')return false;
 a.status='approved';a.stage='queued';a.approvedAt=time();a.blocker='';trace(a,'approved','Permission granted; execution has not yet happened');return true}
function decline(a){if(!a||a.status!=='pending')return false;
 a.status='declined';a.stage='declined';a.decidedAt=time();trace(a,'declined','Request not approved');return true}
function progress(a,stage,detail=''){if(!a||a.status!=='approved'||!['queued','traveling','working'].includes(stage))return false;
 if(a.stage!==stage){a.stage=stage;trace(a,stage,detail)}
 a.blocker='';if(stage==='traveling'){a.startedAt=a.startedAt||time();a.attempts=(a.attempts||0)+1}
 return true}
function interrupt(a,why='Interrupted by another action'){if(!a||a.status!=='approved')return false;
 a.stage='queued';a.blocker='';trace(a,'interrupted',why);return true}
function block(a,why){if(!a||a.status!=='approved')return false;
 a.stage='blocked';a.blocker=asText(why||'A required action is unavailable',220);trace(a,'blocked',a.blocker);return true}
function retry(a){if(!a||a.status!=='approved'||a.stage!=='blocked')return false;
 a.stage='queued';a.blocker='';trace(a,'retry','The previously blocked work is queued again');return true}
function complete(a,{evidence=null,legacyExecuted=false}={}){if(!a||a.status!=='approved'||!evidence||typeof evidence!=='object'||!evidence.id)return false;
 a.status=legacyExecuted?'executed':'completed';a.stage='completed';a.completedAt=time();a.blocker='';a.evidence={id:asText(evidence.id,90),kind:asText(evidence.kind||'record',55)};
 trace(a,'completed','Completion evidence: '+a.evidence.kind+' '+a.evidence.id);return true}
function cancel(a,why='Cancelled by observer'){if(!a||!isOpen(a))return false;
 a.status='cancelled';a.stage='cancelled';a.decidedAt=time();trace(a,'cancelled',why);return true}
function summarize(list){return (list||[]).slice(0,12).map(a=>({id:a.id,type:a.type,intentKey:intentOf(a),status:a.status,stage:a.stage,blocker:a.blocker||'',text:asText(a.text,110),evidence:a.evidence||null}));}
window.TaviCommitments={normalize,normalizeOne,request,approve,decline,progress,interrupt,block,retry,complete,cancel,outstanding,findActive,isOpen,intentOf,summarize,COMPLETE};
})();