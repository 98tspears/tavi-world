/* Tavi World original continuous overworld — no room/scene switching. */
(()=>{'use strict';
const W=178,H=136, T={GRASS:0,TRAIL:1,FOREST:2,MEADOW:3,GARDEN:4,SAND:5,WATER:6,SHALLOW:7,STONE:8,CAVE:9,FLOOR:10,WALL:11,GLASS:12,FLOWERS:13,BRIDGE:14,DIRT:15,PLANK:16,RUG:17,NIGHT:18,CLIFF:19,FARM:20};
const regions=[
 {id:'house',name:'Tavi House',x:27,y:24,kind:'village',color:'#e8bf83',desc:'The hearth of Tavi’s world'},
 {id:'bedroom',name:'Bedroom Loft',x:34,y:21,kind:'village',color:'#e8bf83',desc:'Rest and dream in Tavi’s home'},
 {id:'studio',name:'Art Studio',x:68,y:23,kind:'village',color:'#e7aaa0',desc:'A place for color and creativity'},
 {id:'library',name:'Library & Study',x:110,y:24,kind:'village',color:'#d3be84',desc:'Stories, ideas, and research'},
 {id:'observatory',name:'Observatory',x:152,y:24,kind:'highland',color:'#9eb6f6',desc:'Watch the stars from the hill'},
 {id:'garden',name:'Discovery Garden',x:26,y:64,kind:'garden',color:'#9ace89',desc:'Care for flowers and old stones'},
 {id:'greenhouse',name:'Greenhouse',x:68,y:64,kind:'garden',color:'#b5e9ce',desc:'A sanctuary for tiny plants'},
 {id:'meadow',name:'Firefly Meadow',x:110,y:64,kind:'meadow',color:'#eed18c',desc:'Follow butterflies and melodies'},
 {id:'forest',name:'Whisperwood Forest',x:152,y:64,kind:'forest',color:'#7fbe8b',desc:'Listen to the oldest trees'},
 {id:'shore',name:'Sunlit Shore',x:26,y:106,kind:'shore',color:'#9fdaed',desc:'Shells, tide pools, and soft surf'},
 {id:'workshop',name:'Inventor Workshop',x:68,y:106,kind:'village',color:'#c7ac8a',desc:'Build delightful little machines'},
 {id:'cave',name:'Crystal Cave',x:110,y:106,kind:'cave',color:'#9abbd7',desc:'Ancient crystals and mysteries'}
];
// Preserve the original 36 locations and their interests, relocated into a continuous landscape.
const specs={
 house:[['Fireplace','resting','cozy',-7,0,'hearth'],['Kitchen','eating','food',0,2,'kitchen'],['Bookshelf','reading','stories',-7,-5,'shelf']],
 bedroom:[['Soft bed','sleeping','cozy',0,1,'bed'],['Dream journal','reading','stories',3,3,'journal'],['Star mobile','observing','time',1,-4,'mobile']],
 studio:[['Easel','drawing','art',-4,0,'easel'],['Paint shelf','tinkering','craft',4,-4,'paint'],['Gallery wall','observing','art',1,-5,'frame']],
 greenhouse:[['Seedling beds','gardening','gardening',-4,2,'seedling'],['Watering station','gardening','nature',4,3,'watering'],['Plant samples','observing','science',2,-4,'samples']],
 garden:[['Mysterious stones','observing','mystery',-6,-1,'runestones'],['Flower patch','gardening','nature',5,0,'flowerbed'],['Little pond','playing','nature',0,5,'pond']],
 observatory:[['Telescope','observing','science',-5,1,'telescope'],['Star charts','reading','time',4,2,'starChart'],['Moon clock','tinkering','time',0,-5,'clock']],
 cave:[['Blue crystal','observing','mystery',-7,-2,'crystal'],['Echo chamber','listening','music',6,1,'echo'],['Mineral table','tinkering','science',0,4,'minerals']],
 library:[['Research desk','reading','science',-5,2,'desk'],['Story shelf','reading','stories',5,-5,'shelf'],['Idea board','tinkering','craft',0,-5,'board']],
 forest:[['Ancient oak','observing','nature',-7,-3,'ancientTree'],['Birdsong grove','listening','music',6,-2,'birds'],['Mossy ruins','observing','mystery',0,5,'ruins']],
 shore:[['Tide pools','observing','science',-6,2,'tidepool'],['Shell collection','tinkering','craft',6,2,'shells'],['Driftwood seat','resting','cozy',0,-4,'bench']],
 meadow:[['Butterfly trail','observing','nature',-6,-2,'butterfly'],['Music stones','listening','music',6,1,'musicStone'],['Wildflower canvas','drawing','art',0,-3,'easel']],
 workshop:[['Workbench','tinkering','craft',-5,1,'workbench'],['Clockwork device','tinkering','science',5,1,'machine'],['Idea sketches','drawing','art',0,-5,'sketch']]
};
const hash=(x,y,s=0)=>{let n=Math.imul((x|0)^ (s*137),374761393)+Math.imul((y|0)+s*97,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296};
const index=(x,y)=>y*W+x;
const inBounds=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
const grid=new Uint8Array(W*H);const obstacles=new Uint8Array(W*H);
const structures=[];const props=[];const trees=[];const decor=[];
const setTile=(x,y,v)=>{x=Math.round(x);y=Math.round(y);if(inBounds(x,y))grid[index(x,y)]=v};
const block=(x,y,b=true)=>{x=Math.round(x);y=Math.round(y);if(inBounds(x,y))obstacles[index(x,y)]=b?1:0};
const get=(x,y)=>inBounds(x|0,y|0)?grid[index(x|0,y|0)]:T.WATER;
function biome(x,y){
 if(y>91&&x<46)return 'shore';
 if(x>130&&y>42&&y<103)return 'forest';
 if(x>90&&x<130&&y>44&&y<92)return 'meadow';
 if(x>88&&x<132&&y>92)return 'cave';
 if(x<47&&y>43&&y<92)return 'garden';
 if(x>132&&y<43)return 'highland';
 if(x>131&&y>100)return 'lagoon';
 return 'village';
}
// Deterministic natural ground variation, with a river and beach along the southern coast.
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const b=biome(x,y),r=hash(x,y,19),noise=Math.sin(x*.19+y*.13)*2.5+Math.sin(y*.24-x*.11)*1.5;
 let type=T.GRASS;
 if(b==='forest')type=r>.28?T.FOREST:T.GRASS;
 if(b==='meadow')type=r>.55?T.FLOWERS:T.MEADOW;
 if(b==='garden')type=r>.72?T.FLOWERS:T.GARDEN;
 if(b==='highland')type=r>.73?T.STONE:T.NIGHT;
 if(b==='cave')type=r>.31?T.CAVE:T.STONE;
 if(b==='shore'){
   const coast=18+Math.sin(y*.24)*3+Math.sin(y*.09)*4;
   if(x<coast-3)type=T.WATER;
   else if(x<coast+1)type=T.SHALLOW;
   else if(x<coast+18+noise)type=T.SAND;
   else type=T.GRASS;
 }
 if(b==='lagoon'){
   const d=Math.hypot((x-153)*.85,(y-117)*1.2);
   if(d<9+noise)type=T.WATER;else if(d<13+noise)type=T.SAND;else type=T.FOREST;
 }
 if(b==='village'&&r>.87)type=T.MEADOW;
 grid[index(x,y)]=type;
 if(type===T.WATER)obstacles[index(x,y)]=1;
}
function road(x1,y1,x2,y2,width=2){
 const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1))*4;
 for(let i=0;i<=n;i++){
   const t=i/n,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;
   const bend=Math.sin(t*Math.PI)*Math.sin(t*7+hash(x1,y1)*8)*1.4;
   const ox=Math.abs(y2-y1)>Math.abs(x2-x1)?bend:0;
   const oy=Math.abs(y2-y1)<=Math.abs(x2-x1)?bend:0;
   for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++){
    if(dx*dx+dy*dy>width*width+.4)continue;
    const xx=Math.round(x+ox+dx),yy=Math.round(y+oy+dy);
    setTile(xx,yy,biome(xx,yy)==='shore'&&get(xx,yy)===T.WATER?T.BRIDGE:T.TRAIL);block(xx,yy,false);
   }
 }
}
// Shared main roads. Every district belongs to the same walkable graph.
const links=[
 [[27,36],[68,36]],[[68,36],[110,36]],[[110,36],[152,36]],
 [[27,36],[27,80]],[[68,36],[68,80]],[[110,36],[110,80]],[[152,36],[152,80]],
 [[27,80],[68,80]],[[68,80],[110,80]],[[110,80],[152,80]],
 [[27,80],[27,118]],[[68,80],[68,118]],[[110,80],[110,118]],[[152,80],[152,118]],
 [[27,118],[68,118]],[[68,118],[110,118]],[[110,118],[152,118]],
 [[27,118],[24,106]],[[152,80],[151,64]],[[152,118],[152,106]]
];
links.forEach(([a,b])=>road(a[0],a[1],b[0],b[1],2));
// One-room cutaways. Interiors are physically present in the overworld, never separate scenes.
function building(id,cx,cy,w,h,interior=T.FLOOR){
 const x=Math.round(cx-w/2),y=Math.round(cy-h/2),doorX=cx|0,doorY=y+h-1;
 for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){
   const border=i===x||i===x+w-1||j===y||j===y+h-1;
   const doorway=j===y+h-1&&Math.abs(i-doorX)<=1;
   setTile(i,j,doorway?T.PLANK:(border?T.WALL:interior));
   block(i,j,border&&!doorway);
 }
 for(let j=y+3;j<y+h-2;j+=5)for(let i=x+3;i<x+w-2;i+=7){if(hash(i,j)>.35)setTile(i,j,T.RUG)}
 structures.push({id,x,y,w,h,doorX,doorY});
 return {x,y,w,h,doorX,doorY};
}
const home=building('house',29,24,24,20),studio=building('studio',68,24,20,20),library=building('library',110,24,20,20),obs=building('observatory',152,24,20,20,T.STONE),
 greenhouse=building('greenhouse',68,64,20,20,T.GLASS),workshop=building('workshop',68,106,22,20);
for(const b of structures){road(b.doorX,b.doorY+1,b.doorX,b.doorY+3,1);}
// Other districts have clearings around their landmark clusters.
for(const [cx,cy,radius] of [[26,64,12],[110,64,12],[152,64,12],[26,106,12],[110,106,12]]){
 for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
  if(!inBounds(x,y)||Math.hypot(x-cx,y-cy)>radius+1)continue;
  if(get(x,y)===T.WATER&&cx===26)continue;
  if(hash(x,y,5)>.88)setTile(x,y,T.FLOWERS);
  block(x,y,false);
 }
 const connectY=cy<80?80:118;
 road(cx,cy+Math.sign(connectY-cy)*8,cx,connectY,1);
}
// Small scenic ponds; shore's surf is defined by its coastline.
function pond(cx,cy,rx,ry){for(let y=cy-ry-1;y<=cy+ry+1;y++)for(let x=cx-rx-1;x<=cx+rx+1;x++){
 const d=((x-cx)/rx)**2+((y-cy)/ry)**2;
 if(d<.74){setTile(x,y,T.WATER);block(x,y,true)}else if(d<1.18){setTile(x,y,T.SHALLOW);block(x,y,true)}
}}
pond(28,73,4,3);pond(150,111,7,4);pond(18,104,3,2);
// Activity props: the drawn sprite and its collider share one world coordinate.
const objects=[];
regions.forEach((region,area)=>{
 const rows=specs[region.id]||[];
 rows.forEach(([name,activity,interest,ox,oy,kind],idx)=>{
  const x=region.x+ox,y=region.y+oy;
  const prop={id:region.id+':'+idx,area,obj:idx,name,activity,interest,x,y,kind};
  objects.push(prop);props.push(prop);
 });
});
const walkable=(x,y)=>{
 x=Math.floor(x);y=Math.floor(y);
 if(!inBounds(x,y)||obstacles[index(x,y)])return false;
 const type=get(x,y);
 return type!==T.WATER&&type!==T.CLIFF&&type!==T.WALL;
};
// Props are individually solid; Tavi stands at a neighboring approach tile.
for(const prop of props){
 if(['pond','tidepool','flowerbed','butterfly','musicStone','birds','echo','runestones','mobile','frame','clock','board'].includes(prop.kind))continue;
 block(prop.x,prop.y,true);
 if(['ancientTree','shelf','machine','bed','hearth','crystal','kitchen'].includes(prop.kind))block(prop.x,prop.y-1,true);
}
// Seeded trees, wildflower clusters, rocks and natural landmarks.
for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){
 const type=get(x,y),r=hash(x,y,31);
 const nearRoad=Array.from({length:9},(_,j)=>{const dx=j%3-1,dy=Math.floor(j/3)-1;return get(x+dx,y+dy)===T.TRAIL||get(x+dx,y+dy)===T.BRIDGE}).some(Boolean);
 const nearHub=regions.some(a=>Math.hypot((a.x-x)*.83,a.y-y)<12);
 const chance=type===T.FOREST?.075:type===T.GRASS?.013:type===T.GARDEN?.014:type===T.NIGHT?.006:0;
 if(r<chance&&!nearRoad&&!nearHub&&walkable(x,y)&&walkable(x+1,y)&&walkable(x-1,y)){
   trees.push({x,y,size:type===T.FOREST?1.05+.32*hash(x,y,7):.75+.25*hash(x,y,6),variant:Math.floor(hash(x,y,8)*4)});
   block(x,y,true);
 }else if(r>.974&&type!==T.WATER&&type!==T.TRAIL&&type!==T.FLOOR&&type!==T.WALL&&type!==T.GLASS&&type!==T.BRIDGE&&type!==T.PLANK&&type!==T.RUG){
   decor.push({x,y,type:r>.992?'flowers':type===T.SAND?'shell':'grass',seed:hash(x,y,3)});
 }
}
// Add footpath links from doors and central hubs. A* can always pass the interior entrance.
function nearestArea(x,y){let best=0,d=Infinity;for(let i=0;i<regions.length;i++){
 const r=regions[i],dd=(r.x-x)**2+(r.y-y)**2;
 if(dd<d){d=dd;best=i;}}
 return best;
}
function nearestWalkable(x,y){x=Math.floor(x);y=Math.floor(y);if(walkable(x,y))return {x,y};for(let r=1;r<16;r++){
  let best=null,bestDist=Infinity;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
   const xx=x+dx,yy=y+dy,d=dx*dx+dy*dy;
   if(d<bestDist&&walkable(xx,yy)){bestDist=d;best={x:xx,y:yy}}}
  if(best)return best;
 }return {x:27,y:34}}
function approach(prop,from){let best=null;let d=Infinity;
 for(let radius=1;radius<=3;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
  const x=prop.x+dx,y=prop.y+dy;
  if(!walkable(x,y))continue;
  const score=radius*5+(from?Math.hypot(x-from.x,y-from.y):Math.abs(dx)+Math.abs(dy));
  if(score<d){best={x,y};d=score;}
 }
 return best||nearestWalkable(prop.x,prop.y+3);
}
// Binary-heap A* with 8-direction movement and no corner cutting.
function route(start,goal,limit=110000){
 const sx=Math.floor(start.x),sy=Math.floor(start.y),startP=nearestWalkable(sx,sy),dest=nearestWalkable(goal.x,goal.y);
 const startI=index(startP.x,startP.y),targetI=index(dest.x,dest.y);
 if(startI===targetI)return [];
 const gs=new Float32Array(W*H);gs.fill(Infinity);gs[startI]=0;
 const parent=new Int32Array(W*H);parent.fill(-1);
 const closed=new Uint8Array(W*H);
 const heap=[];
 const push=(id,f)=>{let i=heap.length;heap.push([id,f]);while(i>0){const p=(i-1)>>1;if(heap[p][1]<=f)break;heap[i]=heap[p];i=p}heap[i]=[id,f]};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let c=2*i+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=last[1])break;heap[i]=heap[c];i=c;}heap[i]=last;}return top[0]};
 const heur=(x,y)=>Math.hypot(x-dest.x,y-dest.y);
 push(startI,heur(startP.x,startP.y));
 const delta=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 let visited=0,found=false;
 while(heap.length&&visited++<limit){const id=pop();if(closed[id])continue;closed[id]=1;if(id===targetI){found=true;break}
 const x=id%W,y=(id/W)|0;
 for(const [dx,dy] of delta){const nx=x+dx,ny=y+dy;if(!walkable(nx,ny))continue;
 if(dx&&dy&&(!walkable(x+dx,y)||!walkable(x,y+dy)))continue;
 const ni=index(nx,ny),tile=get(nx,ny);
 const weight=tile===T.TRAIL||tile===T.PLANK||tile===T.FLOOR||tile===T.BRIDGE?1:tile===T.FOREST?1.23:tile===T.SAND?1.12:1.07;
 const g=gs[id]+(dx&&dy?1.4142:1)*weight;
 if(g<gs[ni]){gs[ni]=g;parent[ni]=id;push(ni,g+heur(nx,ny)*1.02)}}
 }
 if(!found)return [];
 const result=[];let at=targetI;
 while(at!==startI&&at!==-1&&result.length<W*H){result.push({x:at%W+.5,y:((at/W)|0)+.5});at=parent[at];}
 result.reverse();
 // Compress consecutive straight segments, preserving corner control.
 const simplified=[];
 for(let i=0;i<result.length;i++){
  const p=result[i],prev=result[i-1],next=result[i+1];
  if(!prev||!next){simplified.push(p);continue}
  const ax=Math.sign(p.x-prev.x),ay=Math.sign(p.y-prev.y),bx=Math.sign(next.x-p.x),by=Math.sign(next.y-p.y);
  if(ax!==bx||ay!==by)simplified.push(p);
 }
 return simplified;
}
function regionAt(x,y){
 const homeBounds=structures.find(s=>s.id==='house');if(homeBounds&&x>=homeBounds.x&&x<homeBounds.x+homeBounds.w&&y>=homeBounds.y&&y<homeBounds.y+homeBounds.h){return x>32?1:0;}
 return nearestArea(x,y);
}
window.TaviWorld={W,H,T,regions,objects,props,trees,decor,grid,structures,hash,get,walkable,route,nearestWalkable,approach,regionAt,biome};
})();