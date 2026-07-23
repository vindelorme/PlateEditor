//*****************************************************************************
// GRAPH_BAR object - For plotting of X or Y data in 2D bar graphs using canvas
//*****************************************************************************
class Graph_Bar extends Graph {
	constructor(I) {
		super(I);
		this.Type = "Bar";
		this.Layout = (I.Layout || "Vertical");
		this.Interleave = (I.Interleave || false); //Interleave data from all dataGroups or keep them grouped
		this.Data = I.Data.Groups.map(function(d) {return new DataGroup("Bar", d)}); //An array containing the DataGroup objects
		this.Subgroups = (I.Data.Subgroups || []);
		if(this.Layout == "Horizontal") {this.Scale = {X: I.Scale}}
		else {this.Scale = {Y: this.Scale}}
		return this;
	}
	//Static methods
	static drawTicks_X(ctx, C, position, graph) { //Draw the X axis for the DataGroup provided
		let tickConfig = GraphConfig.get(C, "ticks");
		let w = tickConfig.size;
		let bloc = graph.BlocSize; //Total space available for a group of data
		let offsetX = GraphConfig.get(C, "margins", "left") - w / 2;
		let offsetY = GraphConfig.get(C, "margins", "top") + GraphConfig.get(C, "plotArea", "height");
		tickConfig.width = w;
		tickConfig.height = tickConfig.length;
		graph.Data.forEach(function(group, i) { //Make a tick for each dataGroup
			let x = Math.round(offsetX + (2 * i + 1) * bloc / 2);
			Graph.shapeRectangle(ctx, x, Math.round(offsetY + position.TickOffset), tickConfig);
			let txt = group.Name;
			if(graph.Interleave) {txt = graph.Subgroups[i].Name}
			Graph.text(ctx, { //Tick label
				Txt: txt,
				X: Math.round(x + w / 2),
				Y: Math.round(offsetY + position.Gutter),
				Config: {text: GraphConfig.get(C, "XtickLabels")}
			});
		});
	}
	static drawTicks_Y(ctx, C, position, graph) { //Draw the Y axis for the DataGroup provided
		let tickConfig = GraphConfig.get(C, "ticks");
		let w = tickConfig.size;
		let bloc = graph.BlocSize; //Total space available for a group of data
		let offsetX = GraphConfig.get(C, "margins", "left");
		let offsetY = GraphConfig.get(C, "margins", "top");
		tickConfig.width = tickConfig.length;
		tickConfig.height = w;
		graph.Data.forEach(function(group, i) { //Make a tick for each dataGroup
			let y = Math.round(offsetY + (2 * i + 1) * bloc / 2);
			Graph.shapeRectangle(ctx, Math.round(offsetX - position.TickOffset - tickConfig.length), y, tickConfig);
			let txt = group.Name;
			if(graph.Interleave) {txt = graph.Subgroups[i].Name}
			Graph.text(ctx, { //Tick label
				Txt: txt,
				X: Math.round(offsetX - position.Gutter),
				Y: Math.round(y + w / 2),
				Config: {text: GraphConfig.get(C, "YtickLabels")}
			});
		});
	}
	//Getter and Setter
	get BlocSize() { //Gives the size of the bloc available for each group of data
		let n = this.Data.length; //Number of dataGroups
		let m = this.Subgroups.length; //Number of Subgroups
		if(this.Layout == "Vertical") {
			let w = GraphConfig.get(this.Config, "plotArea", "width");
			if(this.Interleave) {return Math.round(w / m)}
			else {return Math.round(w / n)}
		}
		else {
			let h = GraphConfig.get(this.Config, "plotArea", "height");
			if(this.Interleave) {return Math.round(h / m)}
			else {return Math.round(h / n)}
		}
	}
	//Methods
	buildOptions(C) {
		let S = this.Scale;
		return {
			Scale: S,
			Ratio: Graph.getRatio(C, S),
			Layout: this.Layout,
			Interleave: this.Interleave,
			Subgroups: this.Subgroups.length,
			Data: this.Data.length,
			BlocSize: this.BlocSize
		}
	}
	drawTicksInternal(ctx, scale, position) { //drawTicksInternal(ctx, C, l, w, TickOffset, Gutter, scale) { //Entry method for drawing of the ticks
		let C = this.Config;
		let Ratio = Graph_XY.getRatio(C, scale);
		if(this.Layout == "Vertical") { //Vertical bars, values are shown on the Y axis
			Graph_XY.drawTicks_Y(ctx, C, position, scale.Y, Ratio.Y);
			Graph_Bar.drawTicks_X(ctx, C, position, this);
		}
		else { //Horizontal bars, values are shown on the X axis
			Graph_XY.drawTicks_X(ctx, C, position, scale.X, Ratio.X);
			Graph_Bar.drawTicks_Y(ctx, C, position, this);
		}
		return this;
	}
}