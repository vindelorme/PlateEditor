//********************************************************************************************
// BLOCCONFIG object - Object holding the adjustable configuration and defaults for a dataBloc
//********************************************************************************************
class BlocConfig extends Config {
	constructor(I) {
		super(I);
		this.Properties = {
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
			},
			DataSeries: {
				Gaps: {
					Space: LinkCtrl.new("Number", {ID: this.id("DataSeries", "Gaps"), Label: "Spaces (%)", Default: 50, Step: 10, Min: 0, Preserve: true, Chain: {Index: 0, Last: true} }),
					Margin: LinkCtrl.new("Number", {ID: this.id("DataSeries", "Gaps"), Label: "Margins (%)", Default: 75, Step: 10, Min: 0, Chain: {Index: 1, NewLine: true, Last: true} }),
				},
				/*Background: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Bars", "Background"), Label: "Use background color", Default: true, Preserve: true, Chain: {Index: 0, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Bars", "Background"), Label: "Color", Default: "gray", Chain: {Index: 1, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Bars", "Background"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 2, Last: true} }),
				},
				Border: {
				   Use: LinkCtrl.new("Checkbox", {ID: this.id("Bars", "Border"), Label: "Use border", Default: true, Preserve: true, Chain: {Index: 0} }),
					Size: LinkCtrl.new("Number", {ID: this.id("Bars", "Border"), Label: "Size", Default: 1, Step: 1, Min: 1, Chain: {Index: 1, Last: true} }),
					Color: LinkCtrl.new("Color", {ID: this.id("Bars", "Border"), Label: "Color", Default: "blue", Chain: {Index: 2, NewLine: true} }),
				   Alpha: LinkCtrl.new("Number", {ID: this.id("Bars", "Border"), Label: "Alpha", Default: 1, Step: 0.1, Min: 0, Max: 1, Chain: {Index: 3, Last: true} }),
				},*/
			},
		}
		return this;
	}
	//Static methods
	/*static get(config, main, sub) { //The method to use to retrieve the value from the graphconfig object passed
		return GraphConfig.get(config, main, sub, this); //Override the "this" context of the original method
	}*/
	//*******************************************************************************
	//For all config values, using multiple of the pixel ratio gives crisper graphics
	//*******************************************************************************
	/*static color() {return undefined}
	static display() {
		return {point: true, error: true, curve: false, bar: false}
	}
	static point() {
		return {size: 6, shape: "circle", fill: true, border: true, color: "black", alpha: 1, showAll: true}
	}
	static pointBorder() {
		return {size: 2, color: "black", alpha: 1}
	}
	static excluded() {
		return {fill: true, border: false, color: "red", alpha: 0.2}
	}
	static curve() {
		return {dash: [4, 4], size: 2, color: "black", alpha: 1}
	}
	static bar() {
		return {width: 20, fill: true, border: true, color: "transparent", alpha: 1}
	}
	static barBorder() {
		return {size: 2, color: "black", alpha: 1, topOnly: false, dash: []}
	}
	static errorBar() {
		return {size: 2, length: 4, color: "black", alpha: 1}
	}*/
}