//**************************************************************
// GRAPH object - For plotting of data in 2D graphs using canvas
//**************************************************************
class Graph {
	constructor(I) {
		let n = I.Index;
		this.Index = n;
		this.SubGroup = I.SubGroup;
		this.JSON = I.JSON;
		let root = Grapher.Anchors.GraphArea + "_" + n;
		this.Anchors = {
			Root: root,
			TitleArea: root + "_TitleArea",
			BlocArea: root + "_BlocArea",
			LegendArea: root + "_LegendArea",
			GraphConfig: root + "_GraphConfig",
		}
		if(this.SubGroup !== undefined) {this.Name = Grapher.groupName(this.SubGroup)}
		else {this.Name = "Graph"}
		this.Config = new GraphConfig({Root: this.Anchors.GraphConfig, Title: this.Name});
		let wrapping = this.JSON.Wrapping;
		let array = [];
		if(wrapping !== undefined && wrapping.Data.Groups !== undefined) { //Use the Cols level 2 to define the Blocs
			let l = wrapping.Data.Groups.length;
			if(l > 0) { //If the group array is not empty, use it to define the blocs
				array = wrapping.Data.Groups.map(function(g, i) {
					return new DataBloc({Index: i, Parent: this, Group: g, GraphIndex: n, JSON: I.JSON, GroupLength: l, ID: this.Anchors.BlocArea + "_" + i});
				}, this);
			}
			else { //Otherwise, there will be only one bloc
				array = [new DataBloc({Index: 0, Parent: this, GraphIndex: n, JSON: I.JSON, GroupLength: 0, ID: this.Anchors.BlocArea + "_0"})];
			}
		}
		else { //If no wrapping exists, there will be only one bloc
			array = [new DataBloc({Index: 0, Parent: this, GraphIndex: n, JSON: I.JSON, GroupLength: 0, ID: this.Anchors.BlocArea + "_0"})];
		}
		this.Options = {
			Pooling: LinkCtrl.new("Radio", {ID: Grapher.Anchors.GraphOptions, Label: "Plot blocs", Default: 0, List: ["Together", "Separately"], Chain: {Index: 0},
				Title: "Whether selected blocs should be plotted together on the same graph or plotted separately",
				Change: function() {this.plot()}.bind(this),
			}),
			Visible: LinkCtrl.new("Checkbox", {ID: Grapher.Anchors.GraphOptions, Label: "Visible", Default: true, Chain: {Index: 1, NewLine: true},
				Title: "Whether this graph should be displayed or not",
				Change: function() {this.toggleVisible()}.bind(this),
			}),
			ShowConfig: LinkCtrl.new("Button", {ID: Grapher.Anchors.GraphOptions, Label: "Edit graph config", Chain: {Index: 2, Last: true},
				Title: "Click to see and update the configuration for the selected graph",
				Click: function() {this.showConfig()}.bind(this),
			}),
		}
		this.DataBlocs = new RespTable({ //Table listing the Blocs available in this graph
			ID: Grapher.Anchors.Blocs,
			Array: array,
			Fields: ["Name", "Visible"],
			NoControls: true,
			RowNumbers: true,
			onSelect: function(s) {Grapher.tableClick(s)}, 
		});
		if(n == 0) { //Init the respTable and options for the first, selected graph
			this.Selected = true;
			this.initOptions();
		}
		else {this.Selected = false}
		return this;
	}
	//Static methods
	static getRatio(where, config) { //Returns the ratio to get the length in pixel for the numerical values, according to the axis scales
		let min = config.get("Scale", where, "Min");
		let max = config.get("Scale", where, "Max");
		if(where == "XAxis") {return config.get("PlotArea", "Size", "Width") / (max - min)}
		else {return config.get("PlotArea", "Size", "Height") / (max - min)}
	}
	static drawTitle(dom, C) {
		let style = C.valuesCSS("Titles", "Main"); //Styling from the config
		dom.style = style;
		if(C.get("Titles", "Main", "Use")) {
			dom.innerHTML = C.get("Titles", "Main", "Name");
		}
		else {dom.innerHTML = ""}
	}
	//Getter
	get Visible() {
		return this.Options.Visible.getValue();
	}
	//Methods
	initOptions() {
		this.DataBlocs.init();
		Object.values(this.Options).forEach(function(o) {o.init()});
		console.log(this);
		this.DataBlocs.Selected[0].initOptions();
		return this;
	}
	getMinMax() { //Get Global Min/Max for this graph
		this.Min = +Infinity;
		this.Max = -Infinity;
		this.DataBlocs.Array.forEach(function(db) {
			db.getMinMax();
			if(db.Min < this.Min) {this.Min = db.Min}
			if(db.Max > this.Max) {this.Max = db.Max}
		}, this);
		return this;
	}
	wrapHtml() {
		return "<div id=\"" + this.Anchors.Root + "\" class=\"Graph_Wrapping\"></div>";
	}
	plot(I) {
		let pool = (this.Options.Pooling.Selected == "Together"); //True if the selected mode is plot together
		let toUse = this.DataBlocs.Array.filter(function(bloc) { //Keep only the selected blocs
			return bloc.Visible;
		});
		let l = toUse.length; //Number of datablocs to output
		if(I !== undefined) {this.init(I)} //Only on init, Object I will contain the necessary info
		let html = this.html(toUse, pool); //Prepare the html structure
		let dom = GetId(this.Anchors.Root);
		dom.innerHTML = html; //Append the structure
		if(pool) {dom.style.marginBottom = this.Config.get("PlotArea", "Margins", "Between") + "px"}
		else {dom.style.marginBottom = ""}
		toUse.forEach(function(bloc, i) { //Plot the graphs
			bloc.plot({
				Index: i,
				Together: pool,
				Last: l - 1, //Index of the last index
			});
		}, this);
		if(pool) { //When plotting is done separately, each databloc takes care of this
			this.drawTitle();
			Legend.draw(Grapher.Legends.Array, this.Anchors.LegendArea);
		}
		return this;
	}
	init(I) { //Init the graph on first run
		if(I.SharedScale) { //Scale are shared for all graph
			this.setScale(I.Scale); //Use the scale provided
		}
		else {
			if(I.AutoScale) { //Generates a scale using its own Min and Max
				this.setScale(Scale.auto(this.Min, this.Max)); //Set the scales for the YAxis (Data)
			}
		}
	}
	html(toUse, pool) { //Generate the html
		let html = "";
		if(pool) { //Blocs are pooled together
			html += "<table class=\"Structure\"><tr><td></td><td></td><td colspan=\"" + this.DataBlocs.Length + "\">";
			html += "<div id=\"" + this.Anchors.TitleArea + "\" class=\"GraphTitle\">" + this.Name + "</div></td></tr>";
			let rows = ["<tr>", "<tr>", "<tr>", "<tr>", "<tr>"];
			toUse.forEach(function(bloc, i) { //Create the html structure for the graphs
				bloc.html(rows, {
					Index: i,
					Together: pool,
				});
			}, this);
			this.wrappingHTML(toUse, rows); //Last row should be made here using the wrapping header
			rows.forEach(function(r) {html += r + "</tr>"}); //Concat each rows to the html
			html += "</table><div id=\"" + this.Anchors.LegendArea + "\" class=\"Legend\"></div>";
		}
		else { //Blocs are separated and the structure is the same for each
			toUse.forEach(function(bloc, i) { //Create the html structure for the graphs
				html += bloc.html(html, {
					ID: this.Anchors.BlocArea + "_" + i,
					Index: i,
					JSON: this.JSON,
					Together: pool,
					Config: this.Config,
				});
			}, this);
		}
		return html;
	}
	wrappingHTML(toUse, rows) { //Prepare the wrapping for the graph. Only used for plot together; in separate mode, each bloc handles this individually
		let C = this.Config;
		if(this.JSON.Headers === undefined || this.JSON.Headers.Cols === undefined) {rows[2] = ""} //No headers means this line can be deleted
		let w = this.JSON.Wrapping;
		if(w !== undefined) { //Wrapping data available
			if(w.Headers !== undefined && w.Headers.Cols !== undefined && w.Headers.Cols.length > 0) { //Wrapping headers also available
				let n = toUse.length;
				let space = Math.round((C.get("PlotArea", "Size", "Width") / this.DataBlocs.Array[0].Data.Groups.length) / 2); //Space to leave on left and right to align with the ticks
				let run = 0;
				let head = 0
				let span = 0;
				let first = true;
				while((run < n) && (w.Headers.Cols[head] !== undefined)) {
					span += w.Headers.Cols[head].Span;
					if(toUse[run].Index < span) { //This wrapping corresponds to the series and should be added
						let step = 1;
						while(((run + step) < n) && (toUse[run + step].Index < span)) {step++} //Find all the blocs belonging to this header
						rows[4] += "<td colspan=\"" + step + "\"><div class=\"XAreaWrappingHead\""; //Span of as many as blocs belonging here
						rows[4]	+= " style=\"" + C.valuesCSS("Labels", "Axes");
						rows[4]	+= " padding-top: " + C.get("Labels", "Headers", "Margin") + "px;"; //Top margin
						rows[4] += " margin: " + C.get("Labels", "Headers", "Margin") + "px " + space + "px 0px "; //Top Right Bottom 
						if(first) {rows[4] += (C.get("PlotArea", "Margins", "Left") + space) + "px;"; first = false} //Left. Additional margin for the first
						else {rows[4] += space + "px;"}
						rows[4] += " border-top: " + C.get("Labels", "Headers", "Border") + "px solid " + C.get("Labels", "Headers", "Color") + ";";
						rows[4] += "\">" + w.Headers.Cols[head].Name + "</div></td>";
						run += step; //Move to the last position and repeat
					}
					head++; //Move to the next header if available
				}
			}
		}
		else { //Extra rows not needed
			rows[3] = "";
			rows[4] = "";
		}
		return this;
	}
	setScale(scale) { //Assign the scale object to the config
		let C = this.Config;
		C.set(scale.Min, "Scale", "YAxis", "Min");
		C.set(scale.Max, "Scale", "YAxis", "Max");
		C.set(scale.Step, "Scale", "YAxis", "Step");
		C.set(scale.Ticks, "Scale", "YAxis", "Ticks");
		return this;
	}
	drawTitle() {
		Graph.drawTitle(GetId(this.Anchors.TitleArea), this.Config);
		return this;
	}
	showConfig() { //Show the config for this Graph
		let id = this.Anchors.GraphConfig;
		let formID = "Form_" + id;
		Form.open({
			ID: formID,
			HTML: "<div id=\"" + id + "\"></div>",
			Title: "Options for graph: " + this.Name,
			Modal: true,
			Size: 500,
			Buttons: [
				{Label: "Done", Click: function() {
					Form.close(formID);
					this.plot();
				}.bind(this) }
			]
		});
		this.Config.init();
		return this;
	}
	toggleVisible() { //Toggle the visibility for this graph
		Grapher.Graphs.update(); //Update the table
		let dom = GetId(this.Anchors.Root);
		if(this.Visible) {dom.style.display = "block"}
		else {dom.style.display = "none"}
	}
	/*
	display() { //Display the internally drawn canvases on screen
		let canvas = GetId(this.Canvas);
		let ctx = canvas.getContext("2d");
		let C = this.Config;
		let r = Graph.pixelRatio;
		let L = GraphConfig.get(C, "margins", "left") * r;
		let T = GraphConfig.get(C, "margins", "top") * r;
		ctx.clearRect(0, 0, canvas.width, canvas.height); //Reset the canvas first
		ctx.drawImage(this.Graph, 0, 0); //Draw the graph base (frame, axis, plot area, title)
		ctx.drawImage(this.Points, L, T); //Add Points at the end so that they end up on the top layer
		// ********************************************************************************************************
		// !!!!!!! DO NOT DELETE !!!!
		// ********************************************************************************************************
		//CORRECT AND NEED TO BE REACTIVATED
		/ *if(this.Selected) {
			let h = this.Highlight.getContext("2d");
			h.clearRect(0, 0, this.Highlight.width, this.Highlight.height); //Reset the canvas first
			h.setTransform(r, 0, 0, r, 0, 0);
			if(this.Selected.Bar) { //Bar highlighted by hover
				Graph.highlightBar(h, this.Data.DataSeries[this.Selected.Bar.Series], this.Selected.Bar.Selected, this.Config);
			}
			if(this.Selected.Point) { //Point highlighted by hover
				Graph.highlightPoint(h, this.Data.DataSeries[this.Selected.Point.Series], this.Selected.Point.Selected);
			}
			ctx.drawImage(this.Highlight, L, T);
		}* /
		//********************************************************************************************************
		canvas.style.width = (GraphConfig.get(C, "plotArea", "width") + GraphConfig.get(C, "margins", "left") + GraphConfig.get(C, "margins", "right")) + "px"; //Resize the canvas to match the desired output size
		return this;
	}*/
}