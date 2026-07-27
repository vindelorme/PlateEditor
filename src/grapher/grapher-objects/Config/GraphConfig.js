//***************************************************************************************
// GRAPHCONFIG object - Object holding adjustable configurations and defaults for a Graph
//***************************************************************************************
class GraphConfig extends Config {
	constructor(I) {
		super(I);
		this.Properties = {
			Scale: {
				/*XAxis : {
					Min: LinkCtrl.new("Number", {ID: this.id("Scale", "XAxis"), Label: "Min", Default: 0, Preserve: true, Chain: {Index: 0} }),
					Max: LinkCtrl.new("Number", {ID: this.id("Scale", "XAxis"), Label: "Max", Default: 0, Chain: {Index: 1, Last: true} }),
				   Step: LinkCtrl.new("Number", {ID: this.id("Scale", "XAxis"), Label: "Step", Default: 0, Chain: {Index: 2, NewLine: true} }),
				  Ticks: LinkCtrl.new("Number", {ID: this.id("Scale", "XAxis"), Label: "Ticks", Default: 0, Chain: {Index: 3, Last: true} }),
				},*/
				YAxis : {
					Min: LinkCtrl.new("Number", {ID: this.id("Scale", "YAxis"), Label: "Min", Default: 0, Preserve: true, Chain: {Index: 0} }),
					Max: LinkCtrl.new("Number", {ID: this.id("Scale", "YAxis"), Label: "Max", Default: 0, Chain: {Index: 1, Last: true} }),
				   Step: LinkCtrl.new("Number", {ID: this.id("Scale", "YAxis"), Label: "Step", Default: 0, Chain: {Index: 2, NewLine: true} }),
				  Ticks: LinkCtrl.new("Number", {ID: this.id("Scale", "YAxis"), Label: "Ticks", Default: 0, Chain: {Index: 3, Last: true} }),
				},
			},
			PlotArea: {
				Size: {
					Width: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Size"), Label: "Width", Default: 400, Step: 50, Preserve: true, Chain: {Index: 0} }),
				   Height: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Size"), Label: "Height", Default: 300, Step: 50, Chain: {Index: 1, Last: true} }),
				},
				Background: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("PlotArea", "Background"), Label: "Use background color", Default: false, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("PlotArea", "Background"), Label: "Color", Default: "white", Chain: {Index: 1, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Background"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 2, Last: true} }),
				},
				Border: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("PlotArea", "Border"), Label: "Use border", Default: false, Preserve: true, Chain: {Index: 0} }),
					Size: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Border"), Label: "Size", Default: 1, Step: 1, Min: 1, Chain: {Index: 1, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("PlotArea", "Border"), Label: "Color", Default: "black", Chain: {Index: 2, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Border"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 3, Last: true} }),
				},
				Margins: {
					Top: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Margins"), Label: "Top", Default: 10, Step: 5, Min: 0, Preserve: true, Chain: {Index: 0} }),
				 Bottom: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Margins"), Label: "Bottom", Default: 10, Step: 5, Min: 0, Chain: {Index: 1, Last: true} }),
				  Right: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Margins"), Label: "Right", Default: 10, Step: 5, Min: 0, Chain: {Index: 2, NewLine: true} }),
				   Left: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Margins"), Label: "Left", Default: 10, Step: 5, Min: 0, Chain: {Index: 3, Last: true} }),
				Between: LinkCtrl.new("Number", {ID: this.id("PlotArea", "Margins"), Label: "Between Graph", Default: 50, Step: 5, Min: 0, Chain: {Index: 4, NewLine: true, Last: true} }),
				},
			},
			Axes: {
				XAxis: {
					Size: LinkCtrl.new("Number", {ID: this.id("Axes", "XAxis"), Label: "Size", Default: 2, Step: 1, Min: 0, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Axes", "XAxis"), Label: "Color", Default: "black", Chain: {Index: 1, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Axes", "XAxis"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 2, Last: true} }),
				},
				YAxis: {
					Size: LinkCtrl.new("Number", {ID: this.id("Axes", "YAxis"), Label: "Size", Default: 2, Step: 1, Min: 0, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Axes", "YAxis"), Label: "Color", Default: "black", Chain: {Index: 1, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Axes", "YAxis"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 2, Last: true} }),
				},
				Ticks: {
					Size: LinkCtrl.new("Number", {ID: this.id("Axes", "Ticks"), Label: "Size", Default: 2, Step: 1, Min: 0, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Axes", "Ticks"), Label: "Color", Default: "black", Chain: {Index: 1, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Axes", "Ticks"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 2, Last: true} }),
				  Length: LinkCtrl.new("Number", {ID: this.id("Axes", "Ticks"), Label: "Length", Default: 8, Step: 1, Min: 0, Chain: {Index: 3, NewLine: true} }),
					Type: LinkCtrl.new("Select", {ID: this.id("Axes", "Ticks"), Label: "Type", Default: 1, List: ["Inside", "Center", "Outside"], Chain: {Index: 4, Last: true} }),
				},
			},
			Labels: {
				Axes: {
					Size: LinkCtrl.new("Number", {ID: this.id("Labels", "Axes"), Label: "Size", Default: 16, Step: 1, Min: 1, Preserve: true, Chain: {Index: 0} }),
					Font: LinkCtrl.new("Select", {ID: this.id("Labels", "Axes"), Label: "Font", Default: 0, List: Config.fontList(), Chain: {Index: 1, Last: true} }),
				  Bold: LinkCtrl.new("Checkbox", {ID: this.id("Labels", "Axes"), Label: "Bold", Default: true, Chain: {Index: 2, NewLine: true} }),
				Italic: LinkCtrl.new("Checkbox", {ID: this.id("Labels", "Axes"), Label: "Italic", Default: false, Chain: {Index: 3, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Labels", "Axes"), Label: "Color", Default: "black", Chain: {Index: 4, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Labels", "Axes"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 5, Last: true} }),
			 Orientation: LinkCtrl.new("Select", {ID: this.id("Labels", "Axes"), Label: "Text orientation", Default: 1, List: ["Horizontal", "Angled", "Sideway"], Chain: {Index: 6, NewLine: true, Last: true} }),
				},
				Headers: {
				  Border: LinkCtrl.new("Number", {ID: this.id("Labels", "Headers"), Label: "Border size", Default: 2, Step: 1, Min: 0, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Labels", "Headers"), Label: "Border color", Default: "black", Chain: {Index: 1, NewLine: true, Last: true} }),
				  Margin: LinkCtrl.new("Number", {ID: this.id("Labels", "Headers"), Label: "Margin", Default: 5, Step: 1, Min: 0, Chain: {Index: 2, NewLine: true, Last: true} }),
				},
			},
			Titles: {
				Main: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "Main"), Label: "Show", Default: true, Preserve: true, Chain: {Index: 0} }),
					  Name: LinkCtrl.new("Text", {ID: this.id("Titles", "Main"), Default: I.Title, Chain: {Index: 1, Last: true} }), //Use the Name provided in the constructor to fill this default
					Size: LinkCtrl.new("Number", {ID: this.id("Titles", "Main"), Label: "Size", Default: 20, Step: 1, Min: 1, Preserve: true, Chain: {Index: 2, NewLine: true} }),
					Font: LinkCtrl.new("Select", {ID: this.id("Titles", "Main"), Label: "Font", Default: 0, List: Config.fontList(), Chain: {Index: 3, Last: true} }),
				 Padding: LinkCtrl.new("Number", {ID: this.id("Titles", "Main"), Label: "Margin", Default: 0, Step: 5, Min: 0, Chain: {Index: 4, NewLine: true, Last: true} }),
				  Bold: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "Main"), Label: "Bold", Default: true, Chain: {Index: 5, NewLine: true} }),
				Italic: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "Main"), Label: "Italic", Default: false, Chain: {Index: 6, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Titles", "Main"), Label: "Color", Default: "black", Chain: {Index: 7, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Titles", "Main"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 8, Last: true} }),
				},
				/*
				XAxis: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "XAxis"), Label: "Show", Default: true, Preserve: true, Chain: {Index: 0} }),
					  Name: LinkCtrl.new("Text", {ID: this.id("Titles", "XAxis"), Default: "XAxis Title", Chain: {Index: 1, Last: true} }),
					Size: LinkCtrl.new("Number", {ID: this.id("Titles", "XAxis"), Label: "Size", Default: 16, Step: 1, Min: 1, Chain: {Index: 2, NewLine: true} }),
					Font: LinkCtrl.new("Select", {ID: this.id("Titles", "XAxis"), Label: "Font", Default: 0, List: Config.fontList(), Chain: {Index: 3, Last: true} }),
				 Padding: LinkCtrl.new("Number", {ID: this.id("Titles", "XAxis"), Label: "Margin", Default: 10, Step: 5, Min: 0, Chain: {Index: 4, NewLine: true, Last: true} }),
				  Bold: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "XAxis"), Label: "Bold", Default: true, Chain: {Index: 5, NewLine: true} }),
				Italic: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "XAxis"), Label: "Italic", Default: false, Chain: {Index: 6, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Titles", "XAxis"), Label: "Color", Default: "black", Chain: {Index: 7, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Titles", "XAxis"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 8, Last: true} }),
				},*/
				YAxis: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "YAxis"), Label: "Show", Default: true, Preserve: true, Chain: {Index: 0} }),
					  Name: LinkCtrl.new("Text", {ID: this.id("Titles", "YAxis"), Default: Grapher.MetaData.Parameter.Name, Chain: {Index: 1, Last: true} }),
					Size: LinkCtrl.new("Number", {ID: this.id("Titles", "YAxis"), Label: "Size", Default: 16, Step: 1, Min: 1, Preserve: true, Chain: {Index: 2, NewLine: true} }),
					Font: LinkCtrl.new("Select", {ID: this.id("Titles", "YAxis"), Label: "Font", Default: 0, List: Config.fontList(), Chain: {Index: 3, Last: true} }),
				 Padding: LinkCtrl.new("Number", {ID: this.id("Titles", "YAxis"), Label: "Margin", Default: 10, Step: 5, Min: 0, Chain: {Index: 4, NewLine: true, Last: true} }),
				  Bold: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "YAxis"), Label: "Bold", Default: true, Chain: {Index: 5, NewLine: true} }),
				Italic: LinkCtrl.new("Checkbox", {ID: this.id("Titles", "YAxis"), Label: "Italic", Default: false, Chain: {Index: 6, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Titles", "YAxis"), Label: "Color", Default: "black", Chain: {Index: 7, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Titles", "YAxis"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 8, Last: true} }),
				},
			}
		}
		return this;
	}
	//Static methods
	
	//Methods

}