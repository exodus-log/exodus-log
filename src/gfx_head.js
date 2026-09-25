/* ---- דרגות איכות: GFX וההחלטה ההתחלתית (ההסבר המלא ב-gfx_add.js, ליד gfxProbe) ---- */
var GFX=EXO.gfx={ tier:1, auto:true, fps:0, ms:0, probe:true, noUp:false };
(function(){
  var m=/[?&]q=([012])(?:&|$)/.exec(location.search);
  var coarse=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
  /* כולם מתחילים בדרגה 1 (גם מחשב): לדרגה 2 עולים רק אחרי שהמדידה הראתה 54 פריימים בשנייה ומעלה */
  if(m){ GFX.tier=+m[1]; GFX.auto=false; } else GFX.tier=1;
  if(GFX.tier===0) EXO.quality='lite';
  EXO.tier=GFX.tier;
})();
var GFXV={};
/* גרסה לכל דרגה ולכל צירוף של שכבות נדירות (זוהר, מטאור): הקוד שלהן נבנה רק בלילות שבהם הן באמת קיימות */
GFX.flags='';
function progT(P,t){ var key=t+GFX.flags; if(!P.v[key]){ var d='#define TIER '+t+'\n'+(GFX.flags.indexOf('a')>=0?'#define AUR 1\n':'')+(GFX.flags.indexOf('m')>=0?'#define MET 1\n':'');
  P.v[key]=prog(d+P.vs,d+P.fs); } return P.v[key]; }
function progV(name,vs,fs){ var P=GFXV[name]={vs:vs,fs:fs,v:{}}; return progT(P,GFX.tier); }

/* ===== שדרוג הגרפיקה (gfx_head.js): מה שהשיידרים צריכים כבר בבנייה שלהם, לפני השמיים =====
   tmo = ACES (Hill) ואחריו קידוד למסך; ainv = ההפך המדויק שלו, לצבעים שכוילו במסך.
   הקידוד הוא גמא 2 (שורש) ולא 2.2 — זול בהרבה בטלפון, ו-ainv משתמש באותה גמא, כך שצבע שכויל חוזר בדיוק.
   הרעש (dith) הוא interleaved gradient noise בלי sin: חצי צעד של 1/255, נגד פסים במעברים של השמיים. */
var TMO_GLSL=[
 'uniform float uExpo;',
 'float dith(){ return fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))))-0.5; }',
 'vec3 tmoN(vec3 c){ c=max(c,0.0)*uExpo;',
 ' vec3 v=vec3(dot(c,vec3(0.59719,0.35458,0.04823)),dot(c,vec3(0.07600,0.90834,0.01566)),dot(c,vec3(0.02840,0.13383,0.83777)));',
 ' v=(v*(v+0.0245786)-0.000090537)/(v*(0.983729*v+0.4329510)+0.238081);',
 ' c=vec3(dot(v,vec3(1.60475,-0.53108,-0.07367)),dot(v,vec3(-0.10208,1.10813,-0.00605)),dot(v,vec3(-0.00327,-0.07276,1.07602)));',
 ' return sqrt(clamp(c,0.0,1.0)); }',
 'vec3 tmo(vec3 c){ return tmoN(c)+dith()/255.0; }',
 'vec3 ainv(vec3 x){ vec3 y=clamp(x,0.0,0.97); y*=y;',
 ' vec3 v=vec3(dot(y,vec3(0.643038,0.311187,0.045775)),dot(y,vec3(0.059269,0.931436,0.009295)),dot(y,vec3(0.005962,0.063929,0.930118)));',
 ' v=clamp(v,0.0,0.99); vec3 qa=1.0-0.983729*v, qb=0.0245786-0.4329510*v, qc=-(0.000090537+0.238081*v);',
 ' vec3 u=(-qb+sqrt(qb*qb-4.0*qa*qc))/(2.0*qa);',
 ' return max(vec3(dot(u,vec3(1.764741,-0.675778,-0.088963)),dot(u,vec3(-0.147028,1.160252,-0.013224)),dot(u,vec3(-0.036337,-0.162436,1.198773))),0.0); }'
].join('\n');

/* 7. השמיים הפיזיקליים: קריאה מהטבלה (לוגריתמית, 26 סטופים), מכפיל אופק→זנית, ועוד רצפת הלילה ועננות */
var PHYS_GLSL=[
 'uniform sampler2D uLutS,uLutM; uniform float uPhys,uKm,uFl,uOvS; uniform vec2 uKs; uniform vec3 uNZ,uNH,uPSun,uPMoon;',
 'vec3 lutRd(sampler2D t,vec3 r,vec3 ld){ float el=asin(clamp(r.y,-1.0,1.0)); float v=sqrt(clamp((el+0.035)/1.6058,0.0,1.0));',
 ' vec2 a=normalize(r.xz+vec2(1e-5)), b=normalize(ld.xz+vec2(1e-5)); float u=acos(clamp(dot(a,b),-1.0,1.0))*0.3183099;',
 ' vec3 e=texture2D(t,vec2((u*31.0+0.5)/32.0,(v*47.0+0.5)/48.0)).rgb; return exp2(e*26.0-24.0); }',
 'vec3 physSky(vec3 r){ float el=max(r.y,0.0); float k=mix(uKs.x,uKs.y,smoothstep(0.0,1.0,sqrt(el))*(1.0-smoothstep(0.55,0.95,dot(r,uPSun))));',
 ' vec3 L=lutRd(uLutS,r,uPSun)*k+lutRd(uLutM,r,uPMoon)*uKm+mix(uNH,uNZ,pow(clamp(r.y*1.15+0.06,0.0,1.0),0.62))*uFl;',
 ' float lu=dot(L,vec3(0.2126,0.7152,0.0722)); return mix(L,lu*vec3(0.95,0.98,1.03),uOvS); }'
].join('\n');

/* 1+12. מפת הסביבה: חצי הכדור העליון, u = אזימוט (כמו dirVec: 0 צפון, עם כיוון השעון), v = שורש של sin(גובה)
   (בלי asin בים). הערכים לינאריים, מקודדים בשורש ביחס לתקרה uEnvK שמשתנה עם האור (ביום 8, בלילה 0.12),
   כך שהים קורא ב-3 כפלים ולא בהיפוך ACES */
var ENV_GLSL=[
 'uniform float uEnv,uEnvOn,uEnvK; uniform sampler2D uEnvT;',
 'vec3 envDir(vec2 n){ float az=(n.x*0.5+0.5)*6.2831853, v=n.y*0.5+0.5, sy=v*v, cy=sqrt(1.0-sy*sy);',
 ' return vec3(sin(az)*cy,sy,-cos(az)*cy); }',
 'vec2 envUV(vec3 d){ float az=atan(d.x,-d.z); return vec2(az*0.1591549+(az<0.0?1.0:0.0),sqrt(clamp(d.y,0.0,1.0))); }',
 'vec3 envRd(vec2 uv,float b){ vec3 e=texture2D(uEnvT,uv,b).rgb; return e*e*uEnvK; }'
].join('\n');
