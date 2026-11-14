// Pressure (tool)
// Adds a Pressure tool to the Tools category.
//
// Hold it over things to squeeze them into denser versions. Hold Shift to squeeze harder.
// Squeezing also warms things up a little.
//
//   Graphite  -> Diamond      (takes a lot of squeezing!)
//   Charcoal  -> Graphite
//   Snow      -> Packed Snow -> Ice
//   Sand / Wet Sand -> Packed Sand -> Rock
//   Gravel    -> Rock
//   Mud       -> Mudstone
//   Sawdust   -> Wood
//   Steam / Cloud -> Water
//   Foam / Bubble -> popped (gone)
//
// Using it on a gas compresses it, building up gas pressure (see gas_pressure.js).
// Holding it on powder inside a tube fires the powder out like a mortar (see gas_pressure.js).
//
// Other mods can add their own: set  elements.X.pressureInto = "Y"  (and optionally pressureChance).

var PRESSURE_RECIPES = {
	graphite:    { into: "diamond",     chance: 0.01 },
	charcoal:    { into: "graphite",    chance: 0.05 },
	snow:        { into: "packed_snow", chance: 0.1 },
	packed_snow: { into: "ice",         chance: 0.05 },
	sand:        { into: "packed_sand", chance: 0.1 },
	wet_sand:    { into: "packed_sand", chance: 0.1 },
	packed_sand: { into: "rock",        chance: 0.02 },
	gravel:      { into: "rock",        chance: 0.05 },
	mud:         { into: "mudstone",    chance: 0.05 },
	sawdust:     { into: "wood",        chance: 0.05 },
	steam:       { into: "water",       chance: 0.2 },
	cloud:       { into: "water",       chance: 0.1 },
	foam:        { into: null,          chance: 0.3 },
	bubble:      { into: null,          chance: 0.5 }
};

var pressureMortarCache = { tick: -1, set: null };

elements.pressure = {
	color: ["#5b6b8c", "#7a8bb0", "#5b6b8c"],
	category: "tools",
	desc: "Squeeze things into denser versions, like Graphite into Diamond or Sand into Packed Sand. Hold Shift to squeeze harder.",
	tool: function(pixel) {
		var info = elements[pixel.element];
		// Powder inside a tube is being loaded into a mortar (gas_pressure.js), so don't squeeze it.
		if (info && info.movable === true && typeof mortarFindBlobAt === "function") {
			if (pressureMortarCache.tick !== pixelTicks) {
				var blob = mortarFindBlobAt(mousePos.x, mousePos.y);
				pressureMortarCache = { tick: pixelTicks, set: blob ? new Set(blob.plug) : null };
			}
			if (pressureMortarCache.set && pressureMortarCache.set.has(pixel)) return;
		}
		var recipe = PRESSURE_RECIPES[pixel.element];
		if (info && info.pressureInto !== undefined) {
			recipe = { into: info.pressureInto, chance: info.pressureChance || 0.05 };
		}
		// Squeezing warms things a little.
		if (!info || info.insulate !== true) {
			pixel.temp += shiftDown ? 2 : 0.5;
			pixelTempCheck(pixel);
		}
		// Squeezing a gas compresses it (works with gas_pressure.js).
		if (info && info.state === "gas") {
			pixel.pressure = Math.min(300, (pixel.pressure || 0) + (shiftDown ? 40 : 10));
		}
		if (!recipe || pixel.del) return;
		var chance = recipe.chance * (shiftDown ? 4 : 1);
		if (Math.random() < chance) {
			if (recipe.into === null) { deletePixel(pixel.x, pixel.y); }
			else if (elements[recipe.into]) { changePixel(pixel, recipe.into); }
		}
	}
};
