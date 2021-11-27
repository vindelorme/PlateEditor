//****************************************************
// DECIMAL object - For clean mathematics with numbers
//****************************************************
class Decimal {
	constructor(n) {
		this.Input = n; //The input number
		this.InputStr = n.toString(); //String representation of the input
		this.Sgn = Math.sign(n); //Sign: -1; 0; 1
		this.Value = Math.abs(n); //Exclude the sign
		this.ValueStr = this.Value.toString(); //String of input without sign
		this.Floor = Math.floor(this.Value); //Floor part
		this.FloorStr = this.Floor.toString(); //Floor part as a string
		this.ExpPosition = this.InputStr.indexOf("e"); //Position of the exponential operator in the input string
		this.DecPosition = this.ValueStr.indexOf("."); //Position of the decimal separator, in the string without sign
		this.Power = Math.floor(Math.log10(this.Value)) //Calculate the power, or exponent, of the number.
		if(this.ExpPosition > 0) { //Exponential notation used here
			this.RawDecimalStr = this.ValueStr.substring(this.DecPosition + 1, this.ExpPosition); //Raw decimals parts, excluding the "e+/-xxx"
			this.PowerOffset = - (this.RawDecimalStr.length - 1); //The offset power to use when working with the PureValue, in order to get back to the right number
		}
		else {
			if(this.DecPosition > 0) {this.RawDecimalStr = this.ValueStr.substring(this.DecPosition + 1)} //Raw decimals parts
			else {this.RawDecimalStr = ""} //Case where there are no decimals 
			this.PowerOffset = -(this.RawDecimalStr.length + this.Power); //The offset power to use when working with the PureValue, in order to get back to the right number
		}
		this.Decimals = Number(this.RawDecimalStr); //Without leading zeros
		this.DecimalStr = this.Decimals.toString(); //String of the pure decimal part, wihtout leading zeros
		if(this.ExpPosition > 0) { //Exponential notation used here
			this.PureValueStr = this.ValueStr.substring(0, this.DecPosition) + this.RawDecimalStr; //The pure number value, without power or dot, as a string
		}
		else {
			if(this.Floor == 0) {this.PureValueStr = this.DecimalStr}
			else {this.PureValueStr = this.InputStr.replace(/[.]/, "")}
		}
		this.PureValue = Number(this.PureValueStr); //The pure number value, without power or dot
		return this;
	}
	//Static methods
	static isNumeric(v) { //Returns a boolean to indicate if the value is text or number
		return (v !== undefined && v !== null && v.toFixed !== undefined && isNaN(v) == false);
	}
	static sgnToText(d) { //Return the txt string corresponding to the sign for the decimal object d
		if(d.Sgn < 0) {return "-"}
		else {return ""}
	}
	static niceNumber(n, I) { //Return the "nicest" number which is the closest (above or below) to n. "Nice" is defined as being any powers of 2, 5 or 10. The Decimal object will be returned, except if the number is explicitly requested
		let nice = 0; //The nice number to return. 0 is used as a default fallback
		let above = true; //Whether the nice number should be bigger or smaller than the number provided
		let offset = 0; //Offset for the root digits, to make sure they fall as a number between 0 and 10
		let d = new Decimal(n);
		let p = d.Power;
		let array = [1, 1.2, 1.25, 1.5, 1.75, 2, 2.5, 4, 5, 6, 7.5, 8, 10]; //The array to compare the root digits with. Any of these numbers is considered "nice" and the aim is to select the closest
		if(I) {
			if(I.Power) {p = I.Power}
			if(I.Below) {above = false}
			if(I.Loose) {array = [1, 2, 4, 5, 10]} //In case a looser approximation is needed
		}
		if(d.Sgn == -1) {above = !above} //In this case, should switch above/below to its opposite
		let digit = d.Value / Math.pow(10, p); //The root digits
		if(digit > 10) { //Bring it back down between 0 and 10
			offset = 10;
			digit -= offset;
		}
		let op = function(a, b) {return(a <= b)} //The comparison function
		if(I && I.Strict) {op = function(a, b) {return a < b}} //Strict inequality
		if(above) { //Nice number should be bigger
			array.reverse(); //This ensures the "smallest among the bigger" will be used
			op = function(a, b) {return(a >= b)}
			if(I && I.Strict) {op = function(a, b) {return a > b}} //Strict inequality
		}
		array.forEach(function(a) {if(op(a, digit)) {nice = a}}); //Compare the root digits with all of the nice numbers available and pick the closest one
		let niceNumber = d.Sgn * (offset + nice) * Math.pow(10, p); //Restore the nice number to the right power and sign
		if(I && I.ReturnAsObject) {return(new Decimal(niceNumber))}
		else {return niceNumber}
	}
	static multiply(a, b, bool) { //Perform a "clean" multiplication with the numbers provided and return the corresponding number. This is to avoid rounding issues
		if(a == 0 || b == 0) {return 0} //Trivial, but problem of power with these cases that need to be excluded
		let A = new Decimal(a);
		let B = new Decimal(b);
		let pureResults = A.PureValue * B.PureValue; //Calculate the pure number out of the inputs. This has no decimals
		let power = A.Power + A.PowerOffset + B.Power + B.PowerOffset; //Calculate the power
		let result = NaN;
		if(power >= 0) {
			result = pureResults * Math.pow(10, power); //No rounding errors in that case
		}
		else { //Rounding errors will ensue when multiplying, so simply shift to a division
			result = pureResults / Math.pow(10, Math.abs(power));
		}
		//let result = pureResults * Math.pow(10, power);
		if(bool) {return new Decimal(result)} //Output
		else {return result}
	}
	static format(n, digit, I) { //Output the number in a string format, keeping digit as precision and using scientific notation whenever required. In case of rounding, displays a leading tilde if true
		let d = new Decimal(n);
		if(digit == 0 || isNaN(digit)) {return d.InputStr} //no formatting, return a string to be consistent with the other outputs
		let out = "~"; //Output string
		if(I && I.NoTilde) {out = ""} 
		let f = d.FloorStr.length;
		if(d.DecPosition > 0) { //Case xx[...]xx.xx[...]xx, the number has decimals
			if(d.ValueStr.length <= (digit+1 )) {return d.InputStr} //Trivial case, no rounding. +1 for decimal place
			let diff = d.RawDecimalStr.length - d.DecimalStr.length; //This will get the number of leading zeros for decimals, if any
			if(d.Floor == 0) { //Case 0.xx[...]xx
				if(diff > 0) { //Case 0.00[...]00xxx
					if(d.DecimalStr.length <= digit) {return d.Input.toExponential(d.DecimalStr.length-1)} //Simple case, no rounding necessary
					else { //Rounding required
						out += Decimal.sgnToText(d); //Add the sign
						let array = d.DecimalStr.split("");
						if(Number(array[digit]) > 4) {array[digit-1]++} //Rounding
						for(let i=0;i<digit;i++) { //Add the decimals
							if(i == 1) {out += "." + array[i]} //Ensures the dot is added only if something comes behind
							else {out += array[i]}
						}
						return out + "e-" + (diff + 1); //Add the power and return
					} 
				}
				else { //Case 0.xx[...]xx
					if(d.DecimalStr.length <= digit) {return d.InputStr} //Simplest case, no rounding necessary
					else { //Round
						out += Decimal.sgnToText(d);
						out += d.Input.toFixed(digit);
						return out;
					}
				}
			}
			else { //Case xx[...]xx.xx[...]xx
				if(f > (digit - 1)) {return out + d.Input.toExponential(digit-1)} //More digits in the floor than required. Use std sci notation
				else { //Case xx.xxx[...]xx, too much decimals
					let decNeeded = digit - f; //How many decimals should be taken
					out += Decimal.sgnToText(d) + d.FloorStr + ".";
					let array = d.DecimalStr.split("");
					if(Number(array[decNeeded]) > 4) {array[decNeeded-1]++} //Rounding
					for(let i=0;i<decNeeded;i++) {out += array[i]}
					return out;
				}
			}
		}
		else { //Case xx[...]xx, no decimals; or exponential notation
			if(d.ValueStr.length <= digit) {return d.InputStr} //Trivial case, no rounding
			var p = f; //in the remaining, may need to round. First look for trailing zeros
			while (d.FloorStr.substring(p, p - 1) == "0") {p--}
			var power = f - p; //Get the power
			if(power > 0) { //Case xx[...]xx00[...]00
				var TrueFloor = d.FloorStr.substring(0, p); //Get only the significant digits
				var tf = TrueFloor.length;
				if(tf > 0 && tf <= digit) {return d.Input.toExponential(tf-1)} //Exact, no rounding required
				else {return out + d.Input.toExponential(digit-1)} //Need to round
			}
			else {return out + d.Input.toExponential(digit-1)} //No trailing zeros, need to round
		}
	}
	//Methods
}


/*function Decimal(n) {
	this.Input = n; //The input number
	//Constructor
	this.InputStr = n.toString(); //String representation of the input
	this.Sgn = Math.sign(n); //Sign: -1; 0; 1
	this.Value = Math.abs(n); //Exclude the sign
	this.ValueStr = this.Value.toString(); //String of input without sign
	this.Floor = Math.floor(this.Value); //Floor part
	this.FloorStr = this.Floor.toString(); //Floor part as a string
	this.ExpPosition = this.InputStr.indexOf("e"); //Position of the exponential operator in the input string
	this.DecPosition = this.ValueStr.indexOf("."); //Position of the decimal separator, in the string without sign
	this.Power = Math.floor(Math.log10(this.Value)) //Calculate the power, or exponent, of the number.
	if(this.ExpPosition > 0) { //Exponential notation used here
		this.RawDecimalStr = this.ValueStr.substring(this.DecPosition + 1, this.ExpPosition); //Raw decimals parts, excluding the "e+/-xxx"
		this.PowerOffset = - (this.RawDecimalStr.length - 1); //The offset power to use when working with the PureValue, in order to get back to the right number
	}
	else {
		if(this.DecPosition > 0) {this.RawDecimalStr = this.ValueStr.substring(this.DecPosition + 1)} //Raw decimals parts
		else {this.RawDecimalStr = ""} //Case where there are no decimals 
		this.PowerOffset = -(this.RawDecimalStr.length + this.Power); //The offset power to use when working with the PureValue, in order to get back to the right number
	}
	this.Decimals = Number(this.RawDecimalStr); //Without leading zeros
	this.DecimalStr = this.Decimals.toString(); //String of the pure decimal part, wihtout leading zeros
	if(this.ExpPosition > 0) { //Exponential notation used here
		this.PureValueStr = this.ValueStr.substring(0, this.DecPosition) + this.RawDecimalStr; //The pure number value, without power or dot, as a string
	}
	else {
		if(this.Floor == 0) {this.PureValueStr = this.DecimalStr}
		else {this.PureValueStr = this.InputStr.replace(/[.]/, "")}
	}
	this.PureValue = Number(this.PureValueStr); //The pure number value, without power or dot
	//Methods
	this.sgnToText = function() { //Return the txt string corresponding to the sign
		if(this.Sgn < 0) {return "-"}
		else {return ""}
	}
	this.format = function(digit, tilde) { //Output the number in a string format, keeping digit as precision and using scientific notation whenever required. In case of rounding, displays a leading tilde if true
		if(digit == 0) {return this.InputStr} //no formatting, return a string to be consistent with the other outputs
		if(tilde) {var out = "~"} else {var out = ""} //Prepare output
		var f = this.FloorStr.length;
		if(this.DecPosition > 0) { //Case xx[...]xx.xx[...]xx, the number has decimals
			if(this.ValueStr.length <= (digit+1 )) {return this.InputStr} //Trivial case, no rounding. +1 for decimal place
			var diff = this.RawDecimalStr.length - this.DecimalStr.length; //This will get the number of leading zeros for decimals, if any
			if(this.Floor == 0 && diff > 0) { //Case 0.00[...]00xxx
				if(this.DecimalStr.length <= digit) {return this.Input.toExponential(this.DecimalStr.length-1)} //Simple case, no rounding necessary
				else {return this.roundSCI(this.DecimalStr, -(diff+1), digit, out)} //Rounding required
			}
			if(this.Floor == 0 && diff == 0) { //Case 0.xx[...]xx
				if(this.DecimalStr.length <= digit) {return this.InputStr} //Simplest case, no rounding necessary
				else { //Avoiding e-1
					var array = this.DecimalStr.split("");
					out += this.sgnToText() + "0."; //Add the sign
					if(Number(array[digit]) > 4) {array[digit-1]++} //Rounding
					for(let i=0;i<digit;i++) {out += array[i]} //Add the decimals
					return out;
				}
			}
			//In all these remaining cases, Floor is > 0
			if(f > (digit-1)) {return out + this.Input.toExponential(digit-1)} //Case xx[...]xx.xx[...]xx, with more digits in the floor than required. Use std sci notation
			else { //Case xx.xxx[...]xx, few decimals will be needed
				var decNeeded = digit - f; //How many decimals should be taken
				var array = this.DecimalStr.split("");
				if(Number(array[decNeeded]) > 4) {array[decNeeded-1]++} //Rounding
				out += this.sgnToText() + this.FloorStr + ".";
				for(let i=0;i<decNeeded;i++) {out += array[i]}
				return out;
			}
		}
		else { //Case xx[...]xx, no decimals; or exponential notation
			if(this.ValueStr.length <= digit) {return this.InputStr} //Trivial case, no rounding
			var p = f; //in the remaining, may need to round. First look for trailing zeros
			while (this.FloorStr.substring(p, p - 1) == "0") {p--}
			var power = f - p; //Get the power
			if(power > 0) { //Case xx[...]xx00[...]00
				var TrueFloor = this.FloorStr.substring(0, p); //Get only the significant digits
				var tf = TrueFloor.length;
				if(tf > 0 && tf <= digit) {return this.Input.toExponential(tf-1)} //Exact, no rounding required
				else {return out + this.Input.toExponential(digit-1)} //Need to round
			}
			else {return out + this.Input.toExponential(digit-1)} //No trailing zeros, need to round
		}
	}
	this.roundSCI = function(object, power, digit, out) { //return a string of the scientific notation of object (decimal or floor), using power for the exponential, with digit as precision, displaying "~" if tilde
		var array = object.split("");
		out += this.sgnToText(); //Add the sign
		if(Number(array[digit]) > 4) {array[digit-1]++} //Rounding
		for(let i=0;i<digit;i++) { //Add the decimals
			if(i == 1) {out += "." + array[i]} //Ensures the dot is added only if something comes behind
			else {out += array[i]}
		} 
		return out + "e" + power; //Add the power and return
	}
	this.formatConc = function(unit, digit, html) { //Format the number with its unit, using html space if true
		var space = " ";
		if(html) {space = "&nbsp;"}
		switch(unit) {
			case "MOI": return(unit + space + this.format(digit, true)); // invert in case of MOI
			default: return(this.format(digit, true) + space + unit);
		}
	}
	this.niceNumber = function(I) { //Return the "nicest" number which is the closest (above or below) to this number. "Nice" is defined as being any powers of 2, 5 or 10. The Decimal object will be returned, except if the number is explicitly requested
		var nice = 0;
		var above = true;
		var p = this.Power;
		var array = [1, 1.2, 1.25, 1.5, 1.75, 2, 2.5, 4, 5, 6, 7.5, 8, 10];
		if(I) {
			if(I.Power) {p = I.Power}
			if(I.Below) {above = false}
			if(I.Loose) {array = [1, 2, 4, 5, 10]} //In case only a loose approximation is needed
		}
		if(this.Sgn == -1) {above = !above} //In this case, should switch above/below to its opposite
		var digit = this.Value / Math.pow(10, p);
		if(digit > 10) {var offset = 10}
		else {var offset = 0}
		digit -= offset;
		var op = function(a, b) {return(a <= b)}
		if(above) { //Nice number should be bigger
			array.reverse(); //This ensures the "smallest among the bigger" will be used
			op = function(a, b) {return(a >= b)}
		}
		array.forEach(function(a) {if(op(a, digit)) {nice = a}});
		var niceNumber = this.Sgn * (offset + nice) * Math.pow(10, p);
		if(I && I.ReturnAsNumber) {return niceNumber}
		else {return(new Decimal(niceNumber))}
	}
	this.multiply = function(a, I) { //Perform a "clean" multiplication with the number provided and return the corresponding number. This is to avoid rounding issues
		if(a == 0 || this.Input == 0) {return 0} //Trivial, but problem of power with these cases that need to be excluded
		var input = new Decimal(a);
		var pureResults = input.PureValue * this.PureValue; //Calculate the pure number out of the inputs
		var power = input.Power + input.PowerOffset + this.Power + this.PowerOffset; //Calculate the power
		var resultStr = pureResults + "e" + power; //Make up a string
		var result = eval(resultStr); //Evaluate the result
		if(I && I.ReturnAsObject) {return new Decimal(result)} //Output
		else {return result}
	}
}*/