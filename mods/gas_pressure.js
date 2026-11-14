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
				if (ny < 0) { open = true; continue; }            // the top edge is open sky
				if (outOfBounds(nx, ny)) continue;                // the floor and sides of the screen are walls
				if (isEmpty(nx, ny)) { open = true; continue; }
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

// ---------------------------------------------------------------------------
// Pumping a box with the Pressure tool
// Hold the Pressure tool inside a closed box (empty or full of gas). After 15 seconds of pumping,
// the box bursts: a hole is blown through its top (or a side, if there's no top). From 8 seconds the box
// shakes, harder and harder, as a warning. This works on any
// wall, even indestructible Wall. Moving to a different box, letting go for a while, or a leak
// resets the timer.

var PUMP_BURST_SECONDS = 15;
var PUMP_HOLE_WIDTH = 5;        // how wide the hole is
var PUMP_MAX_WALL = 12;         // thickest wall it can blow through
var PUMP_MAX_BOX = 20000;       // bigger spaces than this count as open (or half the screen, if bigger)
var PUMP_FORGET_TICKS = 30;     // timer resets if you stop pumping this long

var PUMP_SHAKE_FROM = 8;       // seconds of pumping before the box starts shaking

var pumpState = { key: null, ticks: 0, lastTick: -1000, warned: 0, shake: null, shakeStrength: 0 };

function pumpReset() {
	pumpState.key = null; pumpState.ticks = 0; pumpState.warned = 0;
	pumpState.shake = null; pumpState.shakeStrength = 0;
}

// The wall pixels around a box (going through the wall's thickness), for shaking.
function pumpWallPixels(box) {
	var found = new Set();
	for (var i = 0; i < box.cells.length; i++) {
		var c = box.cells[i];
		for (var k = 0; k < adjacentCoords.length; k++) {
			var dx = adjacentCoords[k][0], dy = adjacentCoords[k][1];
			for (var s = 1; s <= PUMP_MAX_WALL; s++) {
				var x = c[0] + dx * s, y = c[1] + dy * s;
				if (outOfBounds(x, y) || isEmpty(x, y, true) || box.seen[x + "," + y]) break;
				var p = pixelMap[x][y];
				if (!p || gasPressureApplies(p)) break;
				found.add(p);
			}
		}
	}
	return Array.from(found);
}

// Draw the shaking walls: wipe where they really are, then draw them jiggled a little.
renderPostPixel(function(ctx) {
	if (!pumpState.shake || pumpState.shakeStrength <= 0 || paused) return;
	var ps = pixelSize;
	var amp = pumpState.shakeStrength * ps * 0.9;
	var ox = (Math.random() * 2 - 1) * amp, oy = (Math.random() * 2 - 1) * amp;
	var list = pumpState.shake;
	for (var i = 0; i < list.length; i++) {
		var p = list[i];
		if (!p.del) ctx.clearRect(p.x * ps, p.y * ps, ps, ps);
	}
	for (var j = 0; j < list.length; j++) {
		var q = list[j];
		if (q.del) continue;
		ctx.fillStyle = q.color;
		ctx.fillRect(q.x * ps + ox, q.y * ps + oy, ps, ps);
	}
});

// Can pressure spread through this cell? (empty space or a gas)
function pumpPassable(x, y) {
	if (isEmpty(x, y, true)) return true;
	var p = pixelMap[x][y];
	return !!p && gasPressureApplies(p);
}

// Find the closed space under the cursor. Returns null if it's open (leaks to the edge) or too big.
function pumpFindBox(sx, sy) {
	if (outOfBounds(sx, sy) || !pumpPassable(sx, sy)) return null;
	var seen = {};
	var cells = [];
	var queue = [[sx, sy]];
	seen[sx + "," + sy] = true;
	var minKey = null;
	while (queue.length) {
		var c = queue.pop();
		cells.push(c);
		if (cells.length > Math.max(PUMP_MAX_BOX, (width * height) / 2)) return null;
		var k = c[0] * 100000 + c[1];
		if (minKey === null || k < minKey) minKey = k;
		for (var i = 0; i < adjacentCoords.length; i++) {
			var nx = c[0] + adjacentCoords[i][0], ny = c[1] + adjacentCoords[i][1];
			if (ny < 0) return null;                          // reaches the sky (top edge): not a box
			if (outOfBounds(nx, ny)) continue;                // bottom and sides of the screen count as walls
			var key = nx + "," + ny;
			if (seen[key]) continue;
			if (!pumpPassable(nx, ny)) continue;
			seen[key] = true;
			queue.push([nx, ny]);
		}
	}
	return { cells: cells, seen: seen, key: minKey + ":" + cells.length };
}

// Blow a hole in the top of the box (or a side if the top can't be found).
function pumpBurst(box) {
	var sumX = 0;
	for (var i = 0; i < box.cells.length; i++) sumX += box.cells[i][0];
	var midX = sumX / box.cells.length;
	var dirs = [[0, -1], [-1, 0], [1, 0], [0, 1]];   // top first, then sides, then bottom
	for (var d = 0; d < dirs.length; d++) {
		var dx = dirs[d][0], dy = dirs[d][1];
		// Wall cells touching the box on this side.
		var edge = [];
		for (var j = 0; j < box.cells.length; j++) {
			var c = box.cells[j];
			var wx = c[0] + dx, wy = c[1] + dy;
			if (outOfBounds(wx, wy) || box.seen[wx + "," + wy]) continue;
			edge.push(c);
		}
		if (edge.length === 0) continue;
		// The outermost row on this side (e.g. the very top), and the cell nearest the middle.
		var best = null;
		for (var m = 0; m < edge.length; m++) {
			var e = edge[m];
			var depth = dy !== 0 ? e[1] * dy : e[0] * dx;
			var off = dy !== 0 ? Math.abs(e[0] - midX) : 0;
			if (!best || depth > best.depth || (depth === best.depth && off < best.off)) best = { c: e, depth: depth, off: off };
		}
		// Dig the hole outward through the wall.
		var broke = 0;
		var half = Math.floor(PUMP_HOLE_WIDTH / 2);
		for (var w = -half; w <= half; w++) {
			var hx = best.c[0] + (dy !== 0 ? w : 0), hy = best.c[1] + (dx !== 0 ? w : 0);
			for (var s = 1; s <= PUMP_MAX_WALL; s++) {
				var x = hx + dx * s, y = hy + dy * s;
				if (outOfBounds(x, y)) break;
				if (isEmpty(x, y, true)) break;               // through to the outside
				var p = pixelMap[x][y];
				if (!p) break;
				if (gasPressureApplies(p)) break;
				deletePixel(x, y);
				broke++;
			}
		}
		if (broke === 0) continue;
		// Let the gas go: its pressure drops and it gets flung out of the hole.
		for (var q = 0; q < box.cells.length; q++) {
			var g = pixelMap[box.cells[q][0]] && pixelMap[box.cells[q][0]][box.cells[q][1]];
			if (g) g.pressure = 0;
		}
		logMessage("BANG! The box burst open!");
		return true;
	}
	return false;
}

runEveryTick(function() {
	if (paused) return;
	if (!(mouseIsDown && mouseType === "left" && currentElement === "pressure")) {
		if (pixelTicks - pumpState.lastTick > PUMP_FORGET_TICKS) { pumpReset(); }
		return;
	}
	if (pixelTicks % 3 !== 0) return;          // checking every 3 ticks is plenty
	// Pressing on powder that's inside a tube or container: fire it out of the opening like a mortar.
	var blob = mortarFindBlobAt(mousePos.x, mousePos.y);
	if (blob) {
		if (pumpState.key !== "blob" || pixelTicks - pumpState.lastTick > PUMP_FORGET_TICKS) { pumpReset(); pumpState.key = "blob"; }
		pumpState.ticks += 3;
		pumpState.lastTick = pixelTicks;
		pumpState.mortarCharging = pixelTicks;
		if (pumpState.ticks / (tps || 30) >= MORTAR_CHARGE_SECONDS) { mortarFire(blob.plug, blob.dx, blob.dy); pumpReset(); }
		return;
	}
	var box = pumpFindBox(mousePos.x, mousePos.y);
	if (!box) { pumpReset(); return; }
	if (box.key !== pumpState.key || pixelTicks - pumpState.lastTick > PUMP_FORGET_TICKS) {
		pumpState.key = box.key; pumpState.ticks = 0; pumpState.warned = 0;
	}
	pumpState.ticks += 3;
	pumpState.lastTick = pixelTicks;
	// A tube with a plug of powder (or liquid) that has somewhere to go: fire it like a mortar.
	var plug = mortarFindPlug(box);
	if (plug) {
		if (pumpState.ticks / (tps || 30) >= MORTAR_CHARGE_SECONDS) { mortarFireFromBox(box, plug); pumpReset(); }
		return;
	}
	// Any gas in the box is compressed too.
	var level = Math.min(PRESSURE_MAX, (pumpState.ticks / ((tps || 30) * PUMP_BURST_SECONDS)) * PRESSURE_BURST_AT);
	for (var i = 0; i < box.cells.length; i++) {
		var g = pixelMap[box.cells[i][0]] && pixelMap[box.cells[i][0]][box.cells[i][1]];
		if (g && (g.pressure || 0) < level) g.pressure = level;
	}
	var seconds = pumpState.ticks / (tps || 30);
	if (seconds >= 5 && pumpState.warned < 1) { pumpState.warned = 1; logMessage("The box is creaking..."); }
	if (seconds >= 10 && pumpState.warned < 2) { pumpState.warned = 2; logMessage("The box is about to burst!"); }
	// Shake harder and harder as it gets close to bursting.
	if (seconds >= PUMP_SHAKE_FROM) {
		pumpState.shake = pumpWallPixels(box);
		pumpState.shakeStrength = Math.min(1, (seconds - PUMP_SHAKE_FROM) / (PUMP_BURST_SECONDS - PUMP_SHAKE_FROM) + 0.15);
	}
	if (seconds >= PUMP_BURST_SECONDS) {
		pumpBurst(box);
		pumpReset();
	}
});

// ---------------------------------------------------------------------------
// Mortar
// Pump the Pressure tool into a tube (cylinder) that's blocked by a plug of powder or liquid, where the plug
// has open space on its other side. After a short charge the whole plug is fired out of the tube at high
// speed, flying in arcs. It works in any direction: straight up, sideways like a cannon, or slanted.

var MORTAR_CHARGE_SECONDS = 1;   // how long you pump before it fires
var MORTAR_SPEED = 5;            // launch speed, in pixels per tick
var MORTAR_GRAVITY = 0.25;       // how fast flying pixels fall back down
var MORTAR_SPREAD = 1.6;         // how much the shot spreads out sideways
var MORTAR_MAX_PLUG = 4000;      // biggest plug it can fire
var MORTAR_MAX_FLIGHT = 150;     // ticks before a flying pixel goes back to normal

function mortarLoose(p) {
	var info = elements[p.element];
	return !!info && info.movable === true && info.state !== "gas" && !p.del;
}

// Loose pixels touching the box, and connected to them. Only counts as a plug if it can escape somewhere.
function mortarFindPlug(box) {
	var seen = {};
	var plug = [];
	var queue = [];
	for (var i = 0; i < box.cells.length; i++) {
		var c = box.cells[i];
		for (var k = 0; k < adjacentCoords.length; k++) {
			var x = c[0] + adjacentCoords[k][0], y = c[1] + adjacentCoords[k][1];
			if (outOfBounds(x, y) || box.seen[x + "," + y] || seen[x + "," + y]) continue;
			var p = pixelMap[x][y];
			if (p && mortarLoose(p)) { seen[x + "," + y] = true; queue.push(p); }
		}
	}
	if (queue.length === 0) return null;
	var escapes = false;
	while (queue.length) {
		var q = queue.pop();
		plug.push(q);
		if (plug.length > MORTAR_MAX_PLUG) return null;
		for (var j = 0; j < adjacentCoords.length; j++) {
			var nx = q.x + adjacentCoords[j][0], ny = q.y + adjacentCoords[j][1];
			if (ny < 0) { escapes = true; continue; }
			if (outOfBounds(nx, ny)) continue;
			var key = nx + "," + ny;
			if (box.seen[key] || seen[key]) continue;
			if (isEmpty(nx, ny, true)) { escapes = true; continue; }
			var n = pixelMap[nx][ny];
			if (n && gasPressureApplies(n)) { escapes = true; continue; }
			if (n && mortarLoose(n)) { seen[key] = true; queue.push(n); }
		}
	}
	return escapes ? plug : null;
}

var mortarFlying = [];

// Fire away from the middle of the gas space, through the middle of the plug.
function mortarFireFromBox(box, plug) {
	var bx = 0, by = 0, px = 0, py = 0;
	for (var i = 0; i < box.cells.length; i++) { bx += box.cells[i][0]; by += box.cells[i][1]; }
	for (var j = 0; j < plug.length; j++) { px += plug[j].x; py += plug[j].y; }
	bx /= box.cells.length; by /= box.cells.length; px /= plug.length; py /= plug.length;
	mortarFire(plug, px - bx, py - by);
}

function mortarFire(plug, dx, dy) {
	var len = Math.sqrt(dx * dx + dy * dy) || 1;
	dx /= len; dy /= len;
	// Snap to straight up/down/sideways when it's close, so tubes fire straight.
	if (Math.abs(dx) < 0.35) dx = 0;
	if (Math.abs(dy) < 0.35) dy = 0;
	len = Math.sqrt(dx * dx + dy * dy) || 1;
	dx /= len; dy /= len;
	var mortarShotPower = 0.9 + Math.random() * 0.3;
	for (var m = 0; m < plug.length; m++) {
		var p = plug[m];
		var speed = MORTAR_SPEED * mortarShotPower;   // the whole plug moves together
		var spread = (Math.random() * 2 - 1) * MORTAR_SPREAD;
		p.mortarVx = dx * speed - dy * spread;
		p.mortarVy = dy * speed + dx * spread;
		p.mortarFx = p.x; p.mortarFy = p.y;
		p.mortarAge = 0;
		mortarFlying.push(p);
	}
	pumpState.mortarDir = [dx, dy];
	logMessage("BOOM!");
}

runEveryTick(function() {
	if (paused || mortarFlying.length === 0) return;
	// Move the front of the plug first so it doesn't get stuck behind itself.
	var dir = pumpState.mortarDir || [0, -1];
	mortarFlying.sort(function(a, b) { return (b.x * dir[0] + b.y * dir[1]) - (a.x * dir[0] + a.y * dir[1]); });
	var still = [];
	for (var i = 0; i < mortarFlying.length; i++) {
		var p = mortarFlying[i];
		if (p.del || pixelMap[p.x] === undefined || pixelMap[p.x][p.y] !== p) continue;
		p.mortarAge++;
		var tx = p.mortarFx + p.mortarVx, ty = p.mortarFy + p.mortarVy;
		// Step one cell at a time towards where it's going. If the way is blocked, slide along the wall
		// (so shots fly up a tube and spray out of the top), or wait behind other flying bits.
		var steps = Math.max(Math.abs(Math.round(tx) - p.x), Math.abs(Math.round(ty) - p.y));
		var sx = p.x, sy = p.y, blocked = false, friend = false;
		var mortarFree = function(x, y) {
			if (outOfBounds(x, y)) return "wall";
			if (isEmpty(x, y)) return "free";
			var o = pixelMap[x][y];
			return (o && o.mortarVx !== undefined) ? "friend" : "wall";
		};
		for (var s = 1; s <= steps; s++) {
			var cx = Math.round(sx + (tx - sx) * s / steps), cy = Math.round(sy + (ty - sy) * s / steps);
			if (cx === p.x && cy === p.y) continue;
			var f = mortarFree(cx, cy);
			if (f === "free") { movePixel(p, cx, cy); continue; }
			if (f === "friend") { friend = true; break; }
			// Blocked: try sliding straight up/down, then straight sideways.
			var fv = cy !== p.y ? mortarFree(p.x, cy) : "wall";
			if (fv === "free") { movePixel(p, p.x, cy); continue; }
			var fh = cx !== p.x ? mortarFree(cx, p.y) : "wall";
			if (fh === "free") { movePixel(p, cx, p.y); continue; }
			if (fv === "friend" || fh === "friend") { friend = true; break; }
			blocked = true; break;
		}
		if (!friend) p.mortarVy = Math.min(4, p.mortarVy + MORTAR_GRAVITY);   // waiting bits keep their speed
		if (blocked) {
			// Hit something head on: lose most of the speed and carry on falling normally.
			p.mortarFx = p.x; p.mortarFy = p.y;
			p.mortarVx *= 0.3;
			if (p.mortarVy < 0) p.mortarVy = 0;
		}
		else { p.mortarFx = p.x + (tx - Math.round(tx)); p.mortarFy = p.y + (ty - Math.round(ty)); }
		var done = p.mortarAge > MORTAR_MAX_FLIGHT || (blocked && Math.abs(p.mortarVx) < 0.5 && p.mortarVy >= 0);
		if (done) { delete p.mortarVx; delete p.mortarVy; delete p.mortarFx; delete p.mortarFy; delete p.mortarAge; }
		else still.push(p);
	}
	mortarFlying = still;
});

// Powder under the cursor that's mostly surrounded by walls, with an opening: returns the powder and
// which way the opening is. Powder lying out in the open (a pile on the ground) doesn't count.
var MORTAR_ENCLOSED = 0.6;   // share of the powder's edge that must be walls

function mortarFindBlobAt(x, y) {
	if (outOfBounds(x, y) || isEmpty(x, y, true)) return null;
	var start = pixelMap[x][y];
	if (!start || !mortarLoose(start)) return null;
	var seen = {};
	seen[x + "," + y] = true;
	var plug = [], queue = [start];
	var solid = 0, open = 0, ox = 0, oy = 0, cx = 0, cy = 0;
	var counted = {};
	while (queue.length) {
		var p = queue.pop();
		plug.push(p);
		cx += p.x; cy += p.y;
		if (plug.length > MORTAR_MAX_PLUG) return null;
		for (var k = 0; k < adjacentCoords.length; k++) {
			var nx = p.x + adjacentCoords[k][0], ny = p.y + adjacentCoords[k][1];
			var key = nx + "," + ny;
			if (seen[key]) continue;
			if (ny < 0) { open++; ox += nx; oy += ny; continue; }
			if (outOfBounds(nx, ny)) { solid++; continue; }
			var n = isEmpty(nx, ny, true) ? null : pixelMap[nx][ny];
			if (n && mortarLoose(n)) { seen[key] = true; queue.push(n); continue; }
			if (counted[key]) continue;
			counted[key] = true;
			if (!n || gasPressureApplies(n)) { open++; ox += nx; oy += ny; }
			else solid++;
		}
	}
	if (open === 0 || solid / (solid + open) < MORTAR_ENCLOSED) return null;
	cx /= plug.length; cy /= plug.length; ox /= open; oy /= open;
	return { plug: plug, dx: ox - cx, dy: oy - cy };
}
