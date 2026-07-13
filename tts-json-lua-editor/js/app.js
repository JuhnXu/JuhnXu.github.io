
let data=null,scripts=[],current=null;
const list=document.getElementById('list'),code=document.getElementById('code'),xml=document.getElementById('xml');
let xmlField='XmlUI';
tabLua.onclick=()=>{code.classList.remove('hidden');xml.classList.add('hidden');}
tabXml.onclick=()=>{xml.classList.remove('hidden');code.classList.add('hidden');}
file.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{data=JSON.parse(r.result);
for(const k of ['XmlUI','XmlUIData','UIXml','Xml']) if(data[k]!=null){xmlField=k;break;}
xml.value=data[xmlField]||'';
scripts=[];if(data.LuaScript!==undefined)scripts.push({name:'Global',global:true,script:data.LuaScript});
(function walk(arr){if(!arr)return;arr.forEach(o=>{scripts.push({name:o.Nickname||o.Name||o.GUID,obj:o,script:o.LuaScript||''});walk(o.ContainedObjects);});})(data.ObjectStates);render();};r.readAsText(f);}
function render(){list.innerHTML='';const only=onlyLua.checked;scripts.filter(s=>!only||(s.script.trim())).forEach(s=>{let d=document.createElement('div');d.className='item';d.textContent=s.name;d.onclick=()=>{if(current)current.script=code.value;current=s;code.value=s.script;[...list.children].forEach(x=>x.classList.remove('active'));d.classList.add('active');};list.appendChild(d);});if(list.firstChild)list.firstChild.click();}
onlyLua.onchange=render;
save.onclick=()=>{if(current)current.script=code.value;scripts.forEach(s=>{if(s.global)data.LuaScript=s.script;else s.obj.LuaScript=s.script;});data[xmlField]=xml.value;const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='tts_modified.json';a.click();}
