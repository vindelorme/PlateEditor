//*******************************************************************************
// INPUTOBJECT_FILE - Object for input file and tracking of their parsing options
//*******************************************************************************
class InputObject_File extends InputObject {
	constructor(file) {
		super();
		this.RawData = file; //Raw data for the input: original file object from the browser
		this.Source = "File";
		this.Type = file.type;
		this.Name = file.name;
		this.Size = file.size;
		this.Format = file.name.substring(file.name.lastIndexOf(".")); //Get the extension for the file
		if(this.Format == ".xlsx") {this.Controls.Parser.Value = 1} //Set default value for files recognized as excel
		if(this.Format == ".xls") {this.Controls.Parser.Value = 2}
		this.InputParser = InputParser.new({Type: this.Controls.Parser.Selected, Data: this.RawData, Name: this.Name}); //Parser Object and its configuration
		return this;
	}
}