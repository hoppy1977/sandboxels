// Radiation Meter
// - Point at anything (or empty air) and the info bar at the bottom shows how radioactive that spot is,
//   just like it shows the temperature: e.g.  Radiation: 42 (High)
// - Radiation View (press 6, or pick it in Settings > Default View): colours everything by how radioactive
//   it is, like the Thermal View does for heat. Dark = safe, green = low, yellow = medium, red = high,
//   white = extreme. Glowing air shows where radiation is spreading.
//
// Other mods can set  elements.X.radioactivity = number  to say how radioactive their element is.

var RAD_RADIUS = 6;          // how far each radioactive thing reaches
var RAD_UPDATE_TICKS = 4;    // how often the radiation map is worked out
var RAD_VIEW = 6;            // the view number (and key) for Radiation View

var RAD_STRENGTH = {
	radiation: 2, neutron: 3, proton: 1,
	uranium: 4, molten_uranium: 5,
	plutonium: 6, molten_plutonium: 8,
	radium: 10, molten_radium: 12,
	radon: 4, liquid_radon: 5,
	rad_steam: 2, rad_cloud: 2, fallout: 3, rad_ice: 2, rad_water: 2,
	rad_glass: 1, rad_shard: 1, rad_snow: 1,
	n_explosion: 25, nuclear_waste: 5
};

var radStrengthCache = {};
function radStrengthOf(element) {
	if (radStrengthCache[element] !== undefined) return radStrengthCache[element];
	var info = elements[element] || {};
	var s = 0;
	if (info.radioactivity !== undefined) s = info.radioactivity;
	else if (RAD_STRENGTH[element] !== undefined) s = RAD_STRENGTH[element];
	else {
		// Anything that gives off radiation in its behaviour counts a little.
		var b = info.behavior;
		var text = Array.isArray(b) ? b.join("|") : (typeof b === "string" ? b : "");
		if (text.indexOf("radiation") !== -1) s = 3;
	}
	radStrengthCache[element] = s;
	return s;
}

var radMap = null, radMapW = 0, radMapH = 0, radMapTick = -100;

function radUpdateMap() {
	var w = width + 1, h = height + 1;
	if (!radMap || radMapW !== w || radMapH !== h) { radMap = new Float32Array(w * h); radMapW = w; radMapH = h; }
	else radMap.fill(0);
	var R = RAD_RADIUS;
	for (var i = 0; i < currentPixels.length; i++) {
		var p = currentPixels[i];
		if (!p || p.del) continue;
		var s = radStrengthOf(p.element);
		if (s <= 0) continue;
		var x0 = Math.max(0, p.x - R), x1 = Math.min(w - 1, p.x + R);
		var y0 = Math.max(0, p.y - R), y1 = Math.min(h - 1, p.y + R);
		for (var y = y0; y <= y1; y++) {
			var dy = y - p.y;
			for (var x = x0; x <= x1; x++) {
				var dx = x - p.x;
				var d = Math.sqrt(dx * dx + dy * dy);
				if (d > R) continue;
				radMap[y * w + x] += s * (1 - d / (R + 1));
			}
		}
	}
	radMapTick = pixelTicks;
}

function radAt(x, y) {
	if (pixelTicks - radMapTick >= RAD_UPDATE_TICKS || !radMap) radUpdateMap();
	if (x < 0 || y < 0 || x >= radMapW || y >= radMapH) return 0;
	return radMap[y * radMapW + x];
}

function radLevelName(v) {
	if (v < 1) return "None";
	if (v < 10) return "Low";
	if (v < 50) return "Medium";
	if (v < 150) return "High";
	return "EXTREME";
}

// Colour for a radiation amount: dark -> green -> yellow -> red -> white.
function radColor(v) {
	var t = Math.min(1, v / 200);
	if (t <= 0) return null;
	if (t < 0.33) { var a = t / 0.33; return "rgb(0," + Math.round(80 + 175 * a) + ",0)"; }
	if (t < 0.66) { var b = (t - 0.33) / 0.33; return "rgb(" + Math.round(255 * b) + ",255,0)"; }
	if (t < 0.95) { var c = (t - 0.66) / 0.29; return "rgb(255," + Math.round(255 * (1 - c)) + ",0)"; }
	return "rgb(255,255,255)";
}

runAfterLoad(function() {
	// Radiation View
	viewInfo[RAD_VIEW] = {
		name: "radiation",
		pre: function(ctx) {
			radUpdateMap();
			// Radiation in the air glows faintly.
			var ps = pixelSize;
			for (var y = 0; y < radMapH; y++) {
				for (var x = 0; x < radMapW; x++) {
					var v = radMap[y * radMapW + x];
					if (v < 1 || !isEmpty(x, y, true)) continue;
					var col = radColor(v);
					if (!col) continue;
					ctx.globalAlpha = Math.min(0.6, 0.15 + v / 300);
					ctx.fillStyle = col;
					ctx.fillRect(x * ps, y * ps, ps, ps);
				}
			}
			ctx.globalAlpha = 1;
		},
		pixel: function(pixel, ctx) {
			var v = radMap ? radMap[pixel.y * radMapW + pixel.x] : 0;
			ctx.fillStyle = radColor(v) || "rgb(25,30,45)";
			ctx.fillRect(pixel.x * pixelSize, pixel.y * pixelSize, pixelSize, pixelSize);
		}
	};

	// Radiation reading in the info bar, next to the temperature.
	var statsDiv = document.getElementById("stats");
	if (!statsDiv || typeof MutationObserver === "undefined") return;
	new MutationObserver(function() {
		if (document.getElementById("stat-radiation")) return;
		if (!pixelMap || pixelMap[mousePos.x] === undefined) return;
		var v = radAt(mousePos.x, mousePos.y);
		if (v < 1 && view !== RAD_VIEW) return;
		var span = document.createElement("span");
		span.id = "stat-radiation";
		span.className = "stat";
		span.textContent = "Radiation:" + Math.round(v) + " (" + radLevelName(v) + ")";
		if (v >= 50) span.style.color = v >= 150 ? "#ff5050" : "#ffd040";
		else if (v >= 1) span.style.color = "#7dff7d";
		var tempSpan = document.getElementById("stat-temperature");
		if (tempSpan && tempSpan.nextSibling) statsDiv.insertBefore(span, tempSpan.nextSibling);
		else statsDiv.appendChild(span);
	}).observe(statsDiv, { childList: true });
});
