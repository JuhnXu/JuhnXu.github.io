const phases=[
{
name:"① 回合开始",
tasks:[
"抽牌至手牌上限",
"准备单位"
]
},
{
name:"② 自由行动阶段",
tasks:[
"每次打1张牌",
"使用单位",
"使用技能"
]
},
{
name:"③ 移动?",
tasks:[
"支付移动力",
"进入新地形"
]
},
{
name:"④ 互动?",
tasks:[
"村庄 / 修道院",
"法师塔 / 城市",
"招募 / 买法术"
]
},
{
name:"⑤ 战斗?",
tasks:[
"远程",
"格挡",
"攻击≥护甲",
"获得 Fame XP"
]
},
{
name:"⑥ 回合结束",
tasks:[
"宣布结束回合",
"弃掉手牌",
"保留受伤牌",
"抽新手牌",
"牌库空→洗弃牌"
]
}
];

let game=load("magicKnight",{
round:1,
phase:0,
fame:0,
xp:0,
move:0
});

function render(){

document.getElementById("round").innerHTML=game.round;

let p=phases[game.phase];

document.getElementById("phaseName").innerHTML=p.name;

document.getElementById("tasks").innerHTML=
p.tasks.map(x=>"<li>"+x+"</li>").join("");

document.getElementById("fame").innerHTML=game.fame;
document.getElementById("xp").innerHTML=game.xp;
document.getElementById("move").innerHTML=game.move;

save("magicKnight",game);
}

function nextPhase(){
game.phase++;
if(game.phase>=phases.length){
game.phase=0;
game.round++;
}
render();
}

function newRound(){
game.phase=0;
game.round++;
render();
}

function change(k,v){
game[k]+=v;
if(game[k]<0) game[k]=0;
render();
}

render();
