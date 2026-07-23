//*************************************************************************************************
// DATAGROUP object - Object holding the DataPoints object for a single group of data in a 2d graph
//*************************************************************************************************
class DataGroup {
	constructor(I) {
		this.Index = I.Index;
		this.BlocIndex = I.BlocIndex;
		this.DataPoints = I.Data.map(function(g, i) { //Each group contains multiple datapoints
			return new DataPoint({Index: i, GroupIndex: I.Index, Group: g});
		});
		this.Header = I.Header; //Will be undefined if no header is attached to this DataGroup
		return this;
	}
	//Static methods
	
	//Getter
	get Length() {
		return this.DataPoints.length;
	}
	//Methods
	getMinMax() { //Get global min/max for this group
		this.Min = +Infinity;
		this.Max = -Infinity;
		this.DataPoints.forEach(function(dp) {
			dp.getMinMax();
			if(dp.Min < this.Min) {this.Min = dp.Min}
			if(dp.Max > this.Max) {this.Max = dp.Max}
		}, this);
		return this;
	}
	drawTicks_X(ctx, space, I) { //Draw the ticks for the X axis (horizontal)
		let html = "";
		this.DataPoints.forEach(function(dp) { //XAxis handled internally by each group
			dp.drawTicks_X(ctx, I, space);
			html += dp.drawTitle_X(I.Config, space);
			I.TickIndex++; //Increment the tracker for the tick index
		});
		return html;
	}
	drawTitleX(space, C) {
		let h = this.Header;
		let html = "<div style=\"width: "; //Add the width of each bloc, multiplying by h.Span
		if(h !== undefined) {
			html += Math.round(space * (h.Span - 1)) + "px;";
			html += " border-top: " + C.get("Labels", "Headers", "Border") + "px solid " + C.get("Labels", "Headers", "Color") + ";";
			html += " padding-top: " + C.get("Labels", "Headers", "Margin") + "px;";
			html += " margin: 0px " + Math.round(space / 2) + "px 0px " + Math.round(space / 2) + "px;"; //Add half a space on each side to align with the ticks
			html += "\">" + h.Name;
		}
		else {html += space + "px\">"} //Leave empty if no headers
		html += "</div>";
		return html;
	}
	drawPoints(ctx, start, I) {
		this.DataPoints.forEach(function(p, i) { //Draw each DataPoint
			p.draw(ctx, start, I);
		});
		return this;
	}
	/*addPoint(p) { //Add a point to the DataPoints array. p is defined as a DataPoint object
		this.DataPoints.push(p);
		return this;
	}
	draw(ctx, config, options) { //Draw the DataGroup on the ctx
		let groupC = this.Config;
		let curve = GroupConfig.get(groupC, "display", "curve"); //Whether to plot the curve or not
		config.Group = groupC;
		let array = []; //Used to store the calculated (x,y) coordinates of the points in px, for the curve
		this.DataPoints.forEach(function(p, i) { //Draw each point on the canvas
			options.PointIndex = i;
			let coords = p.draw(ctx, config, options); //Draw the point
			if(curve) { //If the curve is needed, push the calculated values directly here
				array.push(coords);
			}
		});
		if(curve) { //Draw the curve using the points from above
			Graph.curve(ctx, array, GroupConfig.get(groupC, "curve"));
		}
		return this;
	}*/
}