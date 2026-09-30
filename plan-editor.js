(() => {
'use strict';
const DRAFT_KEY='half-marathon-plan-draft-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
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
    if(!Number.isInteger(w.number)||w.number<1||numbers.has(w.number))fail('Week numbers must be positive and unique.');numbers.add(w.number);
    str(w.phase,'Phase',100);str(w.mileage,'Mileage',100);
    if(!Array.isArray(w.days)||w.days.length!==7)fail('Each week must contain 7 days, Monday through Sunday.');
    for(const d of w.days){
      if(typeof d.id!=='string'||!/^\d{1,6}$/.test(d.id)||ids.has(d.id))fail('Day IDs must be unique numeric strings. Keep existing IDs to preserve progress.');ids.add(d.id);
      str(d.title,'Day description',1000);
      if(!Array.isArray(d.workouts)||d.workouts.length>20||new Set(d.workouts).size!==d.workouts.length)fail('Invalid or duplicate day workout assignments.');
      d.workouts.forEach(id=>{if(!Object.hasOwn(p.workouts,id))fail('Unknown workout: '+id);});
    }
  }
  return p;
}
let active=null,edit=null,selectedWeek=0,selectedDay=0,selectedWorkout='',dirty=false;
const dialog=document.createElement('dialog');dialog.className='workout-dialog plan-editor';dialog.setAttribute('aria-labelledby','editorTitle');
dialog.innerHTML=`<div class="workout-dialog-head"><h2 id="editorTitle">Edit plan</h2><button type="button" id="editorClose" class="workout-close">Close</button></div>
<p>Save applies this plan on this browser. Export downloads <strong>training-plan.json</strong>; upload it beside index.html to update the website for everyone. Plan edits do not cloud-sync.</p>
<div class="editor-actions"><button id="importPlan" type="button">Import JSON</button><button id="exportPlan" type="button">Export JSON</button><button id="savePlan" type="button">Save on this device</button><button id="publishedPlan" type="button">Use published plan</button></div>
<input id="planFile" type="file" accept=".json,application/json" hidden>
<p id="editorStatus" role="status" aria-live="polite"></p><div id="editorFields"></div>`;
document.body.append(dialog);
const el=id=>dialog.querySelector('#'+id);
function message(t){el('editorStatus').textContent=t;}
function mark(){dirty=true;message('Unsaved changes. Save locally or export when ready.');}
function render(){
  el('savePlan').disabled=el('exportPlan').disabled=!edit;
  if(!edit){el('editorFields').innerHTML='<p>Import a training-plan.json file to begin.</p>';return;}
  const w=edit.weeks[selectedWeek],d=w.days[selectedDay],ids=Object.keys(edit.workouts);
  if(!Object.hasOwn(edit.workouts,selectedWorkout)) selectedWorkout=ids[0]||'';
  const workout=edit.workouts[selectedWorkout];
  el('editorFields').innerHTML=`
<label>Plan title<input id="editTitle" value="${escape(edit.title)}"></label>
<label>Subtitle<input id="editSubtitle" value="${escape(edit.subtitle)}"></label>
<h3>Schedule</h3><div class="editor-columns">
<label>Week<select id="editWeek">${edit.weeks.map((v,i)=>`<option value="${i}" ${i===selectedWeek?'selected':''}>Week ${v.number}</option>`).join('')}</select></label>
<label>Day<select id="editDay">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((v,i)=>`<option value="${i}" ${i===selectedDay?'selected':''}>${v} · Day ${w.days[i].id}</option>`).join('')}</select></label>
<label>Phase<input id="editPhase" value="${escape(w.phase)}"></label><label>Weekly mileage<input id="editMileage" value="${escape(w.mileage)}"></label></div>
<label>Run / day description<input id="editDayTitle" value="${escape(d.title)}"></label>
<fieldset><legend>Workouts for this day</legend>${ids.map(id=>`<label class="editor-check"><input type="checkbox" data-workout="${escape(id)}" ${d.workouts.includes(id)?'checked':''}>${escape(edit.workouts[id].title)}</label>`).join('')||'No workouts yet.'}</fieldset>
<h3>Reusable workouts</h3><p>Editing a workout changes every day that uses it. To change one day only, duplicate the workout and assign the copy to that day.</p>
<label>Workout<select id="editWorkout">${ids.map(id=>`<option value="${escape(id)}" ${id===selectedWorkout?'selected':''}>${escape(edit.workouts[id].title)} (${escape(id)})</option>`).join('')}</select></label>
<div class="editor-actions"><button type="button" id="addWorkout">New workout</button><button type="button" id="duplicateWorkout" ${workout?'':'disabled'}>Duplicate</button><button type="button" id="deleteWorkout" ${workout?'':'disabled'}>Delete workout</button></div>
${workout?`<label>Workout title<input id="editWorkoutTitle" value="${escape(workout.title)}"></label><label>Short label on day card<input id="editWorkoutLabel" value="${escape(workout.label)}"></label><label>Exercises / instructions — one per line<textarea id="editWorkoutItems" rows="10">${escape(workout.items.join('\n'))}</textarea></label>`:''}
<p>Day IDs remain unchanged when editing here, so existing completion is preserved. Changing IDs in imported JSON can change which days your saved progress refers to.</p>`;
  const bind=(id,fn)=>el(id).addEventListener('input',e=>{fn(e.target.value);mark();});
  bind('editTitle',v=>edit.title=v);bind('editSubtitle',v=>edit.subtitle=v);bind('editPhase',v=>w.phase=v);bind('editMileage',v=>w.mileage=v);bind('editDayTitle',v=>d.title=v);
  el('editWeek').onchange=e=>{selectedWeek=Number(e.target.value);render();};el('editDay').onchange=e=>{selectedDay=Number(e.target.value);render();};el('editWorkout').onchange=e=>{selectedWorkout=e.target.value;render();};
  dialog.querySelectorAll('[data-workout]').forEach(box=>box.onchange=()=>{d.workouts=box.checked?[...d.workouts,box.dataset.workout]:d.workouts.filter(id=>id!==box.dataset.workout);mark();});
  if(workout){bind('editWorkoutTitle',v=>workout.title=v);bind('editWorkoutLabel',v=>workout.label=v);bind('editWorkoutItems',v=>workout.items=v.split('\n').map(v=>v.trim()).filter(Boolean));}
  function newWorkout(copy){let n=1;while(Object.hasOwn(edit.workouts,'custom-'+n))n++;selectedWorkout='custom-'+n;edit.workouts[selectedWorkout]=copy?{...clone(workout),title:workout.title+' (copy)'}:{title:'New workout',label:'Workout',items:[]};mark();render();}
  el('addWorkout').onclick=()=>newWorkout(false);el('duplicateWorkout').onclick=()=>newWorkout(true);
  el('deleteWorkout').onclick=()=>{const count=edit.weeks.flatMap(w=>w.days).filter(d=>d.workouts.includes(selectedWorkout)).length;if(!confirm(`Delete this workout and remove it from ${count} day(s)?`))return;edit.weeks.forEach(w=>w.days.forEach(d=>d.workouts=d.workouts.filter(id=>id!==selectedWorkout)));delete edit.workouts[selectedWorkout];mark();render();};
}
function close(){if(dirty&&!confirm('Close without applying unsaved changes?'))return;dialog.close();}
el('editorClose').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
el('importPlan').onclick=()=>el('planFile').click();
el('planFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Maximum JSON size is 2 MB.');const next=validate(JSON.parse(await file.text()));if(dirty&&!confirm('Replace unsaved edits with this imported plan?'))return;edit=clone(next);selectedWeek=selectedDay=0;selectedWorkout='';dirty=true;render();message('Imported. Save on this device to apply, or export your changes.');}catch(error){message('Import failed: '+error.message);}finally{e.target.value='';}};
el('exportPlan').onclick=()=>{try{validate(edit);const url=URL.createObjectURL(new Blob([JSON.stringify(edit,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='training-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Exported. Upload training-plan.json to your website to publish these edits.');}catch(e){message('Export failed: '+e.message);}};
el('savePlan').onclick=()=>{try{validate(edit);localStorage.setItem(DRAFT_KEY,JSON.stringify(edit));dirty=false;location.reload();}catch(e){message('Save failed: '+e.message);}};
el('publishedPlan').onclick=()=>{if(!confirm('Discard local plan edits and load the published JSON? Your completion progress stays saved.'))return;try{localStorage.removeItem(DRAFT_KEY);dirty=false;location.reload();}catch(e){message(e.message);}};
document.getElementById('editPlanBtn').onclick=()=>{edit=active?clone(active):null;dirty=false;selectedWeek=selectedDay=0;selectedWorkout='';render();message('');dialog.showModal();};
async function load(){
  let draft=null;try{const raw=localStorage.getItem(DRAFT_KEY);if(raw)draft=validate(JSON.parse(raw));}catch(e){console.warn('Invalid local plan draft:',e);}
  if(draft){active=draft;document.getElementById('planSource').textContent='Using a plan saved on this device. Export to publish, or choose Use published plan in the editor.';return active;}
  try{const response=await fetch('training-plan.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);active=validate(await response.json());document.getElementById('planSource').textContent='';return active;}
  catch(e){document.getElementById('plan').textContent='Could not load training-plan.json. Upload it beside index.html, or use Edit plan → Import JSON → Save on this device. Open the site through a web server rather than directly as a file.';document.getElementById('statusText').textContent='Plan unavailable';document.getElementById('markAllBtn').disabled=true;document.getElementById('resetBtn').disabled=true;document.getElementById('syncSettingsBtn').disabled=true;console.error(e);return null;}
}
window.PlanEditor={load,validate,escape};
})();
