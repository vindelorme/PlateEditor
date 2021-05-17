//************************************
// UNIT object - Class to handle units
//************************************
class Unit {
	constructor() {}
	//Static Methods
	static units() { //Returns an array with all the available unit objects
		return [
			{Name: "M"},
			{Name: "mM", Root: "M", Shift: -3},
			{Name: "µM", Root: "M", Shift: -6},
			{Name: "nM", Root: "M", Shift: -9},
			{Name: "pM", Root: "M", Shift: -12},
			{Name: "g/L"},
			{Name: "g/mL"},
			{Name: "mg/mL", Root: "g/mL", Shift: -3},
			{Name: "µg/mL", Root: "g/mL", Shift: -6},
			{Name: "ng/mL", Root: "g/mL", Shift: -9},
			{Name: "pg/mL", Root: "g/mL", Shift: -12},
			{Name: "%"},
			{Name: "u/mL"},
			{Name: "ku/mL", Root: "u/mL", Shift: 3},
			{Name: "Mu/mL", Root: "u/mL", Shift: 6},
			{Name: "MOI", Invert: true},
			{Name: "×"},
			{Name: "a.u"},
		];
	}
	static list(I) { //Returns a list of all the available units
		let l = this.units();
		if(I && I.Name) {return l.map(function(u) {return u.Name})} //Only the names
		return l;
	}
	static shiftForUnit(unit) { //For the unit provided, return the shift needed to reach the mother unit, in log scale
		let l = this.units();
		let here = l.find(function(u) {return u.Name == unit});
		return (here.Shift || 0);
	}
	static rootForUnit(unit) { //For the unit provided, return the shift needed to reach the mother unit, in log scale
		let l = this.units();
		let here = l.find(function(u) {return u.Name == unit});
		return (here.Root || unit);
	}
}