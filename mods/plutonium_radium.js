// Plutonium and Radium
// Adds two radioactive powders (and Radon gas) to the game.
//
// Plutonium
// - Heavy, silvery, radioactive powder that gives off radiation and very slowly decays into Uranium.
// - It warms itself up: the bigger the pile, the hotter it gets. A big enough pile melts (above 640°C).
// - Hit it with Neutrons and it goes nuclear. It only needs to be warm (100°C), much less than Uranium needs.
//   Molten Plutonium explodes from Neutrons at any temperature.
//
// Radium
// - White powder that glows blue in the dark and is VERY radioactive.
// - Slowly decays into Radon, a heavy radioactive gas that sinks and fades away.
//
// Note: don't load this together with nuclear.js or radioactive.js; they also define plutonium/radium.

elements.plutonium = {
	color: ["#8f9496", "#a7abad", "#6f7577", "#9a8f86", "#b9bec0"],
	behavior: [
		"XX|XX|XX",
		"XX|RL:radiation%1 AND CH:uranium%0.0005|XX",
		"M2|M1|M2"
	],
	tick: function(pixel) {
		// Decay heat: each Plutonium neighbour adds a bit, so big piles get hot.
		var near = 0;
		for (var i = 0; i < squareCoords.length; i++) {
			var x = pixel.x + squareCoords[i][0], y = pixel.y + squareCoords[i][1];
			if (!isEmpty(x, y, true) && pixelMap[x][y].element === "plutonium") near++;
		}
		if (near > 0) {
			pixel.temp += near * 0.02;
			pixelTempCheck(pixel);
		}
	},
	reactions: {
		"neutron": { elem1: "n_explosion", tempMin: 100, chance: 0.15 },
		"glass": { elem2: "rad_glass", chance: 0.01 },
		"water": { elem2: "rad_steam", chance: 0.01 }
	},
	temp: 30,
	tempHigh: 639.4,
	category: "powders",
	state: "solid",
	density: 19840,
	hardness: 0.6,
	conduct: 0.1,
	alias: "pu",
	excludeRandom: true,
	desc: "Heavy radioactive metal that heats itself up. Big piles get hot. Warm Plutonium explodes when hit by Neutrons."
};

elements.radium = {
	color: ["#e8f0ff", "#d6e4ff", "#f4f8ff", "#c9dcff"],
	behavior: [
		"XX|XX|XX",
		"XX|RL:radiation%3 AND CH:radon%0.02|XX",
		"M2|M1|M2"
	],
	reactions: {
		"water": { elem1: "radon", elem2: "hydrogen", chance: 0.005 },
		"glass": { elem2: "rad_glass", chance: 0.02 },
		"neutron": { elem2: "radiation", chance: 0.5 }
	},
	glow: true,
	temp: 25,
	tempHigh: 700,
	category: "powders",
	state: "solid",
	density: 5500,
	hardness: 0.4,
	conduct: 0.3,
	alias: "ra",
	excludeRandom: true,
	desc: "Glowing, very radioactive white metal. Slowly decays into Radon gas."
};

elements.radon = {
	color: ["#9fd6c2", "#b4e3d2"],
	behavior: [
		"XX|XX|XX",
		"M1%20|RL:radiation%1 AND DL%0.1|M1%20",
		"M1|M1|M1"
	],
	reactions: {
		"water": { elem1: null, elem2: "dirty_water", chance: 0.05 }
	},
	temp: 25,
	tempLow: -61.7,
	category: "gases",
	state: "gas",
	density: 9.73,
	alias: "rn",
	excludeRandom: true,
	desc: "Heavy radioactive gas made when Radium decays. It sinks and slowly fades away."
};

// The auto-made molten versions: keep them radioactive.
runAfterAutogen(function() {
	// Neutrons hitting Plutonium: warm Plutonium goes nuclear, cold Plutonium heats up (so the next hit counts).
	elements.neutron.reactions = elements.neutron.reactions || {};
	elements.neutron.reactions.plutonium = { func: function(n, pu) {
		if (pu.temp >= 100) { changePixel(pu, "n_explosion"); }
		else { pu.temp += 50; pixelTempCheck(pu); }
	}, chance: 0.6 };
	elements.neutron.reactions.molten_plutonium = { func: function(n, pu) { changePixel(pu, "n_explosion"); } };
	if (elements.molten_plutonium) {
		elements.molten_plutonium.behavior = behaviors.RADMOLTEN;
		elements.molten_plutonium.reactions = elements.molten_plutonium.reactions || {};
		elements.molten_plutonium.reactions.neutron = { elem1: "n_explosion" };
		elements.molten_plutonium.density = 16630;
	}
	if (elements.molten_radium) {
		elements.molten_radium.behavior = behaviors.RADMOLTEN;
		elements.molten_radium.glow = true;
	}
	if (elements.liquid_radon) elements.liquid_radon.behavior = behaviors.RADLIQUID;
});
