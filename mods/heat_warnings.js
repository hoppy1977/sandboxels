// Heat Warnings
// Shows a message when something is close to changing because of heat or cold, like:
//   "Steel is about to melt!"   "Water is about to boil!"   "Water is about to freeze!"
//   "Wood is about to burn!"    "Gunpowder is about to explode!"
// It only warns about things that are actually heating up (or cooling down) towards the change,
// and each kind of thing is only mentioned once every few seconds, so it doesn't spam.

var WARN_SCAN_TICKS = 10;        // how often to look
var WARN_REPEAT_SECONDS = 8;     // don't repeat the same warning more often than this
var WARN_GAP_SECONDS = 1;        // at least this long between any two warnings
var WARN_SKIP_CATEGORIES = ["energy", "tools", "special"];

var warnLastByKey = {};
var warnLastAny = -1000;

function warnName(element) {
	var info = elements[element] || {};
	var n = (info.name || element).replace(/_/g, " ");
	return n.charAt(0).toUpperCase() + n.slice(1);
}

function warnTarget(state) {
	if (Array.isArray(state)) {
		for (var i = 0; i < state.length; i++) if (state[i]) return state[i];
		return null;
	}
	return state || null;
}

function warnHasAny(state, names) {
	var list = Array.isArray(state) ? state : [state];
	for (var i = 0; i < list.length; i++) if (names.indexOf(list[i]) !== -1) return true;
	return false;
}

// "melt", "boil", "burn"... for getting hot.
function warnVerbHigh(element) {
	var info = elements[element] || {};
	var to = info.stateHigh;
	var target = warnTarget(to);
	if (warnHasAny(to, ["explosion", "n_explosion", "pop", "supernova"])) return "explode";
	if (warnHasAny(to, ["fire", "smoke", "ash", "carbon_dioxide", "charcoal", "plasma"])) return "burn";
	if (!target || !elements[target]) return null;
	var from = info.state, end = elements[target].state;
	if (target.indexOf("molten_") === 0 || (from === "solid" && end === "liquid")) return "melt";
	if (from === "liquid" && end === "gas") return "boil";
	if (from === "solid" && end === "gas") return "turn into gas";
	return "turn into " + warnName(target).toLowerCase();
}

// "freeze", "condense"... for getting cold.
function warnVerbLow(element) {
	var info = elements[element] || {};
	var target = warnTarget(info.stateLow);
	if (!target || !elements[target]) return null;
	var from = info.state, end = elements[target].state;
	if (element.indexOf("molten_") === 0) return "cool into " + warnName(target).toLowerCase();
	if (from === "liquid" && end === "solid") return "freeze";
	if (from === "gas" && end === "liquid") return "condense";
	if (from === "gas" && end === "solid") return "freeze";
	return "turn into " + warnName(target).toLowerCase();
}

function warnMargin(t) {
	return Math.max(5, Math.min(50, Math.abs(t) * 0.1));
}

function warnSay(key, text) {
	var now = pixelTicks, rate = tps || 30;
	if (now - warnLastAny < WARN_GAP_SECONDS * rate) return;
	if (warnLastByKey[key] !== undefined && now - warnLastByKey[key] < WARN_REPEAT_SECONDS * rate) return;
	warnLastByKey[key] = now;
	warnLastAny = now;
	logMessage(text);
}

runEveryTick(function() {
	if (paused || pixelTicks % WARN_SCAN_TICKS !== 0) return;
	for (var i = 0; i < currentPixels.length; i++) {
		var p = currentPixels[i];
		if (!p || p.del) continue;
		var prev = p.warnPrevTemp;
		p.warnPrevTemp = p.temp;
		if (prev === undefined) continue;
		var info = elements[p.element];
		if (!info || WARN_SKIP_CATEGORIES.indexOf(info.category) !== -1) continue;
		if (info.tempHigh !== undefined && p.temp > prev && p.temp < info.tempHigh && p.temp >= info.tempHigh - warnMargin(info.tempHigh)) {
			var vh = warnVerbHigh(p.element);
			if (vh) warnSay(p.element + ":high", warnName(p.element) + " is about to " + vh + "!");
		}
		else if (info.tempLow !== undefined && p.temp < prev && p.temp > info.tempLow && p.temp <= info.tempLow + warnMargin(info.tempLow)) {
			var vl = warnVerbLow(p.element);
			if (vl) warnSay(p.element + ":low", warnName(p.element) + " is about to " + vl + "!");
		}
	}
});
