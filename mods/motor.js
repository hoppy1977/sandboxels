// Motor (machine)
// Adds a Motor to the Machines category.
//
// - The motor needs electricity: connect it to a Battery with Wire (or touch a Battery directly).
// - While powered, it spins everything solid that is connected to it around itself
//   (e.g. build a blade out of Steel or Wood touching the motor).
// - Wires and batteries are skipped, so spinning parts pass "behind" them.
// - Loose stuff in the way (sand, water, gas...) gets pushed outward.
// - Solid things in the way (like a Wall) block the spin until they're removed.
// - Shift-click the Motor button to set its speed. Negative numbers spin the other way.

var MOTOR_DEFAULT_SPEED = 6;     // degrees turned per step (about 90° a second)
var MOTOR_STEP_TICKS = 2;        // how often it turns, in game ticks
var MOTOR_MAX_PIXELS = 1500;     // biggest thing a motor will spin
var MOTOR_MAX_RADIUS = 60;       // furthest a spinning part can reach from the motor
var MOTOR_POWER_GRACE = 8;       // ticks it keeps running after the last charge

function motorIsPassThrough(pixel) {
	// Power parts never spin and spinning parts pass behind them.
	var info = elements[pixel.element] || {};
	return pixel.element === "motor" || info.category === "machines" || pixel.element === "wire" || pixel.element === "battery";
}

function motorCanSpin(pixel) {
	var info = elements[pixel.element];
	if (!info || motorIsPassThrough(pixel)) return false;
	if (info.movable === true) return false;   // loose stuff (powders, liquids, gases) doesn't spin
	if (info.isGas || info.state === "gas") return false;
	return true;
}

// Find everything solid connected to the motor and remember it as a shape.
function motorCapture(motor) {
	var shape = {};
	var count = 0;
	var radius = 0;
	var seen = {};
	seen[motor.x + "," + motor.y] = true;
	var queue = [];
	// Corner-to-corner counts as connected, since slanted blades only touch at corners.
	for (var i = 0; i < squareCoords.length; i++) {
		queue.push([motor.x + squareCoords[i][0], motor.y + squareCoords[i][1]]);
	}
	while (queue.length && count < MOTOR_MAX_PIXELS) {
		var c = queue.shift();
		var key = c[0] + "," + c[1];
		if (seen[key]) continue;
		seen[key] = true;
		if (isEmpty(c[0], c[1], true)) continue;
		var p = pixelMap[c[0]][c[1]];
		if (!p || !motorCanSpin(p)) continue;
		var ox = c[0] - motor.x, oy = c[1] - motor.y;
		var dist = Math.sqrt(ox * ox + oy * oy);
		if (dist > MOTOR_MAX_RADIUS) continue;
		shape[ox + "," + oy] = { element: p.element, color: p.color, temp: p.temp };
		count++;
		if (dist > radius) radius = dist;
		for (var j = 0; j < squareCoords.length; j++) {
			queue.push([c[0] + squareCoords[j][0], c[1] + squareCoords[j][1]]);
		}
	}
	return { shape: shape, count: count, radius: Math.ceil(radius) + 1 };
}

// Work out where every part of the shape goes at a given angle.
function motorLayout(motor, angleDeg) {
	var a = angleDeg * Math.PI / 180;
	var cos = Math.cos(a), sin = Math.sin(a);
	var r = motor.motorRadius;
	var targets = [];
	for (var ty = -r; ty <= r; ty++) {
		for (var tx = -r; tx <= r; tx++) {
			if (tx === 0 && ty === 0) continue;
			if (tx * tx + ty * ty > r * r) continue;
			// Rotate backwards to find which part of the original shape lands here.
			var sx = Math.round(tx * cos + ty * sin);
			var sy = Math.round(-tx * sin + ty * cos);
			var part = motor.motorShape[sx + "," + sy];
			if (part) targets.push({ x: motor.x + tx, y: motor.y + ty, part: part, ox: tx, oy: ty });
		}
	}
	return targets;
}

// Try to shove a loose pixel out of the way, away from the motor.
function motorShove(motor, p, ox, oy, blocked) {
	var len = Math.sqrt(ox * ox + oy * oy) || 1;
	var dx = ox / len, dy = oy / len;
	for (var step = 1; step <= 4; step++) {
		var nx = Math.round(p.x + dx * step), ny = Math.round(p.y + dy * step);
		var key = nx + "," + ny;
		if (blocked[key]) continue;
		if (isEmpty(nx, ny)) { movePixel(p, nx, ny); return true; }
	}
	// Try the neighbours as a fallback.
	for (var i = 0; i < squareCoords.length; i++) {
		var nx2 = p.x + squareCoords[i][0], ny2 = p.y + squareCoords[i][1];
		if (blocked[nx2 + "," + ny2]) continue;
		if (isEmpty(nx2, ny2)) { movePixel(p, nx2, ny2); return true; }
	}
	return false;
}

function motorTurn(motor) {
	var speed = motor.speed !== undefined ? motor.speed : MOTOR_DEFAULT_SPEED;
	var nextAngle = (motor.motorAngle || 0) + speed;
	var targets = motorLayout(motor, nextAngle);

	var mine = motor.motorPixels || [];
	var mineSet = new Set(mine);
	var blocked = {};
	for (var i = 0; i < targets.length; i++) blocked[targets[i].x + "," + targets[i].y] = true;

	// Check for things in the way before moving anything.
	var toShove = [];
	var drawList = [];
	for (var i = 0; i < targets.length; i++) {
		var t = targets[i];
		if (outOfBounds(t.x, t.y)) continue;
		var here = pixelMap[t.x][t.y];
		if (here && !mineSet.has(here) && !here.del) {
			if (motorIsPassThrough(here)) continue;               // pass behind power parts
			if (elements[here.element].movable === true) { toShove.push(t); }
			else { return false; }                                // solid in the way: stall
		}
		drawList.push(t);
	}
	for (var i = 0; i < toShove.length; i++) {
		var t = toShove[i];
		var here = pixelMap[t.x][t.y];
		if (!here) continue;
		if (!motorShove(motor, here, t.ox, t.oy, blocked)) return false;
	}

	// Remove the old position and draw the new one.
	for (var i = 0; i < mine.length; i++) {
		var p = mine[i];
		if (p.del) continue;
		if (pixelMap[p.x] && pixelMap[p.x][p.y] === p) deletePixel(p.x, p.y);
	}
	var newPixels = [];
	for (var i = 0; i < drawList.length; i++) {
		var t = drawList[i];
		if (!isEmpty(t.x, t.y)) continue;
		createPixel(t.part.element, t.x, t.y);
		var np = pixelMap[t.x][t.y];
		if (!np) continue;
		np.color = t.part.color;
		np.temp = t.part.temp;
		np.motorOwner = motor.motorId;
		np.chargeCD = 999; // spinning parts don't carry electricity (stops power loops)
		newPixels.push(np);
	}
	motor.motorPixels = newPixels;
	motor.motorAngle = nextAngle % 360;
	return true;
}

// Stopping keeps the remembered shape, so it can carry on from the same angle when powered again.
function motorStop(motor) {
	motor.spinning = false;
	// Parts can carry electricity again once stopped.
	if (motor.motorPixels) motor.motorPixels.forEach(function(p) { if (p.chargeCD === 999) p.chargeCD = 1; });
}

// Count how many of the motor's spinning parts are still where it left them.
function motorPartsLeft(motor) {
	if (!motor.motorPixels) return 0;
	var n = 0;
	for (var i = 0; i < motor.motorPixels.length; i++) {
		var p = motor.motorPixels[i];
		if (!p.del && pixelMap[p.x] && pixelMap[p.x][p.y] === p) n++;
	}
	return n;
}

function motorStart(motor) {
	var cap = motorCapture(motor);
	// Nothing changed since it stopped (no parts added or removed): resume with the full original shape.
	if (motor.motorShape && motor.motorPixels && motor.motorPixels.length > 0) {
		var nothingRemoved = motorPartsLeft(motor) === motor.motorPixels.length;
		var mineSet = new Set(motor.motorPixels);
		var nothingAdded = true;
		for (var k in cap.shape) {
			var o = k.split(",");
			var p = pixelMap[motor.x + parseInt(o[0])][motor.y + parseInt(o[1])];
			if (!mineSet.has(p)) { nothingAdded = false; break; }
		}
		if (nothingRemoved && nothingAdded) {
			motor.spinning = true;
			return;
		}
	}
	if (cap.count === 0) return;
	motor.motorShape = cap.shape;
	motor.motorRadius = cap.radius;
	motor.motorAngle = 0;
	motor.motorPixels = [];
	// Collect the real pixels that make up the shape so they get replaced as it turns.
	for (var key in cap.shape) {
		var o = key.split(",");
		var px = motor.x + parseInt(o[0]), py = motor.y + parseInt(o[1]);
		if (!isEmpty(px, py, true)) {
			pixelMap[px][py].motorOwner = motor.motorId;
			motor.motorPixels.push(pixelMap[px][py]);
		}
	}
	motor.spinning = true;
}

// Is the motor getting power from outside (not from its own spinning parts)?
function motorHasPower(motor) {
	for (var i = 0; i < squareCoords.length; i++) {
		var x = motor.x + squareCoords[i][0], y = motor.y + squareCoords[i][1];
		if (isEmpty(x, y, true)) continue;
		var n = pixelMap[x][y];
		if (!n || n.del) continue;
		if (n.motorOwner !== undefined) continue;          // a spinning part, ignore
		if (n.element === "battery") return true;          // touching a battery
		if (n.charge && elements[n.element].conduct !== undefined) return true; // charged wire/metal
	}
	return false;
}

elements.motor = {
	color: ["#3d3f44", "#4a4d53", "#b87333", "#3d3f44"],
	category: "machines",
	state: "solid",
	behavior: behaviors.WALL,
	// No "conduct": the motor senses power itself, so its own spinning metal parts can't keep it running.
	insulate: true,
	movable: false,
	density: 7800,
	hardness: 0.8,
	tempHigh: 1455,
	stateHigh: ["molten_steel", "molten_copper"],
	desc: "Spins solid things connected to it when powered by a Battery or Wire. Shift-click to set its speed.",
	onShiftSelect: function(element) {
		promptInput("Enter motor speed in degrees per step (default " + MOTOR_DEFAULT_SPEED + "). Negative numbers spin the other way.", function(r) {
			if (r === "") return;
			r = parseFloat(r);
			if (isNaN(r)) { logMessage("Invalid number - motor speed not set."); return; }
			currentElementProp = { speed: r };
		}, "Motor");
	},
	tick: function(pixel) {
		doDefaults(pixel);
		if (pixel.del) return;
		if (pixel.motorId === undefined) pixel.motorId = Math.random();
		if (motorHasPower(pixel)) pixel.poweredUntil = pixelTicks + MOTOR_POWER_GRACE;
		var powered = pixel.poweredUntil !== undefined && pixelTicks <= pixel.poweredUntil;

		// Glow copper while powered.
		if (pixel.baseColor === undefined) pixel.baseColor = pixel.color;
		pixel.color = powered ? "rgb(224,138,60)" : pixel.baseColor;

		if (!powered) {
			if (pixel.spinning) motorStop(pixel);
			return;
		}
		if (!pixel.spinning) {
			// Just switched on: remember what's attached (or resume the old shape).
			motorStart(pixel);
			if (!pixel.spinning) return;
		}
		if (pixelTicks % MOTOR_STEP_TICKS === 0) motorTurn(pixel);
	}
};
