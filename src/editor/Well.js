//*************************************************
// WELL object - Well is a collection of properties
//*************************************************
class Well {
	constructor(I) {
		this.Layer = I.Layer; //Parent Layer object
		this.Index = I.Index; //Index in the parent Wells array
		this.Row = I.Row;
		this.Col = I.Col;
		this.Value = undefined; //The value of the concentration, as a number
		this.Conc = undefined; //A string representing the formatted value of the concentration, used for display
		this.Unit = undefined; //The unit attached to the concentration
		this.RangeIndex = 1; //Index of the well in the range
		this.Area = undefined; //Area contained in this well
//*************************************
//Indicators for the status of the well
		this.Selected = false;
		this.Duplicate = false;
		this.Error = false;
//*************************************
		return this;
	}
	//Static Methods
	static alphabet(c) { //Return a string matching the column index given
		var A = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
		if(c < 26) {return A[c]}
		else {return "A" + A[c-26]} //This is enough to cover all the 48 rows allowed
	}
	static dose(w) { //Return a string for the dose in this well
		if(w === undefined || w.Conc === undefined) {return ""}
		if(w.Unit == "MOI") {return "MOI " + w.Conc} //Unit goes first
		if(w.Unit == "%") {return w.Conc + "%"} //No space
		else {return w.Conc + " " + w.Unit} //Normal case
	}
	static parseIndex(w, plate) { //Parse the index corresponding to the well name provided as a string, in the current plate dimensions
		if(w === undefined || plate === undefined || w.search === undefined) {return}
		let c = plate.Cols;
		let r = plate.Rows;
		let i = w.search(/[a-z]{1,2}[0-9]{1,3}/i);
		if(i < 0) {return} //Not a valid well name
		let letters = w.match(/[a-z]{1,2}/i); //Parse well name from string. Accept both AX and A0X formats
		let digits = w.match(/[0-9]{1,3}/);   //
		let col = parseInt(digits, 10) - 1; //will remove trailing 0 if any (case A0X format)
		if(col >= c) {return} //Outside plate dimensions
		let row = Well.rowIndex(letters);
		if(row === undefined || row >= r) {return}
		return {Index: row * c + col, Row: row, Col: col};
	}
	static rowIndex(a) { //Parse the row index for the provided string
		if(a.length == 1) {return parseInt(a, 36) - 10}
		if(a.length == 2) {return (parseInt(a.charAt(0), 36) - 9) * 26 + parseInt(a.charAt(1), 36) - 10}
	}
	static layoutData(well, resolvedDef) { //Return the layout data for the current well, as an array, using the provided definitions
		let data = [""]; //Start with an empty placeholder for the area
		if(well.Value) {data.push(well.Value, well.Unit)}
		else {data.push("", "")} //Need to push something to conserve the right number/order in columns
		let a = well.Area;
		if(a) { //If an area is present
			if(a.Type == "Range") { //Specific case for range
				if(a.Definition) { //There is a definition attached to this range
					data[0] = resolvedDef[a.Name][well.Index];
				}
				else { //Use generic names
					data[0] = a.Name + " #" + well.RangeIndex;
				}
			}
			else {data[0] = a.Name} //The rest is straightforward
		}
		return data;
	}
//*******************
//SAVE & LOAD METHODS
//*******************
	static save(w) { //Return a simplified version of the well object for saving
		return {
			Index: w.Index,
			Value: w.Value,
			Unit: w.Unit
		}
	}
//*******************
	//Getter
	get Name() {
		return Well.alphabet(this.Col) + (this.Row + 1);
	}
	//Methods
	x(space) { //Return the x coordinate for this well on the canvas, calculated based on space (size + margin)
		return (this.Col + 1) * space;
	}
	y(space) { //Return the y coordinate for this well on the canvas, calculated based on space (size + margin)
		return (this.Row + 1) * space;
	}
	content(ctx, size, margin) {
		let space = size + margin;
		let half = margin / 2;
		let x = this.x(space);
		let y = this.y(space);
		ctx.clearRect(x - half, y - half, size + margin, size + margin);
		ctx.save();
		if(this.Selected || this.Duplicate || this.Error) { //Highlight the well to mark its state
			ctx.strokeStyle = "dodgerblue";
			if(this.Duplicate) {
				ctx.strokeStyle = "darkorange";
				this.Duplicate = false;
			}
			if(this.Error) {
				ctx.strokeStyle = "darkred";
				this.Error = false;
			}
			ctx.lineWidth = 3;
			ctx.strokeRect(x, y, size, size);
			if(this.Area) {
				ctx.lineWidth = 1;
				ctx.strokeStyle = "black";
				ctx.strokeRect(x + half, y + half, size - margin, size - margin);
			}
		}
		if(this.Area) { //Area information
			ctx.fillStyle = this.Area.Color;
			ctx.fillRect(x + half + 1 , y + half + 1, size - margin - 2, size - margin - 2);
			if(this.Area.Type == "Range") {
				ctx.fillStyle = CSSCOLORS.font(this.Area.Color); //Color for text
				ctx.font = (Math.floor(margin / 2) * 4 + 3) + "px arial";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(this.RangeIndex, x + size * 0.5, y + size * 0.4, size); //MaxWidth specified to avoid excessive overlap
			}
		}
		if(this.Conc) { //Concentration information
			if(this.Area) {ctx.fillStyle = CSSCOLORS.font(this.Area.Color)} //Color for text
			else {ctx.fillStyle = "black"}
			ctx.font = (Math.floor(margin / 2) * 2 + 3) + "px arial";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(Well.dose(this), x + size * 0.5, y + size * 0.75, size); //MaxWidth specified to avoid excessive overlap
		}
		ctx.restore();
		return this;
	}
	tag(a, I) { //Tag the well with area a
		if(I.Keep == false) {this.Selected = false}
		if(this.Area) { //Area already defined here
			if(this.Area.Name == a.Name) {this.Duplicate = true; return this} //Tagging in duplicate
			if(I.Lock) {this.Error = true; return this} //Trying to change the area when lock option is ON
			var t = TypeMap.reduce(I.Map.types(this.Index, I.Layer.Index)); //Type of everything minus the area defined here, because it can be replaced
		}
		else { //No area defined in the well
			var t = I.Map.get(this.Index) //Type at this location when no area is defined here is directly obtained from the map
		}
		let bool = TypeMap.checkCompatibility(t, TypeMap.valueForType(a.Type), I.Strict); //Check compatibility
		if(!bool) {this.Error = true; return this} //Not compatible :(
		if(this.Area) {this.untag(I)} //Compatible, remove the area tagged if any, so that the new area can be added
		this.Area = a; //Finally, tag with the new area
		if(a.Type == "Range" && a.Custom) {this.RangeIndex = I.RangeIndex} //Proceed to custom tagging here
		I.Map.log(this.Index, a.Type); //Log the type at this location
		return this;
	}
	untag(I) { //Untag the well
		if(I.Keep == false) {this.Selected = false}
		let a = this.Area;
		if(a) { //Do something if the well had some area defined
			Area.unlog(a, I.Layer, this); //Remove this well from the list of wells belonging to this area
			I.Map.unlog(this.Index, I.Layer.Index); //Update the map of types
			if(a.Type == "Range") { //Special case for ranges
				if(a.Custom) {this.RangeIndex = 0} //For customized numbering, remove the value now
				let name = a.Name;
				let index = I.Results.Ranges.findIndex(function(r) {return r.Name == name}); //Look whether this area already exist in the Ranges array
				if(index == -1) {
					I.Results.Ranges.push(a); //Add the area only if not already present
				}
			}
			this.Area = undefined;
		}
		return this;
	}
	tagConc(I) { //Tag the well with concentration given
		this.Value = I.Value;
		this.Conc = Decimal.format(I.Value, I.Digit);
		this.Unit = I.Unit;
		return this;
	}
	untagConc() { //UnTag the well with concentration given
		this.Value = undefined;
		this.Conc = undefined;
		this.Unit = undefined;
		return this;
	}
	changeDigit(digit) { //Update the digit representation of the concentration
		this.Conc = Decimal.format(this.Value, digit);
		return this;
	}
}