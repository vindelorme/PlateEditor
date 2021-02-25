//***************************************************************
//TYPEMAP Object - To handle compatibility of types in the plate
//***************************************************************
class TypeMap {
	constructor(plate) {
		this.Plate = plate;
		this.Map = Array(plate.Rows * plate.Cols); //Start with an empty array
		return this;
	}
	//Static Methods
	static valueForType(type) { //Return the value for type
		switch(type) {
			case "Positive Control": return 0;
			case "Negative Control": return 1;
			case "Sample": return 2;
			case "Range": return 3;
			case "Mixed+": return 4;
			case "Mixed-": return 5;
			default: return 6;
		}
	}
	static symbolForValue(value) { //Return the symbol representing the type stored as value
		switch(value) {
			case 0: return "+";
			case 1: return "-";
			case 2: return "S";
			case 3: return "R";
			case 4: return "M+";
			case 5: return "M-";
			default: return "&nbsp;";
		}
	}
	static colorForValue(value) { //Return the css color name associated with the type
		switch(value) {
			case 0: return "lightgreen";
			case 1: return "lightsalmon";
			case 2: return "white";
			case 3: return "lightcyan";
			case 4: return "khaki";
			case 5: return "plum";
			default: return "white";
		}
	}
	static matrix(a, b) { //Return the type value of comparing the 2 incoming type values
		let M = [ //Compatibility matrix. Types are in order +/-/S/R/M+/M-/unknown
			[ 0,-1, 4, 4, 4,-1, 6],
			[-1, 1, 5, 5,-1, 5, 6],
			[ 4, 5, 2, 2, 4, 5, 6],
			[ 4, 5, 2, 3, 4, 5, 6],
			[ 4,-1, 4, 4, 4,-1, 6],
			[-1, 5, 5, 5,-1, 5, 6],
			[ 6, 6, 6, 6, 6, 6, 6],
		];
		return M[a][b];
	}
	static checkCompatibility(a, b, strict) { //Check compatibility of the two types provided
		if(a === undefined || b === undefined) {return true} //Always compatible with nothing
		if(a == -1 || b == -1) {return false} //Incompatibility will propagate
		let result = this.matrix(a, b);
		if(result == -1) {return false} //Overall between positive and negative control is always rejected
		if(strict && result > 3) {return false} //Types are not "pure" or not compatible, reject in strict mode
		else {return true}
	}
	static reduce(array) { //Reduce the array of type provided and return the final value
		if(array.length > 0) { //At least one element remaining
			let t = array.reduce(function (a, b) {
				return TypeMap.matrix(a, b);
			});
			return t;
		}
		return undefined; //Fallback if array is empty
	}
	static getConflicts(map) { //Check the map provided and return the array of index for which conflicts are found
		var out = [];
		map.Map.forEach(function(m, i) {
			if(m > 3) {out.push(i)}
		});
		return out;
	}
	//Methods
	get(index) { //Return the type at the index location
		return this.Map[index];
	}
	types(index, l) { //Return the array of types for all layer except l, at the index location.
//*********************************************************
//Can be used with l=-1 to retrieve types across all layers
//However, it is much easier to use Map[index] in this case
//*********************************************************
		let types = [];
		this.Plate.Layers.forEach(function(L) { //Collect the types at location index, across the layers, excluding l
			if(L.Index != l) { //All layers excluding l
				let w = L.Wells[index];
				if(w.Area) { //If an area is defined
					types.push(TypeMap.valueForType(w.Area.Type));
				}
			}
		});
		return types;
	}
	log(index, type) { //Log the type provided at position index
		let a = this.Map[index];
		let b = TypeMap.valueForType(type);
		if(a !== undefined) {this.Map[index] = TypeMap.matrix(a, b)} //A value has already been defined.
		else {this.Map[index] = b} //This position was empty
		return this;
	}
	unlog(index, l) { //Recompute the type that will remain at position index after removal of the type on layer l
		let types = this.types(index, l); //Recover the array of types
		this.Map[index] = TypeMap.reduce(types); //Update with new computed type
	}
	resize(r, c) { //Resize the Map array to new dimensions provided
		let oldRows = this.Plate.Rows; //Old dimensions
		let oldCols = this.Plate.Cols;
		let temp = []; //The new Map array
		let i = 0;
		while(i < r) {
			let j = 0;
			while(j < c) {
				if(j < oldCols && i < oldRows) { //Salvage the old data
					let oldData = this.Map[oldCols * i + j];
					if(oldData) {temp.push(oldData)}
					else {temp.push(undefined)}
				}
				else {temp.push(undefined)}
				j++;
			}
			i++;
		}
		this.Map = temp;
		return this;
	}
	draw() { //Draw the map as an html array
		let r = this.Plate.Rows;
		let c = this.Plate.Cols;
		let html = "<table class=\"PlateTable\"><tr><th></th>";
		for(let j=0;j<c;j++) { //Headers, for each col
			html += "<th>" + (j + 1) + "</th>";
		}
		html += "</tr>";
		for(let i=0;i<r;i++) { //For each row
			html += "<tr><th>" + Well.alphabet(i) + "</th>";
			for(let j=0;j<c;j++) { //For each col
				let v = this.Map[i * c + j];
				html += "<td style=\"background-color: " + TypeMap.colorForValue(v) + "\">" + TypeMap.symbolForValue(v) + "</td>";
			}
			html += "</tr>";
		}
		html += "</table>";
		html+= "<p style=\"font-size:0.8em\">+: Positive Control; -: Negative Control; S: Sample; R: Range; M+/-: Mixed sample or range with control</p>"
		return html;
	}
}