//************************************************************************************
// LEGEND object - Class for the representation of a SubGroup (row of data) in a Graph
//************************************************************************************
class Legend {
	constructor(I) {
		this.Index = I.Index;
		this.SubGroup = I.SubGroup;
		this.Name = Grapher.groupName(I.SubGroup);
		this.Config = new LegendConfig(I);
		this.Options = {
			Visible: LinkCtrl.new("Checkbox", {ID: Grapher.Anchors.LegendOptions, Label: "Visible", Default: true, Chain: {Index: 0},
				Title: "Whether this DataSeries should be displayed or not",
				Change: function() {this.toggleVisible()}.bind(this),
			}),
			ShowConfig: LinkCtrl.new("Button", {ID: Grapher.Anchors.LegendOptions, Label: "Edit DataSeries config", Chain: {Index: 1, Last: true},
				Title: "Click to see and update the configuration for the selected DataSeries",
				Click: function() {this.showConfig()}.bind(this),
			}),
		}
		if(I.Index == 0) { //First legend is selected per default, and its options displayed
			this.Selected = true;
			this.initOptions();
		}
		else {this.Selected = false}
		return this;
	}
	//Getter
	get Visible() {
		return this.Options.Visible.getValue();
	}
	//Static methods
	static draw(Legends, ID) { //Output the legends for the array of Legend object provided at the indicated ID
		let content = ID + "_Content";
		GetId(ID).innerHTML = "<fieldset><legend>Legend</legend><table id=\"" + content + "\" class=\"LegendTable\"></table></fieldset>"; //Reset the previous contents
		Legends.forEach(function(l) {l.html(content)}); //Prepare the html for each legend object passed
		Legends.forEach(function(l) {l.draw(content)}); //Draw each legend object passed
	}
	//Methods
	initOptions() {
		Object.values(this.Options).forEach(function(o) {o.init()});
	}
	canvasID(id, elt) { //Returns a unique ID for the element, based on its index
		return id + "_" + this.Index + "_" + elt;
	}
	html(ID) { //Prepare the html in the indicated ID element
		if(this.Visible == false) {return this}
		let C = this.Config;
		let l = C.get("Labels", "Preview", "Size"); //Size of the preview box
		let r = Grapher.PixelRatio;
		let html = "";
		html += "<tr>";
		html += "<td><canvas id=\"" + this.canvasID(ID, "Bar") +   "\" width=\"" + (l * r) + "\" height=\"" + (l * r) + "\" style=\"width: " + l + "px; height: " + l + "px\"></canvas></td>";
		html += "<td><canvas id=\"" + this.canvasID(ID, "Point") + "\" width=\"" + (l * r) + "\" height=\"" + (l * r) + "\" style=\"width: " + l + "px; height: " + l + "px\"></canvas></td>";
		html += "<td><span style=\"" + C.valuesCSS("Labels", "Text") + "\">" + this.Name + "</span></td>";
		html += "</tr>";
		GetId(ID).innerHTML += html;
		return this;
	}
	draw(ID) { //Display the preview
		if(this.Visible == false) {return this}
		let C = this.Config;
		if(C.get("Bars", "Main", "Use")) {
			let ctxB = GetId(this.canvasID(ID, "Bar")).getContext("2d");
			this.drawBar(ctxB);
		}
		if(C.get("Points", "Main", "Use")) {
			let ctxP = GetId(this.canvasID(ID, "Point")).getContext("2d");
			this.drawPoint(ctxP);
		}
		return this;
	}
	drawBar(ctx) { //Draw the appearance of the bar
		let r = Grapher.PixelRatio;
		ctx.setTransform(r, 0, 0, r, 0, 0);
		let C = this.Config;
		let l = C.get("Labels", "Preview", "Size"); //Size of the preview box
		let w = C.get("Bars", "Border", "Size"); //Size of the border
		let length = Math.max(l - w, 1); //Ensures that at least one pixel of square is plotted, otherwise there is nothing...
		Shape.Rectangle(ctx, Math.round(w/2), Math.round(w/2), {Width: length, Height: length}, C.values("Bars", "Border"), C.values("Bars", "Background"));
		return this;
	}
	drawPoint(ctx) { //Draw the appearance of the point
		let r = Grapher.PixelRatio;
		ctx.setTransform(r, 0, 0, r, 0, 0);
		let C = this.Config;
		let l = C.get("Labels", "Preview", "Size"); //Size of the preview box
		let w = C.get("Points", "Border", "Size"); //Size of the border
		let shape = C.get("Points", "Main", "Shape"); //Shape to use
		let size = ((l - w) / 2) - 2; //Leave a small offset of 2 px
		Shape["__" + shape](ctx, Math.round(l/2), Math.round(l/2), size, C.values("Points", "Border"), C.values("Points", "Background"));
		return this;
	}
	toggleVisible() { //Toggle the visibility for this legend
		Grapher.Legends.update(); //Update the table
		Grapher.plot();
	}
	showConfig() { //Show the config for this legend
		let id = Grapher.Anchors.LegendConfig;
		let formID = "Form_" + id;
		Form.open({
			ID: formID,
			HTML: "<div id=\"" + id + "\"></div>",
			Title: "Options for DataSeries: " + this.Name,
			Modal: true,
			Size: 500,
			Buttons: [
				{Label: "Done", Click: function() {
					Form.close(formID);
					Grapher.plot();
				}.bind(this) }
			]
		});
		this.Config.init();
		return this;
	}
	drawNoData(ctx, x, y) { //Draw the no-data symbol at the x & y location on the ctx
		let Cl = this.Config;
		let config = Cl.values("Labels", "No-Data");
		config.Align = "center"; //Add the alignement property
		if(Cl.get("Labels", "No-Data", "Use")) { //Draw a dummy symbol if needed
			Shape.text(ctx, {Txt: Cl.get("Labels", "No-Data", "Text"), X: x, Y: y, Config: config});
		}
		return this;
	}
}