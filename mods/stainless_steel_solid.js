// Stainless Steel (solid)
// Adds stainless steel to the Solids category.
//
// - Works like regular steel, but never rusts in water, salt, blood, etc.
// - Checkerboard texture: 10-pixel dark/light gray squares with a light vertical line.
// - Conducts electricity and heat a little less than steel.
// - Melts at 1450°C into Molten Stainless Steel and solidifies back when cooled.
// - Make it: mix Molten Steel with Molten Nickel.
//
// Load it in the Mod Manager as: stainless_steel_solid.js
// Note: don't load this together with stainless_steel.js; both define "stainless_steel".

// Texture: checkerboard of 10x10 squares (dark gray / light gray),
// with a bright 1-pixel line running top to bottom through the middle of every square.
var STAINLESS_SQUARE = 10;
var STAINLESS_LINE_COLUMN = 5; // which column inside each square holds the line
var stainlessPattern = [];
for (var y = 0; y < STAINLESS_SQUARE * 2; y++) {
	var row = "";
	for (var x = 0; x < STAINLESS_SQUARE * 2; x++) {
		if (x % STAINLESS_SQUARE === STAINLESS_LINE_COLUMN) { row += "S"; }
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
		"S": "#dfe4e8"  // light line, top to bottom
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
