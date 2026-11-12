// Gas Pressure
// Gases now build up pressure when they're trapped in a closed space.
//
// - Every few ticks, each connected pocket of gas is checked. If it's sealed in (no open space touching it),
//   its pressure builds up over time. Hot gas (like steam above 100°C) builds pressure faster -
//   a sealed box of boiling water is a pressure cooker!
// - High pressure BURSTS the walls around it, making a hole. Hard things (steel) last much longer than
//   soft things (glass, wood). Indestructible Wall never breaks. Once there's a hole, the gas rushes out.
// - Pressure PUSHES loose things - powders, liquids and other gases - like a piston. In a cylinder (a tube),
//   trapped gas under some powder pushes the whole plug of powder up; gas above pushes it down.
//   As it pushes, the gas expands into the space it made and its pressure drops a little.
// - Trapped gas holds firm: powders and liquids can't sink through it.
// - Using the Pressure tool on a gas compresses it and adds pressure straight away.

var PRESSURE_SCAN_TICKS = 3;      // how often gas pockets are checked
var PRESSURE_GAIN = 3;            // pressure gained per check while sealed
var PRESSURE_LEAK = 0.5;          // share of pressure kept per check when open (0.5 = halves)
var PRESSURE_MAX = 300;
var PRESSURE_PUSH_AT = 25;        // pressure needed to start pushing
var PRESSURE_BURST_AT = 90;       // pressure needed to start bursting walls
var PRESSURE_PUSH_REACH = 40;     // longest line of stuff a gas can push
var PRESSURE_MAX_POCKET = 4000;   // bigger pockets than this are treated as open air
var PRESSURE_HOLDS_AT = 3;        // trapped gas at this pressure can't be sunk through

// Gases that shouldn't build pressure (effects, clouds, light...)
var PRESSURE_IGNORE = ["fire", "cold_fire", "light", "laser", "flash", "explosion", "pop", "electric",
	"radiation", "liquid_light", "smoke_grenade", "portal_in", "portal_out", "rainbow", "static", "bless"];

function gasPressureApplies(pixel) {
	var info = elements[pixel.element];
	if (!info || info.state !== "gas") return false;
	if (PRESSURE_IGNORE.indexOf(pixel.element) !== -1) return false;
	if (pixel.element.indexOf("cloud") !== -1) return false;
	return true;
}

// Trapped gas can't be squeezed aside: powders and liquids can't sink through it.
validateMoves(function(pixel, nx, ny) {
	if (isEmpty(nx, ny, true)) return true;
	var target = pixelMap[nx][ny];
	if (!target || (target.pressure || 0) < PRESSURE_HOLDS_AT) return true;
	if (!gasPressureApplies(target)) return true;
	var info = elements[pixel.element];
	if (info && info.state !== "gas") return false;
	return true;
});

// Push a line of loose pixels one step in direction (dx, dy), starting at (sx, sy).
// Returns true if it moved (the start cell is now empty).
function gasPressurePushLine(sx, sy, dx, dy, pocketId) {
	var chain = [];
	var x = sx, y = sy;
	for (var i = 0; i < PRESSURE_PUSH_REACH; i++) {
		if (outOfBounds(x, y)) return false;
		var p = pixelMap[x][y];
		if (!p) break;                                            // space at the end
		if (elements[p.element].movable !== true) return false;   // blocked by something solid
		if (p.pocketId === pocketId) return false;               // don't push our own gas
		chain.push(p);
		x += dx; y += dy;
		if (i === PRESSURE_PUSH_REACH - 1) return false;
	}
	if (chain.length === 0) return false;
	for (var j = chain.length - 1; j >= 0; j--) {
		movePixel(chain[j], chain[j].x + dx, chain[j].y + dy);
	}
	return true;
}

var gasPressureScanId = 0;
var gasPressurePocketCount = 0;

function gasPressureScan() {
	gasPressureScanId++;
	var scan = gasPressureScanId;
	var list = currentPixels.slice();
	for (var i = 0; i < list.length; i++) {
		var start = list[i];
		if (start.del || start.pocketScan === scan || !gasPressureApplies(start)) continue;

		// Collect this pocket of gas, and everything touching it.
		var pocket = [];
		var open = false;
		var contacts = [];   // [gasPixel, dx, dy] for each non-pocket neighbour
		var queue = [start];
		var pocketId = ++gasPressurePocketCount;
		start.pocketScan = scan;
		start.pocketId = pocketId;
		var maxP = 0, hot = 0;
		while (queue.length) {
			var g = queue.pop();
			pocket.push(g);
			if ((g.pressure || 0) > maxP) maxP = g.pressure;
			if (g.temp > 100) hot += g.temp - 100;
			if (pocket.length > PRESSURE_MAX_POCKET) { open = true; }
			for (var k = 0; k < adjacentCoords.length; k++) {
				var dx = adjacentCoords[k][0], dy = adjacentCoords[k][1];
				var nx = g.x + dx, ny = g.y + dy;
				if (outOfBounds(nx, ny) || isEmpty(nx, ny)) { open = true; continue; }
				var n = pixelMap[nx][ny];
				if (n.pocketScan === scan) continue;
				if (gasPressureApplies(n)) { n.pocketScan = scan; n.pocketId = pocketId; queue.push(n); }
				else contacts.push([g, dx, dy]);
			}
		}

		// Work out the pocket's pressure.
		var p = maxP;
		if (open) p = p * PRESSURE_LEAK;
		else p = Math.min(PRESSURE_MAX, p + PRESSURE_GAIN + (hot / pocket.length) / 25);
		if (p < 0.5) p = 0;
		for (var m = 0; m < pocket.length; m++) pocket[m].pressure = p;
		if (open || p < PRESSURE_PUSH_AT || contacts.length === 0) continue;

		// Push and burst whatever's around it.
		var pushChance = Math.min(1, (p - PRESSURE_PUSH_AT) / 40);
		var size = pocket.length;
		var burst = false;
		for (var c = 0; c < contacts.length; c++) {
			var gp = contacts[c][0], ddx = contacts[c][1], ddy = contacts[c][2];
			if (gp.del) continue;
			var tx = gp.x + ddx, ty = gp.y + ddy;
			if (isEmpty(tx, ty, true)) continue;
			var t = pixelMap[tx][ty];
			var tinfo = elements[t.element];
			if (tinfo.movable === true) {
				if (Math.random() < pushChance && gasPressurePushLine(tx, ty, ddx, ddy, pocketId)) {
					// The gas expands into the space it made.
					createPixel(gp.element, tx, ty);
					var ng = pixelMap[tx][ty];
					if (ng) { ng.temp = gp.temp; ng.pocketScan = scan; ng.pocketId = pocketId; pocket.push(ng); }
					size++;
					p = p * (size - 1) / size;
				}
			}
			else if (p >= PRESSURE_BURST_AT) {
				var hardness = tinfo.hardness !== undefined ? tinfo.hardness : 0.5;
				if (hardness >= 1) continue;
				var chance = ((p - PRESSURE_BURST_AT) / 1500) * (1 - hardness);
				if (Math.random() < chance) {
					if (isBreakable(t)) breakPixel(t);
					else deletePixel(tx, ty);
					burst = true;
				}
			}
		}
		if (burst) p = p * 0.5;
		for (var q = 0; q < pocket.length; q++) if (!pocket[q].del) pocket[q].pressure = p;
	}
}

runEveryTick(function() {
	if (paused) return;
	if (pixelTicks % PRESSURE_SCAN_TICKS !== 0) return;
	gasPressureScan();
});
