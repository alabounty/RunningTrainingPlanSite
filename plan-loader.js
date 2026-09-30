(() => {
'use strict';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validate(p){
  const fail=message=>{throw new Error(message);};
  const str=(v,label,max=10000)=>{if(typeof v!=='string'||v.length>max)fail(label+' must be text (maximum '+max+' characters).');};
  if(!p||p.version!==1)fail('Use a plan with version: 1.');
  str(p.title,'Plan title',200);str(p.subtitle,'Subtitle',1000);
  if(!p.workouts||typeof p.workouts!=='object'||Array.isArray(p.workouts))fail('Workouts must be an object.');
  if(Object.keys(p.workouts).length>500)fail('Maximum 500 workouts.');
  for(const [id,w] of Object.entries(p.workouts)){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))fail('Invalid workout ID: '+id);
    if(!w||typeof w!=='object')fail('Invalid workout: '+id);
    str(w.title,'Workout title',300);str(w.label,'Workout label',100);
    if(!Array.isArray(w.items)||w.items.length>100)fail('Each workout needs an items array (maximum 100 lines).');
    w.items.forEach(v=>str(v,'Exercise line'));
  }
  if(!Array.isArray(p.weeks)||!p.weeks.length||p.weeks.length>104)fail('Use 1–104 weeks.');
  const ids=new Set(),numbers=new Set();
  for(const w of p.weeks){
    if(!Number.isInteger(w.week)||w.week<1||numbers.has(w.week))fail('Week numbers must be positive and unique.');numbers.add(w.week);
    str(w.phase,'Phase',100);str(w.mileage,'Mileage',100);
    if(!Array.isArray(w.days)||w.days.length!==7)fail('Each week must contain 7 days, Monday through Sunday.');
    for(const d of w.days){
      if(typeof d.day!=='string'||!/^\d{1,6}$/.test(d.day)||ids.has(d.day))fail('Day values must be unique numeric strings. Keep existing values to preserve progress.');ids.add(d.day);
      str(d.title,'Day description',1000);
      if(!Array.isArray(d.workouts)||d.workouts.length>20||new Set(d.workouts).size!==d.workouts.length)fail('Invalid or duplicate day workout assignments.');
      d.workouts.forEach(id=>{if(!Object.hasOwn(p.workouts,id))fail('Unknown workout: '+id);});
    }
  }
  return p;
}
async function load(){
  try{
    const response=await fetch('training-plan.json',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    return validate(await response.json());
  }catch(e){
    document.getElementById('plan').textContent='Could not load the training plan. Please reload the page or try again later.';
    document.getElementById('statusText').textContent='Plan unavailable';
    ['markAllBtn','resetBtn','syncSettingsBtn'].forEach(id=>document.getElementById(id).disabled=true);
    console.error(e);
    return null;
  }
}
window.TrainingPlan={load,escape};
})();
