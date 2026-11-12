// Titanium (solid)
// Adds titanium to the Solids category.
//
// - Strong, light metal: about half as dense as steel.
// - Never rusts, and acid can't dissolve it.
// - Poor conductor of electricity and heat (much worse than steel or copper).
// - Melts at 1668°C into Molten Titanium and solidifies back when cooled.
// - Texture: blue-gray with a sprinkle of darker specks.
//
// Load it in the Mod Manager as: titanium.js (or add it to the built-in list in index.html)

// Texture settings
var TITANIUM_SPECKS = 0.15;   // share of pixels that are darker specks (0 to 1)
var TITANIUM_TILE = 25;       // size of the repeating texture tile, in pixels
var titaniumSeed = 22;        // fixed seed so the specks look the same every time
function titaniumRandom() {
	titaniumSeed = (titaniumSeed * 16807) % 2147483647;
	return titaniumSeed / 2147483647;
}
var titaniumPattern = [];
for (var y = 0; y < TITANIUM_TILE; y++) {
	var row = "";
	for (var x = 0; x < TITANIUM_TILE; x++) {
		row += (titaniumRandom() < TITANIUM_SPECKS) ? "D" : "B";
	}
	titaniumPattern.push(row);
}

elements.titanium = {
	color: "#9aa0a8",
	colorKey: {
		"B": "#9aa0a8", // blue-gray base
		"D": "#7c828b"  // darker specks
	},
	colorPattern: titaniumPattern,
	grain: 0,
	behavior: behaviors.WALL,
	category: "solids",
	state: "solid",
	tempHigh: 1668,
	density: 4506,
	conduct: 0.15,
	hardness: 0.9,
	alias: "ti",
	desc: "A strong, light metal that never rusts and resists acid."
};

// Acid can't dissolve titanium.
if (elements.acid) {
	if (!elements.acid.ignore) elements.acid.ignore = [];
	elements.acid.ignore.push("titanium");
}
