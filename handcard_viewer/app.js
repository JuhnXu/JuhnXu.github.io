const input=document.getElementById("urlInput");
const cards=document.getElementById("cards");
const viewer=document.getElementById("viewer");
const preview=document.getElementById("preview");
const rowInput=document.getElementById("rowInput");

let list=JSON.parse(localStorage.getItem("cards")||"[]");
let rows=parseInt(localStorage.getItem("cardRows")||"3");
rowInput.value=rows;

function save(){
 localStorage.setItem("cards",JSON.stringify(list));
}

function render(){
 cards.innerHTML="";
 updateLayout();
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

function updateLayout(){
 let count=Math.max(1,parseInt(rows)||1);
 let cols=Math.max(1,Math.ceil(list.length/count));
 cards.style.gridTemplateColumns=`repeat(${cols},auto)`;
}

function addCard(){
 let url=input.value.trim();
 if(!url)return;
 list.push(url);
 save();
 render();
 input.value="";
}

document.getElementById("addBtn").onclick=addCard;

// 从系统剪贴板粘贴链接到输入框
document.getElementById("pasteBtn").onclick=async()=>{
 try{
  if(!navigator.clipboard || !navigator.clipboard.readText){
   throw new Error("当前浏览器不支持剪贴板读取");
  }
  const text=(await navigator.clipboard.readText()).trim();
  if(!text){
   alert("剪贴板内容为空");
   return;
  }
  input.value=text;
  input.focus();
  input.setSelectionRange(input.value.length,input.value.length);
 }catch(err){
  console.error("读取剪贴板失败:",err);
  alert("无法读取剪贴板，请允许浏览器访问剪贴板后重试。");
 }
};

// 输入框按回车直接添加卡牌
input.addEventListener("keydown",e=>{
 if(e.key==="Enter"){
  e.preventDefault();
  addCard();
 }
});

rowInput.addEventListener("change",()=>{
 rows=Math.max(1,parseInt(rowInput.value)||1);
 localStorage.setItem("cardRows",rows);
 render();
});

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


const attributeList=document.getElementById("attributeList");
let attributes=JSON.parse(localStorage.getItem("attributes")||"[]");

function saveAttributes(){
 localStorage.setItem("attributes",JSON.stringify(attributes));
}

function renderAttributes(){
 attributeList.innerHTML="";
 attributes.forEach((attr,index)=>{
  let row=document.createElement("div");
  row.className="attribute-row";
  row.innerHTML=`
   <input class="attr-name" value="${attr.name}" placeholder="属性名称">
   <button class="minus">-</button>
   <input class="attr-value" type="number" value="${attr.value}">
   <button class="plus">+</button>
   <button class="remove">删除</button>`;

  let name=row.querySelector('.attr-name');
  let value=row.querySelector('.attr-value');
  name.onchange=()=>{attr.name=name.value;saveAttributes();};
  value.onchange=()=>{attr.value=Math.max(0,Number(value.value)||0);saveAttributes();};
  row.querySelector('.minus').onclick=()=>{
   attr.value=Math.max(0,attr.value-1);saveAttributes();renderAttributes();
  };
  row.querySelector('.plus').onclick=()=>{
   attr.value++;saveAttributes();renderAttributes();
  };
  row.querySelector('.remove').onclick=()=>{
   attributes.splice(index,1);saveAttributes();renderAttributes();
  };
  attributeList.appendChild(row);
 });
}

document.getElementById('addAttrBtn').onclick=()=>{
 attributes.push({name:'',value:0});
 saveAttributes();
 renderAttributes();
};

renderAttributes();
render();
