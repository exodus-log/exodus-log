/* ===== v2/journey.js — מרנדר את "המסע" מתוך data.js =====
   נבנה אוטומטית מ-assets/front.js של הדף הקודם: אותם מקטעים (המרוץ, קנה המידה, התחזית, היום של דניאל),
   בלי המסך הראשון הישן, שאת מקומו תפס החלון. נטען רק כשפותחים את המסע. לא עורכים את הקובץ הזה ביד.
   ===== front.js — מרנדר את הדף מתוך data.js =====
   אין בדף מספר שכתוב ביד: הכול מגיע מ-FIX, FLEET, COND, TRACKP ו-STORY, ולכן רענון = החלפת data.js בלבד.
   הגלובוס (MapLibre, ‎~1MB) והסקסטנט נטענים רק כשמתקרבים אליהם בגלילה; המסך הראשון לא משלם עליהם כלום. */
(function(){
'use strict';
if (typeof FIX==='undefined') return;
var EXO=(window.EXO&&window.EXO.ready)?window.EXO:null;
var $=function(id){ return document.getElementById(id); };
var thou=function(v){ return Math.round(v).toLocaleString('en-US'); };
var pad=function(v){ return (v<10?'0':'')+v; };
var esc=function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); };
var NUM=function(v){ return '<span class="num">'+v+'</span>'; };
var DIR_TO=['צפון','צפון־מזרח','מזרח','דרום־מזרח','דרום','דרום־מערב','מערב','צפון־מערב'];
function toName(d){ return DIR_TO[Math.round((((d%360)+360)%360)/45)%8]; }
function heb(v,one,two,many){ v=Math.round(v); return v<=1?one:v===2?two:v+' '+many; }
function nowMs(){ return (EXO&&EXO.state)?EXO.state.now:Date.now(); }
function localDate(ms){ return new Date(ms+FIX.lon/15*3600000); }      /* שעת השמש המקומית אצל הסירה */
var ME=(function(){ for(var i=0;i<FLEET.length;i++) if(FLEET[i][1]===4) return FLEET[i]; return FLEET[0]; })();

/* ================= המסך הראשון ================= */
function renderTop(){}
function renderSky(s){
  if($('pvSail')) $('pvSail').textContent=s.sail;
  if($('pvTwa')) $('pvTwa').textContent=Math.round(s.twa);
}

/* ================= כמה זה, בעצם ================= */
function cardWave(c){
  var H=c.waveH, T=Math.round(c.waveT), W=240, Ht=150, base=126, man=1.75;
  var top=Math.max(2.6,H*1.25,man*1.2), s=(base-14)/top;                 /* פיקסלים למטר */
  var word=H<0.5?'עד הברך':H<0.95?'עד המותן':H<1.25?'עד החזה':H<1.6?'עד הכתפיים':H<2.0?'בגובה של אדם':H<3.2?'בגובה קומה של בית':H<6.2?'בגובה בית של שתי קומות':'בגובה בניין של '+Math.round(H/3)+' קומות';
  var x,d='M0 '+base, amp=H*s/2;
  for(x=0;x<=W;x+=4){ d+=' L'+x+' '+(base-amp-amp*Math.cos((x-150)/70*Math.PI)).toFixed(1); }
  d+=' L'+W+' '+(Ht)+' L0 '+Ht+' Z';
  var mh=man*s, mx=52, my=base;                                            /* דמות אדם, 1.75 מ׳, באותו קנה מידה */
  var person='<g fill="#eef4f7"><circle cx="'+mx+'" cy="'+(my-mh+mh*0.075)+'" r="'+(mh*0.075)+'"/>'
    +'<path d="M'+(mx-mh*0.11)+' '+(my-mh*0.82)+' h'+(mh*0.22)+' l'+(mh*0.03)+' '+(mh*0.36)+' h-'+(mh*0.07)+' l-'+(mh*0.02)+' '+(mh*0.46)+' h-'+(mh*0.1)+' l-'+(mh*0.02)+' -'+(mh*0.46)+' h-'+(mh*0.07)+' Z"/></g>';
  var crestX=150, crestY=base-H*s;
  return card('גובה הגל עכשיו', H.toFixed(1), 'מטר',
    '<svg viewBox="0 0 '+W+' '+Ht+'" role="img" aria-label="גל של '+H.toFixed(1)+' מטר ליד אדם בגובה 1.75 מטר, באותו קנה מידה">'
    +'<path d="'+d+'" fill="rgba(90,170,215,.28)" stroke="#cfe6ff" stroke-width="2"/>'
    +person
    +'<g stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-dasharray="3 3"><path d="M'+(crestX+34)+' '+crestY.toFixed(1)+' H'+(W-18)+'"/><path d="M'+(crestX+60)+' '+base+' H'+(W-18)+'"/></g>'
    +'<path d="M'+(W-26)+' '+crestY.toFixed(1)+' V'+base+'" stroke="#cfe6ff" stroke-width="1.6"/>'
    +'<path d="M'+(W-30)+' '+(crestY+5).toFixed(1)+' l4 -5 l4 5 M'+(W-30)+' '+(base-5)+' l4 5 l4 -5" stroke="#cfe6ff" stroke-width="1.6" fill="none"/>'
    +'</svg>', word, 'פסגה כל '+T+' שניות · האיש בציור: 1.75 מ׳');
}
function cardSpeed(){
  var kmh=FIX.sog*1.852, W=240, Ht=150, max=24, y=92, x0=14, x1=W-14;
  var X=function(v){ return x0+(x1-x0)*Math.min(v,max)/max; };
  var word=kmh<3.5?'לאט מהליכה':kmh<7?'קצב של הליכה מהירה':kmh<12?'קצב של ריצה קלה':kmh<17?'קצב של ריצה מהירה':'קצב של רכיבה על אופניים';
  var refs=[[5,'הליכה'],[10,'ריצה'],[20,'אופניים']], g='';
  refs.forEach(function(r){ g+='<path d="M'+X(r[0])+' '+(y-7)+' v14" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/>'
    +'<text x="'+X(r[0])+'" y="'+(y+26)+'" text-anchor="middle" font-size="14" fill="#b4c6d1" font-family="Heebo,sans-serif">'+r[1]+'</text>'
    +'<text x="'+X(r[0])+'" y="'+(y+43)+'" text-anchor="middle" font-size="12" fill="#7f95a3" font-family="Heebo,sans-serif">'+r[0]+'</text>'; });
  var bx=X(kmh);
  return card('מהירות', FIX.sog.toFixed(1), 'קשר',
    '<svg viewBox="0 0 '+W+' '+Ht+'" role="img" aria-label="'+kmh.toFixed(1)+' קילומטר לשעה על סולם של הליכה, ריצה ואופניים">'
    +'<path d="M'+x0+' '+y+' H'+x1+'" stroke="rgba(255,255,255,.22)" stroke-width="4" stroke-linecap="round"/>'
    +'<path d="M'+x0+' '+y+' H'+bx.toFixed(1)+'" stroke="#43d6cf" stroke-width="4" stroke-linecap="round"/>'+g
    /* סירה קטנה מעל הסולם */
    +'<g transform="translate('+bx.toFixed(1)+' '+(y-12)+')"><path d="M-15 0 h30 l-5 8 h-20 Z" fill="#fff"/><path d="M0 -2 V-38 L14 -4 Z" fill="#fff"/><path d="M-2 -2 V-30 L-13 -4 Z" fill="#cfe6ff"/></g>'
    +'<circle cx="'+bx.toFixed(1)+'" cy="'+y+'" r="6" fill="#43d6cf" stroke="#0a1b28" stroke-width="2"/>'
    +'</svg>', word, '‎'+kmh.toFixed(1)+' קמ״ש · ערכי ההשוואה מקורבים');
}
function cardDays(){
  var total=250, cols=25, rows=10, W=240, Ht=150, gx=(W-16)/cols, gy=(Ht-40)/rows, s='',i;
  for(i=0;i<total;i++){ var cx=W-8-gx/2-(i%cols)*gx, cy=10+gy/2+Math.floor(i/cols)*gy;   /* מימין לשמאל, כמו שקוראים */
    var done=i<FIX.dayN-1, today=i===FIX.dayN-1;
    s+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(today?4.2:2.7)+'" fill="'+(today?'#43d6cf':done?'#eef4f7':'rgba(255,255,255,.16)')+'"/>'; }
  return card('ימים בים', FIX.dayN, 'יום',
    '<svg viewBox="0 0 '+W+' '+(Ht-30)+'" role="img" aria-label="יום '+FIX.dayN+' מתוך כ-250">'+s+'</svg>',
    'מתוך כ־250', 'כל נקודה היא יום בים');
}
function cardDistance(){
  var km=FIX.dtf*1.852, EQ=40075, turns=FIX.totalNm*1.852/EQ, doneT=(FIX.totalNm-FIX.dtf)*1.852/EQ;
  var W=240, Ht=150, cx=120, cy=76, s='', i, N=260;
  function pt(t){ var r=50+t*15, a=t*2*Math.PI; return [cx+r*Math.sin(a), cy-r*Math.cos(a)]; }
  function path(t0,t1){ var d='',k; for(k=0;k<=N;k++){ var t=t0+(t1-t0)*k/N, p=pt(t); d+=(k?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1); } return d; }
  var word=km>EQ?'יותר מהיקף כדור הארץ כולו':'פחות מהיקף כדור הארץ';
  var here=pt(doneT);
  return card('עד קו הסיום', thou(km), 'ק״מ',
    '<svg viewBox="0 0 '+W+' '+Ht+'" role="img" aria-label="המסלול כולו ארוך פי '+turns.toFixed(2)+' מהיקף כדור הארץ">'
    +'<circle cx="'+cx+'" cy="'+cy+'" r="41" fill="rgba(60,130,180,.24)" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/>'
    +'<path d="M'+(cx-41)+' '+cy+' h82 M'+cx+' '+(cy-41)+' v82" stroke="rgba(255,255,255,.13)"/><ellipse cx="'+cx+'" cy="'+cy+'" rx="19" ry="41" fill="none" stroke="rgba(255,255,255,.13)"/><ellipse cx="'+cx+'" cy="'+cy+'" rx="41" ry="17" fill="none" stroke="rgba(255,255,255,.13)"/>'
    +'<path d="'+path(0,turns)+'" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-dasharray="4 4"/>'
    +'<path d="'+path(0,Math.max(doneT,0.004))+'" fill="none" stroke="#43d6cf" stroke-width="3.4" stroke-linecap="round"/>'
    +'<circle cx="'+here[0].toFixed(1)+'" cy="'+here[1].toFixed(1)+'" r="4.6" fill="#43d6cf" stroke="#0a1b28" stroke-width="1.6"/>'
    +'</svg>', word, 'המסלול כולו: '+thou(FIX.totalNm*1.852)+' ק״מ, פי '+turns.toFixed(2)+' מקו המשווה');
}
function card(k,big,unit,svg,line,sub){
  return '<article class="card"><span class="k">'+k+'</span><span class="big">'+big+'<small>'+unit+'</small></span>'+svg+'<p>'+line+'<span>'+sub+'</span></p></article>'; }
function renderCards(s){ $('cards').innerHTML=cardWave(s.cond)+cardSpeed()+cardDays()+cardDistance(); }

/* ================= המרוץ כרגע: הצי לפי מרחק לסיום ================= */
function renderRace(){
  var svg=$('raceSvg'), box=svg.parentNode, W=Math.max(320,Math.round(box.clientWidth-(box.clientWidth>700?44:24))), narrow=W<620;
  var padL=narrow?18:34, padR=narrow?18:34, lead=FLEET[0][5], i;
  var maxGap=0; for(i=0;i<FLEET.length;i++) maxGap=Math.max(maxGap,FLEET[i][5]-lead);
  maxGap=Math.ceil((maxGap+20)/100)*100;
  var X=function(g){ return padL+(W-padL-padR)*g/maxGap; };          /* המוביל בשמאל: הכיוון שאליו מתקדמים בדף RTL */
  var R=narrow?8:11, rowH=R*2+6, placed=[], rows=0;
  var items=FLEET.map(function(f){ return {f:f,g:f[5]-lead,x:X(f[5]-lead),me:f[1]===4}; });
  items.forEach(function(it){ var r=0;
    for(;;r++){ var clash=false; for(var k=0;k<placed.length;k++) if(placed[k].r===r&&Math.abs(placed[k].x-it.x)<R*2+4){ clash=true; break; } if(!clash) break; }
    it.r=r; placed.push({x:it.x,r:r}); rows=Math.max(rows,r+1); });
  var top=46, axisY=top+rows*rowH+10, H=axisY+46, s='', fs=narrow?11:13;
  var step=maxGap>500?200:100;
  for(var g=0;g<=maxGap;g+=step){ s+='<path d="M'+X(g).toFixed(1)+' '+(top-8)+' V'+axisY+'" stroke="rgba(255,255,255,.08)"/>'
    +'<text x="'+X(g).toFixed(1)+'" y="'+(axisY+17)+'" text-anchor="middle" font-size="'+(fs-1)+'" fill="#7f95a3" font-family="Heebo,sans-serif">'+(g===0?'0':'+'+g)+'</text>'; }
  s+='<path d="M'+padL+' '+axisY+' H'+(W-padR)+'" stroke="rgba(255,255,255,.2)"/>';
  s+='<path d="M'+(padL+54)+' 16 H'+(padL+6)+' m7 -5 l-7 5 l7 5" fill="none" stroke="#7f95a3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<text x="'+(padL+62)+'" y="20" font-size="'+fs+'" fill="#7f95a3" font-family="Heebo,sans-serif">אל קו הסיום</text>';
  s+='<text x="'+(W-padR)+'" y="'+(axisY+38)+'" text-anchor="end" font-size="'+fs+'" fill="#7f95a3" font-family="Heebo,sans-serif">'+(narrow?'מיילים מאחורי המוביל':'מיילים מאחורי המוביל · הזנב שמאחורי כל סירה: הדרך שעשתה ב־24 השעות האחרונות')+'</text>';
  items.forEach(function(it){ var y=top+it.r*rowH+R, tail=(W-padL-padR)*Math.max(0,it.f[6])/maxGap;
    var col=it.me?'#43d6cf':(it.f[0]===1?'#8fd0ff':'rgba(238,244,247,.78)');
    s+='<path d="M'+it.x.toFixed(1)+' '+y+' h'+Math.min(tail,W-padR-it.x).toFixed(1)+'" stroke="'+col+'" stroke-opacity="'+(it.me?.75:.26)+'" stroke-width="'+(it.me?4:2.5)+'" stroke-linecap="round"/>'; });
  items.forEach(function(it,idx){ var y=top+it.r*rowH+R;
    var col=it.me?'#43d6cf':(it.f[0]===1?'#8fd0ff':'rgba(238,244,247,.88)');
    s+='<circle class="rb" data-i="'+idx+'" cx="'+it.x.toFixed(1)+'" cy="'+y+'" r="'+(it.me?R+2:R)+'" fill="'+col+'" stroke="#0a1b28" stroke-width="2.5" tabindex="0" style="cursor:pointer"/>'
      +'<text x="'+it.x.toFixed(1)+'" y="'+(y+(narrow?3.4:4.2))+'" text-anchor="middle" font-size="'+(narrow?9.5:12)+'" font-weight="600" fill="#0a1b28" font-family="Heebo,sans-serif" pointer-events="none">'+it.f[0]+'</text>';
    if(it.me||it.f[0]===1) s+='<text x="'+it.x.toFixed(1)+'" y="'+(top-14)+'" text-anchor="'+(it.x<60?'start':'middle')+'" font-size="'+(fs+1)+'" font-weight="600" fill="'+(it.me?'#8fe3de':'#b9e0ff')+'" font-family="Heebo,sans-serif">'+(it.me?'אקסודוס':esc(it.f[4]))+'</text>'
      +'<path d="M'+it.x.toFixed(1)+' '+(top-9)+' V'+(y-R-3)+'" stroke="'+(it.me?'#8fe3de':'#b9e0ff')+'" stroke-opacity=".6"/>'; });
  svg.setAttribute('viewBox','0 0 '+W+' '+H); svg.innerHTML=s;
  var near=0; items.forEach(function(it){ if(!it.me&&Math.abs(it.f[5]-ME[5])<=25) near++; });
  $('raceLine').innerHTML='אקסודוס '+NUM(FIX.rank)+' מתוך '+NUM(FLEET.length)+'. '+(near?heb(near,'סירה אחת','שתי סירות','סירות')+' בטווח של 25 מייל ממנה.':'אין סירה בטווח של 25 מייל ממנה.');
  var tip=$('raceTip');
  function show(ev){ var t=ev.target; if(!t.classList||!t.classList.contains('rb')){ tip.hidden=true; return; }
    var it=items[+t.getAttribute('data-i')], bb=box.getBoundingClientRect(), cb=t.getBoundingClientRect();
    tip.innerHTML='<b>'+esc(it.f[4])+(it.me?' · אקסודוס':'')+'</b>מקום '+NUM(it.f[0])+' · '+(it.g<=0?'מוביל':NUM('+'+thou(it.g))+' מייל')+'<br>24 שעות: '+NUM(thou(it.f[6]))+' מייל';
    tip.hidden=false; var x=cb.left+cb.width/2-bb.left; x=Math.max(90,Math.min(bb.width-90,x));
    tip.style.left=x+'px'; tip.style.top=(cb.top-bb.top-8)+'px'; }
  svg.onpointermove=show; svg.onpointerdown=show; svg.onfocusin=show; svg.onpointerleave=function(){ tip.hidden=true; };
}

/* ================= 24 השעות הקרובות ================= */
function renderAhead(){
  var now=nowMs(), T=COND.map(function(r){ return Date.parse(r[0]+'Z'); });
  var t0=Math.max(T[0],now-6*3600000), t1=Math.min(T[T.length-1],now+24*3600000), rows=[];
  for(var i=0;i<COND.length;i++) if(T[i]>=t0-1&&T[i]<=t1+1) rows.push({t:T[i],w:COND[i][1],g:COND[i][2],h:COND[i][4],d:COND[i][3],p:COND[i][5]});
  if(rows.length<3){ $('ahead').style.display='none'; return; }
  var cw=$('chWind').parentNode.clientWidth||520, W=Math.max(300,Math.min(560,Math.round(cw))),H=W<400?170:190,pl=30,pr=12,pt=12,pb=26;
  var X=function(t){ return pl+(W-pl-pr)*(t-t0)/(t1-t0); };
  function chart(id,series,maxMin,unit,colors){
    var mx=maxMin; rows.forEach(function(r){ series.forEach(function(k){ mx=Math.max(mx,r[k]); }); });
    var stepY=mx>24?10:mx>10?5:mx>4?2:1; mx=Math.ceil(mx/stepY)*stepY;
    var Y=function(v){ return pt+(H-pt-pb)*(1-v/mx); }, s='', v;
    for(v=0;v<=mx;v+=stepY) s+='<path d="M'+pl+' '+Y(v).toFixed(1)+' H'+(W-pr)+'" stroke="rgba(255,255,255,.07)"/><text x="'+(pl-6)+'" y="'+(Y(v)+3.5).toFixed(1)+'" text-anchor="end" font-size="10.5" fill="#7f95a3" font-family="Heebo,sans-serif">'+v+'</text>';
    /* ציר הזמן: שעת השמש אצל הסירה, כל שש שעות */
    var lt=localDate(t0), first=new Date(t0+((6-(lt.getUTCHours()%6))%6)*3600000-lt.getUTCMinutes()*60000);
    for(var tt=first.getTime(); tt<=t1; tt+=6*3600000){ if(tt<t0) continue; var ld=localDate(tt);
      s+='<path d="M'+X(tt).toFixed(1)+' '+(H-pb)+' v4" stroke="rgba(255,255,255,.3)"/><text x="'+X(tt).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10.5" fill="#7f95a3" font-family="Heebo,sans-serif">'+pad(ld.getUTCHours())+':00</text>'; }
    /* מה שכבר היה מול מה שהמודל חוזה */
    var xo=X(Math.min(Math.max(OBS_UNTIL,t0),t1));
    s+='<rect x="'+xo.toFixed(1)+'" y="'+pt+'" width="'+(W-pr-xo).toFixed(1)+'" height="'+(H-pt-pb)+'" fill="rgba(255,255,255,.035)"/>';
    series.forEach(function(k,si){ var d=''; rows.forEach(function(r,i){ d+=(i?'L':'M')+X(r.t).toFixed(1)+' '+Y(r[k]).toFixed(1); });
      if(si===0){ s+='<path d="'+d+' L'+X(rows[rows.length-1].t).toFixed(1)+' '+Y(0)+' L'+X(rows[0].t).toFixed(1)+' '+Y(0)+' Z" fill="'+colors[0]+'" fill-opacity=".13"/>'; }
      s+='<path d="'+d+'" fill="none" stroke="'+colors[si]+'" stroke-width="'+(si?1.2:2.2)+'" stroke-linejoin="round" '+(si?'stroke-dasharray="3 3" stroke-opacity=".8"':'')+'/>'; });
    var xn=X(Math.min(Math.max(now,t0),t1));
    s+='<path d="M'+xn.toFixed(1)+' '+pt+' V'+(H-pb)+'" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/><text x="'+(xn+6).toFixed(1)+'" y="'+(pt+11)+'" font-size="12" fill="#eef4f7" font-family="Heebo,sans-serif">עכשיו</text>';
    s+='<g class="xh" visibility="hidden"><path class="xl" d="M0 '+pt+' V'+(H-pb)+'" stroke="#fff" stroke-opacity=".45"/><circle class="xd" r="4.5" fill="'+colors[0]+'" stroke="#0a1b28" stroke-width="2"/></g>';
    var el=$(id); el.setAttribute('viewBox','0 0 '+W+' '+H); el.innerHTML=s; el.__Y=Y; el.__k=series[0]; return el;
  }
  var a=chart('chWind',['w','g'],12,'קשר',['#e7f1f8','#e7f1f8']), b=chart('chWave',['h'],2,'מ׳',['#cfe6ff']);
  var tip=$('aheadTip'), box=tip.parentNode;
  function hover(ev){ var el=ev.currentTarget, r=el.getBoundingClientRect(), t=t0+(t1-t0)*((ev.clientX-r.left)/r.width*W-pl)/(W-pl-pr);
    var best=rows[0]; rows.forEach(function(q){ if(Math.abs(q.t-t)<Math.abs(best.t-t)) best=q; });
    [a,b].forEach(function(c){ var g=c.querySelector('.xh'); g.setAttribute('visibility','visible');
      g.querySelector('.xl').setAttribute('transform','translate('+X(best.t).toFixed(1)+' 0)');
      var dot=g.querySelector('.xd'); dot.setAttribute('cx',X(best.t).toFixed(1)); dot.setAttribute('cy',c.__Y(best[c.__k]).toFixed(1)); });
    var ld=localDate(best.t), bb=box.getBoundingClientRect();
    tip.innerHTML='<b>'+pad(ld.getUTCHours())+':00 אצל דניאל'+(best.t>OBS_UNTIL?' · תחזית':'')+'</b>רוח '+NUM(Math.round(best.w))+' קשר, משבים '+NUM(Math.round(best.g))+'<br>גל '+NUM(best.h.toFixed(1))+' מ׳ כל '+NUM(Math.round(best.p))+' שנ׳';
    tip.hidden=false; var x=ev.clientX-bb.left; x=Math.max(100,Math.min(bb.width-100,x)); tip.style.left=x+'px'; tip.style.top=(r.top-bb.top+6)+'px'; }
  function leave(){ tip.hidden=true; [a,b].forEach(function(c){ c.querySelector('.xh').setAttribute('visibility','hidden'); }); }
  [a,b].forEach(function(c){ c.onpointermove=hover; c.onpointerdown=hover; c.onpointerleave=leave; });
  var fut=rows.filter(function(r){ return r.t>now; }), mxw=0, mxh=0, mnw=1e9;
  fut.forEach(function(r){ mxw=Math.max(mxw,r.w); mnw=Math.min(mnw,r.w); mxh=Math.max(mxh,r.h); });
  if(fut.length) $('aheadLine').innerHTML='רוח בין '+NUM(Math.round(mnw))+' ל־'+NUM(Math.round(mxw))+' קשר, גל עד '+NUM(mxh.toFixed(1))+' מטר. מודל, לא מדידה.';
}

/* היום של דניאל: פס של 24 שעות בצבעי השמיים האמיתיים, מסלול השמש, ואיפה הוא עכשיו */
function renderDay(s){
  if(!EXO||!EXO.astro) return; var A=EXO.astro, now=s.now, ld=localDate(now);
  var day0=now-(ld.getUTCHours()*3600+ld.getUTCMinutes()*60+ld.getUTCSeconds())*1000;
  var bw=$('daybar').clientWidth||1000, W=Math.max(300,Math.min(1100,Math.round(bw-28))),H=112,pl=6,pr=6,bandY=56,bandH=26, x,st='',path='',i,N=96, maxAlt=1, small=W<520;
  var alts=[]; for(i=0;i<=N;i++){ var a=A.sunPos(day0+i/N*86400000,FIX.lat,FIX.lon).alt*180/Math.PI; alts.push(a); maxAlt=Math.max(maxAlt,a); }
  function sky(a){ return a>6?'#5aa7e0':a>0?'#e9a05a':a>-6?'#a8566a':a>-12?'#2a3560':'#0a1226'; }
  for(i=0;i<N;i++){ st+='<rect x="'+(pl+(W-pl-pr)*i/N).toFixed(1)+'" y="'+bandY+'" width="'+((W-pl-pr)/N+0.6).toFixed(1)+'" height="'+bandH+'" fill="'+sky((alts[i]+alts[i+1])/2)+'"/>'; }
  for(i=0;i<=N;i++){ var y=bandY-2-Math.max(0,alts[i])/maxAlt*(bandY-14); path+=(i?'L':'M')+(pl+(W-pl-pr)*i/N).toFixed(1)+' '+y.toFixed(1); }
  var f=(now-day0)/86400000, xn=pl+(W-pl-pr)*f, an=Math.max(0,s.sun.alt), yn=bandY-2-an/maxAlt*(bandY-14), lab='';
  (small?[[0,'00:00'],[0.5,'12:00'],[1,'24:00']]:[[0,'00:00'],[0.25,'06:00'],[0.5,'12:00'],[0.75,'18:00'],[1,'24:00']]).forEach(function(q){
    lab+='<text x="'+(pl+(W-pl-pr)*q[0]).toFixed(1)+'" y="'+(bandY+bandH+17)+'" text-anchor="'+(q[0]===0?'start':q[0]===1?'end':'middle')+'" font-size="12" fill="#7f95a3" font-family="Heebo,sans-serif">'+q[1]+'</text>'; });
  function ev(ts,txt){ if(!ts) return ''; var fx=(ts-day0)/86400000; if(fx<0||fx>1) return ''; var X=pl+(W-pl-pr)*fx;
    return '<path d="M'+X.toFixed(1)+' '+(bandY-4)+' V'+(bandY+bandH+4)+'" stroke="#ffcf7a" stroke-width="2"/><text x="'+X.toFixed(1)+'" y="'+(bandY-14)+'" text-anchor="middle" font-size="13" fill="#ffcf7a" font-family="Heebo,sans-serif">'+(small?txt.replace('זריחה ','↑').replace('שקיעה ','↓'):txt)+'</text>'; }
  $('daybar').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="היום של דניאל: זריחה '+(s.riseHM||'—')+', שקיעה '+(s.setHM||'—')+', עכשיו '+s.localHM+'">'
    +'<clipPath id="dbc"><rect x="'+pl+'" y="'+bandY+'" width="'+(W-pl-pr)+'" height="'+bandH+'" rx="13"/></clipPath><g clip-path="url(#dbc)">'+st+'</g>'
    +'<path d="'+path+'" fill="none" stroke="#ffd76a" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>'
    +ev(s.rise,'זריחה '+(s.riseHM||''))+ev(s.set,'שקיעה '+(s.setHM||''))+lab
    +'<path d="M'+xn.toFixed(1)+' '+(bandY-3)+' V'+(bandY+bandH+3)+'" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    +(s.sun.alt>0?'<circle cx="'+xn.toFixed(1)+'" cy="'+yn.toFixed(1)+'" r="8" fill="#ffd76a" stroke="#0a1b28" stroke-width="2"/>':'')
    +'</svg>';
}

/* ================= טעינה עצלה: גלובוס וסקסטנט ================= */
function loadScript(src){ return new Promise(function(ok,bad){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){ bad(new Error(src)); }; document.head.appendChild(s); }); }
function loadCss(href){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l); }
function lazy(target,fn,margin){ if(!target) return; var done=false;
  function go(){ if(done) return; done=true; fn(); }
  if(!('IntersectionObserver' in window)){ setTimeout(go,1500); return; }
  var io=new IntersectionObserver(function(en){ if(en[0].isIntersecting){ io.disconnect(); go(); } },{rootMargin:margin||'700px 0px'}); io.observe(target); }
var landP=null; function needLand(){ return landP||(landP=(typeof LAND50!=='undefined')?Promise.resolve():loadScript('assets/geo/land50.js')); }
lazy($('sextant'),function(){ needLand().then(function(){ return loadScript('assets/v2/sextant.js'); }).catch(function(){ $('sextant').style.display='none'; }); },'500px 0px');

/* ================= הפעלה ================= */
renderTop(); renderRace();
var lastMin=-1;
if(EXO){
  EXO.on(function(s){ renderSky(s); var m=Math.floor(s.now/600000); if(m!==lastMin){ lastMin=m; renderCards(s); renderAhead(); renderDay(s); } renderTop(); }); }
else { $('cards').parentNode.style.display='none'; renderAhead(); }
var rz; window.addEventListener('resize',function(){ clearTimeout(rz); rz=setTimeout(function(){ renderRace(); if(EXO&&EXO.state){ renderAhead(); renderDay(EXO.state); } },180); });
window.addEventListener('load',function(){ setTimeout(function(){ renderRace(); if(EXO&&EXO.state){ renderAhead(); renderDay(EXO.state); } },60); });   /* front.css נטען בלי לחסום; מודדים רוחב שוב אחריו */
$('voyLine').innerHTML=NUM(thou(FIX.sailed))+' מייל ימי מאחוריו, '+NUM(thou(FIX.toGate))+' עד '+esc(FIX.gate)+'. '+NUM(((FIX.totalNm-FIX.dtf)/FIX.totalNm*100).toFixed(1)+'%')+' מההקפה.';
})();
