/* ===== front.js — מרנדר את פאנל החזית מתוך data.js =====
   כל מספר בדף המהיר מגיע מכאן, ולכן רענון = החלפת data.js בלבד.
   אין כאן שום טקסט שצריך לכתוב מחדש בכל עדכון. */
(function(){
'use strict';
if (typeof FIX === 'undefined') return;

var $ = function(id){ return document.getElementById(id); };
var n = function(v,d){ return Number(v).toFixed(d===undefined?0:d); };
var thou = function(v){ return Math.round(v).toLocaleString('en-US'); };

/* --- תנאים נוכחיים מתוך טבלת COND, באינטרפולציה לשעה הנוכחית --- */
function cond(now){
  if (typeof COND === 'undefined' || !COND.length) return null;
  var t = now/1000, best = COND[0], nx = COND[0], i;
  for (i=0;i<COND.length;i++){
    if (Date.parse(COND[i][0]+'Z')/1000 <= t) { best = COND[i]; nx = COND[Math.min(i+1,COND.length-1)]; }
  }
  var t0 = Date.parse(best[0]+'Z')/1000, t1 = Date.parse(nx[0]+'Z')/1000;
  var f = (t1>t0) ? Math.max(0,Math.min(1,(t-t0)/(t1-t0))) : 0;
  var L = function(a,b){ return a+(b-a)*f; };
  var A = function(a,b){ var d=((b-a+540)%360)-180; return (a+d*f+360)%360; };
  return { wind:L(best[1],nx[1]), gust:L(best[2],nx[2]), windDir:A(best[3],nx[3]),
           waveH:L(best[4],nx[4]), cur:L(best[7],nx[7]) };
}

/* --- רוח מרבית ב-24 השעות הקרובות, מתוך אותה טבלה --- */
function maxWind24(now){
  if (typeof COND === 'undefined') return null;
  var t = now/1000, end = t + 86400, mx = 0, any = false;
  for (var i=0;i<COND.length;i++){
    var ti = Date.parse(COND[i][0]+'Z')/1000;
    if (ti > t && ti <= end){ mx = Math.max(mx, COND[i][1]); any = true; }
  }
  return any ? mx : null;
}

/* --- מרחק וכיוון בין שתי נקודות --- */
function bearing(la1,lo1,la2,lo2){
  var R = Math.PI/180, p1=la1*R, p2=la2*R, dl=(lo2-lo1)*R;
  var y = Math.sin(dl)*Math.cos(p2);
  var x = Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return (Math.atan2(y,x)/R+360)%360;
}

function render(){
  var now = Date.now();
  var c = cond(now);

  /* ---------- שורת המצב: מקום, פער, טריות נקודת הציון ---------- */
  var gap = null;
  if (typeof FLEET !== 'undefined' && FLEET.length) gap = Math.round(FIX.dtf - FLEET[0][5]);

  if ($('fxRank')) $('fxRank').textContent = FIX.rank + ' מתוך ' + (typeof FLEET!=='undefined'?FLEET.length:16);
  if ($('fxGap'))  $('fxGap').textContent  = (gap===null?'—':thou(gap) + ' מייל');

  if ($('fxWhen')){
    var d = new Date(FIX.at*1000);
    var p = function(v){ return (v<10?'0':'')+v; };
    var age = (now/1000 - FIX.at)/3600;
    /* עברית: יחיד, זוגי ורבים — "לפני שעה", "לפני שעתיים", "לפני שלוש שעות" */
    var heb = function(v, one, two, many){
      v = Math.round(v);
      return v <= 1 ? one : v === 2 ? two : v + ' ' + many;
    };
    var ageTxt = age < 1  ? 'לפני פחות משעה'
               : age < 24 ? 'לפני ' + heb(age, 'שעה', 'שעתיים', 'שעות')
               :            'לפני ' + heb(age/24, 'יום', 'יומיים', 'ימים');
    $('fxWhen').textContent = p(d.getUTCDate()) + '.' + (d.getUTCMonth()+1) + ' ' +
                              p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ' UTC · ' + ageTxt;
    if (age > 8 && $('fxWhen').parentNode) $('fxWhen').parentNode.classList.add('stale');
    if ($('kickWhen')) $('kickWhen').textContent =
      p(d.getUTCDate()) + '.' + p(d.getUTCMonth()+1) + '.' + d.getUTCFullYear() + ' ' +
      p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ' UTC';
  }

  /* ---------- ארבעת הכרטיסים ---------- */
  if ($('bcNearBoat')) $('bcNearBoat').textContent = thou(FIX.nearBoat);
  if ($('bcNearBoatName')) $('bcNearBoatName').textContent = FIX.nearBoatName || '—';

  if ($('bcNearLand')) $('bcNearLand').textContent = thou(FIX.nearLand);
  if ($('bcNearLandName')) $('bcNearLandName').textContent = FIX.nearLandName || '—';

  if ($('bcGhost')){
    $('bcGhost').textContent = thou(Math.abs(FIX.ghost));
    if ($('bcGhostWord')) $('bcGhostWord').textContent = FIX.ghost >= 0 ? 'מקדים' : 'מפגר אחרי';
  }

  if ($('bcGate')){
    $('bcGate').textContent = thou(FIX.toGate);
    if ($('bcGateName')) $('bcGateName').textContent = FIX.gate || '—';
    if ($('bcGateBrg') && typeof GATE !== 'undefined'){
      $('bcGateBrg').textContent = n(bearing(FIX.lat,FIX.lon,GATE[0],GATE[1])) + '°';
    }
  }

  /* ---------- פס ההתקדמות ---------- */
  var pct = FIX.totalNm ? (FIX.totalNm - FIX.dtf)/FIX.totalNm*100 : 0;
  if ($('progFill')) $('progFill').style.width = pct.toFixed(1)+'%';
  if ($('progDot'))  $('progDot').style.right  = pct.toFixed(1)+'%';
  if ($('progTxt')){
    $('progTxt').textContent = 'יום ' + FIX.dayN + ' מתוך כ־250 · ' +
                               pct.toFixed(1) + '% מההקפה · ' + thou(FIX.sailed) + ' מייל שהפליג';
  }

  /* ---------- המשפט החי בתיבת "מה כאן אמיתי" ---------- */
  if (c && $('pvTwa')){
    var twa = ((c.windDir - FIX.cog + 540) % 360) - 180;   /* חיובי = הרוח מימין */
    var abs = Math.abs(twa);
    $('pvTwa').textContent = n(abs);
    if ($('pvSide')){
      $('pvSide').textContent = abs > 150 ? 'כמעט ישר מאחור'
                              : abs > 100 ? ('מעל הכתף ה' + (twa>0?'ימנית':'שמאלית') + ' האחורית')
                              : abs > 60  ? ('מהצד ה' + (twa>0?'ימני':'שמאלי'))
                              :             'כמעט מהחרטום';
    }
    if ($('pvWind')) $('pvWind').textContent = n(c.wind);
    if ($('pvGust')) $('pvGust').textContent = n(c.gust);
    /* התחזית מוצגת רק אם בטבלה עוד נשארו שעות קדימה */
    var mx = maxWind24(now);
    if ($('pvFcstWrap')) $('pvFcstWrap').hidden = (mx === null);
    if ($('pvFcst') && mx !== null) $('pvFcst').textContent = n(mx);
  }
}

render();
setInterval(render, 60000);   /* טריות נקודת הציון מתעדכנת מעצמה */
})();
