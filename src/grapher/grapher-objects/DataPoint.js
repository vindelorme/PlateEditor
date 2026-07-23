//*************************************************************************
// DATAPOINT object - Object holding the data for a single point in a graph
//*************************************************************************
class DataPoint {
	constructor(I) {
		this.Index = I.Index;
		this.GroupIndex = I.GroupIndex;
		this.Name = Grapher.groupName(I.Group); //Name of the point
		this.Coordinates = I.Group.DataPoints.map(function(p, i) {return new Coordinate(p, i)}); //The data to build points on the graph
		return this;
	}
	//Static methods
	/*static new(type, I) { //Create a new DataPoint object of the desired type. Arrays of values for all coordinates should be provided as arrays under the coordinate name property (e.g X: [...], Y: [...])
		switch(type) {
			case "XY": return new DataPoint_XY(I);
			case "Bar": return new DataPoint_Bar(I);
			default: return new DataPoint(I);
		}
	}*/
	//Getter and setter
	/*get Excluded() { //Tell wether this point is excluded or not
		return false; //Each dataPoint type implements its own method, included here for consistency only
	}*/
	//Methods
	getMinMax() { //Find min and max among its values
		this.Min = +Infinity;
		this.Max = -Infinity;
		this.Coordinates.forEach(function(v) {
			if(v.Min < this.Min) {this.Min = v.Min}
			if(v.Max > this.Max) {this.Max = v.Max}
		}, this);
	}
	drawTicks_X(ctx, I, space) {
		let C = I.Config;
		let l = C.get("Axes", "Ticks", "Length");
		let tickOffset = 0; //Default case
		switch(C.get("Axes", "Ticks", "Type")) { //Adjust the position of the ticks based on the desired behaviour
			case "Inside": tickOffset = - l; break;
			case "Center": tickOffset = - (l / 2); break;
		}
		let x = Math.round((space * I.TickIndex) + (space / 2) - (C.get("Axes", "Ticks", "Size") / 2));
		if(I.Together == false || I.Index == 0) {x += C.get("PlotArea", "Margins", "Left")}
		let y = Math.round(C.get("PlotArea", "Margins", "Top") + C.get("PlotArea", "Size", "Height") + tickOffset);
		let bg = C.values("Axes", "Ticks");
		bg.Use = true;
		Shape.Rectangle(ctx, x, y, {Width: C.get("Axes", "Ticks", "Size"), Height: l}, {Use: false}, bg); //Draw the tick
		return this;
	}
	drawTitle_X(C, space) {
		let c = "";
		let w = "max-width: ";
		switch(C.get("Labels", "Axes", "Orientation")) { //Adjust the class based on the writing orientation
			case "Horizontal": c = "XAxis_Hor"; w = "width: "; break;
			case "Angled": c = "XAxis_Angled"; break;
			case "Sideway": c = "XAxis_Sideway"; break;
		}
		return "<div class=\"" + c + "\" style=\"" + w + space + "px\">" + this.Name + "</div>"; //In all cases, restrict the size for alignement
	}
	draw(ctx, start, I) { //Draw the point on the canvas using the config given
		let center = I.Space * (start + this.Index) + (I.Space / 2); //Position of the tick for this DataPoint
		let toDraw = []; //Array of coordinates to draw
		Grapher.Legends.Array.forEach(function(a, i) { //Retain only visible dataSeries
			if(a.Visible) {toDraw.push(this.Coordinates[i])} //Push the corresponding coordinate
		}, this);
		let l = toDraw.length;
		let s = I.BlocConfig.get("DataSeries", "Gaps", "Space") / 100; //Space between bars, as a percentage
		let m = I.BlocConfig.get("DataSeries", "Gaps", "Margin") / 100; //Margin between DataGroups (Left and Right of each group of bars), as a percentage
		let BarWidth = I.Space / (l + ((l - 1) * s) + (2 * m)); //For l bars, there are l-1 space in-between and two edges
		let left = center - (I.Space / 2) + (BarWidth * m); //Starting position for the first bar
		if(I.BlocIndex == 0 || I.Together == false) {left += I.GraphConfig.get("PlotArea", "Margins", "Left")} //Add the left margin when needed
		toDraw.forEach(function(c, i) { //Draw for each visible coordinate
			let x = Math.round(left + (i * BarWidth * (1 + s))); //Add a bar width and the space to go from one bar to the other
			c.draw(ctx, {BarWidth: Math.round(BarWidth), x: x, Index: i}, I);
		});
		//
		//
		//
		/*let coords = this.calculateCoords(config, I); //Calculate the coordinates for this point using the options given
		let groupC = config.Group;
		let pointConfig = GroupConfig.get(groupC, "point");
		if(this.Excluded) {pointConfig = Object.assign(pointConfig, GroupConfig.get(groupC, "excluded"))} //Override properties with that of the excluded styling
		if(GroupConfig.get(groupC, "display", "bar")) { //Draw bars first, so that they don't hide the points
			this.drawBars(ctx, config, coords.Average, I);
		}
		if(GroupConfig.get(groupC, "display", "point")) { //Draw the points
			if(pointConfig.showAll) {this.drawAllPoints(ctx, config, coords.AllPoints, I)} //Draw all the data points
			else {this.drawAverage(ctx, config, coords.Average, I)} //Draw only the average
		}
		if(GroupConfig.get(groupC, "display", "error")) { //Draw the error
			this.drawError(ctx, config, coords.Average, I);
		}
		return coords.Average; //Return the coordinates of the point for the curve*/
	}
	/*drawBars(ctx, config, xy, I) {
		if(I.Layout && I.Layout == "Horizontal") {DataPoint_Bar.barH(ctx, config, xy)} //Horizontal bars
		else {DataPoint_Bar.barV(ctx, config, xy)} //Vertical bars
		return this;
	}
	drawAllPoints(ctx, config, xy, I) { //Draw all the individual points, with their coordinates passed as an array
		let groupC = config.Group;
		xy.forEach(function(c) { //For all coordinates in the array provided
			Graph.shape(ctx, {X: c.X, Y: c.Y,Config: {
				shape: GroupConfig.get(groupC, "point"),
				border: GroupConfig.get(groupC, "pointBorder")
			} });
			if(GroupConfig.get(groupC, "display", "error")) { //Show the error bars
				Graph.errorBar(ctx, GroupConfig.get(groupC, "errorBar"), c);
			}
		});
		return this;
	}
	drawAverage(ctx, config, xy, I) { //Draw the average value for the datapoint
		let groupC = config.Group;
		Graph.shape(ctx, {
			X: xy.X,
			Y: xy.Y,
			Config: {shape: GroupConfig.get(groupC, "point"), border: GroupConfig.get(groupC, "pointBorder")},
		});
		return this;
	}
	drawError(ctx, config, xy, I) {
		Graph.errorBar(ctx, GroupConfig.get(config.Group, "errorBar"), xy);
		return this;
	}*/
}