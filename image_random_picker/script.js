const baseUrl="https://juhnxu.github.io/mk_db/";

let images=[];
let selected=[];
let discarded=[];
let current=[];
let folder="tactic";

const pool=document.getElementById("pool");
const selectedBox=document.getElementById("selected");
const discardBox=document.getElementById("discard");

async function loadImages(){
    folder=document.getElementById("folder").value.trim();

    showProgress(true);

    let list=[];
    let index=1;

    while(true){
        let name="img"+index+".jpg";
        let url=baseUrl+folder+"/"+name;

        let ok=await checkImage(url);

        updateProgress(index);

        if(!ok) break;

        list.push(name);
        index++;
    }

    if(list.length){
        images=list;

        // 保留已有卡池状态
        selected=selected.filter(x=>images.includes(x));
        discarded=discarded.filter(x=>images.includes(x));

        renderSelected();
        renderDiscard();
        randomPick();
        alert("加载完成，共发现 "+images.length+" 张图片");
    }else{
        alert("没有找到图片");
    }

    showProgress(false);
}

function checkImage(url){
    return new Promise(resolve=>{
        let img=new Image();
        img.onload=()=>resolve(true);
        img.onerror=()=>resolve(false);
        img.src=url;
    });
}

function randomPick(){
    let count=Number(document.getElementById("count").value);

    let available=images.filter(
        x=>!discarded.includes(x)
    );

    current=[...available]
        .sort(()=>Math.random()-0.5)
        .slice(0,count);

    renderPool();
}

function renderPool(){
    pool.innerHTML="";

    current.forEach(name=>{
        let div=document.createElement("div");
        div.className="item";

        div.innerHTML=`
        <img src="${baseUrl+folder+"/"+name}">
        <div>${name}</div>
        <button>保留</button>
        <button>拷贝链接</button>`;

        let buttons=div.querySelectorAll("button");

        buttons[0].onclick=()=>{
            if(!selected.includes(name)){
                selected.push(name);
                renderSelected();
            }
        };

        buttons[1].onclick=()=>{
            copyImageUrl(name);
        };

        pool.appendChild(div);
    });
}

function renderSelected(){
    selectedBox.innerHTML="";

    selected.forEach(name=>{
        let div=document.createElement("div");
        div.className="item";

        div.innerHTML=`
        <img src="${baseUrl+folder+"/"+name}">
        <div>${name}</div>
        <button>移除</button>
        <button>丢弃</button>
        <button>拷贝链接</button>`;

        let buttons=div.querySelectorAll("button");

        buttons[0].onclick=()=>{
            selected=selected.filter(x=>x!==name);
            renderSelected();
        };

        buttons[1].onclick=()=>{
            selected=selected.filter(x=>x!==name);
            if(!discarded.includes(name))
                discarded.push(name);

            renderSelected();
            renderDiscard();
        };

        buttons[2].onclick=()=>{
            copyImageUrl(name);
        };

        selectedBox.appendChild(div);
    });
}

function renderDiscard(){
    discardBox.innerHTML="";

    discarded.forEach(name=>{
        let div=document.createElement("div");
        div.className="discard-item";

        div.innerHTML=`
        <span>${name}</span>
        <button>洗回牌库</button>`;

        div.querySelector("button").onclick=()=>{
            discarded=discarded.filter(x=>x!==name);
            renderDiscard();
        };

        discardBox.appendChild(div);
    });
}

document.getElementById("loadBtn").onclick=loadImages;
document.getElementById("randomBtn").onclick=randomPick;

function showProgress(show){
    let box=document.getElementById("progressBox");
    if(box){
        box.style.display=show?"block":"none";
    }
}

function updateProgress(num){
    let text=document.getElementById("progressText");
    if(text){
        text.innerText="正在尝试加载 img"+num+".jpg";
    }
}


function copyImageUrl(name){
    const url=baseUrl+folder+"/"+name;
    navigator.clipboard.writeText(url)
        .then(()=>{
            alert("已复制链接:\n"+url);
        })
        .catch(()=>{
            prompt("复制链接:", url);
        });
}
