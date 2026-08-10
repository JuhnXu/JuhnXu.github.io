
let channels=[];
let current=0;

async function loadSource(){
 try{
 let url=document.getElementById("source").value;
 let res=await fetch(url);
 let json=await res.json();
 channels=[];
parse(json);
document.getElementById("status").innerText="加载成功，共"+channels.length+"个频道";
render();
 }catch(e){
 document.getElementById("status").innerText="加载失败";
 }
}

function parse(o,g="默认"){
 if(!o)return;
 if(Array.isArray(o)){
  o.forEach(x=>parse(x,g));
  return;
 }
 if(typeof o==="object"){
  let name=o.name||o.title||o.channel;
  let url=o.detailUrl||o.url||o.link||o.src;
  if(name&&url){
   channels.push({name,url,group:o.group||g});
   return;
  }
  Object.keys(o).forEach(k=>{
   if(typeof o[k]==="string" && o[k].startsWith("http")){
    channels.push({name:k,url:o[k],group:g});
   }else{
    parse(o[k],k);
   }
  });
 }
}

function render(){
 let box=document.getElementById("list");
 box.innerHTML="";
 channels.forEach((c,i)=>{
  let d=document.createElement("div");
  d.className="item";
  d.tabIndex=0;
  d.innerText=c.name;
  d.onclick=()=>window.open(c.url,"_blank");
  box.appendChild(d);
 });
 setFocus(0);
}

function setFocus(i){
 let items=document.querySelectorAll(".item");
 items.forEach(x=>x.classList.remove("focus"));
 if(items[i]){
 current=i;
 items[i].classList.add("focus");
 items[i].scrollIntoView({block:"center"});
 }
}

document.addEventListener("keydown",e=>{
 let count=document.querySelectorAll(".item").length;
 if(!count)return;

 if(e.keyCode===39)setFocus((current+1)%count);
 if(e.keyCode===37)setFocus((current-1+count)%count);
 if(e.keyCode===40)setFocus(Math.min(current+5,count-1));
 if(e.keyCode===38)setFocus(Math.max(current-5,0));
 if(e.keyCode===13){
  document.querySelectorAll(".item")[current].click();
 }
});

loadSource();
