//******************************************************************************************************
// COORDINATE object - Object holding the values for a single point, along a given coordinate in a graph
//******************************************************************************************************
class Coordinate {
	constructor(values, index) {
		this.Index = index;
		this.Values = values; //Values for this coordinate, as an array of elements. Elements can be numbers or text
		this.NumValues = []; //Array with only the numerical values
		this.Min = +Infinity;
		this.Max = -Infinity;
		let l = this.Values.length;
		if(l == 0) {return this} //At least one element should be there, to define a valid point.
		this.Excluded = Array(l).fill(false); //To locate points that are excluded
		this.Numeric = Array(l).fill(false); //To locate points that are numerical values
		this.Values.forEach(function(v, i) {
			let bool = Decimal.isNumeric(v);
			this.Numeric[i] = bool;
			if(bool) {
				Coordinate.getMinMax(v, this); //Update min/Max
				this.NumValues.push(v); //Keep in the array of numeric only values
			}
		}, this);
		/*this.Numeric = this.Values.map(function(v) { //An array of booleans indicating if the values are numerical or text
			if(v instanceof Array) {return v.reduce(function(acc, val) {return acc || Decimal.isNumeric(val)}, false)} //At least one valid value required to be considered numeric
			else {return Decimal.isNumeric(v)}
		});*/
		return this;
	}
	//Static methods
	static getMinMax(v, I) { //Update the min, max values of the object based on the value
		if(v < I.Min) {I.Min = v}
		if(v > I.Max) {I.Max = v}
	}
	static exclude(coord, index) { //Exclude the data at the index given for the coordinate passed
		coord.Excluded[index] = true;
	}
	static excluded(coord) { //Tell whether the coordinate should be considered excluded, which is true when all the data it contains are excluded
		return coord.Excluded.reduce(function(acc, val) {
			return acc && val;
		}, true);
	}
	static value(c, index) { //Return the value at index i for the coordinate
		let val = c.Values[index];
		if(val instanceof Array) { //An array of values, return the average only
			return Coordinate.statValue(val).Average; //Will be undefined if no valid values to build an average
		}
		else { //Single value, return as is
			return val;
		}
	}
	static statValue(val) { //Compute the stats for a single value of the Values array
		if(Array.isArray(val)) { //An array of values
			let l = val.length; //Total number of values in the array
			let flat = val.map(function(x) { //Flatten objects inside the array
				if(x!== undefined && x!== null && x.Value !== undefined) {return x.Value}
				return x;
			});
			let v = flat.filter(function(x) { //Then get the array of numerical elements only
				return Decimal.isNumeric(x);
			});
			let n = v.length; //Total number of numerical values
			if(n == 0) {return {N: 0, Total: l} } //No values means no more work to do
			if(n == 1) {return {N: 1, Average: v[0], Total: l}} //Only one value means nothing else to do
			let total = v.reduce(function(acc, cur) {return acc + cur}, 0);
			let avg = total / n; //Average value
			let sumVariance = v.reduce(function(acc, cur) {
				return acc + Math.pow(cur - avg, 2);
			}, 0);
			let SD = Math.sqrt(sumVariance / n);
			return {N: n, Average: avg, SD: SD, CV: 100 * SD / avg, Total: l}
		}
		else { //Just one value
			return {N: 1, Average: val, Total: 1}
		}
	}
	static headerObject(way, CV) { //Return a structured object representing the header for statistics, either as row or column, including CV or nothing
		let o = this.statObject(CV);
		if(way == "Row") { //The output will be as an object including arrays of properties
			return {
				Names: o.map(function(s) {return s.Name}),
				Types: o.map(function(s) {return s.Type}),
				Titles: o.map(function(s) {return s.Title}),
			}
		}
		else {return o} //The output will be an array of objects with a set of properties
	}
	static statObject(CV) { //Return an array of objects with a set of properties representing the statistics calculated. CV present or not, as a boolean
		let out = [
			{Name: "Average", Type: "#", Title: ["Average of the numerical values present in this column. Not available for texts"], Class: "TotalRows"},
			{Name: "SD", Type: "#", Title: ["Standard Deviation for the numerical values present in this column. Available for 2 or more values"], Class: "TotalRows"},
		];
		if(CV) {out.push({Name: "CV", Type: "#", Title: ["Coefficient of Variation for the numerical values present in this column (expressed in %). Available for 2 or more values"], Class: "TotalRows"})}
		out.push(
			{Name: "N", Type: "Text", Title: ["Number of numerical and valid values used for the calculation of the statistics"], Class: "TotalRows"}, //Consider the N as text so that it bypasses the decimal formatting
			{Name: "Total", Type: "Text", Title: ["Total number of values seen in this column"], Class: "TotalRows"} //Same here
		);
		return out;
	}
	static statToArray(s, CV) { //Return the values in the stat object s as an array, with or w/o the CV
		let out = [s.Average, s.SD];
		if(CV) {out.push(s.CV)}
		out.push(s.N, s.Total);
		return out;
	}
	//Getter and Setter
	
	//Methods
	getStats() { //Get the stats for this coordinate
		return Coordinate.statValue(this.getValues());
	}
	getValues() { //Get the numeric, non-excluded values for this coordinate
		return this.NumValues.filter(function(v, i) {
			return (this.Numeric[i] === true && this.Excluded[i] === false); //Only numeric, non excluded values should be used
		}, this);
	}
	draw(ctx, O, I) { //Draw the coordinate on the canvas context provided
		let Cg = I.GraphConfig;
		let Legend = Grapher.Legends.Array[this.Index]; //Legend corresponding to this coordinate
		let a = Cg.get("Axes","XAxis","Size") / 2; //Offset for the Xaxis size
		O.Stat = this.getStats(); //Size of the border, should be removed to match the right size
		O.y = Math.round(Cg.get("PlotArea", "Size", "Height") + Cg.get("PlotArea", "Margins", "Top") - a); //y position at the XAxis
		if(O.Stat.Average === undefined) { //No average means no points
			Legend.drawNoData(ctx, Math.round(O.x + (O.BarWidth / 2)), Math.round(O.y - (Cg.get("Axes", "Ticks", "Length") / 2) - 5)); //Draw the symbol with offsets for correct location
		} 
		else { //Draw the point
			O.h = Math.round((O.Stat.Average - Cg.get("Scale", "YAxis", "Min")) * I.Ratio - a); //Y position of the point. Don't forget to offset by the Scale.Min!
			this.drawBar(ctx, O, I);
			this.drawError(ctx, O, I);
			this.drawPoints(ctx, O, I);
		}
		return this;
	}
	drawBar(ctx, O, I) { //Draw the bar for this point
		let Legend = Grapher.Legends.Array[this.Index]; //Legend corresponding to this coordinate
		let Cl = Legend.Config; //Config legend
		if(Cl.get("Bars", "Main", "Use")) { //Draw the bar if needed
			let s = Cl.get("Bars", "Border", "Size"); //Size of the border
			if(Cl.get("Bars", "Border", "Use") == false) {s = 0} //If the border is not used, the offset is just 0
			if(Cl.get("Bars", "Border", "Use")) { //Draw the bar border if needed
				Shape.Bar(ctx, O.x - s, O.y, {Width: O.BarWidth + 2 * s, Height: O.h}, {Use: false}, Cl.values("Bars", "Border")); //Simulate the border using a filled rectangle
				ctx.clearRect(O.x, O.y - O.h + s, O.BarWidth, O.h); //Clear the inside to leave only the border
			}
			if(Cl.get("Bars", "Background", "Use")) { //Draw the background
				Shape.Bar(ctx, O.x, O.y, {Width: O.BarWidth, Height: O.h - s}, {Use: false}, Cl.values("Bars", "Background"));
			}
		}
		return this;
	}
	drawError(ctx, O, I) { //Draw the error bar for this point
		let Legend = Grapher.Legends.Array[this.Index]; //Legend corresponding to this coordinate
		let Cl = Legend.Config; //Config legend
		if(Cl.get("Error-bars", "Main", "Use")) { //Draw the error bar if needed
			Shape.errorBar(ctx, Math.round(O.x + (O.BarWidth / 2)), Math.round(O.y - O.h), {y: Math.round(O.Stat.SD * I.Ratio)}, Cl.values("Error-bars", "Main"));
		}
		return this;
	}
	drawPoints(ctx, O, I) { //Draw all the points
		let Legend = Grapher.Legends.Array[this.Index]; //Legend corresponding to this coordinate
		let Cl = Legend.Config; //Config legend
		let Cg = I.GraphConfig;
		let offset = Cg.get("Scale", "YAxis", "Min"); //Offset from the scale
		let a = Cg.get("Axes","XAxis","Size") / 2; //Offset for the Xaxis size
		if(Cl.get("Points", "Main", "Use")) { //Draw the points if needed
			let val = this.getValues(); //Array of values to plot
			let x = Math.round(O.x + (O.BarWidth / 2)); //Points are aligned on the center of the bar
			let nudge = Cl.get("Points", "Main", "Nudge");
			let l = val.length; //Total number of values (i.e points) to plot
			let s = Cl.get("Points", "Main", "Size");
			let shape = Cl.get("Points", "Main", "Shape");
			val.forEach(function(v, i) { //Draw each point separately
				if(nudge && l > 1) {x = Math.round(O.x + i * (O.BarWidth / (l - 1)))} //Shift x position at each iteration to occupy all the bar width
				Shape["__" + shape](ctx, x, Math.round(O.y + a - ((v - offset) * I.Ratio)), s, Cl.values("Points", "Border"), Cl.values("Points", "Background"));
			}, this);
		}
		return this;
	}
}