// Parasites
// Adds Parasites to the Life category.
//
// - Parasites are tiny wriggling worms. They crawl towards people nearby.
// - When a parasite touches a person, it burrows in and the person is INFECTED.
// - After a moment the infected person turns: their skin goes green, they stop being scared,
//   and they chase other people. If they bite someone, that person gets infected too!
// - Healthy people are scared of infected people and run away from them.
// - Infected people sometimes drop new parasites, and when they die, parasites crawl out.
// - Parasites die from heat (fire, over 50°C) and freezing cold.

var PARASITE_SEEK_RANGE = 8;       // how far a parasite can sense people
var INFECT_TURN_TICKS = 60;        // how long before an infected person turns (about 2 seconds)
var INFECTED_CHASE_RANGE = 25;     // how far an infected person looks for people to chase
var INFECTED_BITE_CHANCE = 0.15;   // chance per tick of biting someone right next to them
var INFECTED_DROP_CHANCE = 0.0015; // chance per tick of dropping a new parasite

function parasiteIsPerson(p) {
	return !!p && (p.element === "head" || p.element === "body");
}

// Find the head and body that belong together.
function personParts(p) {
	if (p.element === "head") {
		var b = !isEmpty(p.x, p.y + 1, true) ? pixelMap[p.x][p.y + 1] : null;
		return { head: p, body: (b && b.element === "body") ? b : null };
	}
	var h = !isEmpty(p.x, p.y - 1, true) ? pixelMap[p.x][p.y - 1] : null;
	return { head: (h && h.element === "head") ? h : null, body: p };
}

function infectPerson(p) {
	var parts = personParts(p);
	var done = false;
	[parts.head, parts.body].forEach(function(part) {
		if (!part || part.infected !== undefined || part.dead) return;
		part.infected = pixelTicks;
		done = true;
	});
	return done;
}

function isTurned(p) {
	return p.infected !== undefined && pixelTicks - p.infected >= INFECT_TURN_TICKS;
}

// Green, sick-looking skin and clothes once turned.
function infectedColor(p) {
	if (p.preInfectColor === undefined) p.preInfectColor = p.color;
	var green = p.element === "head" ? "rgb(122,156,88)" : "rgb(70,88,58)";
	if (p.color !== green) p.color = green;
}

elements.parasite = {
	color: ["#d9c7a3", "#c9a98a", "#e6d6b8", "#b88f74"],
	category: "life",
	state: "solid",
	density: 1050,
	temp: 25,
	tempHigh: 50,
	stateHigh: "dead_bug",
	tempLow: -10,
	stateLow: "dead_bug",
	burn: 80,
	burnTime: 20,
	burnInto: "ash",
	breakInto: "slime",
	reactions: {
		"salt": { elem1: "dead_bug", chance: 0.1 },
		"bleach": { elem1: "dead_bug", chance: 0.5 },
		"acid": { elem1: null, chance: 0.5 },
		"alcohol": { elem1: "dead_bug", chance: 0.1 }
	},
	desc: "Tiny worms that crawl into people and infect them. Infected people turn green and bite others to spread it!",
	tick: function(pixel) {
		// Fall like a little worm.
		if (tryMove(pixel, pixel.x, pixel.y + 1)) { doHeat(pixel); doBurning(pixel); return; }

		// Burrow into a person it's touching.
		for (var i = 0; i < squareCoords.length; i++) {
			var x = pixel.x + squareCoords[i][0], y = pixel.y + squareCoords[i][1];
			if (isEmpty(x, y, true)) continue;
			var t = pixelMap[x][y];
			if (parasiteIsPerson(t) && !t.dead && t.infected === undefined) {
				if (infectPerson(t)) { deletePixel(pixel.x, pixel.y); return; }
			}
		}

		// Crawl towards the nearest person it can sense, otherwise wriggle about.
		if (Math.random() < 0.3) {
			var dir = Math.random() < 0.5 ? -1 : 1;
			var best = null;
			for (var dx = -PARASITE_SEEK_RANGE; dx <= PARASITE_SEEK_RANGE; dx++) {
				for (var dy = -PARASITE_SEEK_RANGE; dy <= 2; dy++) {
					var px = pixel.x + dx, py = pixel.y + dy;
					if (isEmpty(px, py, true)) continue;
					var q = pixelMap[px][py];
					if (parasiteIsPerson(q) && !q.dead && q.infected === undefined) {
						var d = Math.abs(dx) + Math.abs(dy);
						if (!best || d < best.d) best = { d: d, dx: dx };
					}
				}
			}
			if (best && best.dx !== 0) dir = best.dx > 0 ? 1 : -1;
			if (!tryMove(pixel, pixel.x + dir, pixel.y)) tryMove(pixel, pixel.x + dir, pixel.y - 1); // climb small steps
		}
		doHeat(pixel);
		doBurning(pixel);
	}
};

// Give infected people their new behaviour, on top of the normal human behaviour.
function infectedBite(pixel) {
	for (var i = 0; i < squareCoords.length; i++) {
		var x = pixel.x + squareCoords[i][0], y = pixel.y + squareCoords[i][1];
		if (isEmpty(x, y, true)) continue;
		var t = pixelMap[x][y];
		if (!parasiteIsPerson(t) || t.dead || t.infected !== undefined) continue;
		if (Math.random() < INFECTED_BITE_CHANCE && infectPerson(t)) {
			if (typeof warnSay === "function") warnSay("infected:bite", "Someone got bitten!");
			return;
		}
	}
}

// Look left and right for a healthy person to chase. Returns -1, 1 or 0.
function infectedFindPrey(pixel) {
	var best = 0, bestD = 9999;
	for (var dx = -INFECTED_CHASE_RANGE; dx <= INFECTED_CHASE_RANGE; dx++) {
		if (dx === 0) continue;
		for (var dy = -3; dy <= 3; dy++) {
			var x = pixel.x + dx, y = pixel.y + dy;
			if (isEmpty(x, y, true)) continue;
			var t = pixelMap[x][y];
			if (parasiteIsPerson(t) && !t.dead && t.infected === undefined && Math.abs(dx) < bestD) {
				bestD = Math.abs(dx); best = dx > 0 ? 1 : -1;
			}
		}
	}
	return best;
}

// Healthy people run away from infected people they can see.
function healthyLookForInfected(pixel) {
	if (Math.random() > 0.25) return;
	for (var d = 1; d < 12; d++) {
		var x = pixel.x + d * pixel.dir;
		for (var dy = -1; dy <= 0; dy++) {
			if (isEmpty(x, pixel.y + dy, true)) continue;
			var t = pixelMap[x][pixel.y + dy];
			if (parasiteIsPerson(t) && isTurned(t) && !t.dead) {
				pixel.panic = Math.min(50, (pixel.panic || 0) + 3);
				pixel.dir *= -1;
				return;
			}
		}
	}
}

var parasiteOldBodyTick = elements.body.tick;
elements.body.tick = function(pixel) {
	if (pixel.infected === undefined) {
		if (!pixel.dead) healthyLookForInfected(pixel);
		parasiteOldBodyTick(pixel);
		return;
	}
	var turned = isTurned(pixel);
	if (turned && !pixel.dead) {
		pixel.panic = 2;                         // restless, keeps moving, never scared
		var prey = infectedFindPrey(pixel);
		if (prey !== 0) pixel.dir = prey;
	}
	parasiteOldBodyTick(pixel);
	if (pixel.del || pixel.element !== "body") return;
	if (turned) {
		infectedColor(pixel);
		if (!pixel.dead) {
			infectedBite(pixel);
			var prey2 = infectedFindPrey(pixel);
			if (prey2 !== 0) pixel.dir = prey2;
			if (Math.random() < INFECTED_DROP_CHANCE && isEmpty(pixel.x - pixel.dir, pixel.y)) createPixel("parasite", pixel.x - pixel.dir, pixel.y);
		}
		else if (!pixel.parasitesOut) {
			// Parasites crawl out of a dead infected person.
			pixel.parasitesOut = true;
			for (var i = 0; i < squareCoords.length; i++) {
				var x = pixel.x + squareCoords[i][0], y = pixel.y + squareCoords[i][1];
				if (Math.random() < 0.4 && isEmpty(x, y)) createPixel("parasite", x, y);
			}
		}
	}
};

var parasiteOldHeadTick = elements.head.tick;
elements.head.tick = function(pixel) {
	parasiteOldHeadTick(pixel);
	if (pixel.del || pixel.element !== "head" || pixel.infected === undefined) return;
	if (isTurned(pixel)) {
		infectedColor(pixel);
		if (!pixel.dead) infectedBite(pixel);
	}
};

// Infected people show it when you point at them.
elements.body.hoverStat = function(pixel) { return pixel.infected !== undefined ? (isTurned(pixel) ? "INFECTED" : "Infected (turning...)") : (pixel.dead ? "Dead" : "Healthy"); };
elements.head.hoverStat = elements.body.hoverStat;
