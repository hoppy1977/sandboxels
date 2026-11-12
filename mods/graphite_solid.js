// Graphite (solid)
// Adds graphite to the Solids category.
//
// - Dark, shiny gray form of carbon (what pencil "lead" is made of).
// - Conducts electricity well, so it works like wire.
// - Very heat-proof: doesn't melt; it burns away above 3600°C.
// - Squeeze it with the Pressure tool to turn it into Diamond (see pressure_tool.js).
// Note: don't load this together with graphite.js; both define "graphite".

// Texture settings
var GRAPHITE_SHINE = 0.12;   // share of pixels that are shiny flakes (0 to 1)
var GRAPHITE_TILE = 25;      // size of the repeating texture tile, in pixels
var graphiteSeed = 6;        // fixed seed so the flakes look the same every time
function graphiteRandom() {
	graphiteSeed = (graphiteSeed * 16807) % 2147483647;
	return graphiteSeed / 2147483647;
}
var graphitePattern = [];
for (var y = 0; y < GRAPHITE_TILE; y++) {
	var row = "";
	for (var x = 0; x < GRAPHITE_TILE; x++) {
		var r = graphiteRandom();
		row += (r < GRAPHITE_SHINE) ? "S" : (r < GRAPHITE_SHINE * 2.5 ? "D" : "B");
	}
	graphitePattern.push(row);
}

elements.graphite = {
	color: "#3a3c40",
	colorKey: {
		"B": "#3a3c40", // dark gray
		"D": "#2a2b2e", // darker flakes
		"S": "#6b6f76"  // shiny flakes
	},
	colorPattern: graphitePattern,
	grain: 0,
	behavior: behaviors.WALL,
	category: "solids",
	state: "solid",
	tempHigh: 3600,
	stateHigh: ["fire", "fire", "carbon_dioxide"],
	density: 2260,
	conduct: 0.8,
	hardness: 0.15,
	breakInto: "charcoal",
	alias: "pencil lead",
	desc: "Dark, shiny carbon that conducts electricity. Squeeze it with the Pressure tool to make Diamond."
};
