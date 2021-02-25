//****************************************************************
// INPUTPARSER - Object for parsing of data from file/manual input
//****************************************************************
class InputParser {
	constructor(I) {
		this.RawData = I.Data; //Raw data to use for the parsing
		this.Name = I.Name; //Name of the input
		this.WebWorker = true; //Whether to use WebWorker for parsing
		this.TotalRows = 0; //Total number of rows available in the raw data
		this.TotalCols = 0; //Total number of columns available in the raw data
		this.SelectedRows = 0; //Effectively selected number of rows
		this.SelectedCols = 0; //Effectively selected number of columns
		this.Headers = []; //Array of string summarizing the headers found in the input after parsing
		this.Info = ""; //Additional info regarding the parsing
		this.Limit = Infinity; //This corresponds to the limit of rows to show in the preview
		this.FirstParsed = false; //Indicate that the data need to be fully parsed once to initialize total rows/cols counts
		this.Error = false; //Whether an error was encountered during parsing
		let target = Form_Import.Anchors.ParserOptions; //Target ID for the options
		let onChange = function() {this.parse()}.bind(this); //function() {this.clean()}.bind(this)
		this.Options = {
			NoHeaders: LinkCtrl.new("Checkbox", {ID: target, Label: "No headers", Default: false, Change: onChange, NewLine: true, Title: "If ticked, arbitrary, default headers will be used instead of the values found in the first line"}),
			FirstRow: LinkCtrl.new("Number", {ID: target, Label: "First Row", Default: 1, Min: 1, Preserve: true, NewLine: true, Index: 1, Change: onChange, Title: "Line at which the import is started"}),
			FirstCol: LinkCtrl.new("Number", {ID: target, Label: "First Column", Default: 1, Min: 1, Preserve: true, NewLine: true, Index: 2, Change: onChange, Title: "Column at which the import is started"}),
			SingleCol: LinkCtrl.new("Checkbox", {ID: target, Label: "Single column", Default: false, Preserve: true, NewLine: true, Index: 3, Change: onChange,  Title: "If ticked, only one column of data will be selected for import"}),
			SkipEmptyRows: LinkCtrl.new("Checkbox", {ID: target, Label: "Skip empty rows", Default: true, Preserve: true, NewLine: true, Index: 4, Change: onChange, Title: "Whether empty rows are skipped"}),
		}
		return this;
	}
	//Static Methods
	static new(I) { //Create a new InputParser object of the desired type
		switch(I.Type) { //Create the desired element
			case "TXT/CSV": return new InputParser_Papa(I);
			case "XLSX": return new InputParser_XLSX(I);
			case "XLS": return new InputParser_XLS(I);
			default: //Exit if the type is unknown
				console.error("Unknown type requested for InputParser (" + I.Type + "). Aborted.");
				return;
		}
	}
	static highlight(txt) { //Returns an html string containing the text highlighted with a specific style
		return "<b><i><span style=\"color: salmon\">" + txt + "</span></b></i>"
	}
	//Methods
	init() { //Display controls for available options
		Object.values(this.Options).forEach(function(o) {o.init()});
		return this;
	}
	resetParsing(I) { //Reset previous parsing data before parsing again
		this.SelectedRows = 0;
		this.SelectedCols = 0;
		this.Error = false;
		if(I && I.NoPreview) {return this}
		GetId(Form_Import.Anchors.PreviewBox).innerHTML = "<p>" + InputParser.highlight("Preparing preview, please wait...") + "</p>";
		return this;
	}
	setLimit(I) {
		if(I && I.Limit != "All") { //Set the limit of rows for preview
			this.Limit = parseInt(I.Limit);
		}
		else {this.Limit = Infinity}
		return this;
	}
	parsingOptions() { //Return an object holding parsing options that need to be recalled to clean the row as they come
		let o = {
			NoHeaders: this.Options.NoHeaders.getValue(),
			FirstRow: this.Options.FirstRow.getValue() - 1, //Index of the first row
			FirstCol: this.Options.FirstCol.getValue() - 1, //Index of the first col
			SingleCol: this.Options.SingleCol.getValue(),
			SkipEmptyRows: this.Options.SkipEmptyRows.getValue(),
			LastCol: this.TotalCols, //Index of the last column to explore
			FirstParsed: this.FirstParsed,
			Index: 0, //Tracker for row index
			Selected: -1, //Tracker for the number of selected rows
		};
		if(o.SingleCol) {o.LastCol = o.FirstCol + 1} //Only one column is needed
		return o;
	}
	processRow(row, parser, f, o) { //Process the incoming row from the parser
		row = this.cleanRow(row, o);
		if(row) { //The row is valid
			if(o.Selected == -1) { //First selected row, prepare the header
				this.header(row, o); //Prepare the header
				if(o.NoHeaders || this.FirstParsed == false || o.ApplyToHeader) { //In special cases, this row is processed normally and we move to the next
					f(row, 0, parser, o);
					o.Selected = 1;
				}
				else {o.Selected = 0} //In normal cases ignore the header and the next row will be the first row of data
			}
			else {
				f(row, o.Selected, parser, o);
				o.Selected++;
			}
		}
		o.Index++;
	}
	cleanRow(data, o) { //Clean the row received so that it fits the config
		if(o.FirstParsed == false) {return data} //There is no cleaning needed when processing the file for the first time
		if(o.Index >= o.FirstRow) { //If the current row index is higher than the index requested for first line, this line should be processed
			let row = [];
			let dataFound = false;
			for(let i = o.FirstCol; i < o.LastCol; i++) { //Go through the data and check for empty values
				if(data[i] === undefined || data[i] == "") {row.push("")}
				else { //Value found, push it
					row.push(data[i]);
					dataFound = true; //At least one value found
				}
			}
			if(o.SkipEmptyRows && dataFound == false) {return undefined} //Empty row is excluded
			else {return row}
		}
		else {return undefined}
	}
	parse(I) { //Parse the input using provided options
		let T = Form_Import.Controls.Table;
		if(this.Error) {
			this.previewRow([], undefined, {Error: true});
			if(I && I.Input) {I.Input.Status = "Error"; T.update()}
			return this;
		}
		this.resetParsing(I); //Reset previous parsing data
		if(this.FirstParsed == false) {this.firstParse(I); return this}
		if(I) {this.setLimit(I)}
		let name = this.Name;
		let preview = true;
		if(I && I.NoPreview) {preview = false}
		this.stream(function(row, selected, parser, parsingConfig) { //Step function
			if(preview) {
				let s = T.Selected[0];
				if(s.Name != name) {parser.abort()} //Kill the parsing if another row is clicked in between
				else {
					if(selected == 0) {this.previewRow(row, parsingConfig, {Start: true})}
					else {
						if(selected < this.Limit && preview) {this.previewRow(row, parsingConfig)} //Push for the preview, only a subset
					}
				}
			}
			if(I && I.Step) {I.Step(row, selected, parser)}
		}.bind(this), function(selected, parsingConfig) { //Completion function
			if(selected == -1) { //No rows were found
				this.SelectedRows = 0;
				this.SelectedCols = 0;
			}
			else {
				this.SelectedRows = selected; 
				this.SelectedCols = this.Headers.length;
			}
			if(preview && T.Selected[0].Name == name) { //Preview is not shown if a different file is selected at the moment it should be displayed
				this.previewRow([], parsingConfig, {Last: true});
			}
			if(I && I.Input) {I.Input.Status = undefined; T.update()}
			if(I && I.Complete) {I.Complete(selected)}
		}.bind(this), {ApplyToHeader: true}); //We need to count the header row as a selected row in case the file contains the header
	}
	chunk(f, I) { //Chunk a piece of the input and apply the provided function on each chunk
		
	}
	bulk(f) { //Apply the supplied function to the entire bulk of data, once the streaming is complete. This is sure to crash for big files
		let out = [];
		this.stream(function(row, selected, parser, parsingConfig) { //Step function
			out.push(row); //Accumulate all the data
		}.bind(this), function(selected, parsingConfig) { //Completion function
			f(out); //Execute function on the bulk
		});
	}
	header(row, o) { //Prepare the header based on row parsed
		this.Headers = [];
		if(o.NoHeaders) { //No headers in the file, generate arbitraries column names
			row.forEach(function(r, j) { //For each column, prepare an arbitrary header
				this.Headers.push("Col_" + (j+1));
			}, this);
		}
		else {
			row.forEach(function(r, j) { //In this case, just complete empty values with arbitrary headers
				if(r == "") {this.Headers.push("Col_" + (j+1))}
				else {this.Headers.push(r)}
			}, this);
		}
		return this;
	}
	previewHeader() { //Header for the preview
		let out = "<tr>";
		this.Headers.forEach(function(h) { //Preview of the headers
			out += "<th>" + h + "</th>";
		});
		out += "</tr>";
		return out;
	}
	previewRow(row, o, I) { //Receives a row for the preview and append it to the preview window
		let out = "";
		if(I && I.Start) {
			out += "<div><p>" + InputParser.highlight("Preparing preview, please wait...") + "</p>";
			out += "* Total available Rows: <b>" + this.TotalRows + "</b>; Columns: <b>" + this.TotalCols + "</b>";
			out += "</div><div><table>"; //Headings and Table are wrapped in a div for styling
			out += this.previewHeader();
			out += "</table></div>";
			GetId(Form_Import.Anchors.PreviewBox).innerHTML = out;
			if(o.NoHeaders) {out = ""}
			else {return this}
		}
		if(I && I.Last) {
			let selected = this.SelectedRows;
			out += "* Total available Rows: <b>" + this.TotalRows + "</b>; Columns: <b>" + this.TotalCols + "</b>"; //Reset previous content in out
			out += "<br>* Selected Rows: <b>" + selected + "</b>";
			if(o.NoHeaders == false) {out += " (including header row)"}
			out	+= "; Columns: <b>" + this.SelectedCols + "</b>";
			if(selected > this.Limit) {
				out += InputParser.highlight("<br>Now showing only " + this.Limit + " rows.");
			}
			GetId(Form_Import.Anchors.PreviewBox).children[0].innerHTML = out;
			return this;
		}
		if(I && I.Error) {
			out = "<p>" + InputParser.highlight("Parsing failed!") + "</p><p>Reason:<br>" + this.ErrorDetails + "</p><p>Try with a different parser or validate the input before trying again</p>";
			GetId(Form_Import.Anchors.PreviewBox).innerHTML = out;
			return this;
		}
		row.forEach(function(c, j) { //For each value
			out += "<td>"
			if(c == "") {out += InputParser.highlight("&Oslash;")}
			else {out += c}
			out += "</td>";
		});
		GetId(Form_Import.Anchors.PreviewBox).children[1].children[0].insertRow().insertAdjacentHTML("beforeend", out);
	}
}