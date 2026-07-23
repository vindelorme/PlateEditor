//********************************************************************************************
// LEGENDCONFIG object - Object holding the adjustable configuration and defaults for a Legend
//********************************************************************************************
class LegendConfig extends Config {
	constructor(I) { //I.Index is used for the automatic selection of shapes and colors for the bars/points/curves
		super(I);
		this.Properties = {
			Labels: {
				Text: {
					Size: LinkCtrl.new("Number", {ID: this.id("Labels", "Text"), Label: "Size", Default: 16, Step: 1, Min: 1, Preserve: true, Chain: {Index: 0} }),
					Font: LinkCtrl.new("Select", {ID: this.id("Labels", "Text"), Label: "Font", Default: 0, List: Config.fontList(), Chain: {Index: 1, Last: true} }),
				  Bold: LinkCtrl.new("Checkbox", {ID: this.id("Labels", "Text"), Label: "Bold", Default: true, Chain: {Index: 2, NewLine: true} }),
				Italic: LinkCtrl.new("Checkbox", {ID: this.id("Labels", "Text"), Label: "Italic", Default: false, Chain: {Index: 3, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Labels", "Text"), Label: "Color", Default: "black", Chain: {Index: 4, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Labels", "Text"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 5, Last: true} }),
				},
				Preview: {
					Size: LinkCtrl.new("Number", {ID: this.id("Labels", "Preview"), Label: "Box Size", Default: 20, Step: 1, Min: 1, Preserve: true, Chain: {Index: 0, Last: true} }),
				},
				"No-Data": {
					Use: LinkCtrl.new("Checkbox", {ID: this.id("Labels", "No-Data"), Label: "Show symbol", Default: true, Preserve: true, Chain: {Index: 0} }),
					   Text: LinkCtrl.new("Text", {ID: this.id("Labels", "No-Data"), Default: "Ø", Chain: {Index: 1, Last: true} }),
					 Size: LinkCtrl.new("Number", {ID: this.id("Labels", "No-Data"), Label: "Size", Default: 12, Step: 1, Min: 1, Preserve: true, Chain: {Index: 2, NewLine: true} }),
					 Font: LinkCtrl.new("Select", {ID: this.id("Labels", "No-Data"), Label: "Font", Default: 0, List: Config.fontList(), Chain: {Index: 3, Last: true} }),
				   Bold: LinkCtrl.new("Checkbox", {ID: this.id("Labels", "No-Data"), Label: "Bold", Default: false, Chain: {Index: 4, NewLine: true} }),
				 Italic: LinkCtrl.new("Checkbox", {ID: this.id("Labels", "No-Data"), Label: "Italic", Default: false, Chain: {Index: 5, Last: true} }),
					 Color: LinkCtrl.new("Color", {ID: this.id("Labels", "No-Data"), Label: "Color", Default: "black", Chain: {Index: 6, NewLine: true} }),
				    Alpha: LinkCtrl.new("Number", {ID: this.id("Labels", "No-Data"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 7, Last: true} }),
				}
			},
			Bars: {
				Main: {
					Use: LinkCtrl.new("Checkbox", {ID: this.id("Bars", "Main"), Label: "Show", Default: true, Preserve: true, Chain: {Index: 0, Last: true} }),
				},
				Background: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Bars", "Background"), Label: "Use background color", Default: true, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Bars", "Background"), Label: "Color", Default: CSSCOLORS.fetch(I.Index, "Simple"), Chain: {Index: 1, NewLine: true} }), //Default color set using the index
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Bars", "Background"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 2, Last: true} }),
				},
				Border: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Bars", "Border"), Label: "Use border", Default: true, Preserve: true, Chain: {Index: 0} }),
					Size: LinkCtrl.new("Number", {ID: this.id("Bars", "Border"), Label: "Size", Default: 2, Step: 1, Min: 1, Chain: {Index: 1, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Bars", "Border"), Label: "Color", Default: "black", Chain: {Index: 2, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Bars", "Border"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 3, Last: true} }),
				},
			},
			"Error-bars": {
				Main: {
					Use: LinkCtrl.new("Checkbox", {ID: this.id("Error-bars", "Main"), Label: "Show", Default: true, Preserve: true, Chain: {Index: 0, Last: true} }),
				   Length: LinkCtrl.new("Number", {ID: this.id("Error-bars", "Main"), Label: "Horizontal Length", Default: 8, Step: 1, Min: 0, Chain: {Index: 1, NewLine: true, Last: true} }),
					 Size: LinkCtrl.new("Number", {ID: this.id("Error-bars", "Main"), Label: "Line thickness", Default: 2, Step: 1, Min: 0, Preserve: true, Chain: {Index: 2, NewLine: true, Last: true} }),
				 	 Color: LinkCtrl.new("Color", {ID: this.id("Error-bars", "Main"), Label: "Color", Default: "black", Chain: {Index: 3, NewLine: true} }),
				    Alpha: LinkCtrl.new("Number", {ID: this.id("Error-bars", "Main"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 4, Last: true} }),
				},
				
			},
			Points: {
				Main: {
					Use: LinkCtrl.new("Checkbox", {ID: this.id("Points", "Main"), Label: "Show", Default: true, Preserve: true, Chain: {Index: 0} }),
				  Nudge: LinkCtrl.new("Checkbox", {ID: this.id("Points", "Main"), Label: "Nudge", Default: true, Chain: {Index: 1, Last: true} }),
					 Shape: LinkCtrl.new("Shape", {ID: this.id("Points", "Main"), Label: "Shape", Default: "Circle", Chain: {Index: 2, NewLine: true, Last: true} }),
					 Size: LinkCtrl.new("Number", {ID: this.id("Points", "Main"), Label: "Size", Default: 5, Step: 1, Min: 0, Chain: {Index: 3, NewLine: true, Last: true} }),
				},
				Background: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Points", "Background"), Label: "Use background color", Default: true, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Points", "Background"), Label: "Color", Default: CSSCOLORS.fetch(I.Index, "Simple"), Chain: {Index: 1, NewLine: true} }), //Default color set using the index
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Points", "Background"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 2, Last: true} }),
				},
				Border: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Points", "Border"), Label: "Use border", Default: true, Preserve: true, Chain: {Index: 0} }),
					Size: LinkCtrl.new("Number", {ID: this.id("Points", "Border"), Label: "Size", Default: 2, Step: 1, Min: 1, Chain: {Index: 1, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Points", "Border"), Label: "Color", Default: "black", Chain: {Index: 2, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Points", "Border"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 3, Last: true} }),
				},
			}
		}
		return this;
	}
}