//**************************************************************
// INPUTPARSER_PAPA - Object for parsing of data using papaParse
//**************************************************************
class InputParser_Papa extends InputParser {
	constructor(I) {
		super(I);
		this.Type = "Papa";
		this.Help = "Parsing of text or csv files, based on the PapaParse library";
		let target = Form_Import.Anchors.ParserOptions; //Target ID for the options
		Object.assign(this.Options, {
			delimiter: LinkCtrl.new("Text", {
				ID: target, Label: "Delimiter", Default: "", Preserve: true, /*NewLine: true,*/ Index: 5, Size: 5,
				Change: function() {this.parse()}.bind(this), Title: "Delimiter used for parsing columns. Leave empty for auto-detection",
			}),
//*****************************************************
//Not sure if it is useful because auto works just fine
//*****************************************************
			/*newline: LinkCtrl.new("Text", {
				ID: target, Label: "New line", Default: "", Preserve: true, NewLine: true, Index: 6, Size: 5,
				Change: function() {this.parse()}.bind(this), Title: "Character used as new line for parsing rows. Leave empty for auto-detection",
			}),*/
//*****************************************************
		});
	}
	//Methods
	init() { //Display controls for available options
		Object.values(this.Options).forEach(function(o) {o.init()});
		let tab = LinkCtrl.button({ID: "insert-Tab", Label: "TAB", Title: "Click to insert a Tabulation", Click: function() {this.Options.delimiter.setValue("\t").change()}.bind(this)});
		GetId(Form_Import.Anchors.ParserOptions).insertAdjacentElement("beforeend", tab);
		return this;
	}
	assignOptions(c) { //Assign the value of the options of the inputParser to the parsing config
		let entries = Object.entries(this.Options).map(function(array) {return [array[0], array[1].getValue()]}); //Convert the LinkCtrl into their values
		Object.assign(c, Object.fromEntries(entries)); //Append the key/value pairs to Papa config
		return c;
	}
	firstParse(I) { //Parse the entire file to get nb of rows and columns available
		this.TotalCols = 0; //Reset previous data
		this.TotalRows = 0;
		let PapaConfig = {
			worker: this.WebWorker, 
			header: false,
			step: function(R, parser) {
				parser.FirstParsed = false;
				let l = R.data.length;
				if(l > this.TotalCols) {this.TotalCols = l}
				this.TotalRows++;
				if(I && I.Step) {I.Step(R.data, this.TotalRows, parser)}
			}.bind(this),
			complete: function() { //After complete, parse again to get a preview
				this.FirstParsed = true;
				this.parse(I);
			}.bind(this),
			error: function(e) {
				this.Error = true;
				this.ErrorDetails = e;
				this.parse(I); //We call the parse again so that the error message and status are reflected in the preview box and the input table
				if(I && I.Error) {I.Error(e)}
			}.bind(this),
		}
		Papa.parse(this.RawData, this.assignOptions(PapaConfig));
	}
	stream(f, complete, I) { //Stream the input and send the row to the function provided as argument
		let o = this.parsingOptions();
		if(I && I.ApplyToHeader) {o.ApplyToHeader = true}
		let PapaConfig = {
			header: false,
			worker: this.WebWorker,
			step: function(R, parser) {
				parser.FirstParsed = this.FirstParsed;
				this.processRow(R.data, parser, f, o);
			}.bind(this),
			complete: function() {
				if(complete) {complete(o.Selected, o)}
			},
		}
		Papa.parse(this.RawData, this.assignOptions(PapaConfig));
	}
	/*
	chunk(f, I) { //Chunk a piece of the input and apply the provided function on each chunk
		let o = this.parsingOptions();
		if(I) {
			if(I.Start) {o.FirstRow += I.Start}
			let rows = (I.Rows || 1000);
		}
		let selected = -1; //Tracker for selected rows
		let chunk = [];
		let PapaConfig = {
			header: false,
			worker: this.WebWorker,
			step: function(R, parser) {
				let row = this.cleanRow(R.data, o);
				if(row) {
					if(selected >= rows) {parser.abort()}
					if(selected == -1) { //First selected row, exclude the header if present
						if(this.Options.NoHeaders.getValue()) {chunk.push(row); selected = 1}
						else {selected = 0}
					}
					else {chunk.push(row); selected++;}
				}
				o.Index++;
			}.bind(this),
			complete: function() {f(chunk)},
		}
		Papa.parse(this.RawData, this.assignOptions(PapaConfig));
	}
	*/
	/*
	chunk(f, complete, I) { //Chunk a piece of the input and apply the provided function on each chunk
		Papa.LocalChunkSize = 500000; //500 kB
		var r = this.Options.FirstRow.getValue() - 1; //Index of the first row
		var c = this.Options.FirstCol.getValue() - 1; //Index of the first col
		var i = 0; //Tracker for row index
		var selected = 0;
		var PapaConfig = {
			header: false,
			chunk: function(C, parser) {
				if(I && I.Pause) {parser.pause()} //Need pause/resume to ensure the function can run on each chunk one after the other
				var clean_chunk = [];
				C.data.forEach(function(R) {
					var row = this.cleanRow({Index: i, Data: R, FirstRow: r, FirstCol: c});
					i++;
					if(row) { //Exclude the header
						if(selected == 0) {selected++}
						else {clean_chunk.push(row)}
					}
				}, this);
				f(clean_chunk, parser);
			}.bind(this),
			complete: function() {
				if(complete) {complete()}
			},
		}
		if(I && I.Pause) {
			PapaConfig.worker = false; //Need this to access the pause/resume functions in the step
		}
		else {PapaConfig.worker = this.WebWorker}
		var entries = Object.entries(this.Options).map(function(array) {return [array[0], array[1].getValue()]}); //Convert the LinkCtrl into their values
		Object.assign(PapaConfig, Object.fromEntries(entries)); //Append the key/value pairs to Papa config
		Papa.parse(this.RawData, PapaConfig);
	}
	*/
}

