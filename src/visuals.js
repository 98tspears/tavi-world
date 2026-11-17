/* Original pixel art renderer. 16px native tiles; scale to viewport with nearest-neighbor. */
(()=>{'use strict';
const M=window.TaviWorld,T=M.T,TILE=32,S=2;
// Jewel-bright, readable, 16-bit handheld-inspired palette. Each biome has shadows,
// mids and highlights; objects share the same warm/cool visual language.
const pal={
 [T.GRASS]:['#4dbb65','#36a35a','#6bd277','#9ae785','#26884d'],
 [T.TRAIL]:['#edcb8e','#d9af72','#ffe0a9','#bc8b61','#fff0bf'],
 [T.FOREST]:['#268b57','#18754b','#35a567','#65c575','#166745'],
 [T.MEADOW]:['#84dc71','#65c967','#a1e982','#cff39b','#49b963'],
 [T.GARDEN]:['#75cb62','#51b955','#92de6b','#c4ee8b','#3c9d50'],
 [T.SAND]:['#f4d58e','#edc278','#ffe3a4','#d7aa65','#fff1b9'],
 [T.WATER]:['#138dcb','#007cbf','#28abe0','#82d9ee','#0066a9'],
 [T.SHALLOW]:['#52cad0','#27b5bf','#8ee6db','#cbf7e4','#1599ad'],
 [T.STONE]:['#9ca7bb','#8693aa','#b9c6d5','#e0d6ce','#6d7b9b'],
 [T.CAVE]:['#6772a1','#55618d','#8796bf','#aeb9d5','#424e79'],
 [T.FLOOR]:['#ca935f','#b8804c','#e4a970','#f3c58e','#986340'],
 [T.WALL]:['#81728d','#665f7b','#a99ba8','#d1bdac','#594e69'],
 [T.GLASS]:['#95daca','#69cabc','#b5f2d8','#e6ffdc','#43a99f'],
 [T.FLOWERS]:['#6bca68','#4db75b','#98df71','#f1e08c','#389d54'],
 [T.BRIDGE]:['#d5a576','#bc8859','#ecc28e','#f4d4a0','#93684b'],
 [T.DIRT]:['#bb8b5e','#a87a4d','#dcb080','#e4c597','#8f6544'],
 [T.PLANK]:['#d6a16b','#bc8655','#efbd80','#ffdd9e','#a06f40'],
 [T.RUG]:['#d97b91','#bf617d','#f5a4a4','#ffc5a6','#a84c6c'],
 [T.NIGHT]:['#677cb6','#516aa1','#8c9fcb','#b7bbdf','#415586'],
 [T.CLIFF]:['#968498','#827588','#b8a5a8','#dfc1a7','#695f78'],
 [T.FARM]:['#936044','#81533c','#b07c55','#dba574','#63402f']
};
const c16=()=>{const c=document.createElement('canvas');c.width=16;c.height=16;return c};
const p=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))};
const pixelPoly=(g,pts,color)=>{g.fillStyle=color;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(q=>g.lineTo(q[0],q[1]));g.closePath();g.fill()};
function makeTile(type,variant){const c=c16(),g=c.getContext('2d'),colors=pal[type]||pal[T.GRASS],rand=(i,j)=>M.hash(variant*17+i,variant*23+j,type+2);
 p(g,0,0,16,16,colors[0]);
 const sprinkle=(n,color,min=1,max=2)=>{for(let i=0;i<n;i++){let x=Math.floor(rand(i,21)*16),y=Math.floor(rand(i,49)*16),size=min+Math.floor(rand(i,51)*(max-min+1));p(g,x,y,size,1+(i%3===0?1:0),color)}};
 if([T.GRASS,T.FOREST,T.MEADOW,T.GARDEN,T.FLOWERS].includes(type)){
  for(let i=0;i<12;i++){const x=Math.floor(rand(i,34)*16),y=Math.floor(rand(i,35)*16);p(g,x,y,1,2,colors[1]);p(g,x+1,y-1,1,1,colors[2]);if(i%4===0)p(g,x-2,y,1,1,colors[3])}
  sprinkle(8,colors[4]);
  if(type===T.FOREST){for(let i=0;i<4;i++){const x=Math.floor(rand(i,62)*15),y=Math.floor(rand(i,63)*15);p(g,x,y,3,2,'#255c40');p(g,x+1,y,2,1,'#4d8d52')}}
  if(type===T.FLOWERS||type===T.MEADOW){for(let i=0;i<4;i++){const x=Math.floor(rand(i,84)*14+1),y=Math.floor(rand(i,85)*14+1);const hue=['#f9e2a5','#f4a6ad','#d4ade7','#f2f4d0'][Math.floor(rand(i,86)*4)];p(g,x,y,2,2,hue);p(g,x+1,y+1,1,1,'#faecac')}}
  if(type===T.GARDEN){p(g,3,8,3,1,'#8fc574');p(g,11,5,2,1,'#8fc574')}
 }else if([T.TRAIL,T.SAND,T.DIRT,T.FARM].includes(type)){
  sprinkle(12,colors[1]);sprinkle(7,colors[2]);
  if(type===T.TRAIL){for(let i=0;i<2;i++){const x=Math.floor(rand(i,63)*14);p(g,x,Math.floor(rand(i,64)*14),4,1,colors[3]);}}
  if(type===T.SAND){p(g,2,12,4,1,'#f8e8bc');p(g,11,3,2,2,'#d9b278');p(g,7,7,2,1,'#ffeec6')}
  if(type===T.FARM){for(let y=2;y<16;y+=5){p(g,0,y,16,2,colors[3]);p(g,2,y+2,1,2,colors[1]);}}
 }else if([T.WATER,T.SHALLOW].includes(type)){
  for(let y=0;y<16;y+=5){const shift=Math.floor(rand(y,11)*5);p(g,shift,y,8,2,colors[2]);p(g,(shift+10)%16,y+2,5,1,colors[1]);p(g,(shift+5)%16,y+3,3,1,colors[3])}
 }else if([T.STONE,T.CAVE,T.NIGHT,T.CLIFF].includes(type)){
  for(let i=0;i<6;i++){const x=Math.floor(rand(i,40)*13),y=Math.floor(rand(i,41)*13);p(g,x,y,3+(i%2),2,colors[i%3+1]);p(g,x,y,1,1,colors[3]);}
  if(type===T.CAVE){p(g,2,3,3,2,'#39465f');p(g,12,8,2,3,'#8595a1')}
 }else if([T.FLOOR,T.PLANK,T.BRIDGE,T.RUG,T.GLASS,T.WALL].includes(type)){
  if(type===T.FLOOR||type===T.PLANK||type===T.BRIDGE){for(let y=0;y<16;y+=5){p(g,0,y,16,1,colors[1]);p(g,(y/5%2)*7, y+2,2,1,colors[2]);p(g,10,y+3,3,1,colors[3]);}p(g,0,15,16,1,colors[4]);}
  if(type===T.BRIDGE){p(g,1,0,2,16,'#6b513c');p(g,13,0,2,16,'#6b513c')}
  if(type===T.GLASS){p(g,0,0,16,1,'#c9e7bc');p(g,0,0,1,16,'#c6ebc5');p(g,15,0,1,16,'#4f9a82');p(g,0,15,16,1,'#579a89');p(g,3,3,1,7,'#e0efd1');p(g,7,1,1,14,'#a9d0b5');p(g,9,9,5,2,'#6cae7b')}
  if(type===T.RUG){p(g,0,0,16,1,'#eec7aa');p(g,0,15,16,1,'#eec7aa');p(g,0,0,1,16,'#eec7aa');p(g,15,0,1,16,'#eec7aa');p(g,4,5,8,2,'#e6ab9a');p(g,6,9,4,3,'#e6ab9a')}
  if(type===T.WALL){p(g,0,0,16,3,colors[2]);p(g,0,14,16,2,colors[4]);p(g,8,3,1,11,colors[1]);p(g,1,8,14,1,colors[3]);p(g,4,5,3,1,colors[2])}
 }
 return c;
}
const tiles={};Object.keys(pal).forEach(type=>tiles[type]=Array.from({length:8},(_,v)=>makeTile(Number(type),v)));
const color=(type)=>pal[type]?.[0]||'#51805e';
const artCache={};
function makeSprite(kind){const c=document.createElement('canvas');c.width=80;c.height=80;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const B='#354052',wood='#ac784f',edge='#634631',hl='#edbf86',linen='#fff1cd',leaf='#37b46b',light='#fff7d8',gold='#ffd17b';
 const shadow=()=>{p(g,12,63,55,4,'#213b3670');p(g,18,67,40,2,'#213b3647')};
 const pl=(x,y,w,h,col)=>p(g,x,y,w,h,col);
 const book=(x,y)=>{pl(x,y,20,16,'#925f5a');pl(x+2,y+2,7,11,'#f5e9bd');pl(x+11,y+2,7,11,'#efddad');pl(x+9,y,2,15,'#ba8b70');pl(x+3,y+4,5,1,'#c5b695');pl(x+12,y+4,5,1,'#c5b695')};
 shadow();
 switch(kind){
 case 'hearth':pl(14,22,52,39,'#776471');pl(17,20,46,5,'#bd9a88');pl(20,30,40,28,'#3b3e49');pl(23,32,34,23,'#212a37');pl(25,49,28,6,'#6a4c3a');pl(29,39,8,14,'#f9bd53');pl(36,32,8,21,'#f5da7e');pl(43,40,7,13,'#f1a750');pl(19,57,42,5,'#b39c89');break;
 case 'kitchen':case 'desk':case 'workbench':case 'minerals':case 'samples':case 'sketch':
   pl(9,42,62,12,edge);pl(9,39,62,7,hl);pl(15,52,7,18,edge);pl(58,52,7,18,edge);pl(16,36,49,4,'#e0b581');
   if(kind==='kitchen'){pl(20,29,14,10,'#a8bcc0');pl(24,27,9,4,'#dce2d3');pl(48,29,6,10,'#dbb88b');pl(44,25,12,4,'#faf1d3');pl(38,35,7,5,'#db8d81')}
   else if(kind==='workbench'){pl(17,27,17,12,'#8ca5a7');pl(20,25,10,4,'#ecdfac');pl(45,27,4,12,'#d7c18a');pl(48,22,13,5,'#91afb4');}
   else if(kind==='minerals'||kind==='samples'){for(let i=0;i<3;i++){pl(20+i*13,25+i%2*4,10,12,['#98bddb','#a3cda3','#ddbd8e'][i]);pl(23+i*13,20+i%2*4,4,7,light)}}
   else if(kind==='sketch'){pl(20,22,31,17,linen);pl(25,25,16,1,'#bba58b');pl(27,29,14,2,'#9ea2b4');pl(44,32,7,2,'#d39e99')}
   else {book(24,22);pl(50,19,4,18,'#ceae79');pl(45,16,14,4,'#fff0bd')}break;
 case 'shelf':pl(18,8,44,56,edge);pl(22,12,36,49,'#433f45');for(let j=0;j<3;j++){for(let i=0;i<7;i++){const hues=['#ad9b76','#9ca3b6','#d8a4a1','#76a891','#d4b88b'];pl(24+i*5,14+j*15,4,12,hues[(i+j)%5]);pl(24+i*5,16+j*15,1,8,'#f6d3a7')}pl(20,27+j*15,40,3,hl)}break;
 case 'bed':pl(13,26,54,40,'#624b58');pl(17,30,46,31,'#dfcbb8');pl(19,45,42,17,'#76adae');pl(22,32,16,12,'#fff4d9');pl(41,32,17,12,'#fff4d9');pl(14,62,9,7,edge);pl(58,62,9,7,edge);break;
 case 'journal':case 'starChart':book(31,35);if(kind==='starChart'){pl(27,17,27,19,'#425879');pl(29,19,22,15,'#344662');for(let i=0;i<6;i++)pl(30+(i*7)%20,21+(i*11)%13,2,2,light)}break;
 case 'mobile':pl(37,9,5,32,gold);pl(12,27,55,3,linen);for(let i=0;i<3;i++){let x=19+i*19;pl(x,29,2,12+i%2*5,'#d8c6a4');pl(x-4,41+i%2*5,10,3,light);pl(x,37+i%2*5,2,11,light)}break;
 case 'easel':pl(39,16,6,54,edge);pl(22,60,9,9,edge);pl(52,60,9,9,edge);pl(19,19,42,38,wood);pl(23,22,34,31,linen);pl(25,25,30,26,'#83b9bb');pixelPoly(g,[[25,49],[36,37],[45,44],[54,34],[55,50]],'#70a376');pl(32,32,5,4,'#fbde8e');pl(36,53,8,4,hl);break;
 case 'paint':pl(13,27,54,5,wood);pl(13,50,54,5,wood);for(let i=0;i<6;i++){pl(17+i*8,34,6,16,['#e89da2','#96bfd4','#dec67b','#88bf9f','#b1a2d1','#d6a68a'][i]);pl(18+i*8,31,5,4,'#fbf2d6')}break;
 case 'frame':pl(14,10,52,55,'#6c503b');pl(19,15,42,45,gold);pl(23,19,34,37,'#547b9b');pl(31,25,10,10,light);pixelPoly(g,[[24,55],[25,42],[35,35],[42,49],[52,39],[56,55]],'#5a9a6b');break;
 case 'seedling':pl(6,44,68,23,edge);pl(10,40,60,16,'#4c6849');for(let i=0;i<6;i++){let x=15+i*9;pl(x,28+i%2*3,2,16,'#48854e');pl(x-5,30+i%2*3,6,4,'#78b36e');pl(x+1,24+i%2*3,7,5,'#87be69')}break;
 case 'watering':pl(24,38,30,22,'#5b8f9e');pl(21,41,5,14,'#acd4ce');pl(52,42,17,4,'#b9d5cb');pl(60,47,10,5,'#b9d5cb');pl(32,30,18,6,light);break;
 case 'runestones':case 'musicStone':case 'ruins':
  for(let i=0;i<3;i++){let x=10+i*20,y=28+i%2*11;pl(x+3,y+7,13,29,'#687982');pl(x+1,y+9,13,19,'#899d98');pl(x+1,y+7,17,3,'#b5c1aa');pl(x+7,y+13,3,10,'#d4d5a4')}break;
 case 'flowerbed':for(let i=0;i<7;i++){const x=8+i*9,y=39+(i%2)*8;pl(x,y+4,2,16,'#447e50');pl(x-3,y,7,7,['#edb4b6','#f1d78c','#d9b5e6'][i%3]);pl(x-1,y+2,3,3,light)}break;
 case 'pond':case 'tidepool':pl(10,43,61,14,'#457991');pl(16,37,49,17,'#58a9c2');pl(23,37,40,4,'#c8e9d4');pl(18,49,18,3,'#b8ddcc');pl(48,45,10,2,'#dbf2d9');break;
 case 'telescope':pl(39,36,6,28,'#c1ad92');pl(17,60,46,6,edge);pl(23,57,7,12,edge);pl(50,57,7,12,edge);pixelPoly(g,[[15,27],[56,13],[66,25],[27,40]],'#8ebcc5');pl(20,27,39,7,'#d0ece1');pl(15,24,7,18,'#dfba88');break;
 case 'clock':pl(18,9,44,56,'#705644');pl(22,14,36,42,'#d4c6a3');pl(26,18,28,33,'#455c79');pl(38,25,4,20,light);pl(32,34,18,3,gold);pl(35,56,11,6,edge);break;
 case 'crystal':case 'echo':
  pl(13,58,55,9,'#4d5f6d');pixelPoly(g,[[15,59],[23,29],[36,8],[48,34],[55,58]],'#83c7db');pixelPoly(g,[[36,8],[48,34],[55,58],[37,58]],'#b9edf0');pixelPoly(g,[[23,29],[36,8],[37,58],[15,59]],'#608bbd');pl(34,22,3,19,light);break;
 case 'board':pl(13,12,54,49,edge);pl(18,17,44,39,'#e8d3a6');for(let i=0;i<4;i++){let x=22+(i%2)*20,y=21+Math.floor(i/2)*16;pl(x,y,16,12,['#e9beb8','#a5c8c4','#ecd38b','#b3b4d8'][i]);pl(x+3,y+4,10,1,'#baaa8a')}break;
 case 'ancientTree':pl(32,25,18,44,wood);pl(25,38,8,24,wood);pl(46,38,8,24,wood);for(const [x,y,w,h,c] of [[15,21,49,26,'#327c4c'],[20,10,44,29,'#398b54'],[6,23,35,24,'#418b54'],[37,18,32,30,'#4b9a57'],[19,11,31,13,'#66b96c']])pl(x,y,w,h,c);for(let i=0;i<10;i++)pl(17+i*4,17+i%3*6,3,3,i%2?'#7ccc76':'#a2d585');break;
 case 'birds':pl(22,53,37,7,wood);pl(26,40,6,16,wood);pl(32,37,18,10,'#ecc69b');pl(44,40,7,5,'#db8b6e');pl(40,39,2,2,B);pl(25,35,8,7,'#c3d79d');break;
 case 'shells':for(let i=0;i<5;i++){let x=10+i*12,y=38+(i%2)*6;pl(x,y,10,9,['#f4dcba','#e5b6ac','#c8d6d4','#e9c98b','#d5a5b9'][i]);pl(x+3,y+2,3,5,'#fff1db')}break;
 case 'bench':pl(13,38,53,11,'#b18a64');pl(17,29,46,9,'#9e7657');pl(17,49,8,15,edge);pl(53,49,8,15,edge);pl(23,33,31,2,'#d9b88c');break;
 case 'butterfly':for(let i=0;i<4;i++){let x=16+i*14,y=29+i%2*13;pl(x-6,y,7,8,'#f1b4d3');pl(x+1,y,7,8,'#d0b6ee');pl(x,y-1,2,11,edge);pl(x,y+11,1,4,'#72b867')}break;
 case 'machine':pl(12,51,56,14,edge);for(let j=0;j<2;j++){let x=22+j*27;pl(x,25,20,24,'#b6a078');pl(x+4,29,12,16,'#716e71');pl(x+6,33,8,8,gold);pl(x+8,35,4,4,B)}pl(37,16,6,15,'#b5c1b8');break;
 default:pl(18,28,46,32,edge);pl(21,32,40,22,hl);break;
 }
 return c;
}
for(const p0 of M.props){if(!artCache[p0.kind])artCache[p0.kind]=makeSprite(p0.kind)}
const treeImgs=[];
for(let variation=0;variation<4;variation++){
 const c=document.createElement('canvas');c.width=68;c.height=76;const g=c.getContext('2d');
 const greens=[['#147e50','#209e58','#3bc66b','#9bec84'],['#298a47','#39a950','#56ca61','#b6ef79'],['#147d6a','#2b9c73','#50c98e','#a5f2a4'],['#3e8951','#55ae58','#7bcf6b','#d1ed83']][variation];
 p(g,27,37,15,34,'#664b3b');p(g,29,32,9,36,'#9b7650');p(g,21,50,8,19,'#71553b');
 for(const [x,y,w,h,n] of [[9,25,43,28,0],[22,11,35,30,1],[5,35,39,20,1],[34,28,28,26,0],[17,6,31,26,2],[26,5,19,9,3],[11,27,16,8,3],[41,20,10,6,3]])p(g,x,y,w,h,greens[n]);
 for(let k=0;k<16;k++){let x=Math.floor(M.hash(k,variation,3)*50)+8,y=Math.floor(M.hash(k,variation,7)*36)+10;p(g,x,y,3,2,greens[(k+2)%4])}
 treeImgs.push(c);
}
function drawSign(g,x,y,text){g.save();g.font='bold 11px ui-monospace, monospace';const width=Math.min(224,g.measureText(text).width+25);p(g,x-width/2,y-32,width,22,'#2b3d3d');p(g,x-width/2+2,y-30,width-4,18,'#f0d8a0');g.textAlign='center';g.textBaseline='middle';g.fillStyle='#463b39';g.fillText(text,x,y-21);g.restore()}
function drawTavi(g,x,y,state,now){
 const taviImg=window.TaviSprite?.image;
 const dx=(state.world?.lastDx||0),dy=(state.world?.lastDy||1);
 const moving=!!(state.world?.moving),working=state.brain?.mode==='working',activity=state.brain?.target?.activity;
 let dir=0;if(Math.abs(dx)>Math.abs(dy))dir=dx<0?1:2;else if(dy<-.2)dir=3;
 const frame=moving?1+Math.floor(now/125)%3:working?Math.floor(now/510)%4:Math.floor(now/1800)%4===0?1:0;
 const bob=moving?Math.sin(now/120)*2:Math.sin(now/700)*1;
 g.save();g.imageSmoothingEnabled=false;
 p(g,x-18,y+3,35,6,'#233b3370');p(g,x-12,y+9,23,2,'#19332844');
 if(taviImg&&taviImg.complete&&taviImg.naturalWidth){
  const cellW=taviImg.naturalWidth/4,cellH=taviImg.naturalHeight/4;
  g.drawImage(taviImg,frame*cellW,dir*cellH,cellW,cellH,x-39,y-67+bob,78,78);
 }else{
  p(g,x-20,y-49,40,36,'#f1af70');p(g,x-13,y-18,26,23,'#60cdd3');p(g,x-12,y-43,5,5,'#2e3942');p(g,x+7,y-43,5,5,'#2e3942');
 }
 // Small intent marker, no intrusive overlay graphics.
 if(working){const hue=activity==='sleeping'?'#c9d9f5':activity==='drawing'?'#f7c6d0':'#f1df9d';p(g,x-3,y-80+Math.sin(now/360)*4,7,7,hue)}
 g.restore();
}
function draw(view,state,cam,ui,now){const g=view.getContext('2d');if(!g)return;
 const w=view.width,h=view.height;g.imageSmoothingEnabled=false;
 g.clearRect(0,0,w,h);p(g,0,0,w,h,'#273f45');
 const x0=Math.floor(cam.x/TILE)-1,y0=Math.floor(cam.y/TILE)-1,x1=Math.ceil((cam.x+w)/TILE)+1,y1=Math.ceil((cam.y+h)/TILE)+1;
 for(let ty=Math.max(0,y0);ty<Math.min(M.H,y1);ty++)for(let tx=Math.max(0,x0);tx<Math.min(M.W,x1);tx++){
  const type=M.get(tx,ty),v=Math.floor(M.hash(tx,ty,11)*8),sx=Math.round(tx*TILE-cam.x),sy=Math.round(ty*TILE-cam.y);
  g.drawImage(tiles[type][v],sx,sy,TILE+1,TILE+1);
 }
 // Shallow animated edges and individual glints layer atop the tile mosaic.
 for(let ty=Math.max(0,y0);ty<Math.min(M.H,y1);ty++)for(let tx=Math.max(0,x0);tx<Math.min(M.W,x1);tx++){
  if(M.get(tx,ty)!==T.WATER&&M.get(tx,ty)!==T.SHALLOW)continue;
  const sx=Math.round(tx*TILE-cam.x),sy=Math.round(ty*TILE-cam.y),r=M.hash(tx,ty,35);
  if(r>.6){const ox=Math.floor((now/500+tx*7)%30);p(g,sx+ox,sy+18,11,2,'#c9f0e0a0')}
 }
 // Top-down architectural details (walls already belong to the navigable ground).
 for(const b of M.structures){
  if((b.x+b.w)*TILE<cam.x-60||b.x*TILE>cam.x+w+60||(b.y+b.h)*TILE<cam.y-60||b.y*TILE>cam.y+h+60)continue;
  const sx=Math.round(b.x*TILE-cam.x),sy=Math.round(b.y*TILE-cam.y),bw=b.w*TILE;
  p(g,sx,sy,bw,7,'#c7a078');p(g,sx+8,sy+7,bw-16,6,'#ead19d');
  for(let i=4;i<b.w-2;i+=5){const xx=sx+i*TILE; p(g,xx,sy+19,39,31,'#493c4d');p(g,xx+5,sy+22,29,24,b.id==='greenhouse'?'#bbdcd0':'#f2d598');p(g,xx+18,sy+22,3,24,'#90644e');p(g,xx+5,sy+33,29,3,'#90644e');}
  p(g,sx+8,Math.round((b.y+b.h-1)*TILE-cam.y)+13,bw-16,5,'#765b52');
  const doorX=Math.round(b.doorX*TILE-cam.x),doorY=Math.round(b.doorY*TILE-cam.y);
  p(g,doorX-18,doorY+5,76,5,'#eacb87');
  if(b.id==='house'&&state.decorations?.includes('mural')){const mx=sx+Math.round(bw*.29),my=sy+Math.round(b.h*TILE*.16);p(g,mx-21,my-11,43,29,'#704e4c');p(g,mx-18,my-9,37,25,'#e0b88b');p(g,mx-14,my-6,29,18,'#658a87');p(g,mx-9,my+1,7,5,'#f5d491');p(g,mx+5,my-5,4,4,'#f3d898');p(g,mx+9,my+5,6,6,'#e2b3bf');}
  if(ui.showSigns||Math.hypot(state.world.x-b.doorX,state.world.y-b.doorY)<10)drawSign(g,sx+bw/2,sy+70,M.regions.find(r=>r.id===b.id)?.name||b.id);
 }
 const entries=[];
 for(const decoration of M.decor){const sx=decoration.x*TILE-cam.x,sy=decoration.y*TILE-cam.y;
  if(sx<-60||sy<-60||sx>w+60||sy>h+60)continue;
  entries.push({y:decoration.y-.1,kind:'decor',v:decoration,sx,sy})
 }
 for(const tree of M.trees){const sx=tree.x*TILE-cam.x,sy=tree.y*TILE-cam.y;
  if(sx<-135||sy<-170||sx>w+135||sy>h+135)continue;
  entries.push({y:tree.y+.5,kind:'tree',v:tree,sx,sy})
 }
 for(const prop of M.props){const sx=prop.x*TILE-cam.x,sy=prop.y*TILE-cam.y;
  if(sx<-150||sy<-150||sx>w+150||sy>h+150)continue;
  entries.push({y:prop.y+.3,kind:'prop',v:prop,sx,sy})
 }
 const tx=state.world.x*TILE-cam.x,ty=state.world.y*TILE-cam.y;
 entries.push({y:state.world.y,kind:'tavi',sx:tx,sy:ty});
 entries.sort((a,b)=>a.y-b.y);
 for(const e of entries){const x=Math.round(e.sx),y=Math.round(e.sy);
  if(e.kind==='decor'){
   const d=e.v;
   if(d.type==='flowers'){p(g,x+5,y+8,7,4,'#fa9ac8');p(g,x+8,y+6,3,7,'#ffe6a2');p(g,x+11,y+12,4,3,'#b9d594');}
   else if(d.type==='shell'){p(g,x+14,y+16,10,5,'#e9d6b5');p(g,x+17,y+12,5,6,'#fff3da');}
   else {p(g,x+8,y+8,3,9,'#2b734c');p(g,x+12,y+6,3,12,'#44b667');p(g,x+14,y+10,3,6,'#a4e884');}
  }else if(e.kind==='tree'){
    const t=e.v,dim=Math.round(125*t.size),img=treeImgs[t.variant%treeImgs.length];g.drawImage(img,x-dim/2,y-dim+16,dim,dim);
  }else if(e.kind==='prop'){
    const pr=e.v,active=state.brain?.mode==='working'&&state.brain.target?.id===pr.id;
    const dim=pr.kind==='ancientTree'?128:pr.kind==='flowerbed'?82:94;
    const im=artCache[pr.kind];g.drawImage(im,x-dim/2,y-dim*.82,dim,dim);
    if(active){const wobble=Math.floor(now/320)%2;const spark='#fae5a3';p(g,x-12,y-65+(wobble?3:0),4,7,spark);p(g,x+10,y-70+(wobble?0:3),5,5,'#eaf4d3')}
    if(ui.hovered?.id===pr.id||ui.selected?.id===pr.id){
      g.strokeStyle='#f7e4a4';g.lineWidth=2;g.strokeRect(x-22,y-19,44,24);
      drawSign(g,x,y-50,pr.name);
    }
  }else drawTavi(g,x,y,state,now);
 }
 // Cinematic yet subtle lantern lighting and animated wildlife specks.
 for(let i=0;i<20;i++){
  const wx=(i*161+47)%M.W,wy=(i*47+63)%M.H;
  const sx=wx*TILE-cam.x+Math.sin(now/1250+i*17)*19,sy=wy*TILE-cam.y+Math.cos(now/1100+i)*14;
  if(sx<0||sy<0||sx>w||sy>h)continue;
  const evening=new Date().getHours()>=19||new Date().getHours()<6;
  p(g,sx,sy,evening?4:2,evening?4:2,evening?'#f7e9ae':'#f4dfbb9d');
 }
 // Semi-transparent evening tint, not opaque enough to hide tile detail.
 const hour=new Date().getHours();if(hour>=20||hour<5){p(g,0,0,w,h,'#132b4a34')}
 if(ui.showGrid){g.strokeStyle='#f5fff227';g.lineWidth=1;for(let tx=x0;tx<=x1;tx++){let sx=Math.round(tx*TILE-cam.x);g.beginPath();g.moveTo(sx,0);g.lineTo(sx,h);g.stroke()}for(let ty=y0;ty<=y1;ty++){let sy=Math.round(ty*TILE-cam.y);g.beginPath();g.moveTo(0,sy);g.lineTo(w,sy);g.stroke()}}
}
const miniBg=document.createElement('canvas');miniBg.width=M.W;miniBg.height=M.H;
const mg=miniBg.getContext('2d');for(let y=0;y<M.H;y++)for(let x=0;x<M.W;x++){mg.fillStyle=color(M.get(x,y));mg.fillRect(x,y,1,1)}
function minimap(view,state,opts={}){const g=view.getContext('2d');if(!g)return;const w=view.width,h=view.height;g.imageSmoothingEnabled=false;g.clearRect(0,0,w,h);g.drawImage(miniBg,0,0,w,h);
 const sx=w/M.W,sy=h/M.H;
 for(let i=0;i<M.regions.length;i++){const r=M.regions[i],x=Math.round(r.x*sx),y=Math.round(r.y*sy);
 p(g,x-3,y-3,7,7,'#253e40');p(g,x-2,y-2,5,5,r.color);
 }
 const wx=Math.round(state.world.x*sx),wy=Math.round(state.world.y*sy);
 p(g,wx-4,wy-4,9,9,'#24374a');p(g,wx-2,wy-2,5,5,'#fff1aa');
 if(opts.showCamera){g.strokeStyle='#fff8d2';g.lineWidth=2;g.strokeRect(opts.camera.x/TILE*sx,opts.camera.y/TILE*sy,opts.screen.w/TILE*sx,opts.screen.h/TILE*sy)}
}
window.TaviVisuals={TILE,draw,minimap,makeTile};
})();