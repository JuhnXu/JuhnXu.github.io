function save(k,v){
localStorage.setItem(k,JSON.stringify(v));
}

function load(k,d){
let v=localStorage.getItem(k);
return v?JSON.parse(v):d;
}
