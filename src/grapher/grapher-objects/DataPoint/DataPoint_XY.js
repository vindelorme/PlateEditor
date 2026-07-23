//************************************************************************************
// DATAPOINT_XY object - Object holding the data for a single point in a 2d (XY) graph
//************************************************************************************
class DataPoint_XY extends DataPoint {
	constructor(I) {
		super(I);
		this.X = new Coordinate(I.X);
		this.Y = new Coordinate(I.Y);
		//Process excluded points
		//I.Excluded.forEach( DataPoint_XY.exclude(...) ) ...
		//
		return this;
	}
	//Static methods
	static exclude(p, i) { //For the DataPoint object passed, exclude the point at index i
		Coordinate.exclude(p.X, i);
		Coordinate.exclude(p.Y, i);
	}
	//Getter and Setter
	get Excluded() { //Tell wether this point is excluded or not
		return Coordinate.excluded(this.X);
	}
	//Methods
	stats() { //Stats for each coordinate
		return {
			X: Coordinate.statValue(this.X),
			Y: Coordinate.statValue(this.Y),
		}
	}
	calculateCoords(config, I) { //Calculate the set of coordinates for this point, using the config passed
		let out = {Average: {}, AllPoints: []};
		let stat = this.stats();
		let h = GraphConfig.get(config.Graph, "plotArea", "height");
		let scale = I.Scale;
		let ratio = I.Ratio;
		if(stat.X.N == 0) {return out} //No need to bother if no points
		out.Average = {
			X: Math.round((stat.X.Average - scale.X.Min) * ratio.X),
			Y: Math.round(h - (stat.Y.Average - scale.Y.Min) * ratio.Y),
			SDx: Math.round(stat.X.SD * ratio.X),
			SDy: Math.round(stat.Y.SD * ratio.Y),
		}
		out.Average.BarWidth = GroupConfig.get(config.Group, "bar", "width");
		this.X.Values.forEach(function(v, i) { //For each value
			let p = {
				X: Math.round((Coordinate.value(this.X, i) - scale.X.Min) * ratio.X),
				Y: Math.round(h - (Coordinate.value(this.Y, i) - scale.Y.Min) * ratio.Y),
				SDx: Math.round(Coordinate.statValue(v).SD * ratio.X),
				SDy: Math.round(Coordinate.statValue(this.Y.Values[i]).SD * ratio.Y),
			}
			out.AllPoints.push(p);
		}, this);
		return out;
	}
}