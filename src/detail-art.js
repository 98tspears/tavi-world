/*
 * Tavi World — cohesive continuous overworld detail art.
 * Procedurally generated 32-pixel native tiles and rooted scenery.
 * No scenic panels, picture backgrounds or independent scene transitions.
 * Purely presentational; never changes collisions, the world grid, saves or cognition.
 */
(()=>{'use strict';
const M=window.TaviWorld,T=M.T,N=32;
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const px=(g,x,y,w,h,c)=>{if(w<=0||h<=0)return;g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
const mix=(a,b,t)=>{const v=(c)=>[1,3,5].map(n=>parseInt(c.slice(n,n+2),16));const A=v(a),B=v(b);return '#'+A.map((n,i)=>Math.max(0,Math.min(255,Math.round(n*(1-t)+B[i]*t))).toString(16).padStart(2,'0')).join('');};
const rng=(type,variation,salt=0)=>{let seed=(Math.imul(type+83,374761393)^Math.imul(variation+19,668265263)^Math.imul(salt+11,2246822519))|0;return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};};
const randInt=(random,a,b)=>a+Math.floor(random()*(b-a+1));
const roundRect=(g,x,y,w,h,color,corner=3)=>{px(g,x+corner,y,w-2*corner,h,color);px(g,x,y+corner,w,h-2*corner,color);px(g,x+1,y+1,w-2,h-2,color);};
function leaf(g,x,y,shade,light){
 px(g,x,y+2,6,3,shade);px(g,x+1,y,4,5,shade);
 px(g,x+1,y+1,4,2,light);px(g,x+3,y+3,3,1,light);
}
function smallFlower(g,x,y,petal,center){
 px(g,x+1,y-2,2,7,petal);px(g,x-1,y,6,2,petal);px(g,x,y-1,4,4,petal);
 px(g,x+1,y,2,2,center);
}
function makeTile(type,variation,pal){
 const colors=pal[type]||pal[T.GRASS],random=rng(type,variation,31),gcanvas=canvas(N,N),g=gcanvas.getContext('2d');
 const ground=(col,x=0,y=0,w=N,h=N)=>px(g,x,y,w,h,col);
 const deep=mix(colors[0],colors[4],.42),bright=mix(colors[0],colors[3],.44),mid=mix(colors[0],colors[2],.58);
 ground(colors[0]);
 if([T.GRASS,T.FOREST,T.MEADOW,T.GARDEN,T.FLOWERS].includes(type)){
  // Clumped green shadow and sunlit leaf patches connect visually across a tile.
  for(let i=0;i<10;i++){
   const x=randInt(random,-3,27),y=randInt(random,0,29),w=randInt(random,3,10);
   px(g,x,y,w,randInt(random,2,5),i%4===0?bright:deep);
   if(i%3===0)px(g,x+2,y-2,Math.max(2,w-4),2,mid);
  }
  for(let i=0;i<15;i++){
   const x=randInt(random,0,30),y=randInt(random,2,30),h=randInt(random,2,5),c=i%4===0?colors[3]:i%3===0?colors[1]:colors[2];
   px(g,x,y,1,h,c);px(g,x-1,y+1,1,2,i%2?colors[4]:mid);
   px(g,x+1,y+1,1,2,colors[2]);
  }
  const foliage=type===T.FOREST?11:type===T.GARDEN?7:5;
  for(let i=0;i<foliage;i++){
   const x=randInt(random,1,26),y=randInt(random,1,26),z=randInt(random,0,3);
   leaf(g,x,y,z===1?deep:colors[1],z===1?colors[2]:colors[3]);
  }
  if(type===T.FOREST){
   for(let i=0;i<4;i++){
    const x=randInt(random,1,27),y=randInt(random,3,29);
    px(g,x,y+1,7,3,'#1a704e');px(g,x+2,y,4,2,'#61bd77');
    if(i===2&&variation%3===0){px(g,x+3,y-2,1,3,'#f4e5bd');px(g,x+1,y-3,5,2,'#d8ae8b');}
   }
  }
  const fcount=type===T.FLOWERS?5:type===T.GARDEN?4:type===T.MEADOW?4:type===T.GRASS?(variation%3===0?2:0):variation%4===0?1:0;
  const flowers=['#ffcad7','#efdd84','#b7b2f4','#f5f3d0','#f19b9f'];
  for(let i=0;i<fcount;i++){
   const x=randInt(random,3,27),y=randInt(random,3,27);
   px(g,x+1,y+2,1,4,'#2b834a');smallFlower(g,x,y,flowers[(variation+i)%flowers.length],'#fff3ae');
  }
 }else if([T.TRAIL,T.DIRT,T.SAND,T.FARM].includes(type)){
  // Fine aggregate, compacted earth and rounded pebbles; native 32px not 16px upscaled.
  for(let i=0;i<17;i++){
   const x=randInt(random,0,31),y=randInt(random,0,30),w=randInt(random,2,8),c=i%3===0?deep:i%2===0?bright:colors[1];
   px(g,x,y,w,randInt(random,1,3),c);
   if(i%4===0){px(g,x+2,y-1,w>4?3:2,1,colors[3]);}
  }
  for(let i=0;i<22;i++){
   const x=randInt(random,0,31),y=randInt(random,0,31),c=i%3===0?colors[4]:i%4===0?colors[3]:colors[2];
   px(g,x,y,randInt(random,1,2),1,c);
  }
  if(type===T.TRAIL||type===T.DIRT){
   for(let i=0;i<3;i++){
    const x=randInt(random,3,26),y=randInt(random,3,27);
    px(g,x,y+2,7,3,colors[3]);px(g,x+1,y,5,3,bright);px(g,x+3,y,2,1,'#ffecc0');
   }
  }
  if(type===T.SAND){
   for(let i=0;i<4;i++){
    const x=randInt(random,1,20),y=randInt(random,1,30);
    px(g,x,y,10,1,'#fff0bb');px(g,x+4,y+2,4,1,colors[1]);
   }
   if(variation%4===0){px(g,9,17,5,3,'#e7b4a6');px(g,10,15,3,2,'#fff4d3');px(g,12,18,1,2,'#d99f93');}
  }
  if(type===T.FARM){for(let y=4;y<32;y+=9){px(g,0,y,32,2,colors[4]);for(let x=2;x<32;x+=8){px(g,x,y+2,2,4,'#5da85c');px(g,x+2,y+1,3,2,'#87d27a')}}}
 }else if(type===T.WATER||type===T.SHALLOW){
  for(let i=0;i<9;i++){
   const x=randInt(random,-4,27),y=randInt(random,0,30),length=randInt(random,7,14);
   px(g,x,y+2,length,3,i%3===0?colors[1]:colors[2]);px(g,x+1,y,length-3,1,colors[3]);
   if(i%3===0)px(g,x+4,y+4,4,1,colors[4]);
  }
  for(let i=0;i<7;i++){
   const x=randInt(random,0,30),y=randInt(random,0,30);
   px(g,x,y,randInt(random,1,2),1,i%2?bright:colors[3]);
  }
  if(variation%3===0){px(g,2,10,9,1,mix(colors[3],'#ffffff',.48));px(g,19,27,7,1,colors[2]);}
 }else if([T.STONE,T.CAVE,T.CLIFF,T.NIGHT].includes(type)){
  for(let i=0;i<10;i++){
   const x=randInt(random,-3,28),y=randInt(random,0,30),w=randInt(random,5,11);
   px(g,x,y,w,randInt(random,3,6),i%3===0?deep:mid);
   px(g,x+1,y,w-3,1,bright);
   px(g,x+1,y+4,Math.max(2,w-4),2,colors[4]);
  }
  for(let i=0;i<5;i++){
   const x=randInt(random,1,26),y=randInt(random,1,28);
   px(g,x,y,6,1,colors[4]);px(g,x+4,y+1,1,4,colors[4]);
   px(g,x+1,y-1,3,1,colors[3]);
  }
  if(type===T.CAVE||type===T.NIGHT){
   if(variation%3===0){px(g,11,18,5,6,'#5578a7');px(g,12,15,3,3,'#6bd4f0');px(g,13,15,1,4,'#d8ffff');}
   for(let i=0;i<3;i++){px(g,randInt(random,0,30),randInt(random,0,30),2,2,'#9bd7eb');}
  }
  if(type===T.CLIFF){px(g,1,26,30,2,colors[4]);px(g,0,28,32,3,deep);}
 }else if([T.FLOOR,T.PLANK,T.BRIDGE].includes(type)){
  // Four hand-sized planks per tile, fine knots and staggered seams.
  for(let y=0;y<32;y+=8){
   const row=(Math.floor(y/8)+variation)%3,xOffset=row===0?8:row===1?17:0;
   px(g,0,y,32,1,colors[4]);px(g,0,y+1,32,1,colors[3]);px(g,0,y+7,32,1,colors[1]);
   for(let x=xOffset-32;x<32;x+=32){px(g,x,y,2,8,colors[4]);px(g,x+2,y+2,1,4,colors[2]);}
   for(let i=0;i<3;i++){
    const x=randInt(random,0,26),dy=randInt(random,2,6);
    px(g,x,y+dy,randInt(random,3,9),1,i%2?colors[3]:colors[1]);
   }
   if(row===0){const x=randInt(random,5,26);px(g,x,y+3,4,2,colors[1]);px(g,x+1,y+3,2,1,bright);}
  }
  if(type===T.BRIDGE){px(g,1,0,3,32,colors[4]);px(g,27,0,3,32,colors[4]);}
 }else if(type===T.WALL){
  // Small stone and timber bonds along the walls; no visual scene panel.
  for(let y=0;y<32;y+=10){
   px(g,0,y,32,1,colors[4]);px(g,0,y+1,32,1,colors[3]);
   const shift=(y/10+variation)%2?9:22;
   px(g,shift,y,2,10,deep);px(g,shift+2,y+2,1,6,colors[2]);
  }
  for(let i=0;i<5;i++){const x=randInt(random,0,30),y=randInt(random,0,30);px(g,x,y,3,2,colors[2]);}
 }else if(type===T.GLASS){
  for(let y=0;y<32;y+=8){px(g,0,y,32,1,colors[4]);px(g,0,y+1,32,1,colors[3]);}
  for(let x=0;x<32;x+=8){px(g,x,0,1,32,colors[4]);px(g,x+1,0,1,32,colors[2]);}
  for(let i=0;i<5;i++){const x=randInt(random,1,27),y=randInt(random,2,26);px(g,x,y,2,5,'#e1ffef');px(g,x+1,y,2,1,'#fffde5');}
  if(variation%2===0)leaf(g,15,16,'#3ca17b','#8be4a6');
 }else if(type===T.RUG){
  for(let y=0;y<32;y+=6){px(g,0,y,32,1,colors[3]);px(g,0,y+1,32,1,colors[4]);}
  for(let x=0;x<32;x+=10){px(g,x,0,1,32,colors[3]);px(g,x+3,4,4,4,colors[2]);px(g,x+4,5,2,2,'#ffe0b5');}
 }
 return gcanvas;
}
// Smooth multi-tile color variation only affects the displayed material. The
// collision grid, activity locations and route costs still use M.get(x,y).
function smoothNoise(x,y,scale,salt){
 const u=x/scale,v=y/scale,ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
 const smooth=t=>t*t*(3-2*t),a=smooth(fx),b=smooth(fy);
 const n=(xx,yy)=>M.hash(xx+salt,yy-salt,salt);
 const top=n(ix,iy)*(1-a)+n(ix+1,iy)*a;
 const bottom=n(ix,iy+1)*(1-a)+n(ix+1,iy+1)*a;
 return top*(1-b)+bottom*b;
}
function visualType(type,x,y){
 const biome=M.biome(x,y),c=smoothNoise(x,y,7,179),b=smoothNoise(x,y,14,331);
 // Scatter rugs from the old simulation remain walkable but are rendered as
 // coherent wood/stone flooring; actual furnishings and central rugs provide detail.
 if(type===T.RUG){
  const here=M.structures.find(v=>x>=v.x&&x<v.x+v.w&&y>=v.y&&y<v.y+v.h);
  return here&&here.id==='greenhouse'?T.GLASS:here&&here.id==='observatory'?T.STONE:T.FLOOR;
 }
 // Coherent multi-tile patches replace single-cell random checkerboarding.
 if(biome==='forest'&&(type===T.GRASS||type===T.FOREST))return c*.7+b*.3>.19?T.FOREST:T.GRASS;
 if(biome==='garden'&&(type===T.FLOWERS||type===T.GARDEN))return c*.7+b*.3>.71?T.FLOWERS:T.GARDEN;
 if(biome==='meadow'&&(type===T.FLOWERS||type===T.MEADOW))return c*.7+b*.3>.58?T.FLOWERS:T.MEADOW;
 if(biome==='highland'&&(type===T.NIGHT||type===T.STONE))return c*.7+b*.3>.7?T.STONE:T.NIGHT;
 if(biome==='cave'&&(type===T.CAVE||type===T.STONE))return c*.7+b*.3>.3?T.CAVE:T.STONE;
 if(biome==='village'&&(type===T.MEADOW||type===T.GRASS))return c*.6+b*.4>.88?T.MEADOW:T.GRASS;
 return type;
}
const TILE_VARIANTS=24;
function tileAtlas(palette){const atlas={};Object.keys(palette).forEach(id=>{
 atlas[id]=Array.from({length:TILE_VARIANTS},(_,n)=>makeTile(Number(id),n,palette));
});return atlas;}
const trees=[];
function ellipse(g,cx,cy,rx,ry,c,step=2){for(let y=-ry;y<=ry;y+=step){const q=Math.sqrt(Math.max(0,1-y*y/(ry*ry)));px(g,cx-Math.floor(q*rx/step)*step,cy+y,Math.floor(q*rx/step)*step*2+step,step,c);}}
function treeSprite(variation){
 const c=canvas(112,128),g=c.getContext('2d'),r=rng(variation,44,3);
 const palettes=[
 ['#134d3f','#216943','#358c51','#55b464','#83d17d','#b6e596'],
 ['#235b3c','#357d48','#55a25d','#75bd68','#a4d47d','#d6eb9b'],
 ['#164e51','#1e7174','#2f9996','#56bbad','#8bdbc5','#c6f1dc'],
 ['#315141','#467345','#669951','#88b561','#b3d77b','#e9eca4'],
 ['#36593c','#477950','#62a366','#80c47e','#a8d990','#d0ebb1'],
 ['#214e50','#2b6972','#488990','#60a7a3','#88d0b9','#d7f6d8'],
 ['#174c3d','#1f7652','#398e61','#57b273','#80d99b','#bcf2cb'],
 ['#2b513c','#47754d','#659755','#8ab86a','#b2d67f','#e2eca1']][variation];
 // Contact shadow, stepped trunk, branch forks and bark grain.
 ellipse(g,56,115,29,5,'#10332d56');
 px(g,47,65,20,47,'#443629');px(g,50,63,17,49,'#8b5b3c');px(g,52,64,4,46,'#bd8350');px(g,62,69,2,37,'#5a4431');
 px(g,43,82,9,8,'#5b432f');px(g,36,76,11,7,'#644631');px(g,64,77,11,7,'#694a31');px(g,60,89,5,4,'#493627');
 for(let i=0;i<7;i++){const x=52+randInt(r,0,9),y=67+randInt(r,0,35);px(g,x,y,1,randInt(r,3,7),i%2?'#d5a46e':'#69452f');}
 // Eight leafy lobes are irregularly placed but retain a unified crown silhouette.
 const lobes=[[30,60,24,18],[72,58,22,19],[54,45,36,21],[30,32,22,19],[78,34,20,20],[54,22,28,20],[50,67,32,13],[69,16,17,14]];
 for(let i=0;i<lobes.length;i++){
  const [xx,yy,rx,ry]=lobes[i],dx=randInt(r,-3,3),dy=randInt(r,-3,3);
  ellipse(g,xx+dx,yy+dy+4,rx+3,ry+3,palettes[0],3);
  ellipse(g,xx+dx,yy+dy,rx,ry,palettes[1],2);
  ellipse(g,xx+dx-3,yy+dy-3,rx-5,ry-6,palettes[2+(i%2)],2);
  ellipse(g,xx+dx-6,yy+dy-7,Math.max(6,rx-12),Math.max(5,ry-10),palettes[4],2);
 }
 // Sprigs, clusters, edge pixels and blossoms are visibly finer than previous 16px trees.
 for(let i=0;i<180;i++){
  const x=randInt(r,11,98),y=randInt(r,9,78),f=(x-54)**2/2500+(y-43)**2/1250;
  if(f>1.22)continue;
  const k=randInt(r,0,5),width=randInt(r,2,5),h=randInt(r,1,3);
  px(g,x,y,width,h,palettes[k]);
  if(i%9===0)px(g,x+2,y-2,2,2,palettes[5]);
  if(i%31===0){px(g,x,y,3,2,variation%2?'#ffc6d7':'#ffe6ab');px(g,x+1,y+1,1,1,'#fff5dc');}
 }
 return c;
}
for(let i=0;i<8;i++)trees.push(treeSprite(i));
function makeScenery(kind,variant){
 const c=canvas(56,56),g=c.getContext('2d'),r=rng(kind.length,variant,8);
 if(kind==='fern'||kind==='fern2'){
  const leaves=['#246e4e','#2f935c','#54b975','#87d58e'];
  ellipse(g,28,44,17,4,'#16432d55');
  for(let i=0;i<5;i++){
   const x=13+i*7,dy=(i%2)*4;
   px(g,x+2,25+dy,2,20,'#286c3e');
   for(let j=0;j<4;j++){
    const y=26+dy+j*4,ext=4+Math.abs(2-j)*2;
    px(g,x-ext+3,y,ext+1,3,leaves[(i+j)%4]);px(g,x+3,y,ext+3,2,leaves[(i+j+1)%4]);
   }
  }
 }else if(kind==='shrub'){
  ellipse(g,27,45,22,5,'#14382d66');px(g,19,27,18,19,'#475735');
  for(let i=0;i<7;i++){
   const x=10+(i%4)*9,y=22+Math.floor(i/4)*10;
   ellipse(g,x+4,y+8,12,10,'#1f704b');ellipse(g,x+2,y+4,10,7,i%2?'#38985a':'#48a75f');
   ellipse(g,x,y+1,5,4,i%2?'#9bdb82':'#70c673');
  }
  for(let i=0;i<16;i++){const x=randInt(r,14,39),y=randInt(r,16,40);px(g,x,y,2,2,i%4===0?'#fff5b0':'#71cd7e');}
 }else if(kind==='mushroom'){
  ellipse(g,28,48,19,4,'#21432e6b');
  for(let i=0;i<3;i++){
   const x=14+i*12,y=30+(i%2)*7;
   px(g,x+3,y+1,4,14,'#f3dfbc');px(g,x,y,11,4,i===1?'#a779cb':'#c98569');
   px(g,x+2,y-3,7,4,i===1?'#c8a1e2':'#efa28b');px(g,x+3,y-2,2,1,'#fff1d4');
  }
 }else if(kind==='rock'){
  ellipse(g,28,47,20,4,'#223f3c55');
  px(g,14,33,32,13,'#596e77');px(g,17,26,26,11,'#8c9c98');px(g,22,23,18,4,'#c1c4b0');
  px(g,16,35,7,3,'#b6c0a6');px(g,31,35,11,1,'#475c68');px(g,35,40,7,2,'#3e5d59');
  px(g,19,28,5,3,'#6cb07d');px(g,21,29,5,2,'#99c788');
 }else if(kind==='bloom'){
  ellipse(g,28,49,18,4,'#31574755');
  const petals=['#f3a0c0','#f7d27a','#ccc1f3','#fcf4d0','#fba18d'];
  for(let i=0;i<10;i++){
   const x=randInt(r,7,45),y=randInt(r,19,40);
   px(g,x+2,y+1,1,13,'#35884c');px(g,x,y,7,2,petals[(i+variant)%5]);px(g,x+3,y-2,2,6,petals[(i+variant)%5]);px(g,x+2,y,3,2,'#fff1a8');
  }
 }else if(kind==='reeds'){
  ellipse(g,28,50,21,4,'#366d6a88');
  for(let i=0;i<6;i++){
   const x=12+i*6,y=19+(i%3)*4;
   px(g,x+2,y,1,30,'#538e51');px(g,x+4,y+11,1,22,'#7abb72');
   px(g,x,y,3,9,'#b68d52');px(g,x+1,y+2,1,3,'#e8c27a');px(g,x-3,y+14,6,2,'#8dc18b');
  }
 }else if(kind==='crystals'){
  ellipse(g,29,50,20,4,'#142a4855');
  const cols=['#519ed6','#87dcef','#77a4e4','#be9de6','#d3f7ff'];
  for(let i=0;i<4;i++){
   const x=12+i*10,h=randInt(r,13,28),y=48-h;
   px(g,x,y,8,h,cols[i]);px(g,x+1,y-4,4,5,cols[(i+2)%5]);px(g,x+3,y+2,2,h-4,'#ecfcff');
  }
 }else if(kind==='shell'){
  ellipse(g,29,50,16,3,'#a57c654d');px(g,19,37,19,12,'#e5b6a9');px(g,23,31,12,7,'#ffdfc5');
  for(let i=0;i<5;i++)px(g,22+i*3,35,1,13,'#be8f84');
 }
 return c;
}
const decorImg={};['fern','fern2','shrub','mushroom','rock','bloom','reeds','crystals','shell'].forEach(k=>decorImg[k]=Array.from({length:3},(_,v)=>makeScenery(k,v)));
// Only small, non-solid decorations: terrain and navigation remain authoritative.
const scenery=[];
function createScenery(){
 const mapW=M.W,mapH=M.H;
 for(let y=3;y<mapH-3;y++)for(let x=3;x<mapW-3;x++){
  const terrain=M.get(x,y),r=M.hash(x,y,497),nearPOI=M.props.some(z=>Math.abs(z.x-x)<3&&Math.abs(z.y-y)<3);
  if(nearPOI)continue;
  let kind=null;
  if(terrain===T.FOREST){if(r<.029)kind='fern';else if(r>.982)kind='shrub';else if(r>.962)kind='mushroom';}
  else if([T.GRASS,T.MEADOW,T.GARDEN,T.FLOWERS].includes(terrain)){if(r<.018)kind='bloom';else if(r>.984)kind='shrub';else if(r>.966)kind='rock';}
  else if(terrain===T.SAND){if(r<.017)kind='shell';else if(r>.982)kind='reeds';}
  else if([T.CAVE,T.NIGHT].includes(terrain)){if(r<.033)kind='crystals';else if(r>.972)kind='rock';}
  else if(terrain===T.STONE&&r<.013)kind='rock';
  if(kind)scenery.push({x,y,kind,variant:Math.floor(M.hash(x,y,498)*3),scale:kind==='shrub'?1.06:kind==='crystals'?.75:kind==='rock'?.8:kind==='bloom'?.74:.76});
 }
}
createScenery();
function drawScenery(g,d,screenX,screenY,zoom){
 const im=decorImg[d.kind][d.variant%3],size=Math.round(48*d.scale);
 g.drawImage(im,Math.round(screenX-size/2),Math.round(screenY-size*.93),size,size);
}
// Pixel-layer water, sand, path and grass transitions instead of scene-card seams.
function drawEdges(g,cam,limits){
 const {x0,y0,x1,y1}=limits;
 for(let y=Math.max(0,y0);y<Math.min(M.H,y1);y++)for(let x=Math.max(0,x0);x<Math.min(M.W,x1);x++){
  const type=M.get(x,y),wx=Math.round(x*N-cam.x),wy=Math.round(y*N-cam.y),w=N;
  const land=(v)=>v!==T.WATER&&v!==T.SHALLOW;
  const green=(v)=>[T.GRASS,T.FOREST,T.MEADOW,T.GARDEN,T.FLOWERS].includes(v);
  const top=y>0?M.get(x,y-1):type,left=x>0?M.get(x-1,y):type,right=x<M.W-1?M.get(x+1,y):type,down=y<M.H-1?M.get(x,y+1):type;
  const water=type===T.WATER||type===T.SHALLOW;
  if(water){
   if(land(top)){
    px(g,wx,wy,32,2,'#e5fff0');px(g,wx+4,wy+2,23,1,'#9deae4');
    for(let k=0;k<3;k++)px(g,wx+3+k*10,wy+3+(k%2)*2,5,1,'#d8fff4');
   }
   if(land(left)){
    px(g,wx,wy,2,32,'#d7fff0');px(g,wx+2,wy+4,1,22,'#81daca');
    for(let k=0;k<3;k++)px(g,wx+3,wy+3+k*10,2,5,'#befff0');
   }
   if(land(right)){
    px(g,wx+29,wy,3,32,'#8bded2');px(g,wx+27,wy+10,1,12,'#cbf5df');
   }
   if(land(down)){px(g,wx,wy+28,32,3,'#6dcac7');px(g,wx+6,wy+26,20,1,'#d0ffeb');}
  }else if(type===T.TRAIL||type===T.DIRT){
   // Irregular rooted turf along traveled path edges, with gravel in the dirt.
   if(green(top)){
    px(g,wx,wy,32,2,'#37864e');
    for(let k=0;k<5;k++){const ox=wx+(k*7+Math.floor(M.hash(x,y,k)*4))%32;px(g,ox,wy+2,3,2,'#66b875');}
   }
   if(green(left)){
    px(g,wx,wy,2,32,'#34844d');
    for(let k=0;k<5;k++){const oy=wy+(k*7+Math.floor(M.hash(y,x,k)*5))%32;px(g,wx+2,oy,2,3,'#65b772');}
   }
   if(green(right)){
    px(g,wx+29,wy,3,32,'#388c51');
    for(let k=0;k<4;k++)px(g,wx+26,wy+4+k*7,4,2,'#76c779');
   }
   if(green(down)){px(g,wx,wy+29,32,3,'#3d9156');for(let k=0;k<5;k++)px(g,wx+3+k*6,wy+27,3,2,'#80cd7b');}
  }
 }
}
function drawArchitecture(g,b,sx,sy,state){
 const w=b.w*N,h=b.h*N,style={
  house:['#684a42','#b17a57','#ead0a0','#efb681'],studio:['#784a50','#bd8376','#f3caa5','#e9a59d'],
  library:['#665047','#93724f','#ead5ae','#d1aa6f'],observatory:['#4f516d','#7980a1','#e2d8d4','#adbcde'],
  greenhouse:['#326c5d','#65a58a','#e5f4c9','#9bdab7'],workshop:['#665348','#9c7054','#f4d29f','#d5a979']
 }[b.id]||['#584844','#a37a65','#efd7b2','#dea47e'];
 // Long common back wall across an architectural footprint; not an independent scene.
 px(g,sx,sy,w,9,style[0]);px(g,sx+6,sy+7,w-12,6,style[2]);px(g,sx+6,sy+13,w-12,60,style[1]);
 for(let row=0;row<5;row++){
  const yy=sy+15+row*12;px(g,sx+7,yy,w-14,2,style[0]);px(g,sx+7,yy+2,w-14,1,style[3]);
  for(let x=17+(row%2)*21;x<w-12;x+=45){px(g,sx+x,yy+2,2,10,style[0]);px(g,sx+x+3,yy+4,8,1,style[2]);}
 }
 px(g,sx+6,sy+73,w-12,9,style[0]);px(g,sx+8,sy+75,w-16,3,style[3]);
 // Side wall column details, the building remains a part of the terrain grid.
 px(g,sx,sy+8,8,h-20,style[0]);px(g,sx+2,sy+13,3,h-30,style[1]);
 px(g,sx+w-8,sy+8,8,h-20,style[0]);px(g,sx+w-6,sy+13,3,h-30,style[2]);
 for(let yy=sy+90;yy<sy+h-15;yy+=32){px(g,sx+1,yy,7,2,style[2]);px(g,sx+w-8,yy+8,7,2,style[1]);}
 // Windows are animated/static pixel elements integrated with the same building frame.
 const count=b.id==='greenhouse'?4:3,sep=w/(count+1);
 for(let i=1;i<=count;i++){
  const cx=Math.round(sx+i*sep),wy=sy+23;
  px(g,cx-23,wy-5,47,45,style[0]);px(g,cx-20,wy-2,41,38,'#624837');
  px(g,cx-17,wy+1,35,31,b.id==='observatory'?'#5e70a9':b.id==='greenhouse'?'#91e3b4':'#fbe0a0');
  px(g,cx-13,wy+3,10,17,b.id==='observatory'?'#adbbe9':'#f8f2b3');px(g,cx+2,wy+3,10,17,b.id==='observatory'?'#97a9d6':'#fff8c7');
  px(g,cx-2,wy,4,33,style[0]);px(g,cx-17,wy+16,35,3,style[0]);
  px(g,cx-25,wy+36,51,5,style[0]);px(g,cx-23,wy+36,47,2,style[2]);
  px(g,cx-18,wy+3,4,20,style[2]);px(g,cx+14,wy+6,2,14,style[3]);
  if(b.id!=='observatory'){
   // Pixel-stepped window light, rendered as translucent light on the actual floor.
   g.save();g.globalAlpha=.13;
   const baseX=cx+10,baseY=sy+83;
   for(let j=0;j<12;j++){
    const shade=j%3===0?'#fff6c7':'#ffd992';
    px(g,baseX+j*5,baseY+j*10,28,6,shade);
    if(j%2===0)px(g,baseX+j*5+8,baseY+j*10+5,11,3,'#fff8d2');
   }
   g.restore();
  }
 }
 // Specific, modest ornamentation keeps every place identifiable without scene cards.
 const peg=(x,y)=>{px(g,x-2,y,15,4,style[0]);px(g,x,y+3,11,10,'#ac7a4e');px(g,x+3,y+4,5,5,'#ffdc9c');px(g,x+4,y+3,3,2,'#ffefbd');};
 const planter=(x,y)=>{px(g,x-12,y+18,24,7,'#674733');px(g,x-9,y+14,18,14,'#b87949');
  for(let j=0;j<6;j++){const rx=x-12+j*5,ry=y+2+(j%3)*3;px(g,rx,ry,8,5,j%2?'#4cb66b':'#6bcb73');px(g,rx+3,ry-4,3,6,'#83d884');}
 };
 for(let i=0;i<3;i++)peg(sx+30+i*(w-60)/2,sy+90);
 if(b.id==='house'||b.id==='studio'||b.id==='library'){
  // Small wall shelf: plants, books and craft supplies.
  const shelfX=sx+35,shelfY=sy+91;
  px(g,shelfX-5,shelfY-7,85,4,'#69432f');px(g,shelfX-4,shelfY-9,82,2,'#e0ab74');
  for(let i=0;i<13;i++){px(g,shelfX+i*6,shelfY-25-(i%3)*2,5,17+(i%3)*2,['#b76d61','#88b0a3','#d3ac6c','#c8a3aa'][i%4]);px(g,shelfX+i*6+1,shelfY-21,1,8,'#f0dca8');}
 }
 if(b.id==='studio'){planter(sx+w-38,sy+116);
  for(let i=0;i<4;i++){px(g,sx+w-140+i*22,sy+95,18,24,'#79513d');px(g,sx+w-138+i*22,sy+97,14,19,['#f5c6ab','#b2daca','#bfaad6','#e6d9ae'][i]);px(g,sx+w-136+i*22,sy+109,9,4,'#739b78');}
 }else if(b.id==='library'){
  // Reading lamps and a long shelving wall.
  px(g,sx+w-185,sy+95,160,7,'#684834');
  for(let i=0;i<22;i++){px(g,sx+w-180+i*7,sy+76,6,19,['#8eabb8','#a67b67','#c6b78c','#6e9678'][i%4]);px(g,sx+w-177+i*7,sy+79,2,12,'#eee1ad');}
 }else if(b.id==='greenhouse'){
  px(g,sx+16,sy+95,w-32,5,'#3e856a');
  for(let i=0;i<10;i++){
   const x=sx+33+i*(w-66)/9;
   px(g,x,sy+92,12,9,'#ab7752');px(g,x+3,sy+86,2,6,'#4ba86a');px(g,x,sy+83,8,4,'#79d37b');
  }
 }else if(b.id==='observatory'){
  px(g,sx+w*.52-37,sy+86,74,12,'#6c6c92');
  for(let i=0;i<7;i++){const x=sx+w*.52-29+i*9;px(g,x,sy+72-(i%2)*5,7,16,'#acb9d2');px(g,x+2,sy+73-(i%2)*5,2,7,'#fff0bb');}
 }else if(b.id==='workshop'){
  for(let i=0;i<8;i++){
   const x=sx+w*.57+i*18,y=sy+104+(i%2)*8;
   px(g,x,y,14,12,'#8d704e');px(g,x+3,y+2,8,8,'#dfb26d');px(g,x+5,y+4,4,4,'#8a6854');
  }
 }
 // Wall greenery and readable threshold at the south edge.
 planter(sx+29,sy+118);planter(sx+w-36,sy+126);
 // Door is in the existing passable tile, do not add colliding visual furniture.
 const thresholdX=Math.round(b.doorX*N-(b.x*N-sx));
 px(g,thresholdX-20,sy+h-16,70,6,'#86624f');px(g,thresholdX-16,sy+h-10,62,5,'#e1bc84');
 for(let i=0;i<4;i++)px(g,thresholdX-8+i*15,sy+h-9,8,2,'#ac845d');
}
function enhanceProp(g,kind){
 // Additional object-specific native pixel highlights, kept inside original 80x80 canvas.
 if(['easel','sketch','frame'].includes(kind)){
  px(g,24,23,5,2,'#fff0c8');px(g,29,26,7,2,'#f3dbad');px(g,42,39,5,3,'#c7a4d5');
  px(g,29,47,6,2,'#91b69e');
 }else if(['desk','workbench','kitchen','minerals','samples'].includes(kind)){
  px(g,12,42,55,2,'#f1c68b');px(g,13,48,51,1,'#4a342f');
  for(let i=0;i<4;i++)px(g,20+i*11,39,4,2,'#e0a978');
 }else if(kind==='shelf'){
  for(let j=0;j<3;j++)for(let i=0;i<6;i++){
   const x=24+i*5,y=15+j*15;
   px(g,x,y,1,10,'#ffdfa4');if(i%3===0)px(g,x+1,y+4,3,1,'#5a6b89');
  }
 }else if(kind==='hearth'){
  px(g,23,56,34,3,'#f9cf8b');px(g,36,30,3,16,'#ffd985');px(g,32,43,5,12,'#f9a45b');
  px(g,19,21,43,2,'#f3ddbd');
 }else if(kind==='bed'){
  for(let i=0;i<8;i++)px(g,19+i*5,48+(i%2),3,1,'#e4e0c6');
  px(g,23,34,11,2,'#fffbea');px(g,45,34,11,2,'#fffbea');
 }else if(kind==='telescope'){
  px(g,22,26,38,2,'#f7e8be');px(g,27,31,29,2,'#4e8391');px(g,54,16,4,5,'#f7d88c');
 }else if(kind==='crystal'||kind==='echo'){
  px(g,30,18,3,22,'#b4efff');px(g,37,24,3,17,'#ffffff');px(g,15,59,45,2,'#badbf1');
 }else if(kind==='flowerbed'||kind==='seedling'){
  for(let i=0;i<6;i++){
   const x=13+i*9,y=27+(i%2)*8;
   px(g,x,y,5,4,'#67cb6e');px(g,x+2,y-3,2,6,'#a7dd74');
  }
 }else if(kind==='machine'||kind==='clock'){
  px(g,20,26,12,2,'#f8db99');px(g,50,26,12,2,'#f5d596');px(g,33,50,12,2,'#5f7583');
 }else if(kind==='ancientTree'){
  for(let i=0;i<10;i++){
   const x=15+i*4,y=18+(i%4)*3;px(g,x,y,4,2,'#b2e995');
  }
 }
}
window.TaviDetailArt={makeTile,tileAtlas,visualType,trees,scenery,drawScenery,drawEdges,drawArchitecture,enhanceProp,TILE_VARIANTS};
})();