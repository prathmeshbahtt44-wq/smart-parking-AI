'use strict';
const API='/api';
const getToken=()=>localStorage.getItem('sp_token');
const getUser=()=>{try{return JSON.parse(localStorage.getItem('sp_user')||'null')}catch{return null}};
const setAuth=(t,u)=>{localStorage.setItem('sp_token',t);localStorage.setItem('sp_user',JSON.stringify(u))};
const clearAuth=()=>{localStorage.removeItem('sp_token');localStorage.removeItem('sp_user')};
const isLoggedIn=()=>!!getToken();
function requireAuth(){if(!isLoggedIn()){window.location.href='/pages/login.html';return false}return true}
function redirectIfAuth(){if(isLoggedIn())window.location.href='/pages/dashboard.html'}
async function apiFetch(path,opts={}){
  const t=getToken();
  const h={'Content-Type':'application/json',...(opts.headers||{})};
  if(t)h['Authorization']='Bearer '+t;
  const r=await fetch(API+path,{...opts,headers:h});
  const d=await r.json();
  if(!r.ok)throw new Error(d.message||'Request failed');
  return d;
}
const Auth={
  register:b=>apiFetch('/auth/register',{method:'POST',body:JSON.stringify(b)}),
  login:b=>apiFetch('/auth/login',{method:'POST',body:JSON.stringify(b)}),
  profile:()=>apiFetch('/auth/profile'),
};
const Parking={
  getAll:()=>apiFetch('/parking'),
  getNearby:(lat,lng)=>apiFetch('/parking/nearby?lat='+lat+'&lng='+lng),
  getById:id=>apiFetch('/parking/'+id),
  getSlots:id=>apiFetch('/parking/'+id+'/slots'),
};
const Bookings={
  book:b=>apiFetch('/bookings',{method:'POST',body:JSON.stringify(b)}),
  getMy:()=>apiFetch('/bookings/my'),
  cancel:id=>apiFetch('/bookings/'+id+'/cancel',{method:'PATCH'}),
};
const AIApi={fallback:(lat,lng,vt)=>apiFetch('/ai/fallback?lat='+lat+'&lng='+lng+'&vehicleType='+(vt||'Both'))};
function showToast(msg,type='info',ms=3500){
  let c=document.getElementById('toast-container');
  if(!c){c=Object.assign(document.createElement('div'),{id:'toast-container'});document.body.appendChild(c)}
  const t=document.createElement('div');
  t.className='toast toast-'+type;
  t.textContent=({'success':'✅','error':'❌','info':'ℹ️'}[type]||'')+' '+msg;
  c.appendChild(t);setTimeout(()=>t.remove(),ms);
}
function fmtIST(s){if(!s)return'—';return new Date(s).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function fmtINR(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)}
function availBadge(a,t){return a/t>0.3?'bg':a>0?'bo':'br'}
function renderNavbar(active=''){
  const user=getUser();
  const links=[
    {id:'dashboard',href:'/pages/dashboard.html',label:'Dashboard'},
    {id:'map',href:'/pages/map.html',label:'Find Parking'},
    {id:'bookings',href:'/pages/bookings.html',label:'My Bookings'},
    {id:'ai-finder',href:'/pages/ai-finder.html',label:'AI Finder'},
    {id:'camera-scanner',href:'/pages/camera-scanner.html',label:'📷 Scan'},
    {id:'vehicle-finder',href:'/pages/vehicle-finder.html',label:'🚗 Vehicle'},
  ];
  const el=document.getElementById('navbar-mount');
  if(!el)return;
  el.innerHTML=`<nav class="navbar">
    <a class="nav-brand" href="/pages/dashboard.html"><span class="logo">🚗</span><span class="nm">SmartPark <em>AI</em></span></a>
    <div class="nav-links">${links.map(l=>'<a class="nav-link'+(active===l.id?' active':'')+'" href="'+l.href+'">'+l.label+'</a>').join('')}</div>
    <div class="nav-right">
      ${user?'<span style="font-size:13px;color:#64748b" class="hm">Hi, <strong style="color:#fff">'+user.name.split(' ')[0]+'</strong></span>':''}
      <button class="btn btn-s btn-sm" onclick="logout()">Logout</button>
    </div>
  </nav>`;
}
function logout(){clearAuth();showToast('Logged out','info',1200);setTimeout(()=>window.location.href='/pages/login.html',800)}
function generateQR(token){
  const seed=[...token].reduce((a,c)=>a+c.charCodeAt(0),0);
  let h='<div class="qr-grid">';
  for(let i=0;i<100;i++){const v=(seed*(i+1)*31337)%97;const dk=v<50||i<10||i>89||i%10===0||i%10===9;h+='<div style="aspect-ratio:1;border-radius:1px;background:'+(dk?'#f97316':'rgba(255,255,255,0.05)')+'"></div>';}
  return h+'</div>';
}
function btnLoading(btn,text='Loading...'){btn.disabled=true;btn._o=btn.innerHTML;btn.innerHTML='<span class="loader lsm"></span> '+text}
function btnReset(btn){btn.disabled=false;if(btn._o)btn.innerHTML=btn._o}
