// Stainless Steel (solid)
// Adds stainless steel to the Solids category.
//
// - Works like regular steel, but never rusts in water, salt, blood, etc.
// - Texture: light gray with dark gray specks and a dark vertical line every 25 pixels.
// - Conducts electricity and heat a little less than steel.
// - Melts at 1450°C into Molten Stainless Steel and solidifies back when cooled.
// - Make it: mix Molten Steel with Molten Nickel.
//
// Load it in the Mod Manager as: stainless_steel_solid.js
// Note: don't load this together with stainless_steel.js; both define "stainless_steel".

// Texture: light gray with a sprinkle of dark gray specks (like steel),
// and a darker 1-pixel line running top to bottom every 25 pixels.
var STAINLESS_LINE_EVERY = 25;   // distance between the vertical lines, in pixels
var STAINLESS_SPECKS = 0.15;     // share of pixels that are dark gray specks (0 to 1)
var stainlessSeed = 74;          // fixed seed so the specks look the same every time
function stainlessRandom() {
	stainlessSeed = (stainlessSeed * 16807) % 2147483647;
	return stainlessSeed / 2147483647;
}
var stainlessPattern = [];
for (var y = 0; y < STAINLESS_LINE_EVERY; y++) {
	var row = "";
	for (var x = 0; x < STAINLESS_LINE_EVERY; x++) {
		if (x === 0) { row += "S"; }
		else if (stainlessRandom() < STAINLESS_SPECKS) { row += "D"; }
		else { row += "L"; }
	}
	stainlessPattern.push(row);
}

elements.stainless_steel = {
	color: "#b4bcc2",
	colorKey: {
		"L": "#b4bcc2", // light gray
		"D": "#8a9298", // dark gray specks
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
