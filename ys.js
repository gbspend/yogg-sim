//make it a class so we can reset
function Game () {
	this.me = new Player(true);
	this.op = new Player(false);
	this.hist = []; //array of strings (spells that YS played)
	
	this.summon = function (f,m){
		if (f) this.me.board.add(m);
		else this.op.board.add(m);
	}
	this.kill = function (f,s){
		if (f) this.me.board.kill(this,s);
		else this.op.board.kill(this,s);
	}
}

//f = "friendly": boolean (true = me, false = opponent)
function Player (f) {
	this.name = f? "Me": "Opponent";
	this.me = f;
	this.hp = 30;
	this.maxhp = 30;
	this.armor = 0;
	this.atk = 0; //HERO atk (not total)
	this.weap = 0; //WEAPON atk
	this.dur = 0; //weapon durability
	this.maxmana = 10; //total mana crystals
	this.mana = 10; //full crystals
	
	this.deck = 10; //cards left in deck
	this.fat = 1; //next fatigue damage
	this.hand = []; //array of strings
	this.secrets = []; //array of strings
	this.board = new Board(f);
	this.notes = [];
	
	this.frozen = false;
	this.cs = false; //commanding shout 1.2
	
	this.damage = function (i, game) {
		if (i < 1) return;
		var temp = this.armor;
		this.armor -= i;
		i -= temp;
		if (this.armor < 0) this.armor = 0;
		if (i > 0){
			this.hp -= i;
			//check death externally
		}
	}
	this.heal = function (i) {
		this.hp += i;
		if (this.hp > this.maxhp) this.hp = this.maxhp;
	}
	this.addHand = function (s) {
		if (this.hand.length < 10) this.hand.push(s);
	}
	this.discardRand = function () {
		var i = random(this.hand.length-1);
		this.hand.splice(i,1);
	}
	this.addSecret = function (s) {
		if (this.secrets.length < 5 && this.secrets.indexOf(s) == -1) this.secrets.push(s);
	}
	this.drawx = function (x) {
		while (x--) this.draw();
	}
	this.draw = function (msg) {
		if (!msg) msg = "";
		if (this.deck > 0){
			this.deck--;
			this.addHand("[Drawn from deck"+msg+"]");
		}
		else {
			//fatigue
			this.damage(this.fat,null);
			this.fat++;
		}
	}
	this.addManaEmpty = function (i){
		this.maxmana += i;
		if (this.maxmana > 10) this.maxmana = 10;
	}
	this.addManaFull = function (i){
		this.addManaEmpty(i);
		this.mana += i;
		if (this.mana > 10) this.mana = 10;
	}
	
	//"duck typing"
	this.isMinion = false;
	this.isPlayer = true;
	this.id = -1;
}

function Board (f) {
	this.friend = f; //friendly or enemy board
	this.mins = []; //array of minions
	
	this.size = function(){
		return this.mins.length;
	}
	//returns true if was able to add minion, false otherwise
	this.add = function (m) {
		if (this.mins.length < 7){
			m.friend = this.friend;
			m.slot = this.mins.length;
			this.mins.push(m);
			return true;
		}
		else return false;
	}
	this.kill = function (game,s) {
		var m = this.mins[s];
		this.mins.splice(s,1);
		this.updateSlots();
		m.die(game);
	}
	this.updateSlots = function () {
		var i = this.mins.length;
		while (i--){
			this.mins[i].slot = i;
			this.mins[i].friend = this.friend;
		}
	}
}

var nextId = 1;

//n = name: string
//a,h = attack,health: int
function Minion (n,a,h) {
	this.name = n;
	this.id = nextId++;
	this.origatk = a; //needed for silence
	this.orighp = h;
	this.atk = a; //current
	this.hp = h; //current
	this.maxhp = h;
	//with these ^ shouldn't need to track buff number
	
	//these will be set when added to board
	this.friend = false;
	this.slot = -1;
	
	this.tribe = "";
	this.notes = []; // notes like blessing of wisdom, etc (and deathrattles, temp!)
	this.taunt = false;
	this.divine = false;
	this.charge = false;
	this.immune = false; //assume that Yogg can target Immune creatures
	this.wind = false;
	this.stealth = false;
	this.frozen = false;
	
	//extra stuff
	this.leokk = false;
	this.igb = false; //imp gang boss
	this.ds = false; //dreadsteed
	this.tk = false; //tiny knight of evil
	this.wg = false; //wrathguard
	
	this.origtaunt = false; //feral spirits, etc
	this.origcharge = false; //huffer, etc
	
	//deathrattles:
	//	Ancestral Spirit	Give a minion "Deathrattle: Resummon this minion."
	this.as = 0;
	//	Soul of the Forest	Give your minions "Deathrattle: Summon a 2/2 Treant."
	this.sf = 0;
	//	Explorer's Hat		Give a minion +1/+1 and "Deathrattle: Add an Explorer's Hat to your hand."
	this.eh = 0;
	//	Infest				Give your minions: "Deathrattle: Add a random Beast to your hand"
	this.sp = 0;
	
	//can manipulate atk directly
	this.buffhp = function (i) { //for double just pass in this.hp
		this.maxhp += i;
		this.hp += i;
	}
	this.silence = function () {
		var full = false;
		if (this.maxhp == this.hp) full = true;
		this.atk = this.origatk;
		this.maxhp = this.orighp;
		if (this.hp > this.maxhp) this.hp = this.maxhp; //I'm pretty sure this is right
		if (full) this.hp = this.maxhp; //1.2.2
		this.notes = []; // notes like blessing of wisdom, etc (and deathrattles, temp!)
		this.taunt = false;
		this.divine = false;
		this.immune = false;
		this.charge = false;
		this.wind = false;
		this.stealth = false;
		this.frozen = false;
		this.as = 0;
		this.sf = 0;
		this.eh = 0;
		this.sp = 0;
	}
	this.damage = function (i, game) {
		if (i < 1 || this.immune) return;
		if (this.divine) {
			this.divine = false;
			return;
		}
		this.hp -= i;
		if (this.hp < 1) {
			//1.2
			var who = game.me;
			if (!this.friend) who = game.op;
			if (who.cs) this.hp = 1;
			else this.kill(game);
		}
	}
	this.heal = function (i) {
		this.hp += i;
		if (this.hp > this.maxhp) this.hp = this.maxhp;
	}
	this.kill = function (game) {
		game.kill(this.friend,this.slot);
	}
	this.die = function (game) {
		//"deathrattles"
		while (this.as > 0) { //IMPERFECT
			var m = new Minion(this.name,this.origatk,this.orighp);
			if (this.origtaunt) m.taunt = true;
			if (this.origcharge) m.charge = true;
			m.tribe = this.tribe;
			game.summon(this.friend,m);
			this.as--;
		}
		while (this.sf > 0) {
			game.summon(this.friend, new Minion("Treant",2,2));
			this.sf--;
		}
		while (this.eh > 0) {
			var c = "Explorer's Hat";
			if (this.friend) game.me.addHand(c);
			else game.op.addHand(c);
			this.eh--;
		}
		while (this.sp > 0) {
			var c = "[Random Beast]";
			if (this.friend) game.me.addHand(c);
			else game.op.addHand(c);
			this.sp--;
		}
	}
	
	this.cardText = function () {
		var ret = "<b>" + this.name + "</b>";
		if (this.taunt) ret += "<br>Taunt";
		if (this.immune) ret += "<br>Immune";
		if (this.divine) ret += "<br>Divine Shield";
		if (this.charge) ret += "<br>Charge";
		if (this.wind) ret += "<br>Windfury";
		if (this.stealth) ret += "<br>Stealth";
		if (this.frozen) ret += "<br>Frozen";
		return ret;
	}
	this.getNotes = function () {
		var ret = this.notes.slice(0);
		if (this.as > 0) ret.push("Ancestral Spirit"+(this.as > 1? " ("+this.as+")": ""));
		if (this.sf > 0) ret.push("Soul of the Forest"+(this.sf > 1? " ("+this.sf+")": ""));
		if (this.eh > 0) ret.push("Explorer's Hat"+(this.eh > 1? " ("+this.eh+")": ""));
		if (this.sp > 0) ret.push("[Add Random Beast]"+(this.sp > 1? " ("+this.sp+")": ""));
		return ret;
	}
	
	//"duck typing"
	this.isMinion = true;
	this.isPlayer = false;
}

////////////////////////////////
//random helpers

//passing 1 argument rolls from 0-arg
function random(min, max){
    if (max === undefined){
        max = min;
        min = 0;
    }
    if (min > max){
        var temp = min;
        min = max;
        max = temp;
    }
    else if (max == min) return min;
    return Math.floor(Math.random()*(max-min+1)+min);
}

//50/50 true/false
function flip(){
    return !random(1);
}

//for now, just flip
function joust(){
	return flip();
}

////////////////////////////////
//chooser helpers

//returns a random minion from either side
function aminion(game){
	var both = game.me.board.size() + game.op.board.size();
	if (both == 0) return null;
	var i = random(both-1);
	if (i < game.me.board.size()){
		return game.me.board.mins[i];
	}
	else{
		i -= game.me.board.size();
		return game.op.board.mins[i];
	}
}

//random enemy minion
function enemyminion(game){
	if (game.op.board.size() == 0) return null;
	return game.op.board.mins[random(game.op.board.size()-1)];
}

//random friendly minion
function myminion(game){
	if (game.me.board.size() == 0) return null;
	return game.me.board.mins[random(game.me.board.size()-1)];
}

//random enemy character
//BE CAREFUL WITH THE OBJECT RETURNED FROM THIS (or check isPlayer/isMinion)
function enemy(game){
	var both = game.op.board.size() + 1;
	var i = random(both-1);
	if (i < game.op.board.size()){
		return game.op.board.mins[i];
	}
	else return game.op;
}

//random friendly character
//BE CAREFUL WITH THE OBJECT RETURNED FROM THIS (or check isPlayer/isMinion)
function friendly(game){
	var both = game.me.board.size() + 1;
	var i = random(both-1);
	if (i < game.me.board.size()){
		return game.me.board.mins[i];
	}
	else return game.me;
}

//random friendly character
//BE CAREFUL WITH THE OBJECT RETURNED FROM THIS (or check isPlayer/isMinion)
function character(game){
	var both = game.me.board.size() + game.op.board.size();
	var i = random(both+2-1);
	if (i < game.me.board.size()){
		return game.me.board.mins[i];
	}
	i -= game.me.board.size();
	if (i < game.op.board.size()){
		return game.op.board.mins[i];
	}
	i -= game.op.board.size();
	if (i) return game.me;
	else return game.op;
}

function dotoenemymins(game, f){
	var pointers = [];
	for (var i=0; i<game.op.board.size(); i++){
		pointers.push(game.op.board.mins[i]);
	}
	var i = pointers.length;
	while (i--){
		f(pointers[i]);
	}
}

function dotomymins(game, f){
	var pointers = [];
	for (var i=0; i<game.me.board.size(); i++){
		pointers.push(game.me.board.mins[i]);
	}
	var i = pointers.length;
	while (i--){
		f(pointers[i]);
	}
}

function dotoallmins(game, f){
	dotomymins(game, f);
	dotoenemymins(game, f);
}

function remove(game,friend,slot){
	var m = null;
	if (friend){
		m = game.me.board.mins.splice(slot,1)[0];
		game.me.board.updateSlots();
	}
	else{
		m = game.op.board.mins.splice(slot,1)[0];
		game.op.board.updateSlots();
	}
	return m;
}

function replace(game,friend,slot,m){
	var who = game.me;
	if (!friend) who = game.op;
	who.board.mins[slot] = m;
	who.board.updateSlots();
}

//f is a function that takes a minion and returns bool
//returns array of mins that match f
function matchmins(game,friend,enemy,f){
	if (!friend && !enemy) return [];
	var ret = [];
	if (friend) {
		dotomymins(game, function (m) {
			if (f(m)) ret.push(m);
		});
	}
	if (enemy) {
		dotoenemymins(game, function (m) {
			if (f(m)) ret.push(m);
		});
	}
	return ret;
}

//looks at friend/slot minion and runs f on adjacent mins
//f is a function that takes a minion
function dotoadj(game,friend,slot,f){
	var who = game.me;
	if (!friend) who = game.op;
	var m1 = null;
	var m2 = null;
	if (who.board.size()-1 >= slot+1) m1 = who.board.mins[slot+1];
	if (slot-1 >= 0 && who.board.size()-1 >= slot-1) m2 = who.board.mins[slot-1];
	if (m1) f(m1);
	if (m2) f(m2);
}

function trackRandDam(log,add){
	if (!(add in log)) log[add] = 0;
	log[add]++;
}
function randLogToString(log){
	var s = [];
	for (k in log) {
		var v = log[k];
		s.push(k+" for "+v);
	}
	return s.join(", ");
}

////////////////////////////////

//all "effect" functions return a string that will be logged in history
var spells = [
{name:"Ancestral Healing",effect: function(game){
	//Restore a minion to full Health and give it Taunt.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	var h = m.maxhp - m.hp ;
	m.heal(h);
	m.taunt = true;
	return this.name + " healed "+(m.friend? "my ": "opponent's ")+m.name+" for "+h+" and gave it Taunt";
}},
{name:"Ancestral Knowledge",effect: function(game){
	//Draw 2 cards.
	game.me.drawx(2);
	return this.name + " drew 2 cards";
}},
{name:"Ancestral Spirit",effect: function(game){
	//Give a minion "Deathrattle: Resummon this minion."
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.as++;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Animal Companion",effect: function(game){
	//Summon a random Beast Companion.
	if (game.me.board.size() > 6) return this.name + " fizzled";
	var i = random(2);
	var m = new Minion("Misha",4,4);
	m.taunt = true;
	if (i == 1){
		m = new Minion("Huffer",4,2);
		m.charge = true;
	}
	else if (i == 2){
		m = new Minion("Leokk",2,4); //IMPERFECT
		m.leokk = true;
	}
	m.tribe = "Beast";
	game.summon(true, m);
	return this.name + " summoned "+m.name;
}},
{name:"Anyfin Can Happen",effect: function(game){
	//Summon 7 Murlocs that died this game.
	if (game.me.board.size() > 6) return this.name + " fizzled";
	var n = random(1,6);//IMPERFECT
	var count = n;
	while (n--){
		var m = new Minion("Murloc Raider",2,1);
		switch(random(11)){
			case 0:
				break;
			case 1:
				m = new Minion("Murloc Warleader",3,3); //IMPERFECT
				break;
			case 2:
				m = new Minion("Murloc Tidehunter",2,1); //IMPERFECT
				break;
			case 3:
				m = new Minion("Murloc Knight",3,4);
				break;
			case 4:
				m = new Minion("Murloc Tidecaller",1,2);
				break;
			case 5:
				m = new Minion("Murloc Tinyfin",1,1);
				break;
			case 6:
				m = new Minion("Grimscale Oracle",1,1); //IMPERFECT
				break;
			case 7:
				m = new Minion("Coldlight Oracle",2,2);
				break;
			case 8:
				m = new Minion("Bluegill Warrior",2,1);
				m.charge = true;
				break;
			case 9:
				m = new Minion("Old Murk-Eye",2,4); //IMPERFECT
				m.charge = true;
				break;
			case 10:
				m = new Minion("Coldlight Seer",2,3);
				break;
			case 11:
				m = new Minion("Sir Finley Mrrgglton",1,3);
				break;
		}
		game.summon(true,m);
	}
	return this.name + " summoned "+count;
}},
{name:"Arcane Blast",effect: function(game){
	//Deal 2 damage to a minion. This spell gets double bonus from Spell Damage. 
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(2,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 2";
}},
{name:"Arcane Explosion",effect: function(game){
	//Deal 1 damage to all enemy minions.
	dotoenemymins(game, function (m) {
		m.damage(1,game);
	});
	return this.name;
}},
{name:"Arcane Intellect",effect: function(game){
	//Draw 2 cards.
	game.me.drawx(2);
	return this.name + " drew 2 cards";
}},
{name:"Arcane Missiles",effect: function(game){
	//Deal 3 damage randomly split among all enemies.
	//1.2
	var log = {};
	var i = 3;
	while (i--){
		var c = enemy(game);
		c.damage(1,game);
		trackRandDam(log,(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name);
	}
	return this.name + " damaged: "+randLogToString(log);
}},
{name:"Arcane Shot",effect: function(game){
	//Deal 2 damage.
	var c = character(game);
	c.damage(2,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 2";
}},
{name:"Assassinate",effect: function(game){
	//Destroy an enemy minion.
	var m = enemyminion(game);
	if (!m) return this.name + " fizzled";
	m.kill(game);
	return this.name + " killed "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Astral Communion",effect: function(game){
	//Gain 10 Mana Crystals. Discard your hand.
	game.me.hand = [];
	//1.2
	var excess = false;
	if (game.me.maxmana == 10) {
		excess = true;
		game.me.addHand("Excess Mana");
	}
	else {
		game.me.addManaFull(10);
		game.me.mana = 10;
	}
	if (excess) return this.name + " gave Excess Mana";
	else return this.name + " added Mana Crystals";
}},
{name:"Avenging Wrath",effect: function(game){
	//Deal 8 damage randomly split among all enemies.
	//1.2
	var log = {};
	var i = 8;
	while (i--){
		var c = enemy(game);
		c.damage(1,game);
		trackRandDam(log,(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name);
	}
	return this.name + " damaged: "+randLogToString(log);
}},
{name:"Backstab",effect: function(game){
	//Deal 2 damage to an undamaged minion.
	var mins = matchmins(game,true,true, function (m) {
		return m.hp == m.maxhp;
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.damage(2,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 2";
}},
{name:"Ball of Spiders",effect: function(game){
	//Summon three 1/1 Webspinners.
	if (game.me.board.size() > 6) return this.name + " fizzled";
	var i = 3;
	while (i--){
		var m = new Minion("Webspinner",1,1);
		m.tribe = "Beast";
		m.sp++;
		game.summon(true,m);
	}
	return this.name + " summoned Webspinners";
}},
{name:"Bane of Doom",effect: function(game){
	//Deal 2 damage to a character. If that kills it, summon a random Demon.
	var c = character(game);
	c.damage(2,game);
	var sumn = false;
	if (c.hp < 1 && game.me.board.size() < 7){
		var sumn = true;
		var demons = [];
		var m = new Minion("Flame Imp",3,2);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Tiny Knight of Evil",3,2);
		m.tk = true;
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Dreadsteed",1,1);
		m.ds = true;
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Pit Lord",5,6);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Voidwalker",1,3);
		m.taunt = true;
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Imp Gang Boss",2,4);
		m.igb = true;
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Dread Infernal",6,6);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Void Crusher",5,4);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Blood Imp",0,1);
		m.stealth = true;
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Illidan Stormrage",7,5);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Wrathguard",4,3);
		m.wg = true;
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Fearsome Doomguard",6,8);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Doomguard",5,7);
		m.charge = true;
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Void Terror",3,3);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Succubus",4,3);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Lord Jaraxxus",3,15);
		m.tribe = "Demon";
		demons.push(m);
		m = new Minion("Felguard",3,5);
		m.taunt = true;
		m.tribe = "Demon";
		demons.push(m);
		var n = demons[random(demons.length-1)];
		game.summon(true,n);
	}
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 2"+(sumn? " and summoned "+n.name: "");
}},
{name:"Bash",effect: function(game){
	//Deal 3 damage. Gain 3 Armor.
	var c = character(game);
	c.damage(3,game);
	game.me.armor += 3;
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 3 and I gained 3 Armor";
}},
{name:"Battle Rage",effect: function(game){
	//Draw a card for each damaged friendly character.
	var i = 0;
	if (game.me.hp < game.me.maxhp) i++; //1.2
	dotomymins(game, function (m) {
		if (m.hp < m.maxhp) i++;
	});
	game.me.drawx(i);
	return this.name + " drew "+i+" cards";
}},
{name:"Bear Trap",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Beneath the Grounds",effect: function(game){
	//Shuffle 3 Ambushes into your opponent's deck
	game.op.deck += 3; //IMPERFECT?
	return this.name;
}},
{name:"Bestial Wrath",effect: function(game){
	//Give a friendly Beast +2 Attack and Immune this turn.
	var mins = matchmins(game,true,false, function (m) {
		return m.tribe == "Beast";
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.atk += 2;
	m.immune = true;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Betrayal",effect: function(game){
	//Force an enemy minion to deal its damage to the minions next to it.
	var n = enemyminion(game);
	if (!n) return this.name + " fizzled";
	dotoadj(game,false,n.slot, function (m) {
		m.damage(n.atk,game);
	});
	return this.name + " damaged "+(n.friend? "my ": "opponent's ")+n.name+"'s adjacent minions for "+n.atk;
}},
{name:"Bite",effect: function(game){
	//Give your hero +4 Attack this turn and 4 Armor.
	game.me.armor += 4;
	game.me.atk += 4;
	return this.name;
}},
{name:"Blade Flurry",effect: function(game){
	//Destroy your weapon and deal its damage to all enemies.
	if (game.me.dur < 1) return this.name + " fizzled";
	var d = game.me.weap;
	game.me.weap = 0;
	game.me.dur = 0;
	dotoenemymins(game, function (m) {
		m.damage(d,game);
	});
	return this.name + " for "+d;
}},
{name:"Blessed Champion",effect: function(game){
	//Double a minion's Attack.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk *= 2;
	return this.name + " doubled "+(m.friend? "my ": "opponent's ")+m.name+"'s Attack";
}},
{name:"Blessing of Kings",effect: function(game){
	//Give a minion +4/+4.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk += 4;
	m.buffhp(4);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Blessing of Might",effect: function(game){
	//Give a minion +3 Attack. 
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk += 3;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Blessing of Wisdom",effect: function(game){
	//Choose a minion. Whenever it attacks, draw a card.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.notes.push(this.name);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Blizzard",effect: function(game){
	//Deal 2 damage to all enemy minions and Freeze them.
	dotoenemymins(game, function (m) {
		m.damage(2,game);
		m.frozen = true;
	});
	return this.name;
}},
{name:"Bloodlust",effect: function(game){
	//Give your minions +3 Attack this turn.
	dotomymins(game, function (m) {
		m.atk += 3;
	});
	return this.name;
}},
{name:"Bolster",effect: function(game){
	//Give your Taunt minions +2/+2.
	dotomymins(game, function (m) {
		if (m.taunt){
			m.atk += 2;
			m.buffhp(2);
		}
	});
	return this.name;
}},
{name:"Brawl",effect: function(game){
	//Destroy all minions except one. 
	var both = game.me.board.size() + game.op.board.size();
	if (both < 2) return this.name + " fizzled";
	var n = aminion(game); //1.2
	dotoallmins(game, function (m) {
		if (m.id == n.id) return;
		m.kill(game);
	});
	return this.name + " left only "+(n.friend? "my ": "opponent's ")+n.name+" alive";
}},
{name:"Burgle",effect: function(game){
	//Add 2 random class cards to your hand (from your opponent's class).
	game.me.addHand("[Burgled]");
	game.me.addHand("[Burgled]");
	return this.name;
}},
{name:"Charge",effect: function(game){
	//Give a friendly minion +2 Attack and Charge.
	var m = myminion(game);
	if (!m) return this.name + " fizzled";
	m.atk += 2;
	m.charge = true;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Circle of Healing",effect: function(game){
	//Restore 4 Health to ALL minions.
	dotoallmins(game, function (m) {
		m.heal(4);
	});
	return this.name;
}},
{name:"Claw",effect: function(game){
	//Give your hero +2 Attack this turn and 2 Armor.
	game.me.armor += 2;
	game.me.atk += 2;
	return this.name;
}},
{name:"Cleave",effect: function(game){
	//Deal 2 damage to two random enemy minions.
	if (game.op.board.size() < 2) return this.name + " fizzled";
	var a = random(game.op.board.size()-1);
	var b = a;
	while (b == a) b = random(game.op.board.size()-1);
	var m1 = null;
	var m2 = null;
	dotoenemymins(game, function (m) {
		if (m.slot == a) m1 = m;
		if (m.slot == b) m2 = m;
	});
	m1.damage(2,game);
	m2.damage(2,game);
	return this.name + " damaged opponent's "+m1.name+" and "+m2.name+" for 2";
}},
{name:"Cold Blood",effect: function(game){
	//Give a minion +2 Attack
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk += 2;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Commanding Shout",effect: function(game){
	//Your minions can't be reduced below 1 Health this turn. Draw a card.
	game.me.notes.push(this.name);
	game.me.cs = true; //1.2
	game.me.draw();
	return this.name;
}},
{name:"Competitive Spirit",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Conceal",effect: function(game){
	//Give your minions Stealth until your next turn.
	dotomymins(game, function (m) {
		m.stealth = true;
	});
	return this.name;
}},
{name:"Cone of Cold",effect: function(game){
	//Freeze a minion and the minions next to it, and deal 1 damage to them.
	var n = aminion(game);
	if (!n) return this.name + " fizzled";
	dotoadj(game,n.friend,n.slot, function (m) {
		m.damage(1,game);
		m.frozen = true;
	});
	n.damage(1,game);
	n.frozen = true;
	return this.name + " on "+(n.friend? "my ": "opponent's ")+n.name+" and adjacent minions";
}},
{name:"Confuse",effect: function(game){
	//Swap the Attack and Health of all minions. 
	dotoallmins(game, function (m) {
		var temp = m.hp;
		m.hp = m.atk;
		m.maxhp = m.atk;
		m.atk = temp;
		if (m.hp < 1) m.kill(game); //1.2
	});
	return this.name;
}},
{name:"Consecration",effect: function(game){
	//Deal 2 damage to all enemies. 
	dotoenemymins(game, function (m) {
		m.damage(2,game);
	});
	game.op.damage(2,null);
	return this.name;
}},
{name:"Convert",effect: function(game){
	//Put a copy of an enemy minion into your hand.
	var m = enemyminion(game);
	if (!m) return this.name + " fizzled";
	game.me.addHand(m.name);
	return this.name + " added a copy of "+m.name;
}},
{name:"Corruption",effect: function(game){
	//Choose an enemy minion. At the start of your turn, destroy it.
	var m = enemyminion(game);
	if (!m) return this.name + " fizzled";
	m.notes.push(this.name);
	return this.name + " on opponent's "+m.name;
}},
{name:"Counterspell",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Curse of Rafaam",effect: function(game){
	//Give your opponent a 'Cursed!' card.
	game.op.addHand("Cursed!");
	return this.name;
}},
{name:"Dark Bargain",effect: function(game){
	//Destroy 2 random enemy minions. Discard 2 random cards
	if (game.op.board.size() < 2) return this.name + " fizzled";
	var i = 2;
	var mins = "";
	while (i--){
		var s = random(game.op.board.size()-1);
		var m = game.op.board.mins[s];
		if (mins.length == 0) mins += m.name + " and ";
		else mins += m.name;
		game.kill(false,s);
	}
	game.me.discardRand();
	game.me.discardRand();
	return this.name + " on opponent's "+mins+" and discarded 2";
}},
{name:"Dart Trap",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Deadly Poison",effect: function(game){
	//Give your weapon +2 Attack.
	if (game.me.dur < 1) return this.name + " fizzled";
	game.me.weap += 2;
	return this.name;
}},
{name:"Deadly Shot",effect: function(game){
	//Destroy a random enemy minion.
	var m = enemyminion(game);
	if (!m) return this.name + " fizzled";
	m.kill(game);
	return this.name + " killed opponent's "+m.name;
}},
{name:"Demonfire",effect: function(game){
	//Deal 2 damage to a minion. If it's a friendly Demon, give it +2/+2 instead.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	if (m.friend && m.tribe == "Demon") {
		m.atk += 2;
		m.buffhp(2);
	}
	else m.damage(2,game);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Demonfuse",effect: function(game){
	//Give a Demon +3/+3. Give your opponent a Mana Crystal.
	var mins = matchmins(game,true,true, function (m) {
		return m.tribe == "Demon";
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.atk += 3;
	m.buffhp(3);
	game.op.addManaFull(1);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Demonwrath",effect: function(game){
	//Deal 2 damage to all non-Demon minions.
	dotoallmins(game, function (m) {
		if (m.tribe != "Demon") m.damage(2,game);
	});
	return this.name;
}},
{name:"Divine Favor",effect: function(game){
	//Draw cards until you have as many in hand as your opponent.
	var c = game.op.hand.length - game.me.hand.length;
	if (c < 0) c = 0;
	else {
		game.me.drawx(c);
	}
	return this.name + " drew "+c;
}},
{name:"Divine Spirit",effect: function(game){
	//Double a minion's Health.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.buffhp(m.hp);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Dragon's Breath",effect: function(game){
	//Deal 4 damage.
	var c = character(game);
	c.damage(4,game);
	return this.name + " damaged "+c.name+" for 4";
}},
{name:"Drain Life",effect: function(game){
	//Deal 2 damage. Restore 2 Health to your hero
	var c = character(game);
	c.damage(2,game);
	game.me.heal(2);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 2";
}},
{name:"Earth Shock",effect: function(game){
	//Silence a minion, then deal 1 damage to it.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.silence();
	m.damage(1,game);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Effigy",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Elemental Destruction",effect: function(game){
	//Deal 4-5 damage to all minions.
	dotoallmins(game, function (m) {
		m.damage(random(4,5),game);
	});
	return this.name;
}},
{name:"Enter the Coliseum",effect: function(game){
	//Destroy all minions except each player's highest Attack minion.
	var myhi = -1;
	var myid = -1;
	var ophi = -1;
	var opid = -1;
	dotoallmins(game, function (m) {
		if (m.friend && m.atk > myhi){
			myhi = m.atk;
			myid = m.id;
		}
		else if (!m.friend && m.atk > ophi){
			ophi = m.atk;
			opid = m.id;
		}
	});
	dotoallmins(game, function (m) {
		//1.2
		if ((m.friend && m.id == myid) ||
			(!m.friend && m.id == opid)){
			//do nothing
		}
		else m.kill(game);
	});
	return this.name;
}},
{name:"Entomb",effect: function(game){
	//Choose an enemy minion. Shuffle it into your deck.
	var m = enemyminion(game);
	if (!m) return this.name + " fizzled";
	var m = remove(game,false,m.slot);
	game.me.deck++;
	return this.name + " on opponent's "+m.name;
}},
{name:"Equality",effect: function(game){
	//Change the Health of ALL minions to 1.
	dotoallmins(game, function (m) {
		m.hp = 1;
		m.maxhp = 1;
	});
	return this.name;
}},
{name:"Everyfin is Awesome",effect: function(game){
	//Give your minions +2/+2.
	dotomymins(game, function (m) {
		m.atk += 2;
		m.buffhp(2);
	});
	return this.name;
}},
{name:"Eviscerate",effect: function(game){
	//Deal 2 damage
	var c = character(game);
	c.damage(2,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 2";
}},
{name:"Excavated Evil",effect: function(game){
	//Deal 3 damage to all minions. Shuffle this card into your opponent's deck.
	dotoallmins(game, function (m) {
		m.damage(3,game);
	});
	game.op.deck += 1;
	return this.name;
}},
{name:"Execute",effect: function(game){
	//Destroy a damaged enemy minion.
	var mins = matchmins(game,false,true, function (m) {
		return m.hp < m.maxhp;
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.kill(game);
	return this.name + " on opponent's "+m.name;
}},
{name:"Explorer's Hat",effect: function(game){
	//Give a minion +1/+1 and "Deathrattle: Add an Explorer's Hat to your hand."
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk++;
	m.buffhp(1);
	m.eh++;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Explosive Shot",effect: function(game){
	//Deal 5 damage to a minion and 2 damage to adjacent ones.
	var n = aminion(game);
	if (!n) return this.name + " fizzled";
	dotoadj(game,n.friend,n.slot, function (m) {
		m.damage(2,game);
	});
	n.damage(5,game);
	return this.name + " on "+(n.friend? "my ": "opponent's ")+n.name+" and adjacent minions";
}},
{name:"Explosive Trap",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Eye for an Eye",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Fan of Knives",effect: function(game){
	//Deal 1 damage to all enemy minions. Draw a card
	dotoenemymins(game, function (m) {
		m.damage(1,game);
	});
	game.me.draw();
	return this.name;
}},
{name:"Far Sight",effect: function(game){
	//Draw a card. That card costs (3) less
	game.me.draw(", costs 3 less");
	return this.name + " drew a card";
}},
{name:"Feral Spirit",effect: function(game){
	//Summon two 2/3 Spirit Wolves with Taunt.
	if (game.me.board.size() > 6) return this.name + " fizzled";
	var i = 2;
	while (i--){
		var m = new Minion("Spirit Wolf",2,3);
		m.taunt = true;
		game.summon(true,m);
	}
	return this.name;
}},
{name:"Fireball",effect: function(game){
	//Deal 6 damage
	var c = character(game);
	c.damage(6,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 6";
}},
{name:"Fist of Jaraxxus",effect: function(game){
	//Deal 4 damage to a random enemy.
	var c = enemy(game);
	c.damage(4,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 4";
}},
{name:"Flame Lance",effect: function(game){
	//Deal 8 damage to a minion. 
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(8,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 8";
}},
{name:"Flamestrike",effect: function(game){
	//Deal 4 damage to all enemy minions. 
	dotoenemymins(game, function (m){
		m.damage(4,game);
	});
	return this.name;
}},
{name:"Flare",effect: function(game){
	//All minions lose Stealth. Destroy all enemy Secrets. Draw a card.
	dotoallmins(game, function (m) {
		m.stealth = false;
	});
	game.op.secrets = [];
	game.me.draw();
	return this.name;
}},
{name:"Flash Heal",effect: function(game){
	//Restore 5 Health.
	var c = character(game);
	c.heal(5);
	return this.name + " healed "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 5";
}},
{name:"Force of Nature",effect: function(game){
	//Summon three 2/2 Treants with Charge that die at the end of the turn.
	if (game.me.board.size() > 6) return this.name + " fizzled";
	var i = 3;
	while (i--){
		game.summon(true, new Minion("Treant",2,2));
	}
	return this.name;
}},
{name:"Forgotten Torch",effect: function(game){
	//Deal 3 damage. Shuffle a (6 damage for 3 mana card) into your deck.
	var c = character(game);
	c.damage(3,game);
	game.me.deck++;
	return this.name + " on "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name;
}},
{name:"Forked Lightning",effect: function(game){
	//Deal 2 damage to 2 random enemy minions
	if (game.op.board.size() < 2) return this.name + " fizzled";
	var a = random(game.op.board.size()-1);
	var b = a;
	while (b == a) b = random(game.op.board.size()-1);
	var m1 = null;
	var m2 = null;
	dotoenemymins(game, function (m) {
		if (m.slot == a) m1 = m;
		if (m.slot == b) m2 = m;
	});
	m1.damage(2,game);
	m2.damage(2,game);
	return this.name + " damaged opponent's "+m1.name+" and "+m2.name+" for 2";
}},
{name:"Freezing Trap",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Frost Nova",effect: function(game){
	//Freeze all enemy minions. 
	if (game.op.board.size() < 1) return this.name + " fizzled";
	dotoenemymins(game, function (m) {
		m.frozen = true;
	});
	return this.name;
}},
{name:"Frost Shock",effect: function(game){
	//Deal 1 damage to an enemy character and Freeze it.
	var c = enemy(game);
	c.damage(1,game);
	c.frozen = true;
	return this.name + " on "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name;
}},
{name:"Frostbolt",effect: function(game){
	//Deal 3 damage to a character and Freeze it.
	var c = character(game);
	c.damage(3,game);
	c.frozen = true;
	return this.name + " on "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name;
}},
{name:"Gang Up",effect: function(game){
	//Choose a minion. Shuffle 3 copies of it into your deck.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	game.me.deck += 3;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Hammer of Wrath",effect: function(game){
	//Deal 3 damage. Draw a card.
	var c = character(game);
	c.damage(3,game);
	game.me.draw();
	return this.name + " on "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" and drew a card";
}},
{name:"Hand of Protection",effect: function(game){
	//Give a minion Divine Shield.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.divine = true;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Headcrack",effect: function(game){
	//Deal 2 damage to the enemy hero.
	game.op.damage(2,game);
	return this.name + " damaged Opponent for 2";
}},
{name:"Healing Touch",effect: function(game){
	//Restore 8 Health.
	var c = character(game);
	c.heal(8);
	return this.name + " healed "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 8";
}},
{name:"Healing Wave",effect: function(game){
	//Restore 7 Health. Reveal a minion in each deck. If yours costs more, Restore 14 instead
	var h = joust()? 14: 7;
	var c = character(game);
	c.heal(h);
	return this.name + " healed "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for "+h;
}},
{name:"Hellfire",effect: function(game){
	//Deal 3 damage to ALL characters
	dotoallmins(game, function (m) {
		m.damage(3,game);
	});
	game.me.damage(3,null);
	game.op.damage(3,null);
	return this.name;
}},
{name:"Heroic Strike",effect: function(game){
	//Give your hero +4 Attack this turn.
	game.me.atk += 4;
	return this.name;
}},
{name:"Hex",effect: function(game){
	//Transform a minion into a 0/1 Frog with Taunt
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	var t = new Minion("Frog",0,1);
	t.taunt = true;
	t.tribe = "Beast"; //1.2.2
	replace(game,m.friend,m.slot,t);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Holy Fire",effect: function(game){
	//Deal 5 damage. Restore 5 Health to your hero
	var c = character(game);
	c.damage(5,game);
	game.me.heal(5);
	return this.name + " on "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name;
}},
{name:"Holy Light",effect: function(game){
	//Restore 6 Health
	var c = character(game);
	c.heal(6);
	return this.name + " healed "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 6";
}},
{name:"Holy Nova",effect: function(game){
	//Deal 2 damage to all enemies. Restore 2 Health to all friendly characters.
	dotoenemymins(game, function (m) {
		m.damage(2,game);
	});
	game.op.damage(2,game); //1.2
	dotomymins(game, function (m) {
		m.heal(2);
	});
	game.me.heal(2); //1.2
	return this.name;
}},
{name:"Holy Smite",effect: function(game){
	//Deal 2 damage
	var c = character(game);
	c.damage(2,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 2";
}},
{name:"Holy Wrath",effect: function(game){
	//Draw a card and deal damage equal to its cost.
	var deck = game.me.deck;
	game.me.draw();
	if (deck > 0){
		var c = character(game);
		var d = random(1,9);
		c.damage(d,game); //IMPERFECT
		return this.name + " drew a card and damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for "+d;
	}
	else return this.name + " drew a card";
}},
{name:"Humility",effect: function(game){
	//Change a minion's Attack to 1.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk = 1;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Hunter's Mark",effect: function(game){
	//Change a minion's Health to 1.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.hp = 1;
	m.maxhp = 1;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Ice Barrier",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Ice Block",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Ice Lance",effect: function(game){
	//Freeze a character. If it was already Frozen, deal 4 damage instead.
	var c = character(game);
	var dmg = false;
	if (c.frozen) {
		dmg = true;
		c.damage(4,game);
	}
	else {
		c.frozen = true;
	}
	var name = (c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name;
	if (dmg) return this.name + " damaged "+name+" for 4";
	else return this.name + " froze "+name;
}},
{name:"Inner Fire",effect: function(game){
	//Change a minion's Attack to be equal to its Health. 
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk = m.hp;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Inner Rage",effect: function(game){
	//Deal 1 damage to a minion and give it +2 Attack.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(1,game);
	m.atk += 2;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Innervate",effect: function(game){
	//Gain 2 Mana Crystals this turn only.
	game.me.addManaFull(2);
	return this.name;
}},
{name:"Kill Command",effect: function(game){
	//Deal 3 damage. If you have a Beast, deal 5 damage instead.
	var have = false;
	dotomymins(game, function (m) {
		if (m.tribe == "Beast") have = true;
	});
	var d = have? 5: 3;
	var c = character(game);
	c.damage(d, game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for "+d;
}},
{name:"Lava Burst",effect: function(game){
	//Deal 5 damage.
	var c = character(game);
	c.damage(5,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 5";
}},
{name:"Lava Shock",effect: function(game){
	//Deal 2 damage.
	var c = character(game);
	c.damage(2,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 2";
}},
{name:"Lay on Hands",effect: function(game){
	//Restore 8 Health. Draw 3 cards. 
	var c = character(game);
	c.heal(8);
	game.me.drawx(3);
	return this.name + " healed "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 8 and drew 3 cards";
}},
{name:"Lightning Bolt",effect: function(game){
	//Deal 3 damage
	var c = character(game);
	c.damage(3,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 3";
}},
{name:"Lightning Storm",effect: function(game){
	//Deal 2-3 damage to all enemy minions
	dotoenemymins(game, function (m) {
		m.damage(random(2,3),game);
	});
	return this.name;
}},
{name:"Living Roots",effect: function(game){
	//Choose One - Deal 2 damage; or Summon two 1/1 Saplings.
	var dmg = false;
	if (flip()){
		dmg = true;
		var c = character(game);
		c.damage(2,game);
	}
	else {
		if (game.me.board.size() > 6) return this.name + " fizzled";
		var i = 2;
		while (i--){
			var m = new Minion("Sapling",1,1);
			game.summon(true,m);
		}
	}
	if (dmg) return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 2";
	else return this.name + " summoned Saplings";
}},
{name:"Lock and Load",effect: function(game){
	//
	game.me.notes.push(this.name); //1.2
	return this.name + " (doesn't affect Yogg-Saron spells)";
}},
{name:"Mark of Nature",effect: function(game){
	//Choose One - Give a minion +4 Attack; or +4 Health and Taunt.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	var taunt = false;
	if (flip()){
		taunt = true;
		m.taunt = true;
		m.buffhp(4);
	}
	else {
		m.atk += 4;
	}
	return this.name + " gave "+(m.friend? "my ": "opponent's ")+m.name+(taunt? " +4 Health and Taunt": "+4 Attack");
}},
{name:"Mark of the Wild",effect: function(game){
	//Give a minion Taunt and +2/+2.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.taunt = true;
	m.buffhp(2);
	m.atk += 2;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Mass Dispel",effect: function(game){
	//Silence all enemy minions. Draw a card.
	dotoenemymins(game, function (m) {
		m.silence();
	});
	game.me.draw();
	return this.name;
}},
{name:"Mind Blast",effect: function(game){
	//Deal 5 damage to the enemy hero.
	game.op.damage(5,game);
	return this.name + " damaged Opponent for 5";
}},
{name:"Mind Control",effect: function(game){
	//Take control of an enemy minion.
	var s = game.op.board.size();
	if (s < 1) return this.name + " fizzled";
	var m = remove(game,false,random(s-1));
	game.summon(true,m);
	return this.name + " stole opponent's "+m.name;
}},
{name:"Mind Vision",effect: function(game){
	//Put a copy of a random card in your opponent's hand into your hand.
	if (game.op.hand.length < 1) return this.name + " fizzled";
	game.me.addHand("[Copy of opponent's hand card]");
	return this.name;
}},
{name:"Mindgames",effect: function(game){
	//Put a copy of a random minion from your opponent's deck into the battlefield.
	var m = new Minion("[Mindgames]",3,3); //IMPERFECT
	game.summon(true,m);
	return this.name + " summoned a 3/3 (partial implementation)";
}},
{name:"Mirror Entity",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Mirror Image",effect: function(game){
	//Summon two 0/2 minions with Taunt. 
	if (game.me.board.size() > 6) return this.name + " fizzled";
	var i = 2;
	while (i--){
		var m = new Minion("Mirror Image",0,2);
		m.taunt = true;
		game.summon(true,m);
	}
	return this.name;
}},
{name:"Misdirection",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Moonfire",effect: function(game){
	//Deal 1 damage.
	var c = character(game);
	c.damage(1,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 1";
}},
{name:"Mortal Coil",effect: function(game){
	//Deal 1 damage to a minion. If that kills it, draw a card
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(1,game);
	var drew = false;
	if (m.hp < 1) {
		drew = true;
		game.me.draw();
	}
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 1"+(drew? " and drew a card": "");
}},
{name:"Mortal Strike",effect: function(game){
	//Deal 4 damage. If you have 12 or less Health, deal 6 instead.
	var d = 4;
	if (game.me.hp <= 12) d = 6;
	var c = character(game);
	c.damage(d,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for "+d;
}},
{name:"Mulch",effect: function(game){
	//Destroy a minion. Add a random minion to your opponent's hand.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.kill(game);
	game.op.addHand("[Random minion]");
	return this.name + " destroyed "+(m.friend? "my ": "opponent's ")+m.name+" and Opponent got a random minion";
}},
{name:"Multi-Shot",effect: function(game){
	//Deal 3 damage to two random enemy minions.
	if (game.op.board.size() < 2) return this.name + " fizzled";
	var a = random(game.op.board.size()-1);
	var b = a;
	while (b == a) b = random(game.op.board.size()-1);
	var m1 = null;
	var m2 = null;
	dotoenemymins(game, function (m) {
		if (m.slot == a) m1 = m;
		if (m.slot == b) m2 = m;
	});
	m1.damage(3,game);
	m2.damage(3,game);
	return this.name + " damaged opponent's "+m1.name+" and "+m2.name+" for 3";
}},
{name:"Naturalize",effect: function(game){
	//Destroy a minion. Your opponent draws 2 cards.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.kill(game);
	game.op.drawx(2);
	return this.name + " destroyed "+(m.friend? "my ": "opponent's ")+m.name+" and Opponent drew 2";
}},
{name:"Noble Sacrifice",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Nourish",effect: function(game){
	//Choose One - Gain 2 Mana Crystals; or Draw 3 cards.
	var mana = false;
	if (flip()) {
		mana = true;
		game.me.addManaFull(2);
	}
	else {
		game.me.drawx(3);
	}
	if (mana) return this.name + " added 2 Mana Crystals";
	return this.name + " drew 3 cards";
}},
{name:"Polymorph",effect: function(game){
	//Transform a minion into a 1/1 Sheep.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	var t = new Minion("Sheep",1,1);
	t.tribe = "Beast";
	replace(game,m.friend,m.slot,t);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Polymorph: Boar",effect: function(game){
	//Transform a minion into a 4/2 Boar with Charge. 
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	var t = new Minion("Boar",4,2);
	t.charge = true;
	t.tribe = "Beast";
	replace(game,m.friend,m.slot,t);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Power of the Wild",effect: function(game){
	//Choose One - Give your minions +1/+1; or Summon a 3/2 Panther.
	var buff = false;
	if (flip()){
		buff = true; //1.2
		if (game.me.board.size() == 0) return this.name + " fizzled";
		dotomymins(game, function (m) {
			m.atk += 1;
			m.buffhp(1);
		});
	}
	else {
		if (game.me.board.size() > 6) return this.name + " fizzled";
		var m = new Minion("Panther",3,2);
		m.tribe = "Beast";
		game.summon(true,m);
	}
	if (buff) return this.name + " buffed my minions";
	else return this.name + " summoned a Panther";
}},
{name:"Power Overwhelming",effect: function(game){
	//Give a friendly minion +4/+4 until end of turn. Then, it dies. Horribly.
	var m = myminion(game);
	if (!m) return this.name + " fizzled";
	m.atk += 4;
	m.buffhp(4);
	m.notes.push(this.name);
	return this.name + " on my "+m.name;
}},
{name:"Power Word: Glory",effect: function(game){
	//Choose a minion. Whenever it attacks, restore 4 Health to your hero.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.notes.push(this.name);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Power Word: Shield",effect: function(game){
	//Give a minion +2 Health. Draw a card.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.buffhp(2);
	game.me.draw();
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Powershot",effect: function(game){
	//Deal 2 damage to a minion and the minions next to it.
	var n = aminion(game);
	if (!n) return this.name + " fizzled";
	dotoadj(game,n.friend,n.slot, function (m) {
		m.damage(2,game);
	});
	n.damage(2,game);
	return this.name + " on "+(n.friend? "my ": "opponent's ")+n.name+" and adjacent minions";
}},
{name:"Preparation",effect: function(game){
	//The next spell you cast this turn costs (3) less.
	game.me.notes.push(this.name);
	return this.name;
}},
{name:"Pyroblast",effect: function(game){
	//Deal 10 damage
	var c = character(game);
	c.damage(10,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 10";
}},
{name:"Quick Shot",effect: function(game){
	//Deal 3 damage. If your hand is empty, draw a card.
	var c = character(game);
	c.damage(3,game);
	var drew = false;
	if (game.me.hand.length == 0){
		game.me.draw();
		drew = true;
	}
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 3"+(drew? " and drew": "");
}},
{name:"Rampage",effect: function(game){
	//Give a damaged minion +3/+3.
	var mins = matchmins(game,true,true, function (m) {
		return m.hp < m.maxhp;
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.atk += 3;
	m.buffhp(3);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Raven Idol",effect: function(game){
	//Choose One - Discover a minion; or Discover a spell.
	var s = "spell";
	if (flip()) s = "minion";
	game.me.addHand("[Discovered "+s+"]");
	return this.name + " added a "+s;
}},
{name:"Redemption",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Repentance",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Resurrect",effect: function(game){
	//Summon a random friendly minion that died this game. 
	var m = new Minion("[Resurrect]",3,3); //IMPERFECT
	game.summon(true,m);
	return this.name + " summoned a 3/3 (partial implementation)";
}},
{name:"Revenge",effect: function(game){
	//Deal 1 damage to all minions. If you have 12 or less Health, deal 3 damage instead.
	var d = (game.me.hp <= 12)? 3: 1;
	dotoallmins(game, function (m) {
		m.damage(d,game);
	});
	return this.name + " damaged all minions for "+d;
}},
{name:"Rockbiter Weapon",effect: function(game){
	//Give a friendly character +3 Attack this turn.
	var c = friendly(game);
	c.atk += 3;
	return this.name + " on "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name;
}},
{name:"Sacred Trial",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Sacrificial Pact",effect: function(game){
	//Destroy a Demon. Restore 5 Health to your hero. 
	var mins = matchmins(game,true,true, function (m) {
		return m.tribe == "Demon";
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.kill(game);
	game.me.heal(5);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Sap",effect: function(game){
	//Return an enemy minion to your opponent's hand.
	var s = game.op.board.size();
	if (s < 1) return this.name + " fizzled";
	var m = remove(game,false,random(s-1));
	game.op.addHand(m.name);
	return this.name + " on opponent's "+m.name;
}},
{name:"Savage Roar",effect: function(game){
	//Give your characters +2 Attack this turn.
	dotomymins(game, function (m) {
		m.atk += 2;
	});
	game.me.atk += 2;
	return this.name;
}},
{name:"Savagery",effect: function(game){
	//Deal damage equal to your hero's Attack to a minion.
	var m = aminion(game);
	var d = game.me.atk + game.me.weap;
	if (!m || d < 1) return this.name + " fizzled";
	m.damage(d,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for "+d;
}},
{name:"Seal of Champions",effect: function(game){
	//Give a minion +3 Attack and Divine Shield. 
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk += 3;
	m.divine = true;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Sense Demons",effect: function(game){
	//Put 2 random Demons from your deck into your hand
	//1.2
	game.me.addHand("Worthless Imp");
	game.me.addHand("Worthless Imp");
	//IMPERFECT (for a Warlock it would remove from deck)
	return this.name;
}},
{name:"Shadow Bolt",effect: function(game){
	//Deal 4 damage to a minion
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(4,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 4";
}},
{name:"Shadow Madness",effect: function(game){
	//Gain control of an enemy minion with 3 or less Attack until end of turn. 
	var mins = matchmins(game,false,true, function (m) {
		return m.atk <= 3;
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m = remove(game,false,m.slot);
	m.notes.push(this.name);
	game.summon(true,m);
	return this.name + " stole opponent's "+m.name;
}},
{name:"Shadow Word: Death",effect: function(game){
	//Destroy a minion with an Attack of 5 or more. 
	var mins = matchmins(game,true,true, function (m) {
		return m.atk >= 5;
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.kill(game);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Shadow Word: Pain",effect: function(game){
	//Destroy a minion with 3 or less Attack. 
	var mins = matchmins(game,true,true, function (m) {
		return m.atk <= 3;
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.kill(game);
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Shadowflame",effect: function(game){
	//Destroy a friendly minion and deal its Attack damage to all enemy minions.
	var n = myminion(game);
	if (!n) return this.name + " fizzled";
	var d = n.atk;
	n.kill(game);
	dotoenemymins(game, function (m) {
		m.damage(d,game);
	});
	return this.name + " destroyed "+(n.friend? "my ": "opponent's ")+n.name+" and dealt "+d+" damage";
}},
{name:"Shadowform",effect: function(game){
	//Your Hero Power becomes 'Deal 2 damage'. If already in Shadowform: 3 damage.
	game.me.notes.push(this.name);
	return this.name;
}},
{name:"Shadowstep",effect: function(game){
	//Return a friendly minion to your hand. It costs (2) less.
	var s = game.me.board.size();
	if (s < 1) return this.name + " fizzled";
	var m = remove(game,true,random(s-1));
	game.me.addHand(m.name+", costs 2 less");
	return this.name + " on my "+m.name;
}},
{name:"Shield Block",effect: function(game){
	//Gain 5 Armor. Draw a card.
	game.me.armor += 5;
	game.me.draw();
	return this.name;
}},
{name:"Shield Slam",effect: function(game){
	//Deal 1 damage to a minion for each Armor you have
	var a = game.me.armor;
	if (a < 1) return this.name + " fizzled";
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(a,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for "+a;
}},
{name:"Shiv",effect: function(game){
	//Deal 1 damage. Draw a card.
	var c = character(game); //1.2.2
	c.damage(1,game);
	game.me.draw();
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 1";
}},
{name:"Silence",effect: function(game){
	//Silence a minion.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.silence();
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Sinister Strike",effect: function(game){
	//Deal 3 damage to the enemy hero. 
	game.op.damage(3,game);
	return this.name + " damaged Opponent for 3";
}},
{name:"Siphon Soul",effect: function(game){
	//Destroy a minion. Restore 3 Health to your hero.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.kill(game);
	game.me.heal(3);
	return this.name + " killed "+(m.friend? "my ": "opponent's ")+m.name+" and healed Me for 3";
}},
{name:"Slam",effect: function(game){
	//Deal 2 damage to a minion. If it survives, draw a card.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(2,game);
	var drew = false;
	if (m.hp > 0) {
		drew = true;
		game.me.draw();
	}
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 2"+(drew? " and drew a card": "");
}},
{name:"Snake Trap",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Snipe",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Solemn Vigil",effect: function(game){
	//Draw 2 cards. 
	game.me.drawx(2);
	return this.name + " drew 2";
}},
{name:"Soul of the Forest",effect: function(game){
	//Give your minions "Deathrattle: Summon a 2/2 Treant."
	dotomymins(game, function (m) {
		m.sf++;
	});
	return this.name;
}},
{name:"Soulfire",effect: function(game){
	//Deal 4 damage. Discard a random card.
	var c = character(game);
	c.damage(4,game);
	game.me.discardRand();
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 4 and discarded 1";
}},
{name:"Spellbender",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Sprint",effect: function(game){
	//Draw 4 cards. 
	game.me.drawx(4);
	return this.name + " drew 4 cards";
}},
{name:"Starfall",effect: function(game){
	//Choose One - Deal 5 damage to a minion; or 2 damage to all enemy minions.
	var single = false;
	if (flip()) {
		single = true;
		var m = aminion(game);
		if (!m) return this.name + " fizzled";
		m.damage(5,game);
	}
	else {
		dotoenemymins(game, function (m) {
			m.damage(2,game);
		});
	}
	if (single) return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 5";
	else return this.name + " damaged all enemy minions for 2";
}},
{name:"Starfire",effect: function(game){
	//Deal 5 damage. Draw a card.
	//1.2
	var c = character(game);
	c.damage(5,game);
	game.me.draw();
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 5";
}},
{name:"Swipe",effect: function(game){
	//Deal 4 damage to an enemy and 1 damage to all other enemies.
	var c = enemy(game);
	//c.id is -1 for players
	c.damage(4,game);
	dotoenemymins(game, function (m) {
		if (m.id != c.id) m.damage(1,game);
	});
	if (c.isMinion) game.op.damage(1,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 4 and the rest for 1";
}},
{name:"Thoughtsteal",effect: function(game){
	//Copy 2 cards from your opponent's deck and put them into your hand.
	game.me.addHand("[Generated from Thought-steal]");
	game.me.addHand("[Generated from Thought-steal]");
	return this.name;
}},
{name:"Totemic Might",effect: function(game){
	//Give your Totems +2 Health
	dotomymins(game, function (m) {
		if (m.tribe == "Totem") m.buffhp(2);
	});
	return this.name;
}},
{name:"Tracking",effect: function(game){
	//Look at the top three cards of your deck. Draw one and discard the others.
	game.me.draw();
	var d = 2;
	if (game.me.deck <= d) game.me.deck = 0;
	else game.me.deck -= d;
	return this.name;
}},
{name:"Twisting Nether",effect: function(game){
	//Destroy all minions.
	dotoallmins(game, function (m) {
		m.kill(game);
	});
	return this.name;
}},
{name:"Unleash the Hounds",effect: function(game){
	//For each enemy minion, summon a 1/1 Hound with Charge.
	if (game.me.board.size() > 6 || game.op.board.size() == 0) return this.name + " fizzled"; //1.2
	var h = game.op.board.size();
	while (h--){
		var m = new Minion("Hound",1,1);
		m.tribe = "Beast";
		m.charge = true;
		game.summon(true,m);
	}
	return this.name + " summoned "+game.op.board.size()+" Hounds";
}},
{name:"Upgrade!",effect: function(game){
	//If you have a weapon, give it +1/+1. Otherwise equip a 1/3 weapon
	var buff = false;
	if (game.me.dur > 0) {
		buff = true;
		game.me.dur++;
		game.me.weap++;
	}
	else {
		game.me.dur = 3;
		game.me.weap = 1;
	}
	if (buff) return this.name + " buffed my weapon";
	else return this.name + " gave me a 1/3 weapon";
}},
{name:"Vanish",effect: function(game){
	//Return all minions to their owner's hand. 
	if (game.op.board.size() + game.me.board.size() < 1) return this.name + " fizzled";
	dotomymins(game, function (m) {
		remove(game, true, m.slot);
		game.me.addHand(m.name);
	});
	dotoenemymins(game, function (m) {
		remove(game, false, m.slot);
		game.op.addHand(m.name);
	});
	return this.name;
}},
{name:"Vaporize",effect: function(game){
	//Secret
	game.me.addSecret(this.name); return this.name;
}},
{name:"Whirlwind",effect: function(game){
	//Deal 1 damage to ALL minions.
	dotoallmins(game, function (m) {
		m.damage(1,game);
	});
	return this.name;
}},
{name:"Wild Growth",effect: function(game){
	//Gain an empty Mana Crystal.
	if (game.me.maxmana == 10){
		game.me.addHand("Excess Mana");
		return this.name + " gave Excess Mana";
	}
	game.me.addEmptyMana(1);
	return this.name + " added an empty Mana Crystal";
}},
{name:"Windfury",effect: function(game){
	//Give a minion Windfury.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.wind = true;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Wrath",effect: function(game){
	//Choose One - Deal 3 damage to a minion; or 1 damage and draw a card.
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	var draw = false;
	var d = 3;
	if (flip()) {
		draw = true;
		d = 1;
	}
	m.damage(d,game);
	if (draw) game.me.draw();
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for "+d+(draw? " and drew a card": "");
}},
{name:"Stand Against Darkness",effect: function(game){
	//Summon 5 1/1 Silver Hand Recruits
	if (game.me.board.size() > 6) return this.name + " fizzled";
	var i = 5;
	while (i--) {
		game.summon(true, new Minion("Silver Hand Recruit",1,1));
	}
	return this.name;
}},
{name:"Forbidden Flame",effect: function(game){
	//Spend all mana, deal that much damage to a minion
	var m = aminion(game);
	if (!m || game.me.mana == 0) return this.name + " fizzled";
	var a = game.me.mana;
	game.me.mana = 0;
	m.damage(a,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for "+a;
}},
{name:"Forbidden Shaping",effect: function(game){
	//Spend all mana, summon random minion that costs that much
	//1.2
	if (game.me.board.size() > 6)  return this.name + " fizzled";
	game.me.mana = 0;
	var m = new Minion("Murloc Tinyfin",1,1);
	m.tribe = "Murloc";
	var ones = [new Minion("Wisp",1,1), m];
	var n = ones[random(ones.length-1)];
	game.summon(true, n); //IMPERFECT
	return this.name + " summoned "+n.name;
}},
{name:"Forbidden Healing",effect: function(game){
	//Spend all mana, restore twice that much health
	if (game.me.mana == 0) return this.name + " fizzled";
	var a = game.me.mana * 2;
	game.me.mana = 0;
	var c = character(game);
	c.heal(a);
	return this.name + " healed "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for "+a;
}},
{name:"DOOM!",effect: function(game){
	//Destroy all minions, draw a card for each
	var d = 0;
	dotoallmins(game, function (m) {
		m.kill(game);
		d++;
	});
	game.me.drawx(d);
	return this.name + " destroyed all minions and drew "+d;
}},
{name:"Renounce Darkness",effect: function(game){
	//
	return this.name + " not implemented";
}},
{name:"Infest",effect: function(game){
	//Give your minions: "Deathrattle: Add a random Beast to your hand"
	dotomymins(game, function (m) {
		m.sp++;
	});
	return this.name;
}},
{name:"Shadow Word: Horror",effect: function(game){
	//Destroy all minions with 2 or less Attack
	dotoallmins(game, function (m) {
		if (m.atk <= 2) m.kill(game);
	});
	return this.name;
}},
{name:"Mark of Y'Shaarj",effect: function(game){
	//Give a minion +2/+2. If it's a beast, draw a card
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.atk += 2;
	m.buffhp(2);
	if (m.tribe == "Beast") game.me.draw();
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name+(m.tribe == "Beast"? " and drew a card": "");
}},
{name:"Cabalist's Tome",effect: function(game){
	//Add 3 random mage spells to your hand
	var i = 3;
	while (i--) {
		game.me.addHand("[Random Mage spell]");
	}
	return this.name;
}},
{name:"Blood Warriors",effect: function(game){
	//Add a copy of each friendly damaged minion to your hand
	dotomymins(game, function (m) {
		if (m.hp < m.maxhp) game.me.addHand(m.name);
	});
	return this.name;
}},
{name:"Call of the Wild",effect: function(game){
	//Summon all 3 animal companions
	if (game.me.board.size() > 6) return this.name + " fizzled";
	m2 = new Minion("Huffer",4,2);
	m2.charge = true;
	m2.tribe = "Beast";
	game.summon(true, m2);
	
	m3 = new Minion("Leokk",2,4); //IMPERFECT
	m3.tribe = "Beast";
	m3.leokk = true;
	game.summon(true, m3);
	
	var m1 = new Minion("Misha",4,4);
	m1.taunt = true;
	m1.tribe = "Beast";
	game.summon(true, m1);
	return this.name;
}},
{name:"Spreading Madness",effect: function(game){
	//Deal 9 damage randomly split among ALL characters
	//1.2
	var log = {};
	var i = 9;
	while (i--){
		var c = character(game);
		c.damage(1,game);
		trackRandDam(log,(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name);
	}
	return this.name + " damaged: "+randLogToString(log);
}},
{name:"Wisps of the Old Gods",effect: function(game){
	//Choose One - Summon seven 1/1 Wisps; or give your minions +2/+2
	var buff = false;
	if (flip()){
		buff = true;
		if (game.me.board.size() == 0) return this.name + " fizzled";
		dotomymins(game, function (m) {
			m.atk += 2;
			m.buffhp(2);
		});
	}
	else {
		if (game.me.board.size() > 6) return this.name + " fizzled";
		var i = 7;
		while (i--)	game.summon(true,new Minion("Wisp",1,1));
	}
	if (buff) return this.name + " buffed my minions";
	else return this.name + " summoned Wisps";
}},
{name:"Thistle Tea",effect: function(game){
	//Draw a card. Add 2 extra copies of it to your hand
	var deck = game.me.deck;
	game.me.draw(", from Thistle Tea");
	if (deck > 0){
		game.me.addHand("[Copy of Thistle Tea card]");
		game.me.addHand("[Copy of Thistle Tea card]");
	}
	return this.name;
}},
{name:"Embrace the Shadow",effect: function(game){
	//This turn, your healing effects deal damage instead
	game.me.notes.push(this.name);
	return this.name;
}},
{name:"Stormcrack",effect: function(game){
	//4 damage to minion
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(4,game);
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 4";
}},
{name:"Shatter",effect: function(game){
	//Destroy Frozen minion
	var mins = matchmins(game,true,true, function (m) {
		return m.frozen;
	});
	var l = mins.length;
	if (l == 0) return this.name + " fizzled";
	var m = mins[random(l-1)];
	m.kill(game);
	return this.name + " killed "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Primal Fusion",effect: function(game){
	//Give a minion +1/+1 for each of your totems
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	var ts = matchmins(game,true,false, function (m) {
		return m.tribe == "Totem";
	});
	var t = ts.length;
	if (t < 1) return this.name + " fizzled";
	m.buffhp(t);
	m.atk += t;
	return this.name + " gave "+(m.friend? "my ": "opponent's ")+m.name+" +"+t+"/+"+t;
}},
{name:"On the Hunt",effect: function(game){
	//Deal 1 damage. Summon a 1/1 Mastiff (Beast)
	var c = character(game);
	c.damage(1,game);
	var m = new Minion("Mastiff",1,1);
	m.tribe = "Beast";
	game.summon(true,m);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 1 and summoned a Mastiff";
}},
{name:"Forbidden Ritual",effect: function(game){
	//Spend all your mana, summon that many 1/1 tentacles
	if (game.me.mana == 0) return this.name + " fizzled";
	var a = game.me.mana;
	game.me.mana = 0;
	var sum = a;
	while (a--){
		game.summon(true, new Minion("Tentacle",1,1));
	}
	return this.name + " summoned "+sum+" tentacle(s)";
}},
{name:"Evolve",effect: function(game){
	//Transform your minions into random minions that cost (1) more
	return this.name + " not implemented";
}},
{name:"Divine Strength",effect: function(game){
	//Give a minion +1/+2
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.buffhp(2);
	m.atk += 1;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"A Light in the Darkness",effect: function(game){
	//Discover a minion. Give it +1/+1
	game.me.addHand("[Discover minion with +1/+1]");
	return this.name;
}},
{name:"Feral Rage",effect: function(game){
	//Give your hero +4 Atk or 8 Armor
	var a = false;
	if (flip()) {
		game.me.atk += 4;
		a = true;
	}
	else game.me.armor += 8;
	return this.name + " gave me "+(a? "+4 Attack": "8 Armor");
}},
{name:"Blood To Ichor",effect: function(game){
	//Deal 1 damage to a minion. If it survives, summon a 2/2 Slime
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.damage(1,game);
	var sum = false;
	if (m.hp > 0) {
		sum = true;
		game.summon(true, new Minion("Slime",2,2));
	}
	return this.name + " damaged "+(m.friend? "my ": "opponent's ")+m.name+" for 1"+(sum? " and summoned a Slime": "");
}},
{name:"Shadow Strike",effect: function(game){
	//5 damage to an undamaged character
	var cars = matchmins(game,true,true, function (m) {
		return m.hp == m.maxhp;
	});
	if (game.op.hp == game.op.maxhp) cars.push(game.op);
	if (game.me.hp == game.me.maxhp) cars.push(game.me);
	var l = cars.length;
	if (l == 0) return this.name + " fizzled";
	var c = cars[random(l-1)];
	c.damage(5,game);
	return this.name + " damaged "+(c.isPlayer? "": c.friend? "my ": "opponent's ")+c.name+" for 5";
}},
{name:"Power Word: Tentacles",effect: function(game){
	//Give a minion +2/+6
	var m = aminion(game);
	if (!m) return this.name + " fizzled";
	m.buffhp(6);
	m.atk += 2;
	return this.name + " on "+(m.friend? "my ": "opponent's ")+m.name;
}},
{name:"Journey Below",effect: function(game){
	//Discover a Deathrattle card
	game.me.addHand("[Discover deathrattle card]");
	return this.name;
}}
];