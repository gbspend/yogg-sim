# yogg-sim
Yogg-Saron Simulator for Hearthstone WotOG expansion

This Javascript simulator simulates the effects of the Hearthstone card Yogg-Saron on a customizable board. The simulator includes all Standard spells (including all WotOG spells) with exceptions and imperfect simulations listed below.

Using the simulator via index.html: Set the number of spells, click "Summon", and "Next" to step through the spells!

Using the simulator via Javascript: ys.js is my Model, sim.js is my crappy View and Controller and can be safely discarded :) sim.js is a good reference, however for how to use ys.js.
The basics are: create a new Game object, set game.me and game.op to your and your opponent's board state, and call spells[x].effect(game) to simulate that spell's effect on the game

Spells not included (for obvious reasons):

* Renounce Darkness

* Evolve

Imperfectly simulated:

* Decks are just numbers, not actual cards: Beneath the Grounds, Holy Wrath

* Leokk doesn't buff other minions: Animal Companion, Call of the Wild

* Ancestral Spirit doesn't summon in place

* Sense Demons only adds worthless Imps

* Forbidden Shaping only summons 0-cost minions

* Anyfin Can Happen summons random (non-WotOG) murlocs, but none of them have their effects

* Bane of Doom summons random (non-WotOG) demons (when appropriate), but none of them have their effects

* Mindgames always gives a 3/3

* Resurrect always gives a 3/3



