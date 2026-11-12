// Stainless Steel (solid)
// Adds stainless steel to the Solids category.
//
// - Works like regular steel, but never rusts in water, salt, blood, etc.
// - Shinier and lighter in colour than steel.
// - Conducts electricity and heat a little less than steel.
// - Melts at 1450°C into Molten Stainless Steel and solidifies back when cooled.
// - Make it: mix Molten Steel with Molten Nickel.
//
// Load it in the Mod Manager as: stainless_steel_solid.js
// Note: don't load this together with stainless_steel.js; both define "stainless_steel".

elements.stainless_steel = {
	color: "#b4bcc2",
	colorKey: {
		"L": "#d3d9dd",
		"B": "#b4bcc2"
	},
	colorPattern: [
		"BBLB",
		"BBBL",
		"BLBB",
		"LBBB"
	],
	grain: 0.3,
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
