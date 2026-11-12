// Chromium (solid)
// Adds chromium to the Solids category.
//
// - Hard, shiny, bluish-silver metal. Never rusts.
// - Melts at 1907°C into Molten Chromium.
// - Chromium Powder (in Powders): falls like sand. Smash solid chromium to get it.
// - Make stainless steel: mix Chromium (powder, solid or molten) into Molten Steel. Powder mixes best.
//   The mix becomes Molten Stainless Steel, which turns into solid Stainless Steel when it cools.
//
// Needs stainless_steel_solid.js to be loaded too (it is, in the built-in list in index.html).

// Texture settings
var CHROMIUM_SHINE = 0.15;   // share of pixels that are bright shiny specks (0 to 1)
var CHROMIUM_TILE = 25;      // size of the repeating texture tile, in pixels
var chromiumSeed = 24;       // fixed seed so the specks look the same every time
function chromiumRandom() {
	chromiumSeed = (chromiumSeed * 16807) % 2147483647;
	return chromiumSeed / 2147483647;
}
var chromiumPattern = [];
for (var y = 0; y < CHROMIUM_TILE; y++) {
	var row = "";
	for (var x = 0; x < CHROMIUM_TILE; x++) {
		row += (chromiumRandom() < CHROMIUM_SHINE) ? "S" : "B";
	}
	chromiumPattern.push(row);
}

elements.chromium = {
	color: "#c3ccd6",
	colorKey: {
		"B": "#c3ccd6", // bluish silver
		"S": "#eef3f8"  // bright shine
	},
	colorPattern: chromiumPattern,
	grain: 0,
	behavior: behaviors.WALL,
	category: "solids",
	state: "solid",
	tempHigh: 1907,
	density: 7190,
	conduct: 0.35,
	hardness: 0.95,
	alias: "chrome",
	breakInto: "chromium_powder",
	desc: "A hard, shiny metal. Mix it into Molten Steel to make Stainless Steel. Smash it to get Chromium Powder."
};

// Chromium powder: falls and piles like sand, so it mixes into molten steel easily.
elements.chromium_powder = {
	color: ["#b7c0ca", "#c3ccd6", "#d4dce4", "#eef3f8"],
	behavior: behaviors.POWDER,
	category: "powders",
	state: "solid",
	tempHigh: 1907,
	stateHigh: "molten_chromium",
	density: 7190, // heavier than molten steel (about 7065), so it sinks in and mixes
	conduct: 0.2,
	hardness: 0.6,
	alias: "chrome powder",
	desc: "Powdered chromium. Sprinkle it into Molten Steel to make Stainless Steel."
};

// Molten forms are generated after mods load, so add the recipe afterwards.
runAfterAutogen(function() {
	if (!elements.molten_steel || !elements.molten_stainless_steel) { return; }
	if (!elements.molten_steel.reactions) elements.molten_steel.reactions = {};
	// Molten chromium + molten steel: both turn into molten stainless steel.
	if (elements.molten_chromium) {
		elements.molten_steel.reactions.molten_chromium = {
			elem1: "molten_stainless_steel",
			elem2: "molten_stainless_steel",
			chance: 0.2
		};
	}
	// Solid chromium dropped into molten steel dissolves into it.
	elements.molten_steel.reactions.chromium = {
		elem1: "molten_stainless_steel",
		elem2: "molten_stainless_steel",
		chance: 0.05
	};
	// Chromium powder sprinkled into molten steel mixes in quickly.
	elements.molten_steel.reactions.chromium_powder = {
		elem1: "molten_stainless_steel",
		elem2: "molten_stainless_steel",
		chance: 0.3
	};
});
