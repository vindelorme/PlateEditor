//************************************************************************************
// DATAPOINT_BAR object - Object holding the data for a single point in a 2d bar graph
//************************************************************************************
class DataPoint_Bar extends DataPoint {
	constructor(I) {
		super(I);
		this.Coordinate = new Coordinate(I); //An array of single values or array of values
		//Process excluded points
		//I.Excluded.forEach( DataPoint_Bar.exclude(...) ) ...
		//
		return this;
	}
	//Static methods
	static exclude(p, i) { //For the DataPoint object passed, exclude the point at index i
		Coordinate.exclude(p.Values, i);
	}
	static barV(ctx, config, xy) { //Draw a vertical bar
		let groupC = config.Group;
		let shapeConfig = GroupConfig.get(groupC, "bar");
		let w = xy.BarWidth;
		shapeConfig.height = GraphConfig.get(config.Graph, "plotArea", "height") - xy.Y; //Set the height for the bar
		shapeConfig.width = w; //Override default width with the calculated one
		if(GroupConfig.get(groupC, "barBorder", "topOnly")) { //Only the top-border is shown for this bar, but the fill is as defined
			shapeConfig.border = false; //Force the border off
			if(shapeConfig.fill == false) { //border false is ignored if the fill is false
				shapeConfig.fill = true;  //Force it true...
				shapeConfig.color = "transparent"; //To something invisible!
			}
			Graph.shapeRectangle(ctx, xy.X - w / 2, xy.Y, shapeConfig); //Draw the bar, it will have no border
			let coords = [ //For the top border, draw a simple curve between 2 points using the border config
				{X: xy.X - w / 2, Y: xy.Y},
				{X: xy.X + w / 2, Y: xy.Y}
			];
			Graph.curve(ctx, coords, GroupConfig.get(groupC, "barBorder")); //Draw the top bar
		}
		else { //Draw the bar with its border normally
			Graph.shapeRectangle(ctx, xy.X - w / 2, xy.Y, shapeConfig, GroupConfig.get(groupC, "barBorder"));
		}
	}
	static barH(ctx, config, xy) { //Draw an horizontal bar
		let groupC = config.Group;
		let shapeConfig = GroupConfig.get(groupC, "bar");
		let w = xy.BarWidth;
		shapeConfig.width = xy.X; //Set the width needed to represent the value for this bar
		shapeConfig.height = w; //Calculated width should go here
		if(GroupConfig.get(groupC, "barBorder", "topOnly")) { //Only the top-border is shown for this bar, but the fill is as defined
			shapeConfig.border = false; //Force the border off
			if(shapeConfig.fill == false) { //border false is ignored if the fill is false
				shapeConfig.fill = true;  //Force it true...
				shapeConfig.color = "transparent"; //To something invisible!
			}
			Graph.shapeRectangle(ctx, 0, xy.Y - w / 2, shapeConfig); //Draw the bar, it will have no border
			let coords = [ //For the top border, draw a simple curve between 2 points using the border config
				{X: xy.X, Y: xy.Y - w / 2},
				{X: xy.X, Y: xy.Y + w / 2}
			];
			Graph.curve(ctx, coords, GroupConfig.get(groupC, "barBorder")); //Draw the top bar
		}
		else { //Draw the bar with its border normally
			Graph.shapeRectangle(ctx, 0, xy.Y - w / 2, shapeConfig, GroupConfig.get(groupC, "barBorder"));
		}
	}
	//Getter and Setter
	get Excluded() { //Tell wether this point is excluded or not
		return Coordinate.excluded(this.Coordinate);
	}
	//Methods
	stats() { //Stats for each coordinate
		return Coordinate.statValue(this.Coordinate);
	}
	calculateCoords(config, I) { //Calculate the set of coordinates for this point, using the config passed
		let out = {Average: {}, AllPoints: []};
		let stat = this.stats();
		if(stat.N == 0) {return out}
		let bloc = I.BlocSize; //size of a bloc allocated for each group of bars
		let ratio = I.Ratio;
		let scale = I.Scale;
		let n = I.Data; //Number of bars per bloc
		if(I.Interleave) {n = I.Subgroups}
		let m = bloc * GraphConfig.get(config.Graph, "barSpacing", "margin"); //Margin on each side of the bars for a group of bar
		let f = GraphConfig.get(config.Graph, "barSpacing", "inner"); //Fraction of width to use as space between each bar
		let w = Math.round((bloc - 2 * m) / (n + (n - 1) * f)); //Width of a bar
		out.Average.BarWidth = w; //Log this calculated width for drawing later
		let s = Math.round(f * w); //Space between each bar
		if(I.Layout == "Horizontal") { //Horizontal layout
			//let l = GraphConfig.get(config.Graph, "plotArea", "width"); //PlotArea length, or width
			if(I.Interleave) {
				out.Average.Y = (m + (w / 2) + I.GroupIndex * (w + s)) + I.PointIndex * bloc;
			}
			else {
				out.Average.Y = (m + (w / 2) + I.PointIndex * (w + s)) + I.GroupIndex * bloc;
			}
			out.Average.X = Math.round((stat.Average - scale.X.Min) * ratio.X);
			out.Average.SDx = Math.round(stat.SD * ratio.X);
			this.Coordinate.Values.forEach(function(v, i) { //For each value
				let p = {
					Y: out.Average.Y,
					X: Math.round((Coordinate.value(this.Coordinate, i) - scale.X.Min) * ratio.X),
					SDx: Math.round(Coordinate.statValue(v).SD * ratio.X),
				}
				out.AllPoints.push(p);
			}, this);
		}
		else { //Vertical layout
			let h = GraphConfig.get(config.Graph, "plotArea", "height"); //PlotArea height
			if(I.Interleave) {
				out.Average.X = (m + (w / 2) + I.GroupIndex * (w + s)) + I.PointIndex * bloc;
			}
			else {
				out.Average.X = (m + (w / 2) + I.PointIndex * (w + s)) + I.GroupIndex * bloc;
			}
			out.Average.Y = Math.round(h - (stat.Average - scale.Y.Min) * ratio.Y);
			out.Average.SDy = Math.round(stat.SD * ratio.Y);
			this.Coordinate.Values.forEach(function(v, i) { //For each value
				let p = {
					X: out.Average.X,
					Y: Math.round(h - (Coordinate.value(this.Coordinate, i) - scale.Y.Min) * ratio.Y),
					SDy: Math.round(Coordinate.statValue(v).SD * ratio.Y),
				}
				out.AllPoints.push(p);
			}, this);
		}
		return out;
	}
}