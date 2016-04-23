function MinStats(n,a,h,d,t,r){
	this.name = n;
	this.atk = a;
	this.hp = h;
	this.dam = d;
	this.taunt = t;
	this.tribe = r;
}

var game = new Game();
var yslist = [];

var mymins = []; //array of MinStats (NOT MINIONS)
var opmins = [];
var meweap = 0;
var medur = 0;
var opweap = 0;
var opdur = 0;
var mehp = 30;
var mearm = 0;
var ophp = 30;
var oparm = 0;
var mehand = 0;
var medeck = random(10,15);
var ophand = 0;
var opdeck = random(10,15);
var memana = 10;
var opmana = 10;

function defaults(){
	mymins = [];
	opmins = [];
	meweap = 0;
	medur = 0;
	opweap = 0;
	opdur = 0;
	mehp = 30;
	mearm = 0;
	ophp = 30;
	oparm = 0;
	mehand = 0;
	medeck = random(10,15);
	ophand = 0;
	opdeck = random(10,15);
	memana = 10;
	opmana = 10;

	mehand = 3;
	ophand = 6;

	opmana = 9;
	opweap = 3;
	opdur = 4;

	mearm = 2;

	mymins.push(new MinStats("Spider Tank",3,4,0,false,"Mech"));
	mymins.push(new MinStats("Silverback Patriarch",1,4,2,true,"Beast"));

	opmins.push(new MinStats("Chillwind Yeti",4,5,1,false,""));
	opmins.push(new MinStats("Defias Ringleader",2,2,0,false,""));
	opmins.push(new MinStats("Defias Bandit",2,1));
	opmins.push(new MinStats("Imp",1,1,0,false,"Demon"));
}
defaults();

function defaultButton(){
	defaults();
	reset(true);
}

function reset(form){
	game = new Game();
	yslist = [];

	game.me.weap = meweap;
	game.me.dur = medur;
	game.op.weap = opweap;
	game.op.dur = opdur;
	game.me.hp = mehp;
	game.me.armor = mearm;
	game.op.hp = ophp;
	game.op.armor = oparm;
	game.me.deck = medeck;
	game.op.deck = opdeck;
	game.me.mana = memana;
	game.me.maxmana = memana;
	game.op.mana = opmana;
	game.op.maxmana = opmana;
	game.me.hand = buildhand(mehand);
	game.op.hand = buildhand(ophand);
	game.me.board.mins = buildmins(mymins);
	game.me.board.updateSlots();
	game.op.board.mins = buildmins(opmins);
	game.op.board.updateSlots();
	
	if (form){
		//keep everything in sync
		document.getElementById("defmeweap").value = meweap;
		document.getElementById("defmedur").value = medur;
		document.getElementById("defopweap").value = opweap;
		document.getElementById("defopdur").value = opdur;
		document.getElementById("defmehp").value = mehp;
		document.getElementById("defmearm").value = mearm;
		document.getElementById("defophp").value = ophp;
		document.getElementById("defoparm").value = oparm;
		document.getElementById("defmehand").value = mehand;
		document.getElementById("defmedeck").value = medeck;
		document.getElementById("defophand").value = ophand;
		document.getElementById("defopdeck").value = opdeck;
		document.getElementById("defopmana").value = opmana;
	}
	
	update();
}

function buildhand(n){
	var ret = [];
	while (n--) ret.push("");
	return ret;
}

function buildmins(mins){
	var ret = [];
	for (var i=0; i<mins.length; i++){
		var s = mins[i];
		var m = new Minion(s.name,s.atk,s.hp);
		if (s.dam > 0) m.damage(s.dam,game);
		m.taunt = s.taunt;
		m.tribe = s.tribe;
		ret.push(m);
	}
	return ret;
}

function spinnerChange(e){
	var n = parseInt(e.value);
	var min = parseInt(e.min);
	var max = parseInt(e.max);
	if (n < min) n = min;
	if (n > max) n = max;
	e.value = n;
}

function summonButton(){
	yslist = [];
	var n = parseInt(document.getElementById("yoggspells").value);
	start(n);
}

function start(n){
	document.getElementById("summonctrl").style.display = "none";
	document.getElementById("boardctrl").style.display = "none";
	document.getElementById("nextctrl").style.display = "block";
	var ys = new Minion("Yogg-Saron",7,5);
	game.summon(true,ys);
	game.me.mana = 0;
	var l = spells.length-1;
	while(n--) yslist.push(spells[random(l)]);
	update();
}

function updateButton(){
	meweap = parseInt(document.getElementById("defmeweap").value);
	medur = parseInt(document.getElementById("defmedur").value);
	if (medur < 1) meweap = 0;
	opweap = parseInt(document.getElementById("defopweap").value);
	opdur = parseInt(document.getElementById("defopdur").value);
	if (opdur < 1) opweap = 0;
	mehp = parseInt(document.getElementById("defmehp").value);
	mearm = parseInt(document.getElementById("defmearm").value);
	ophp = parseInt(document.getElementById("defophp").value);
	oparm = parseInt(document.getElementById("defoparm").value);
	mehand = parseInt(document.getElementById("defmehand").value);
	medeck = parseInt(document.getElementById("defmedeck").value);
	ophand = parseInt(document.getElementById("defophand").value);
	opdeck = parseInt(document.getElementById("defopdeck").value);
	opmana = parseInt(document.getElementById("defopmana").value);
	reset(true);
}

function removelast(f){
	if (f) mymins.pop();
	else opmins.pop();
	reset();
}

function addmin(f){
	if (f && mymins.length > 6) return;
	if (!f && opmins.length > 6) return;
	var n = document.getElementById("minname").value;
	var a = parseInt(document.getElementById("minatk").value);
	var h = parseInt(document.getElementById("minhp").value);
	var d = parseInt(document.getElementById("mindam").value);
	if (d < 0 || d >= h) d = 0;
	var t = false;
	if (document.getElementById("mintaunt").checked) t = true;
	var r = document.getElementById("mintribe").value;
	var m = new MinStats(n,a,h,d,t,r);
	if (f) mymins.push(m);
	else opmins.push(m);
	reset();
}

function nextButton(){
	if (yslist.length > 0) adv();
	else {
		reset();
		document.getElementById("summonctrl").style.display = "block";
		document.getElementById("boardctrl").style.display = "block";
		document.getElementById("nextctrl").style.display = "none";
		document.getElementById("nextbtn").value = "Next";
	}
}

function adv(){
	var curr = yslist.shift();
	var s = curr.effect(game);
	if (s) game.hist.push(s);
	
	//check for player death(s)
	
	if (yslist.length == 0){
		game.hist.push("DONE");
		document.getElementById("nextbtn").value = "Reset";
	}
	
	update();
}

//draw all
function update(){
	//cards
	var mycards = document.getElementById("mycards");
	var opcards = document.getElementById("opcards");
	updateCards(game.me.hand, mycards);
	updateCards(game.op.hand, opcards);
	
	//my face
	var atk = game.me.atk + (game.me.dur > 0? game.me.weap: 0);
	if (atk < 1) atk = "";
	document.getElementById("myatk").innerHTML = atk;
	var hp = game.me.hp + "";
	if (game.me.armor > 0){
		hp = game.me.armor + "<br>" + hp;
	}
	document.getElementById("myhp").innerHTML = hp;
	if (game.me.dur > 0){ //has weapon
		document.getElementById("myweapdiv").style.visibility = "visible";
		document.getElementById("myweapatk").innerHTML = game.me.weap;
		document.getElementById("myweapdur").innerHTML = game.me.dur;
	}
	else{
		document.getElementById("myweapdiv").style.visibility = "hidden";
	}
	document.getElementById("myname").innerHTML = game.me.frozen? "<br>Frozen": ""; //1.2
	//op face
	var atk = game.op.atk + (game.op.dur > 0? game.op.weap: 0);
	if (atk < 1) atk = "";
	document.getElementById("opatk").innerHTML = atk;
	var hp = game.op.hp + "";
	if (game.op.armor > 0){
		hp = game.op.armor + "<br>" + hp;
	}
	document.getElementById("ophp").innerHTML = hp;
	if (game.op.dur > 0){ //has weapon
		document.getElementById("opweapdiv").style.visibility = "visible";
		document.getElementById("opweapatk").innerHTML = game.op.weap;
		document.getElementById("opweapdur").innerHTML = game.op.dur;
	}
	else{
		document.getElementById("opweapdiv").style.visibility = "hidden";
	}
	document.getElementById("opname").innerHTML = game.op.frozen? "<br>Frozen": ""; //1.2
	
	//mana
	document.getElementById("mymana").innerHTML = game.me.mana + " / " + game.me.maxmana;
	document.getElementById("opmana").innerHTML = game.op.mana + " / " + game.op.maxmana;
	
	//secrets (temp?)
	var s = game.me.secrets.join(", ");
	if (s.length > 0) s = "Secrets: "+s;
	document.getElementById("mysecrets").innerHTML = s;
	s = game.op.secrets.join(", ");
	if (s.length > 0) s = "Secrets: "+s;
	document.getElementById("opsecrets").innerHTML = s;
	
	//minions
	var myboard = document.getElementById("myboard");
	var opboard = document.getElementById("opboard");
	updateBoard(game.me.board.mins, myboard);
	updateBoard(game.op.board.mins, opboard);
	
	//decks (temp?)
	document.getElementById("decks").innerHTML = game.op.deck + "<br><br><br><br><br>" + game.me.deck;
	
	//yogg spells
	var e = document.getElementById("upcomingdiv");
	e.innerHTML = "";
	for (var i=0; i<yslist.length; i++){
		var s = yslist[i];
		var n = document.createElement("div");
		n.appendChild(document.createTextNode(s.name));
		e.appendChild(n);
	}
	
	//history
	var e = document.getElementById("histarea");
	e.innerHTML = game.hist.join("\n");
	
	//notes
	var e = document.getElementById("mynotes");
	var s = game.me.notes.join(", ");
	if (s.length > 0) s = "Notes: "+s;
	e.innerHTML = s;
}

function updateCards(cards, e){
	e.innerHTML = "";
	for (var i=0; i<cards.length; i++){
		var n = document.createElement("div");
		n.className = "hand-card";
		var textnode = document.createTextNode(cards[i]);
		n.appendChild(textnode);
		e.appendChild(n); 
	}
}

function updateBoard(mins, e){
	e.innerHTML = "";
	for (var i=0; i<mins.length; i++){
		var m = mins[i];
		var n = document.createElement("div");
		n.className = "min ht";
		
		var ns = m.getNotes();
		if (ns.length > 0) {
			var s = document.createElement("span");
			s.className = "tooltip";
			var notes = "Notes: "+ns.join(", ");
			s.appendChild(document.createTextNode(notes));
			n.appendChild(s);
		}
		
		var t = document.createElement("div");
		t.className = "min-name";
		t.innerHTML = m.cardText();
		n.appendChild(t);
		var a = document.createElement("div");
		a.className = "atk";
		a.appendChild(document.createTextNode(m.atk));
		n.appendChild(a);
		var h = document.createElement("div");
		h.className = "hp";
		if (m.hp < m.maxhp) h.innerHTML = "<span style='color:red'>"+m.hp+"</span>";
		else h.appendChild(document.createTextNode(m.hp));
		n.appendChild(h);
		
		e.appendChild(n); 
	}
}
	