let channels=[];
let currentCategory="全部";

async function loadSource(){
 const url=document.getElementById("source").value.trim();
 try{
  const res=await fetch(url);
  const json=await res.json();
  channels=[];
  deepParse(json);

  document.getElementById("status").innerText=
    "加载成功，共 "+channels.length+" 个频道";

  renderCategory();
  renderList();
 }catch(e){
  document.getElementById("status").innerText="加载失败 "+e;
 }
}

function deepParse(obj,parent="默认"){
 if(!obj)return;

 if(Array.isArray(obj)){
  obj.forEach(v=>deepParse(v,parent));
  return;
 }

 if(typeof obj==="object"){

  let name=obj.name||obj.title||obj.channel;
  // 跳转地址优先使用 detailUrl
  let url=obj.detailUrl||obj.url||obj.src||obj.link||obj.web;

  if(name && url){
   channels.push({
    name:name,
    url:url,
    group:obj.group||obj.category||parent
   });
   return;
  }

  Object.keys(obj).forEach(k=>{
   let v=obj[k];

   if(typeof v==="string" && v.startsWith("http")){
    channels.push({
     name:k,
     url:v,
     group:parent
    });
   }else{
    deepParse(v,k);
   }
  });
 }
}

function categories(){
 let s=new Set();
 channels.forEach(c=>s.add(c.group||"默认"));
 return ["全部",...s];
}

function renderCategory(){
 let box=document.getElementById("category");
 box.innerHTML="";

 categories().forEach(c=>{
  let d=document.createElement("div");
  d.className="cat";
  d.innerText=c;
  d.onclick=()=>{
   currentCategory=c;
   renderList();
  };
  box.appendChild(d);
 });
}

function renderList(){
 let box=document.getElementById("list");
 box.innerHTML="";

 let key=document.getElementById("search").value;

 channels.filter(c=>
  (currentCategory==="全部"||c.group===currentCategory)
  &&
  c.name.includes(key)
 ).forEach(c=>{

  let d=document.createElement("div");
  d.className="item";
  d.innerHTML=
   `<b>${c.name}</b><div class="url">${c.url}</div>`;

  d.onclick=()=>{
   window.open(c.url,"_blank");
  };

  box.appendChild(d);
 });
}

document.getElementById("search").oninput=renderList;
loadSource();
