const input=document.getElementById("urlInput");
const cards=document.getElementById("cards");
const viewer=document.getElementById("viewer");
const preview=document.getElementById("preview");

let list=JSON.parse(localStorage.getItem("cards")||"[]");

function save(){
 localStorage.setItem("cards",JSON.stringify(list));
}

function render(){
 cards.innerHTML="";
 list.forEach((url,i)=>{
  let div=document.createElement("div");
  div.className="card";
  div.dataset.index=i;
  div.innerHTML=`
   <img src="${url}">
   <div class="actions">
    <button class="copy">复制</button>
    <button class="del">删除</button>
   </div>`;

  div.querySelector("img").onclick=()=>{
   preview.src=url;
   viewer.classList.add("show");
  };

  div.querySelector(".copy").onclick=(e)=>{
   e.stopPropagation();
   navigator.clipboard.writeText(url);
  };

  div.querySelector(".del").onclick=(e)=>{
   e.stopPropagation();
   list.splice(i,1);
   save();
   render();
  };

  cards.appendChild(div);
 });
}

document.getElementById("addBtn").onclick=()=>{
 let url=input.value.trim();
 if(!url)return;
 list.push(url);
 save();
 render();
 input.value="";
};

document.getElementById("clearBtn").onclick=()=>{
 if(confirm("确定清空?")){
  list=[];
  save();
  render();
 }
};

viewer.onclick=()=>viewer.classList.remove("show");
document.addEventListener("keydown",e=>{
 if(e.key==="Escape") viewer.classList.remove("show");
});

new Sortable(cards,{
 animation:200,
 onEnd(){
  let arr=[];
  cards.querySelectorAll(".card").forEach(c=>{
   arr.push(list[c.dataset.index]);
  });
  list=arr;
  save();
  render();
 }
});

render();
