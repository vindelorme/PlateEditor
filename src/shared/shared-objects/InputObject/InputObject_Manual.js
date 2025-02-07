//**********************************************************************************************
// INPUTOBJECT_MANUAL - Object from manual input of data, with tracking of their parsing options
//**********************************************************************************************
class InputObject_Manual extends InputObject {
	constructor(data) {
		super();
		let d = data.Data;
		if(d === undefined) {console.warn("No data transfered to InputObject manual. Aborted"); return this}
		this.RawData = d; //Raw data for the input: original data submitted by the user
		this.Source = "Manual";
		this.Type = "txt/plain"; //Mimickry
		this.Size = d.length;
		if(data.Name && data.Name.length > 0) { //Use provided name
			this.Name = data.Name;
		}
		else { //Create a name based on the first characters within the input
			this.Name = d.substring(0, 7);
			if(this.Size > 7) {this.Name += "[...]"}
		}
		this.Format = "-"; //No extension because no file, so just a filler is used
		this.Controls.Parser.List = ["TXT/CSV"]; //Excel not needed
		this.InputParser = InputParser.new({Type: this.Controls.Parser.Selected, Data: this.RawData, Name: this.Name}); //Parser Object and its configuration
		return this;
	}
}