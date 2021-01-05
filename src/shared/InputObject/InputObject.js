//********************************************************************************
// INPUTOBJECT - Object for input files/data and tracking of their parsing options
//********************************************************************************
class InputObject {
	constructor() {
		this.Controls = {
			Parser: LinkCtrl.new("Select", {
				ID: Form_Import.Anchors.Parser, Label: "Parser", Default: 0, List: ["TXT/CSV", "XLSX", "XLS"], 
				Title: "The parser to use to parse this input",
				Change: function(v, I) {
					if(I) {I.Input = this}
					else {
						I = {Input: this}
					}
					this.changeParser(I);
				}.bind(this)
			}),
			Limit: LinkCtrl.new("Select", { //The limit to the number of lines to parse for the preview
				ID: Form_Import.Anchors.Preview, Index: 1, Default: 0, Label: "Limit", Preserve: true, List: ["20", "100", "500", "1000", "All"], Title: "Only this number of rows will be displayed in the preview. Prevent big files from crashing the browser.",
				Change: function() { //on change, trigger a new parsing of the input and supply the new limit to use
					this.InputParser.parse({Limit: this.Controls.Limit.Selected, Input: this});
				}.bind(this),
			}),
		}
	}
	static new(type, data) { //Create a new child InputObject
		switch(type) {
			case "File": return new InputObject_File(data); break; //File passed in data
			case "Manual": return new InputObject_Manual(data); break; //Plain input passed in data
			default:
				console.error("Unknown type requested for InputObject (" + type + "). Aborted.");
				return;
		}
	}
	//Methods
	changeParser(I) { //Change in the parser selected
		this.InputParser = InputParser.new({Type: this.Controls.Parser.Selected, Data: this.RawData, Name: this.Name}); //Create a new parser object
		if(I) {I.Limit = this.Controls.Limit.Selected}
		else {
			I = {Limit: this.Controls.Limit.Selected}
		}
		this.InputParser.parse(I); //Parse
		if(I && I.NoInit) {return}
		this.InputParser.init(); //Init the LinkCtrl options for the parser
	}
}