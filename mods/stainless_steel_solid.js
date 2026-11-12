// Stainless Steel (solid)
// Adds stainless steel to the Solids category.
//
// - Works like regular steel, but never rusts in water, salt, blood, etc.
// - Texture: pixel-by-pixel dark/light gray checkerboard with a dark vertical line every 25 pixels.
// - Conducts electricity and heat a little less than steel.
// - Melts at 1450°C into Molten Stainless Steel and solidifies back when cooled.
// - Make it: mix Molten Steel with Molten Nickel.
//
// Load it in the Mod Manager as: stainless_steel_solid.js
// Note: don't load this together with stainless_steel.js; both define "stainless_steel".

// Texture: pixel-by-pixel checkerboard (dark gray / light gray),
// with a darker 1-pixel line running top to bottom every 25 pixels.
var STAINLESS_SQUARE = 1;        // size of each checker square, in pixels
var STAINLESS_LINE_EVERY = 25;   // distance between the vertical lines, in pixels
// Tile must repeat cleanly for both the checker and the lines.
var stainlessTileW = STAINLESS_LINE_EVERY * STAINLESS_SQUARE * 2;
var stainlessTileH = STAINLESS_SQUARE * 2;
var stainlessPattern = [];
for (var y = 0; y < stainlessTileH; y++) {
	var row = "";
	for (var x = 0; x < stainlessTileW; x++) {
		if (x % STAINLESS_LINE_EVERY === 0) { row += "S"; }
		else if ((Math.floor(x / STAINLESS_SQUARE) + Math.floor(y / STAINLESS_SQUARE)) % 2 === 0) { row += "D"; }
		else { row += "L"; }
	}
	stainlessPattern.push(row);
}

elements.stainless_steel = {
	color: "#b4bcc2",
	colorKey: {
		"D": "#6b7176", // dark gray squares
		"L": "#b4bcc2", // light gray squares
		"S": "#3f4448"  // darker gray line, top to bottom
	},
	colorPattern: stainlessPattern,
	grain: 0,
	behavior: behaviors.WALL,
	category: "solids",
	state: "solid",
	tempHigh: 1450,
	density: 7900,
	conduct: 0.3,
	hardness: 0.85,
	alias: "inox",
	desc: "Steel alloyed to resist rust. Make it by mixing Molten Steel with Molten Nickel."
};

// Molten forms are generated after mods load, so add the recipe afterwards.
runAfterAutogen(function() {
	if (elements.molten_steel && elements.molten_nickel && elements.molten_stainless_steel) {
		if (!elements.molten_steel.reactions) elements.molten_steel.reactions = {};
		elements.molten_steel.reactions.molten_nickel = {
			elem1: "molten_stainless_steel",
			elem2: "molten_stainless_steel",
			chance: 0.2
		};
	}
});
