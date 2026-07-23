//**************************************************************************
// GRAPHER object - UI for plotting and configuration of graphs using canvas
//**************************************************************************
class Grapher {
	constructor() {return this}
	//Static Methods
	static init(I) {
		if(I.Data === undefined) {return this}
		this.PixelRatio = 2; //Gives a higher resolution for the graph
		this.MetaData = I.MetaData;
		this.ResolvedNames = I.ResolvedNames;
		let root = "Grapher_";
		this.Anchors = {
			Menu: root + "Menu",
			Output: root + "Output",
			Graphs: root + "Graphs",
			Scale: root + "Scale",
			GraphOptions: root + "GraphOptions",
			GraphName: root + "GraphName",
			Blocs: root + "Blocs",
			BlocOptions: root + "BlocOptions",
			GraphArea: root + "GraphArea",
			BlocName: root + "BlocName",
			Legends: root + "Legends",
			LegendName: root + "LegendName",
			LegendOptions: root + "LegendOptions",
			LegendConfig: root + "LegendConfig",
		}
		let html = "";
		html += "<div id=\"" + this.Anchors.Menu + "\"></div>";
		html += "<div id=\"" + this.Anchors.Output + "\"></div>";
		GetId("Main").innerHTML = html;
		this.Menu = new TabControl({
			ID: this.Anchors.Menu,
			Multiple: true,
			Stack: true,
			Layout: "Menu",
			Tabs: [
				{Label: "Graphs", Active: true, Content:
					{Type: "HTML", Value: "<div>" +
						"<fieldset><legend>Scale</legend><div id=\"" + this.Anchors.Scale + "\"></div></fieldset>" +
						"<fieldset><legend>Available Graphs</legend><div id=\"" + this.Anchors.Graphs + "\"></div></fieldset>" +
						"<fieldset><legend>Options for graph: <span id=\"" + this.Anchors.GraphName + "\"></span></legend><div id=\"" + this.Anchors.GraphOptions + "\"></div></fieldset>" +
						"</div>",
					}
				},
				{Label: "DataSeries", Active: true, Content:
					{Type: "HTML", Value: "<div>" +
						"<fieldset><legend>Available DataSeries</legend><div id=\"" + this.Anchors.Legends + "\"></div></fieldset>" +
						"<fieldset><legend>Options for DataSeries: <span id=\"" + this.Anchors.LegendName + "\"></span></legend><div id=\"" + this.Anchors.LegendOptions + "\"></div></fieldset>" +
						"</div>",
					}
				},
				{Label: "Blocs", Active: true, Content:
					{Type: "HTML", Value: "<div>" +
						"<fieldset><legend>Available blocs</legend><div id=\"" + this.Anchors.Blocs + "\"></div></fieldset>" +
						"<fieldset><legend>Options for bloc: <span id=\"" + this.Anchors.BlocName + "\"></span></legend><div id=\"" + this.Anchors.BlocOptions + "\"></div></fieldset>" +
						"</div>",
					}
				},
			],
		});
		let metadata = "<fieldset><legend>Metadata</legend>" + Section.metaDataToHeader(this.MetaData, {HTML: true}) + "</fieldset>";
		html = ""; //Start a new bloc of html
		html += "<div id=\"" + this.Anchors.GraphArea + "\"></div>";
		this.Output = new TabControl({ //Outout tabs
			ID: this.Anchors.Output,
			Multiple: true,
			Layout: "Horizontal",
			Tabs: [
				{Label: this.MetaData.BlocName + " - " + this.MetaData.Table, Active: true, Content: {Type: "HTML", Value: html} },
				{Label: "Metadata", Active: false, Content: {Type: "HTML", Value: metadata} },
			],
		});
		this.Options = {
			SharedScale: LinkCtrl.new("Checkbox", {ID: this.Anchors.Scale, Label: "Shared scales", Default: true, Preserve: true,
				Title: "If ticked, all graphs will share the same scale; otherwise each graph will adapt its scale based on its own data",
				Change: function(v) {this.plot()}.bind(this), 
			}),
		}
		this.Menu.init();
		this.Output.init();
		Object.values(this.Options).forEach(function(o) {o.init()});
		this.importJSON(I.Data);
		this.plot({AutoScale: true});
		this.SelectedNames(); //Update the names of the selected graph, legend and bloc
		return this;
	}
	static importJSON(data) { // Create Graph objects from the incoming JSON
		let graphArray = [];
		this.JSON = data; //Contains Data, Headers and Wrapping
		let wrapping = data.Wrapping;
		if(wrapping !== undefined && wrapping.Data.SubGroups !== undefined && wrapping.Data.SubGroups.length > 0) { //Use the Rows level 2 to define the Graphs
			graphArray = wrapping.Data.SubGroups.map(function(sg, i) {
				return new Graph({Index: i, SubGroup: sg, JSON: data});
			});
		}
		else { //If no wrapping exists, there will be only one graph
			graphArray = [new Graph({Index: 0, JSON: data})]; //SubGroup will be undefined
		}
		this.importGraph(graphArray);
		let legendArray = [];
		if(data.Data[0].SubGroups.length == 0) { //No SubGroups: use a generic one using the parameter name to create the legend
			legendArray = [new Legend({SubGroup: {Name: this.MetaData.Parameter.Name}, Index: 0, Root: this.Anchors.LegendConfig})];
		}
		else { //Otherwise, use the SubGroups
			legendArray = data.Data[0].SubGroups.map(function(sg, i) {
				return new Legend({SubGroup: sg, Index: i, Root: this.Anchors.LegendConfig});
			}, this);
		}
		this.importLegend(legendArray);
		return this;
	}
	static importGraph(array) { //Create the Graph table using the array passed
		this.Graphs = new RespTable({ //Table listing the graphs available
			ID: this.Anchors.Graphs,
			Array: array,
			Fields: ["Name", "Visible"],
			NoControls: true,
			RowNumbers: true,
			Preserve: true,
			onSelect: function(s) {Grapher.tableClick(s)} //Prefer to use Grapher than 'this' because it is less ambiguous
		});
		this.Graphs.init(); //Init the respTable
		return this;
	}
	static importLegend(array) { //Create the Graph table using the array passed
		this.Legends = new RespTable({ //Table listing the graphs available
			ID: this.Anchors.Legends,
			Array: array,
			Fields: ["Name", "Visible"],
			NoControls: true,
			RowNumbers: true,
			Preserve: true,
			onSelect: function(s) {Grapher.tableClick(s)} //Prefer to use Grapher than 'this' because it is less ambiguous
		});
		this.Legends.init(); //Init the respTable
		return this;
	}
	static getMinMax() { //Get the global min and max, for all the data
		this.Min = +Infinity;
		this.Max = -Infinity;
		this.Graphs.Array.forEach(function(g) {
			g.getMinMax();
			if(g.Min < this.Min) {this.Min = g.Min}
			if(g.Max > this.Max) {this.Max = g.Max}
		}, this);
	}
	static groupName(group, I) { //Return the name for a group
		if(group.Type == "Range") { //Retrieve the resolved range name
			let i = group.OriginIndex;
			let j = group.RangeIndex - 1;
			if(this.ResolvedNames[i] !== undefined) {
				return this.ResolvedNames[i][j];
			}
		}
		if(I && I.ValueOnly) {return group.Name}
		if(group.Type == "Conc") {
			if(group.Unit == "MOI") {return group.Unit + " " + group.Name}
			else {return group.Name + " " + group.Unit}
		}
		return group.Name; //Default scenario
	}
	static plot(I) { //Plot the graphs
		if(I && I.AutoScale) {
			if(this.Min === undefined || this.Max === undefined) {this.getMinMax()} //Recover global Min and Max to set the Scale
			this.Scale = Scale.auto(this.Min, this.Max);
		}
		let dom = GetId(this.Anchors.GraphArea);
		dom.innerHTML = ""; //Reset the contents
		let index = 0; //Tracker for the graph index
		this.Graphs.Array.forEach(function(g, i) {
			if(g.Visible) {
				dom.insertAdjacentHTML("beforeend", g.wrapHtml());
				g.plot({
					Scale: this.Scale,
					SharedScale: this.Options.SharedScale.getValue(),
				});
				index++;
			}
		}, this);
		return this;
	}
	static SelectedNames() { //Update the names of the selected graph and bloc in the corresponding legends
		GetId(this.Anchors.GraphName).innerHTML = this.Graphs.Selected[0].Name;
		GetId(this.Anchors.LegendName).innerHTML = this.Legends.Selected[0].Name;
		GetId(this.Anchors.BlocName).innerHTML = this.Graphs.Selected[0].DataBlocs.Selected[0].Name;
		return this;
	}
	static tableClick(s) { //Action taken on a click in the Graph or Bloc Table
		this.SelectedNames(); //Update the legend
		s[0].initOptions(); //Change the graph/bloc options displayed
		return this;
	}
}