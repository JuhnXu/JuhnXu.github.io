let baseUrl="http://localhost/";

let images=[];
let selected=[];
let discarded=[];
let current=[];
let folder="tactic";

const defaultFolders=["行动卡","高级单位","建筑","技能","魔法","神器","普通单位","kdm","tactic"];
let folders=[];

const pool=document.getElementById("pool");
const selectedBox=document.getElementById("selected");
const discardBox=document.getElementById("discard");
const statusBar=document.getElementById("statusBar");
const folderSelect=document.getElementById("folderSelect");


function initFolders(){
    folders=JSON.parse(localStorage.getItem("imagePickerFolders")||"null") || [...defaultFolders];
    let current=localStorage.getItem("imagePickerCurrentFolder");
    renderFolderSelect();
    if(current){
        document.getElementById("folder").value=current;
        folderSelect.value=current;
    }
}

function renderFolderSelect(){
    if(!folderSelect) return;
    folderSelect.innerHTML="";
    folders.forEach(name=>{
        let op=document.createElement("option");
        op.value=name;
        op.textContent=name;
        folderSelect.appendChild(op);
    });
}

function saveFolder(){
    localStorage.setItem("imagePickerFolders",JSON.stringify(folders));
    localStorage.setItem("imagePickerCurrentFolder",folder);
}

function addFolderIfNeed(name){
    if(name && !folders.includes(name)){
        folders.push(name);
        renderFolderSelect();
        showStatus("新增目录："+name);
    }
    saveFolder();
}

function showStatus(msg){
    if(statusBar) statusBar.innerText="状态："+msg;
}

async function loadImages(){
    folder=document.getElementById("folder").value.trim();
    if(folderSelect && folderSelect.value && !folder){
        folder=folderSelect.value;
    }
    addFolderIfNeed(folder);

    const baseInput=document.getElementById("baseUrl");
    if(baseInput && baseInput.value.trim()){
        baseUrl=baseInput.value.trim();
        if(!baseUrl.endsWith("/")){
            baseUrl+="/";
        }
    }

    // 根据加载成功的目录名修改标题
    document.querySelector("h1").innerText =
        folder;
    document.title = folder + " - 图片随机抽取器";

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
        showStatus("加载完成，共发现 "+images.length+" 张图片");
    }else{
        showStatus("没有找到图片");
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
    showStatus("随机抽取 "+current.length+" 张图片");
}

function renderPool(){
    pool.innerHTML="";

    current.forEach(name=>{
        let div=document.createElement("div");
        div.className="item";

        div.innerHTML=`
        <img src="${baseUrl+folder+"/"+name}" onclick="previewImage(this.src)">
        <div>${name}</div>
        <button>丢弃</button>
        <button>拷贝链接</button>`;

        let buttons=div.querySelectorAll("button");

        buttons[0].onclick=()=>{
            if(!discarded.includes(name))
                discarded.push(name);

            current=current.filter(x=>x!==name);
            renderPool();
            renderDiscard();
            showStatus("已丢弃 "+name);
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
        <img src="${baseUrl+folder+"/"+name}" onclick="previewImage(this.src)">
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
            showStatus("已丢弃 "+name);
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
            showStatus("已恢复 "+name);
        };

        discardBox.appendChild(div);
    });
}

document.getElementById("loadBtn").onclick=loadImages;
if(folderSelect){
    folderSelect.onchange=()=>{
        document.getElementById("folder").value=folderSelect.value;
    };
}

initFolders();
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

    // 手机浏览器通常要求 HTTPS + 用户手势才能使用 clipboard API
    if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(url)
        .then(()=>{
            showStatus("链接已复制");
        })
        .catch(()=>{
            fallbackCopy(url);
        });
    }else{
        fallbackCopy(url);
    }
}

function fallbackCopy(text){
    let input=document.createElement("textarea");
    input.value=text;
    input.style.position="fixed";
    input.style.left="-9999px";
    document.body.appendChild(input);
    input.focus();
    input.select();

    try{
        let ok=document.execCommand("copy");
        showStatus(ok ? "链接已复制" : "复制失败，请长按复制");
    }catch(e){
        showStatus("复制失败，请长按复制");
    }

    document.body.removeChild(input);
}


// 点击图片放大预览
function previewImage(src){
    const box=document.getElementById("imagePreview");
    const img=document.getElementById("previewImg");
    if(box && img){
        img.src=src;
        box.style.display="flex";
    }
}

function closePreview(){
    const box=document.getElementById("imagePreview");
    if(box){
        box.style.display="none";
    }
}
