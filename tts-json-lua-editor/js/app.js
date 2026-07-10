let data=null,scripts=[],current=null;
const list=document.getElementById('list');
const code=document.getElementById('code');

document.getElementById('file').onchange=e=>{
 const f=e.target.files[0];
 if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
  data=JSON.parse(r.result);
  scripts=[];
  if(data.LuaScript!==undefined)
    scripts.push({name:'Global',global:true,script:data.LuaScript});
  function walk(arr){
    if(!arr)return;
    arr.forEach(o=>{
      scripts.push({name:(o.Nickname||o.Name||o.GUID),obj:o,script:o.LuaScript||''});
      if(o.ContainedObjects)walk(o.ContainedObjects);
    });
  }
  walk(data.ObjectStates);
  render();
 };
 r.readAsText(f);
};

function render(){
 const only=document.getElementById("onlyLua")?.checked;
 list.innerHTML='';
 scripts.filter(s=>!only||((s.script||"").trim().length>0)).forEach(s=>{
   const d=document.createElement('div');
   d.className='item';
   d.textContent=s.name;
   d.onclick=()=>{
      if(current)current.script=code.value;
      current=s;
      code.value=s.script;
      [...list.children].forEach(x=>x.classList.remove('active'));
      d.classList.add('active');
   };
   list.appendChild(d);
 });
 if(scripts.length)list.firstChild.click();
}

document.getElementById('save').onclick=()=>{
 if(!data)return;
 if(current)current.script=code.value;
 scripts.filter(s=>!only||((s.script||"").trim().length>0)).forEach(s=>{
   if(s.global)data.LuaScript=s.script;
   else s.obj.LuaScript=s.script;
 });
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download='tts_modified.json';
 a.click();
 URL.revokeObjectURL(a.href);
};

document.getElementById("onlyLua").onchange=render;
