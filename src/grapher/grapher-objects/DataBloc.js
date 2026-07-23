//************************************************************************************************
// DATABLOC object - Object holding the DataGroup objects for a single bloc of data in a 2d graph
//***********************************************************************************************
class DataBloc {
	constructor(I) {
		this.Index = I.Index;
		this.Parent = I.Parent;
		this.Group = I.Group;
		this.JSON = I.JSON;
		this.GraphIndex = I.GraphIndex; //Index in the Wrapping.SubGroups array
		let root = I.ID + "_";
		this.Anchors = { //Defines the anchors for html output
			GraphArea: root + "GraphArea",
			YAreaTitle: root + "YAreaTitle",
			YArea: root + "YArea",
			XAreaHeader: root + "XAreaHeader",
			XArea: root + "XArea",
			TitleArea: root + "TitleArea",
			LegendArea: root + "LegendArea",
			XAreaWrapping: root + "XAreaWrapping",
			BlocConfig: root + "BlocConfig",
		};
		if(this.Group !== undefined) {
			this.Name = Grapher.groupName(this.Group);
		}
		else {this.Name = "Bloc"}
		this.Config = new BlocConfig({Root: this.Anchors.BlocConfig, Title: this.Name});
		let index = this.GraphIndex * I.GroupLength + this.Index; //Index of the data corresponding to this bloc
		this.Data = this.JSON.Data[index];
		if(this.JSON.Headers !== undefined && this.JSON.Headers.Cols !== undefined) { //Use the headers data to decompose Groups into DataGroups
			let h = this.JSON.Headers.Cols;
			this.DataGroups = [];
			let l = this.Data.Groups.length;
			let currentGroup = 0;
			let currentHeader = 0;
			while(currentGroup < l) { //Go through all the Groups and assign them using the header data
				if(h[currentHeader] === null) { //Null header for single Group without header
					this.DataGroups.push(
						new DataGroup({Index: currentHeader, BlocIndex: this.Index, Data: [this.Data.Groups[currentGroup]]})
					);
					currentGroup++;
				}
				else { //A header with several Groups inside
					let span = h[currentHeader].Span;
					let array = [];
					for(let j=0; j<span; j++) { //Create an array regrouping these Groups
						array.push(this.Data.Groups[currentGroup]);
						currentGroup++;
					}
					this.DataGroups.push( //Create the DataGroup using the array of Groups
						new DataGroup({Index: currentHeader, BlocIndex: this.Index, Data: array, Header: h[currentHeader]})
					);
				}
				currentHeader++;
			}
		}
		else { //If no headers, then there is only one datagroup, which takes all the Groups
			this.DataGroups = [new DataGroup({Index: index, BlocIndex: this.Index, Data: this.Data.Groups})];
		}
		this.Options = {
			Visible: LinkCtrl.new("Checkbox", {ID: Grapher.Anchors.BlocOptions, Label: "Visible", Default: true, Chain: {Index: 0},
				Title: "Whether this bloc should be displayed or not",
				Change: function() {this.toggleVisible()}.bind(this),
			}),
			ShowConfig: LinkCtrl.new("Button", {ID: Grapher.Anchors.BlocOptions, Label: "Edit bloc config", Chain: {Index: 1, Last: true},
				Title: "Click to see and update the configuration for the selected bloc",
				Click: function() {this.showConfig()}.bind(this),
			}),
		}
		this.Graph = document.createElement("canvas"); //The main layer hosting the graphic elements
		this.Points = document.createElement("canvas"); //Layer for the data points.
		this.Highlight = document.createElement("canvas"); //To highlight the current point
		if(this.Index == 0) {this.Selected = true}
		return this;
	}
	//Static methods
	
	//Getter
	get Visible() {
		return this.Options.Visible.getValue();
	}
	//Methods
	initOptions() {
		Object.values(this.Options).forEach(function(o) {o.init()});
		return this;
	}
	plot(I) {
		this.setSizes(I); //Adjust the size of the internal layers based on the config. This also resets the canvas
		let r = Grapher.PixelRatio;
		[this.Graph, this.Points, this.Highlight].forEach(function(canvas) {
			let ctx = canvas.getContext("2d");
			ctx.setTransform(r, 0, 0, r, 0, 0);
		});
		this.drawPlotArea(I);
		this.drawAxes(I).drawTicks(I).drawTitles(I).drawPoints(I).drawLegends(I);
		this.display(I); //Display the drawn elements on the page
		return this;
	}
	html(rows, I) { //Prepare and output the html structure for this bloc
		if(I.Together) {this.togetherHTML(rows, I)}
		else {return this.separateHTML()}
		return this;
	}
	togetherHTML(rows, I) { //Output the html corresponding to the Together (pool) format
		if(I.Index == 0) { //The first graph should add the Yaxis placeholders for the first line
			rows[0] += "<td class=\"YAreaTitle\" id=\"" + this.Anchors.YAreaTitle +"\">Y area Title</td>";
			rows[0] += "<td class=\"YArea\" id=\"" + this.Anchors.YArea +"\">Y area Ticks</td>";
			rows[1] += "<td></td><td></td>"; //Add empty placeholders for alignment on the other lines
			rows[2] += "<td></td><td></td>";
			rows[3] += "<td></td><td></td>";
			rows[4] += "<td></td><td></td>";
		}
		rows[0] += "<td><canvas id=\"" + this.Anchors.GraphArea +"\"></canvas></td>";
		rows[1] += "<td><div id=\"" + this.Anchors.XArea +"\" class=\"XArea\">X area</div></td>";
		if(this.JSON.Headers !== undefined && this.JSON.Headers.Cols !== undefined) { //If headers need to be added
			rows[2] += "<td><div id=\"" + this.Anchors.XAreaHeader +"\" class=\"XAreaHeader\">Xarea Header</div></td>";
		}
		if(this.Group !== undefined) { //Wrapping data available
			rows[3] += "<td><div id=\"" + this.Anchors.XAreaWrapping +"\" class=\"XAreaWrapping\">" + Grapher.groupName(this.Group, {ValueOnly: true}) + "</div></td>";
		}
		return this;
	}
	separateHTML() {
		let html = "";
		let C = this.Parent.Config;
		html += "<div class=\"Bloc_Wrapping\"";
		html += "style=\"margin: 0px " + C.get("PlotArea", "Margins", "Between") + "px " + C.get("PlotArea", "Margins", "Between") + "px 0px\">"; //Top Right Bottom Left
		html += "<table class=\"Structure\"><tr><td></td><td></td><td><div id=\"" + this.Anchors.TitleArea + "\" class=\"GraphTitle\">" + this.Name + "</div></td></tr>";
		html += "<tr><td class=\"YAreaTitle\" id=\"" + this.Anchors.YAreaTitle +"\">Y area Title</td>";
		html += "<td class=\"YArea\" id=\"" + this.Anchors.YArea +"\">Y area Ticks</td>";
		html += "<td><canvas id=\"" + this.Anchors.GraphArea +"\"></canvas></td></tr>";
		html += "<tr><td></td><td></td><td><div id=\"" + this.Anchors.XArea +"\" class=\"XArea\">X area</div></td></tr>";
		if(this.JSON.Headers !== undefined && this.JSON.Headers.Cols !== undefined) { //If headers need to be added
			html += "<tr><td></td><td></td><td><div id=\"" + this.Anchors.XAreaHeader + "\" class=\"XAreaHeader\">Xarea Header</div></td></tr>";
		}
		html += "</table><div id=\"" + this.Anchors.LegendArea + "\" class=\"Legend\"></div></div>";
		return html;
	}
	setSizes(I) { //Set internal canvas to sizes based on configuration
		this.Canvas = GetId(this.Anchors.GraphArea);
		let r = Grapher.PixelRatio;
		let C = this.Parent.Config;
		let h = C.get("PlotArea", "Size", "Height");
		let w = C.get("PlotArea", "Size", "Width");
		let H = h + C.get("PlotArea", "Margins", "Top") + C.get("PlotArea", "Margins", "Bottom");
		let W = w + this.getMarginsLR(I);
		[this.Canvas, this.Graph, this.Points, this.Highlight].forEach(function(l) {
			l.height = H * r;
			l.width = W * r;
		});
		return this;
	}
	getMarginsLR(I) { //Output the values of left and right margins to use based on the config
		let C = this.Parent.Config;
		if(I.Together) { //When blocs are plotted together, only the first and last blocs have margins
			let margin = 0;
			if(I.Index == 0) {margin += C.get("PlotArea", "Margins", "Left")} //First bloc, add the left margin
			if(I.Index == I.Last) {margin += C.get("PlotArea", "Margins", "Right")} //Last bloc, add the right margin
			return margin;
		}
		return C.get("PlotArea", "Margins", "Left") + C.get("PlotArea", "Margins", "Right");
	}
	getSpace(Config) { //Space available for each datapoint
		return Config.get("PlotArea", "Size", "Width") / this.Data.Groups.length;
	}
	getMinMax() { //Get global min/max for this bloc
		this.Min = +Infinity;
		this.Max = -Infinity;
		this.DataGroups.forEach(function(dg) {
			dg.getMinMax();
			if(dg.Min < this.Min) {this.Min = dg.Min}
			if(dg.Max > this.Max) {this.Max = dg.Max}
		}, this);
		return this;
	}
	drawPlotArea(I) {
		let ctx = this.Graph.getContext("2d");
		let C = this.Parent.Config;
		let x = C.get("PlotArea", "Margins", "Left");
		if(I.Together && I.Index > 0) {x = 0}
		let y = C.get("PlotArea", "Margins", "Top");
		Shape.Rectangle(ctx, x, y, C.values("PlotArea", "Size"), C.values("PlotArea", "Border"), C.values("PlotArea", "Background"));
		return this;
	}
	drawAxes(I) { //Draw the axes for the graph
		let ctx = this.Graph.getContext("2d");
		let C = this.Parent.Config;
		let left = C.get("PlotArea", "Margins", "Left");
		if(I.Together && I.Index > 0) {left = 0}
		let top = C.get("PlotArea", "Margins", "Top");
		let h = C.get("PlotArea", "Size", "Height");
		let w = C.get("PlotArea", "Size", "Width");
		let size = C.get("Axes", "YAxis", "Size");
		let bg = C.values("Axes", "YAxis");
		bg.Use = true;
		if(I.Together == false || I.Index == 0) { //Vertical axis (Y), only for the first graph if mode is set to together
			Shape.Rectangle(ctx, Math.round(left - size / 2), top, {Height: Math.round(h + size / 2), Width: size}, {Use: false}, bg); //Vertical axis (Y)
		}
		size = C.get("Axes", "XAxis", "Size");
		Object.assign(bg, C.values("Axes", "XAxis"));
		Shape.Rectangle(ctx, Math.round(left - size / 2), Math.round(top + h - size / 2), {Height: size, Width: Math.round(w + size / 2)}, {Use: false}, bg); //Horizontal axis (X)
		return this;
	}
	drawTicks(I) { //Draw the ticks on the axes
		if(I.Together == false || I.Index == 0) {this.drawTicks_Y(I)} //Vertical axis (Y), only for the first graph if mode is set to together
		this.drawTicks_X(I);
		return this;
	}
	drawTicks_Y(I) { //Draw the ticks for the Y axis
		let ctx = this.Graph.getContext("2d");
		let C = this.Parent.Config;
		let l = C.get("Axes", "Ticks", "Length");
		let w = C.get("Axes", "Ticks", "Size");
		let h = C.get("PlotArea", "Size", "Height");
		let top = C.get("PlotArea", "Margins", "Top");
		let left = C.get("PlotArea", "Margins", "Left");
		let step = C.get("Scale", "YAxis", "Step");
		let max = C.get("Scale", "YAxis", "Max");
		let stepPX = step * Graph.getRatio("YAxis", C); //Size of the step in px on the canvas
		let offsetY = top + h - w / 2;
		let tickOffset = - w / 2; //Default case
		switch(C.get("Axes", "Ticks", "Type")) { //Adjust the position of the ticks based on the desired behaviour
			case "Inside": tickOffset = w / 2 - l; break;
			case "Center": tickOffset = - (l / 2); break;
		}
		let fontSize = C.get("Labels", "Axes", "Size");
		let html = "";
		let bg = C.values("Axes", "Ticks");
		bg.Use = true;
		let t = C.get("Scale", "YAxis", "Ticks"); //Number of ticks
		let divHeight = Math.round((fontSize + h) / t); //Height of the div elements containing the text
		for(let i=0; i<t; i++) { //For each tick
			Shape.Rectangle(ctx, Math.round(left - tickOffset - l), Math.round(offsetY - i * stepPX), {Width: l, Height: w}, {Use: false}, bg); //Draw the tick
			html += "<div style=\"text-align: right; overflow: auto; max-height: " + divHeight + "px\">" + Decimal.add(max, - Decimal.multiply(i, step)) + "</div>"; //Append a bloc for the text
		}
		let dom = GetId(this.Anchors.YArea); //Adjust the styling of the YArea
		let style = C.valuesCSS("Labels", "Axes"); //Styling from the config
		style += " height: " + (fontSize + h) + "px;"; //Extra styling required for alignement with the ticks
		style += " margin-top: " + (top - fontSize / 2) + "px;";
		style += " margin-bottom: " + (C.get("PlotArea", "Margins", "Bottom") - fontSize / 2) + "px;";
		dom.style = style;
		dom.innerHTML = html;
		return this;
	}
	drawTicks_X(I) {
		let C = this.Parent.Config;
		let html = "";
		I.TickIndex = 0; //Tracker for the tick index
		I.Config = C;
		this.DataGroups.forEach(function(dg) {
			html += dg.drawTicks_X(this.Graph.getContext("2d"), this.getSpace(C), I);
		}, this);
		let dom = GetId(this.Anchors.XArea);
		let style = C.valuesCSS("Labels", "Axes"); //Styling from the config
		if(I.Together == false || I.Index == 0) { //Alignement for first bloc
			style += " margin-left: " + C.get("PlotArea", "Margins", "Left") + "px;";
		}
		style += " width: " + C.get("PlotArea", "Size", "Width") + "px;";
		dom.style = style;
		dom.innerHTML = html;
	}
	drawTitles(I) {
		this.drawTitleY(I);
		if(this.JSON.Headers !== undefined && this.JSON.Headers.Cols !== undefined) { //Headers are added here
			this.drawHeaderTitleX(I);
		}
		if(this.Group !== undefined && I.Together) { //Wrapping data added here
			this.drawWrappingTitleX(I);
		}
		if(I.Together == false) { //Each bloc append the main title in separate mode
			Graph.drawTitle(GetId(this.Anchors.TitleArea), this.Config);
		}
		return this;
	}
	drawTitleY(I) {
		let C = this.Parent.Config;
		let Ydom = GetId(this.Anchors.YAreaTitle);
		if(I.Together == false || I.Index == 0) { //YAxis Title not needed for pooled graphs, except the first one 
			let style = C.valuesCSS("Titles", "YAxis"); //Styling from the config
			style += " max-height: " + (C.get("PlotArea", "Size", "Height") + C.get("PlotArea", "Margins", "Top") + C.get("PlotArea", "Margins", "Bottom")) + "px;"; //Set a max-height to conserve the alignment
			Ydom.style = style;
			if(C.get("Titles", "YAxis", "Use")) { //YAxis Title is displayed
				Ydom.innerHTML = C.get("Titles", "YAxis", "Name"); //LinkCtrl Name
			}
			else {Ydom.innerHTML = ""} //Title not displayed
		}
		return this;
	}
	drawHeaderTitleX(I) {
		let C = this.Parent.Config;
		let space = this.getSpace(C);
		let html = "";
		this.DataGroups.forEach(function(dg) {
			html += dg.drawTitleX(space, C);
		});
		let Xdom = GetId(this.Anchors.XAreaHeader);
		let style = C.valuesCSS("Labels", "Axes"); //Styling from the config
		style += " margin: " + C.get("Labels", "Headers", "Margin") + "px 0px 0px "; //Top-right-bottom margins
		if ((I.Together && I.Index == 0) || I.Together == false) {style += C.get("PlotArea", "Margins", "Left") + "px"} //Alignement for first bloc
		else {style += "0px"}
		style += "; width: " + C.get("PlotArea", "Size", "Width") + "px;"; //Restrict size for alignment
		Xdom.style = style;
		Xdom.innerHTML = html;
		return this;
	}
	drawWrappingTitleX(I) {
		let C = this.Parent.Config;
		let dom = GetId(this.Anchors.XAreaWrapping);
		let space = Math.round(this.getSpace(C) / 2); //Space to leave on left and right to align with the ticks
		if(this.Data.Groups.length == 1) {space = 2} //Edge case when there is only one group: nullify the space to take up all the length & leave just a short gap to delimit the bars
		let style = C.valuesCSS("Labels", "Axes"); //Styling from the config
		style += " padding-top: " + C.get("Labels", "Headers", "Margin") + "px;"; //Top margin
		style += " margin: " + C.get("Labels", "Headers", "Margin") + "px " + space + "px 0px "; //Top Right Bottom margins
		if ((I.Together && I.Index == 0) || I.Together == false) {style += (C.get("PlotArea", "Margins", "Left") + space) + "px;"} //Left margin. Additional margin for the first
		else {style += space + "px;"}
		style += " border-top: " + C.get("Labels", "Headers", "Border") + "px solid " + C.get("Labels", "Headers", "Color") + ";";
		dom.style = style;
		return this;
	}
	drawPoints(I) {
		let C = this.Parent.Config; //GraphConfig
		let ctx = this.Points.getContext("2d");
		let O = {
			Together: I.Together,
			BlocIndex: I.Index,
			GraphConfig: C,
			BlocConfig: this.Config,
			Ratio: Graph.getRatio("YAxis", C),
			Space: Math.round(C.get("PlotArea", "Size", "Width") / this.Data.Groups.length), //Total space available per group
		}
		let startIndex = 0;
		this.DataGroups.forEach(function(dg, i) {
			dg.drawPoints(ctx, startIndex, O);
			startIndex += dg.Length;
		});
		return this;
	}
	drawLegends(I) { //In separate mode, each bloc append its legend
		if(I.Together == false) {
			Legend.draw(Grapher.Legends.Array, this.Anchors.LegendArea);
		}
		return this;
	}
	display(I) {
		let canvas = this.Canvas;
		let ctx = canvas.getContext("2d");
		let C = this.Parent.Config;
		let r = Grapher.PixelRatio;
		ctx.clearRect(0, 0, canvas.width, canvas.height); //Reset the canvas first
		ctx.drawImage(this.Graph, 0, 0); //Draw the graph base (frame, axis, plot area, title)
		ctx.drawImage(this.Points, 0, 0); //Add Points after so that they end up on top
		canvas.style.width = (C.get("PlotArea", "Size", "Width") + this.getMarginsLR(I)) + "px"; //Resize the canvas to match the desired output size
		canvas.style.height = (C.get("PlotArea", "Size", "Height") + C.get("PlotArea", "Margins", "Top") + C.get("PlotArea", "Margins", "Bottom")) + "px";
		return this;
	}
	showConfig() {
		let id = this.Anchors.BlocConfig;
		let formID = "Form_" + id;
		Form.open({
			ID: formID,
			HTML: "<div id=\"" + id + "\"></div>",
			Title: "Options for bloc: " + this.Name,
			Modal: true,
			Size: 500,
			Buttons: [
				{Label: "Done", Click: function() {
					Form.close(formID);
					this.Parent.plot();
				}.bind(this) }
			]
		});
		this.Config.init();
		return this;
	}
	toggleVisible() { //When the visibility of a bloc change, the whole graph should be drawn again because of the axis
		this.Parent.DataBlocs.update();
		this.Parent.plot();
		return this;
	}
}