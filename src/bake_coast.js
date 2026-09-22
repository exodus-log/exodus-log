// Bakes a medium-resolution coastline for the mini-map from land50.js (Natural Earth 1:50m).
// Output: assets/v2/coast.js  ->  var COAST=[[lon0,lat0,dlon,dlat,...],...] in hundredths of a degree, with a bbox index.
const fs=require('fs');
const path=require('path'), up=path.join(__dirname,'..');
const src=fs.readFileSync((process.env.GGR_SITE||(fs.existsSync(path.join(up,'assets','deck.js'))?up:'/mnt/user-data/uploads/GGR Project'))+'/assets/geo/land50.js','utf8');
const LAND50=(new Function(src+';return LAND50;'))();
const TOL=+process.argv[2]||0.03, MINBOX=+process.argv[3]||0.10;
function decode(r){const o=[];let x=r[0],y=r[1];o.push([x,y]);for(let i=2;i<r.length;i+=2){x+=r[i];y+=r[i+1];o.push([x,y]);}return o;}
function dp(pts,tol){ // Douglas-Peucker, iterative
  const n=pts.length; if(n<4) return pts; const keep=new Uint8Array(n); keep[0]=keep[n-1]=1; const st=[[0,n-1]];
  while(st.length){const [a,b]=st.pop(); let md=0,mi=-1; const ax=pts[a][0],ay=pts[a][1],bx=pts[b][0],by=pts[b][1],dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;
    for(let i=a+1;i<b;i++){let t=L?((pts[i][0]-ax)*dx+(pts[i][1]-ay)*dy)/L:0;t=Math.max(0,Math.min(1,t));const px=ax+dx*t,py=ay+dy*t,d=Math.hypot(pts[i][0]-px,pts[i][1]-py);if(d>md){md=d;mi=i;}}
    if(md>tol){keep[mi]=1;st.push([a,mi],[mi,b]);}}
  return pts.filter((p,i)=>keep[i]);}
let rings=0,vin=0,vout=0; const out=[];
for(const poly of LAND50){ const ring=poly[0]; if(!ring) continue; // outer ring only
  const pts=decode(ring); vin+=pts.length; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(const p of pts){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
  if(Math.max(x1-x0,y1-y0)<MINBOX*100) continue;
  let s=dp(pts,TOL*100); if(s.length<4) { if(Math.max(x1-x0,y1-y0)<MINBOX*200) continue; s=pts.length<=6?pts:dp(pts,TOL*40); if(s.length<4) continue; }
  const enc=[s[0][0],s[0][1]]; for(let i=1;i<s.length;i++) enc.push(s[i][0]-s[i-1][0],s[i][1]-s[i-1][1]);
  out.push(enc); rings++; vout+=s.length; }
const js='/* coast.js — קו חוף ברזולוציה בינונית למפת המיקומים הקטנה. נאפה פעם אחת מ-land50.js (Natural Earth 1:50m, נחלת הכלל).\n   כל טבעת: [lon0,lat0,dlon,dlat,...] במאיות מעלה. */\nvar COAST='+JSON.stringify(out)+';\n';
fs.writeFileSync('coast.js',js);
console.log(JSON.stringify({polys:LAND50.length,rings,vin,vout,bytes:js.length}));
