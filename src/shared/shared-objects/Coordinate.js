//******************************************************************************************************
// COORDINATE object - Object holding the values for a single point, along a given coordinate in a graph
//******************************************************************************************************
class Coordinate {
	constructor(values) {
		this.Values = values; //Values for this coordinate, as an array of elements. At least one element should be there, to define a valid point. Elements can be numbers or array of numbers
		this.Excluded = Array(this.Values.length).fill(false); //To locate points that are excluded
		this.Numeric = this.Values.map(function(v) { //An array of booleans indicating if the values are numerical or text
			if(v instanceof Array) {return v.reduce(function(acc, val) {return acc || Decimal.isNumeric(val)}, false)} //At least one valid value required to be considered numeric
			else {return Decimal.isNumeric(v)}
		});
		return this;
	}
	//Static methods
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
			let v = val.filter(function(n) { //Get the array of numerical elements only
				return Decimal.isNumeric(n);
			});
			let n = v.length; //Total number of numerical values
			if(n == 0) {return {N: 0, Total: l} } //No values means no more work to do
			if(n == 1) {return {N: 1, Average: v[0], Total: l}} //Only one value means nothing else to do
			let total = v.reduce(function(acc, cur) {return acc + cur}, 0);
			let avg = total / n; //Average value
			let sumVariance = val.reduce(function(acc, cur) {
				return acc + Math.pow(cur - avg, 2);
			}, 0);
			let SD = Math.sqrt(sumVariance / n);
			return {N: n, Average: avg, SD: SD, CV: 100 * SD / avg, Total: l}
		}
		else { //Just one value
			return {N: 1, Average: val, Total: 1}
		}
	}
	static flatten(c) { //Flatten the Values array of the coordinate into a single, 1D array containing only numerical values
		let out = c.Values.reduce(function(acc, cur, i) { //Flatten the 2D array of values into a flat 1D array
			if(c.Excluded[i] === false && c.Numeric[i] === true) {return acc.concat(cur)}
			else {return acc}
		}, []);
		out = out.filter(function(v, i) { //Get the array of numerical elements only
			return (Decimal.isNumeric(v));
		});
		return out;
	}
	static stats(c) { //Compute the stats for the coordinate object passed and return them as a structured object.
		/*let val = c.Values.filter(function(v, i) { //Get the array of numerical elements only
			return (c.Excluded[i] === false && c.Numeric[i] === true);
		});*/
		let val = Coordinate.flatten(c);
		let n = val.length; //Number of numerical values
		if(n == 0) {return {N: 0} } //No values means no more work to do
		let total = val.reduce(function(acc, cur) {return acc + cur}, 0);
		if(n == 1) {return {N: 1, Average: total}} //Only one value means nothing else to do
		let avg = total / n; //Average value
		let sumVariance = val.reduce(function(acc, cur) {
			return acc + Math.pow(cur - avg, 2);
		}, 0);
		let SD = Math.sqrt(sumVariance / n);
		return {N: n, Average: avg, SD: SD, CV: 100 * SD / avg}
	}
	//Getter and Setter
	//***************************************************************************************
	//MAYBE MORE EFFICIENT TO SIMPLY CALL THE STATIC METHOD STATS(), WHICH IS MORE EFFICIENT
	//***************************************************************************************
	/*get N() { //Number of valid numerical values
		return this.Numeric.reduce(function(acc, val) {return acc + Number(val)}, 0); //Return 0 if no numerical values
	}
	get Average() { //Average for this data point, based on the values
		let total = 0;
		let n = 0;
		this.Values.forEach(function(v, i) {
			if(this.Excluded[i] === false && this.Numeric[i] === true) {
				n++;
				total += v;
			}
		}, this);
		return (total / n); //Return NaN if no numerical values
	}
	get SD() { //SD of the values
		let avg = this.Average;
		let n = this.N;
		let variance = this.Values.map(function(v) { //return an array for which each element x is now (x-avg)^2, or NaN for text
			return Math.pow(v - avg, 2);
		}); 
		let sumVariance = 0;
		variance.forEach(function(v, i) {
			if(this.Excluded[i] === false && this.Numeric[i] === true) {sumVariance += v}
		}, this);
		return Math.sqrt(sumVariance / n); //Population SD, computed with 1/N (For Sample SD, we should use 1/N-1, but population SD is more natural: [8, 12] => pSD = 2; sSD = 2.82)
	}
	get CV() { //CV(%) of the values
		let SD = this.SD;
		let avg = this.Average;
		return 100 * SD / avg;
	}*/
	//Methods
	
}