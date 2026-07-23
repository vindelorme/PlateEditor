//******************************************************************************************
// SCALE object - Helper class for the preparation of suitable scale objects to use in Graph
//******************************************************************************************
class Scale {
	constructor(I) {
		this.Min = I.Min;
		this.Max = I.Max;
		this.Step = I.Step;
		this.Ticks = I.Ticks;
		return this;
	}
	//Static methods
	static auto(min, max) { //Creates a scale object based on the in and max data values provided
		let step = 1;
		if(max == min) { //First things first, lets exclude weird cases
			if(max == 0) {return {Min: -1, Max: 1, Step: 1, Ticks: 3}} //This case is dangerous because power = -Infinity for 0
			else { //In other cases, we use a trivial 3 ticks template: [x-step; x; x+step] where step is the closest niceNumber of x
				step = Decimal.niceNumber(max);
				if(step < 0) {return {Min: 2 * step, Max: 0, Step: step, Ticks: 3}} //Should invert min-max for negative numbers
				else {return {Min: 0, Max: 2 * step, Step: step, Ticks: 3}}
			}
		}
		let targetTicks = 6;
		let minTicks = 4;
		let maxTicks = 10;
		let rawRange = max - min;
		step = Decimal.niceNumber(rawRange / targetTicks, {Loose: true});
		let niceMin = Math.floor(min / step) * step;
		let niceMax = Math.ceil(max / step) * step;
		let tickCount = Math.round((niceMax - niceMin) / step) + 1;
		if (tickCount < minTicks) {step = step / 2}
		else if (tickCount > maxTicks) {step = step * 2}
		return new Scale({
			Min: Math.floor(min / step) * step,
			Max: Math.ceil(max / step) * step,
			Step: step,
			Ticks: Math.round((niceMax - niceMin) / step) + 1
		});
		/*
		let range = max - min; //Then we can get at it. Lets get the range of the data first
		let niceRange = Decimal.niceNumber(range, {Loose: true, Strict: true, ReturnAsObject: true}); //Lets round this up and strictly, to be sure to include all the data. Loose mode allows more space on each sides and helps avoid decimals
		//let pow10 = Math.pow(10, niceRange.Power - 1); //The order of magnitude for the range of data, in log scale
		let niceMin = Decimal.niceNumber(min, {Strict: true, Below: true, ReturnAsObject: true});
		let niceMax = Decimal.niceNumber(max, {Strict: true, ReturnAsObject: true});
		if(niceMax.Power > niceMin.Power || niceMin.Input == 0) { //Use the max to define the step size and compute the scale min/max, starting from max
			step = Decimal.niceNumber(niceRange.Input / 4, {Below: true});
			if(step == 0) {throw new Error("Crashed the scale with 0 step", min, max)}
			return Scale.buildFromMax(step, min, max);
		}
		else { //In other cases, start from the min
			step = Decimal.niceNumber(niceRange.Input / 4, {Loose: true, Below: true, Power: niceRange.Power - 1}); //Not sure why but power-1 seems to be the right thing
			if(step == 0) {throw new Error("Crashed the scale with 0 step", min, max)}
			return Scale.buildFromMin(step, min, max);
		}
		*/
	}
	//Methods
	initConfig() { //Init the ui for the scale options
		[this.Min, this.Max, this.Step, this.Ticks].forEach(function(o) {
			o.init();
		});
		return this;
	}
}

//BULLSHITS
/*static buildFromMin(niceStep, min, max) { //Return the scale object based on the niceStep, min and max values given, by incrementing step from min until max is reached
	let frac = 0.5;
	let niceMin = Decimal.niceNumber(min - frac * niceStep, {Below: true}); //Offset min by a fraction of a step, to give space on this side
	let t = 1;
	while(niceMin + t * niceStep < max + frac * niceStep) { //Also offset max to have space on this side too
		t++;
		//if(t > 10) {console.log(niceMin, niceStep, min, max, t); break; return}
	}
	return {
		Min: niceMin,
		Max: niceMin + t * niceStep,
		Step: niceStep,
		Ticks: t + 1,
	}
}
static buildFromMax(niceStep, min, max) { //Return the scale object based on the niceStep, min and max values given, by decrementing step from max until min is reached
	let frac = 0.5;
	let niceMax = Decimal.niceNumber(max + frac * niceStep); //Offset min by a fraction of a step, to give space on this side
	let t = 1;
	while(niceMax - t * niceStep > min - frac * niceStep) { //Also offset max to have space on this side too
		t++;
		//if(t > 10) {console.log(niceMax, niceStep, min, max, t); break; return}
	}
	return {
		Min: niceMax - t * niceStep,
		Max: niceMax,
		Step: niceStep,
		Ticks: t + 1,
	}
}*/