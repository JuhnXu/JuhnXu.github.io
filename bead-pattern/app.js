const $=s=>document.querySelector(s);
const els={file:$("#fileInput"),drop:$("#dropzone"),name:$("#fileName"),w:$("#widthInput"),h:$("#heightInput"),ratio:$("#keepRatio"),colors:$("#colorCount"),colorVal:$("#colorCountValue"),palette:$("#palette"),grid:$("#showGrid"),numbers:$("#showNumbers"),generate:$("#generateBtn"),png:$("#exportPng"),csv:$("#exportCsv"),canvas:$("#patternCanvas"),wrap:$("#canvasWrap"),meta:$("#meta"),total:$("#totalBeads"),used:$("#usedColors"),size:$("#patternSize"),table:$("#colorTable"),zin:$("#zoomIn"),zout:$("#zoomOut"),zv:$("#zoomValue")};
const PALETTES={
classic:[
["01","黑色","#171717"],["02","深灰","#55585d"],["03","灰色","#8b8f93"],["04","白色","#f7f7f4"],["05","象牙白","#f1e5c8"],["06","浅黄","#ffe27a"],["07","黄色","#ffc400"],["08","橙色","#ff8b22"],["09","红色","#e9363f"],["10","深红","#a81f31"],["11","粉色","#ff8fbc"],["12","紫色","#8e55b7"],["13","深紫","#59368a"],["14","蓝色","#4b8ff7"],["15","深蓝","#254f9c"],["16","天蓝","#75c9ee"],["17","青色","#2cbdb0"],["18","绿色","#48b957"],["19","深绿","#287842"],["20","棕色","#875632"],["21","浅棕","#c58b5b"],["22","米色","#e5c69b"],["23","肤色","#f0b18b"],["24","浅粉","#ffd0d7"],["25","薄荷绿","#9be4bb"],["26","草绿","#8fca47"],["27","金黄","#e8a91a"],["28","珊瑚","#f06e5f"],["29","靛蓝","#3d4eaa"],["30","湖蓝","#39a9d8"],["31","酒红","#70293b"],["32","墨绿","#1f5c52"],["33","深棕","#4d3325"],["34","浅紫","#c39bdc"],["35","浅蓝","#a8d7ff"],["36","浅绿","#c8e98b"],["37","银灰","#c2c4c7"],["38","暖灰","#6f6a63"],["39","砖红","#bd4c3b"],["40","卡其","#b7a77c"],["41","荧光黄","#d9ff42"],["42","荧光绿","#5eff71"],["43","荧光橙","#ffad35"],["44","荧光粉","#ff5fa2"],["45","金属蓝","#597aa8"],["46","海军蓝","#1b315f"],["47","咖啡","#6b4330"],["48","焦糖","#c77a3a"]],
basic:[["01","黑色","#171717"],["02","白色","#f7f7f4"],["03","红色","#e9363f"],["04","橙色","#ff8b22"],["05","黄色","#ffc400"],["06","绿色","#48b957"],["07","青色","#2cbdb0"],["08","蓝色","#4b8ff7"],["09","深蓝","#254f9c"],["10","紫色","#8e55b7"],["11","粉色","#ff8fbc"],["12","棕色","#875632"]]
};
let img=null, sourceName="", cells=[], counts=[], scale=1;

function dist(a,b){return (a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2}
function rgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}
function activePalette(){return PALETTES[els.palette.value]}
function pickPalette(n){
  const p=activePalette().map(x=>({id:x[0],name:x[1],hex:x[2],rgb:rgb(x[2])}));
  if(n>=p.length)return p;
  // Deterministic farthest-point selection keeps representative colors.
  const chosen=[p.reduce((a,b)=>luma(b.rgb)>luma(a.rgb)?b:a,p[0])];
  while(chosen.length<n){
    let best=null,bd=-1;
    for(const c of p) if(!chosen.includes(c)){
      const d=Math.min(...chosen.map(x=>dist(c.rgb,x.rgb)));
      if(d>bd){bd=d;best=c}
    }
    chosen.push(best);
  }
  return chosen;
}
function luma(x){return .2126*x[0]+.7152*x[1]+.0722*x[2]}
function loadFile(file){
  if(!file||!file.type.startsWith("image/"))return;
  sourceName=file.name; els.name.textContent=file.name;
  const reader=new FileReader();
  reader.onload=e=>{const im=new Image();im.onload=()=>{img=im;els.generate.disabled=false;autoSize();renderSourceHint()};im.src=e.target.result};
  reader.readAsDataURL(file);
}
function autoSize(){
  if(!img)return;
  const w=+els.w.value||40;
  if(els.ratio.checked)els.h.value=Math.max(5,Math.round(w*img.naturalHeight/img.naturalWidth));
}
function renderSourceHint(){els.meta.textContent=`原图 ${img.naturalWidth} × ${img.naturalHeight} · ${sourceName}`}
function generate(){
  if(!img)return;
  let W=Math.max(5,Math.min(200,+els.w.value||40)),H=Math.max(5,Math.min(200,+els.h.value||40));
  els.w.value=W;els.h.value=H;
  const pal=pickPalette(+els.colors.value), work=document.createElement("canvas");work.width=W;work.height=H;
  const ctx=work.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,W,H);
  const data=ctx.getImageData(0,0,W,H).data;
  cells=new Array(W*H);counts=pal.map(()=>0);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4,a=data[i+3]/255;
    const bg=[255,255,255], c=[data[i]*a+bg[0]*(1-a),data[i+1]*a+bg[1]*(1-a),data[i+2]*a+bg[2]*(1-a)];
    let bi=0,bd=Infinity;
    pal.forEach((p,j)=>{const d=dist(c,p.rgb);if(d<bd){bd=d;bi=j}});
    cells[y*W+x]=bi;counts[bi]++;
  }
  draw(pal,W,H);updateStats(pal,W,H);renderTable(pal);els.png.disabled=false;els.csv.disabled=false;
}
function draw(pal,W,H){
  const max=760,cell=Math.max(4,Math.floor(max/Math.max(W,H))),cw=W*cell,ch=H*cell;
  els.canvas.width=cw;els.canvas.height=ch;els.canvas.hidden=false;$(".empty")?.remove();
  const c=els.canvas.getContext("2d");c.clearRect(0,0,cw,ch);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){c.fillStyle=pal[cells[y*W+x]].hex;c.fillRect(x*cell,y*cell,cell,cell)}
  if(els.grid.checked){c.strokeStyle="rgba(0,0,0,.22)";c.lineWidth=Math.max(1,cell/14);c.beginPath();for(let x=0;x<=W;x++){c.moveTo(x*cell,0);c.lineTo(x*cell,ch)}for(let y=0;y<=H;y++){c.moveTo(0,y*cell);c.lineTo(cw,y*cell)}c.stroke()}
  if(els.numbers.checked&&cell>=18){c.textAlign="center";c.textBaseline="middle";c.font=`${Math.max(8,cell*.32)}px sans-serif`;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=pal[cells[y*W+x]],v=luma(p.rgb)>155?"#222":"#fff";c.fillStyle=v;c.fillText(p.id,x*cell+cell/2,y*cell+cell/2)}}
  scale=1;applyZoom();
}
function applyZoom(){els.canvas.style.width=(els.canvas.width*scale)+"px";els.canvas.style.height=(els.canvas.height*scale)+"px";els.zv.textContent=Math.round(scale*100)+"%"}
function updateStats(pal,W,H){els.total.textContent=W*H;els.used.textContent=counts.filter(Boolean).length;els.size.textContent=`${W} × ${H}`}
function renderTable(pal){
  const rows=pal.map((p,i)=>({...p,n:counts[i]})).filter(x=>x.n).sort((a,b)=>b.n-a.n);
  els.table.innerHTML=`<div class="color-row" style="font-weight:700;color:#727b88"><span></span><span>颜色</span><span>HEX</span><span>编号</span><span class="num">数量</span></div>`+
  rows.map(p=>`<div class="color-row"><span class="swatch" style="background:${p.hex}"></span><span>${p.name}</span><span class="hex">${p.hex}</span><span>${p.id}</span><span class="num">${p.n}</span></div>`).join("");
}
function csvExport(){
  const pal=pickPalette(+els.colors.value),rows=pal.map((p,i)=>[p.id,p.name,p.hex,counts[i]||0]).filter(x=>x[3]);
  const csv="\uFEFF编号,颜色名称,HEX,数量\n"+rows.map(r=>r.join(",")).join("\n");
  download(new Blob([csv],{type:"text/csv;charset=utf-8"}),"拼豆颜色统计.csv");
}
function pngExport(){
  const a=document.createElement("a");a.download="拼豆图纸.png";a.href=els.canvas.toDataURL("image/png");a.click();
}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
els.file.onchange=e=>loadFile(e.target.files[0]);
["dragenter","dragover"].forEach(t=>els.drop.addEventListener(t,e=>{e.preventDefault();els.drop.classList.add("drag")}));
["dragleave","drop"].forEach(t=>els.drop.addEventListener(t,e=>{e.preventDefault();els.drop.classList.remove("drag")}));
els.drop.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));
els.w.oninput=()=>{if(els.ratio.checked)autoSize()};
els.ratio.onchange=autoSize;els.colors.oninput=()=>els.colorVal.textContent=els.colors.value;
els.generate.onclick=generate;els.png.onclick=pngExport;els.csv.onclick=csvExport;
[els.grid,els.numbers].forEach(x=>x.onchange=()=>{if(cells.length)generate()});
els.palette.onchange=()=>{if(cells.length)generate()};
els.zin.onclick=()=>{scale=Math.min(3,scale+.1);applyZoom()};
els.zout.onclick=()=>{scale=Math.max(.3,scale-.1);applyZoom()};
