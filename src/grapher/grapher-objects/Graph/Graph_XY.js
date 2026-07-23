//********************************************************************
// GRAPH_XY object - For plotting of XY data in 2D graphs using canvas
//********************************************************************
class Graph_XY extends Graph {
	constructor(I) {
		/*
		super(I);
		this.Type = "XY";
		this.Data = I.Data.Groups.map(function(d) {return new DataGroup("XY", d)}); //An array containing the DataGroup objects
		*/
		return this;
	}
	//Static methods
	/*static getRatio(C, Scale) {
		let Sx = Scale.X;
		let Sy = Scale.Y;
		let w = Sx.Max - Sx.Min;
		let h = Sy.Max - Sy.Min;
		return {
			Y: GraphConfig.get(C, "plotArea", "height") / h, //The ratio to get the length in pixel for the numerical value, according to the axis scales
			X: GraphConfig.get(C, "plotArea", "width") / w,
		}
	}*/
	static drawTicks_X(ctx, C, position, Scale, RatioX) { //Draw the ticks for a vertical (X) axis - Internal use
		let tickConfig = GraphConfig.get(C, "ticks");
		let step = Scale.Step * RatioX; //Size of the step in px on the canvas
		let w = tickConfig.size; //Width of a tick
		let offsetX = GraphConfig.get(C, "margins", "left") - w / 2;
		let offsetY = GraphConfig.get(C, "margins", "top") + GraphConfig.get(C, "plotArea", "height");
		let t = Scale.Ticks; //Number of ticks
		tickConfig.width = w;
		tickConfig.height = tickConfig.length;
		for(let i=0; i<t; i++) { //For each tick
			let x = offsetX + i * step;
			Graph.shapeRectangle(ctx, Math.round(x), Math.round(offsetY + position.TickOffset), tickConfig);
			Graph.text(ctx, { //Tick label
				Txt: Scale.Min + Decimal.multiply(i, Scale.Step),
				X: Math.round(x + w/2),
				Y: Math.round(offsetY + position.Gutter),
				Config: {text: GraphConfig.get(C, "XtickLabels")}
			});
		}
		Graph.text(ctx, { //Axis name
			Txt: Scale.Label,
			X: Math.round(offsetX + GraphConfig.get(C, "plotArea", "width") / 2),
			Y: Math.round(offsetY + position.Gutter + (GraphConfig.get(C, "tickLabels", "size") * 1.2) + GraphConfig.get(C, "XaxisName", "margin")),
			Config: {text: GraphConfig.get(C, "XaxisName")}
		});
	}
	static drawTicks_Y(ctx, C, position, Scale, RatioY) { //Draw the ticks for an horizontal (Y) axis - Internal use
		let tickConfig = GraphConfig.get(C, "ticks");
		let step = Scale.Step * RatioY; //Size of the step in px on the canvas
		let w = tickConfig.size; //Width of a tick
		let offsetX = GraphConfig.get(C, "margins", "left");
		let offsetY = GraphConfig.get(C, "margins", "top") + GraphConfig.get(C, "plotArea", "height") - w / 2;
		let MaxLength = 0; //Longest width of text found
		let t = Scale.Ticks; //Number of ticks
		tickConfig.width = tickConfig.length;
		tickConfig.height = w;
		for(let i=0; i<t; i++) { //For each tick
			let txt = Scale.Min + Decimal.multiply(i, Scale.Step);
			let y = offsetY - i * step;
			MaxLength = Math.max(ctx.measureText(txt).width * Graph.pixelRatio + 5, MaxLength); //Add a small, fixed offset for safety
			Graph.shapeRectangle(ctx, Math.round(offsetX - position.TickOffset - tickConfig.length), Math.round(y), tickConfig);
			Graph.text(ctx, { //Tick label
				Txt: txt,
				X: Math.round(offsetX - position.Gutter),
				Y: Math.round(y + w / 2),
				Config: {text: GraphConfig.get(C, "YtickLabels")}
			});
		}
		Graph.text(ctx, { //Axis name
			Txt: Scale.Label,
			X: - Math.round(offsetY - GraphConfig.get(C, "plotArea", "height") / 2),
			Y: Math.round(offsetX - position.Gutter - MaxLength - GraphConfig.get(C, "YaxisName", "margin")),
			Config: {text: GraphConfig.get(C, "YaxisName")}
		});
	}
	//Methods
	drawTicksInternal(ctx, scale, position) { //Entry method for drawing of the ticks
		let C = this.Config;
		let Ratio = Graph_XY.getRatio(C, scale);
		Graph_XY.drawTicks_X(ctx, C, position, scale.X, Ratio.X);
		Graph_XY.drawTicks_Y(ctx, C, position, scale.Y, Ratio.Y);
		return this;
	}
	/*drawData(ctx) { //Draw the data
		let C = this.Config;
		let S = this.Scale;
		let ratio = Graph_XY.getRatio(C, S);
		this.Data.forEach(function(group) {
			group.draw(ctx, C, ratio, S);
		});
		return this;
	}*/
}