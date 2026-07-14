const phases=[
{
name:"① 神话阶段",
tasks:["+1 Doom","抽遭遇卡"]
},
{
name:"② 调查员阶段",
tasks:["每人3行动"]
},
{
name:"③ 敌人阶段",
tasks:["Hunter移动","敌人攻击"]
},
{
name:"④ 整备阶段",
tasks:["Ready全部","+1牌","+1资源"]
}
];

let game=load("soloGame",{
round:1,
phase:0,
doom:0,
clue:0,
resource:5,
health:5,
horror:0
});

function render(){

document.getElementById("round").innerHTML=game.round;

document.getElementById("doom").innerHTML=game.doom;
document.getElementById("clue").innerHTML=game.clue;
document.getElementById("resource").innerHTML=game.resource;
document.getElementById("health").innerHTML=game.health;
document.getElementById("horror").innerHTML=game.horror;

let phase=phases[game.phase];

document.getElementById("phaseName").innerHTML=phase.name;

document.getElementById("phaseTasks").innerHTML=
phase.tasks.map(x=>"<li>"+x+"</li>").join("");

save("soloGame",game);
}

function change(key,value){
game[key]+=value;
if(game[key]<0) game[key]=0;
render();
}

function nextPhase(){
game.phase++;
if(game.phase>=4) game.phase=0;
render();
}

function newRound(){
game.round++;
game.phase=0;
render();
}

render();
