//************************************************************************
// INPUTPARSER_XLSX - A parser for xlsx files thatfully supports streaming
//************************************************************************
class InputParser_XLSX extends InputParser {
	constructor(I) {
		super(I);
		this.Type = "XLSX";
		this.Help = "Parsing of .xlsx Excel files with streaming capabilities";
		let target = Form_Import.Anchors.ParserOptions; //Target ID for the options
		this.Options = Object.assign(this.Options, { //These options require a new parsing to be performed
			Sheet: LinkCtrl.new("Select", {ID: target, Label: "Sheet", Default: 0, List: [], Preserve: true, NewLine: true, Index: 5, Change: function() {
				if(this.Worker) {this.Worker.terminate()}
				this.FirstParsed = false; //Need to reevaluate available rows/cols
				this.parse();
			}.bind(this), Title: "The sheet to import"}),
		});
		this.Worker = undefined; //WebWorker used to process the file
		this.ZIP = undefined;
		this.SharedStrings = undefined;
	}
	//Static methods
	static getSheetNames(zip, DOMParser) { //Parse the input to get the number of sheets and their names
		return new Promise(function(resolve, reject) {
			zip.file("xl/workbook.xml").async("string").then(function(str) {
				let xml = DOMParser.parseFromString(str, "application/xml").getElementsByTagName("sheet");
				let l = xml.length;
				let sheets = Array(l);
				for(let i=0; i<l; i++) {
					let index = Number(xml[i].attributes.sheetId.value) - 1;
					sheets[index] = xml[i].attributes.name.value;
				}
				resolve(sheets);
			}, function(e) {reject(e)});
		}.bind(this));
	}
	static getSharedStrings(zip, DOMParser) { //Parse the input to get the shared strings available for this file
		return new Promise(function(resolve, reject) {
			zip.file("xl/sharedStrings.xml").async("string").then(function(str) {
				let xml = DOMParser.parseFromString(str, "application/xml").getElementsByTagName("t");
				let l = xml.length;
				let shared = [];
				for(let i=0; i<l; i++) {
					shared.push(xml[i].innerHTML);
				}
				resolve(shared);
			}, function(e) {reject(e)});
		}.bind(this));
	}
	static getMeta(inputParser, zip) { //Recover meta data from the file and store them in the object property
		let parser = new DOMParser();
		return new Promise(function(resolve, reject) {
			let promises = [this.getSheetNames(zip, parser), this.getSharedStrings(zip, parser)];
			Promise.all(promises).then(function(out) {
				inputParser.Options.Sheet.updateList(out[0]);
				inputParser.SharedStrings = out[1];
				resolve();
			}, function(e) {reject(e)});
		}.bind(this));
	}
	static initWorker() {
		let f = function(e) { //What to do inside the worker when a message is received
			let buffer = e.data.Buffer; //Incoming arraybuffer containing the excel sheet
			let shared = e.data.SharedStrings;
			let alphabet = "*ABCDEFGHIJKLMNOPQRSTUVWXYZ"; //Add a first character to shift the index by 1, so that A=1, B=2, C=3...
			let chunkSize = self.MaxChunkSize; //The length of data to process
			let l = buffer.byteLength;
			while(self.Position < l) { //While the buffer has not been fully processed
				if((self.Position + self.MaxChunkSize) > l) {chunkSize = l - self.Position} //There are less elements to process than the max allowed
				let view = new Uint8Array(buffer, self.Position, chunkSize); //Get data from arraybuffer
				let data = new TextDecoder("utf-8").decode(view);
				if(self.LastRow) {data = self.LastRow + data} //Concate the remaining elements from previous chunk to get it full
				data.split('<row r="').forEach(function(str, i) { //Process all the individual row chunks
					let rowEnd = str.indexOf("</row>");
					if(rowEnd > -1) { //This means a complete row is present and can be parsed right away without worrying about missing items
						let rowIndex = str.substring(0, str.indexOf('"')); //Recover the row index, as a string!
						let row = [];
						let ColCount = 0; //How many columns are counted
						str.split('<c r="').forEach(function(cell, j) { //Further divide it into individual cells
							if(j > 0) { //The first piece is the row header, which is not useful here
								let colName = cell.substring(0, cell.indexOf('"') - rowIndex.length); //Recover the letters forming the cell name
								let colIndex = -1; //Start at -1 to retrieve a 0-based index
								colName.split("").forEach(function(c, k) {colIndex += alphabet.indexOf(c) * Math.pow(26, colName.length - k - 1)}); //Convert colName to colIndex
								while(ColCount < colIndex) {ColCount++; row.push("")} //Fill gaps with empty values
								let valStart = cell.indexOf("<v>");
								if(valStart > -1) { //This cell has a value
									let v = cell.substring(valStart + 3, cell.indexOf("</v>")); //The value
									let type = cell.substring(0, cell.indexOf('</c>')).match(/t="(.+?)"/); //Restrict the search to the current cell. Expecially useful for the last cell
									if(type !== null) {
										switch(type[1]) {
											case "b": //Boolean value
												if(v) {row.push("TRUE")}
												else {row.push("FALSE")}
												break;
											case "s": //Shared string
												row.push(shared[Number(v)]); //Convert the value using the shared dictionary and push it
												break;
											default: //This includes string and error values from formula
												row.push(v); //Push the value
												break;
										}
									}
									else {row.push(Number(v))} //Other cases should fall to the number type
								}
								else {row.push("")} //No value
								ColCount++;
							}
						});
						postMessage({Row: row});
						let remaining = str.substring(rowEnd + 6); //What remains after the rowEnd tag?
						if(remaining.length == 0) {self.LastRow = undefined} //There is nothing left after the closing row tag, lucky you!
						else {self.LastRow = remaining} //Pieces left should be added to the next chunk
					}
					else {self.LastRow = str} //This row is not complete so we need to wait for the next chunk
				});
				self.Position += self.MaxChunkSize; //Increment position to process the next chunk of data
			}
			postMessage({Done: true});
		}
		let blob = new Blob(["self.MaxChunkSize = 1024 * 1024; self.LastRow = undefined; self.Position = 0; onmessage = " + f.toString()], {type: "application/javascript"});
		return new Worker(URL.createObjectURL(blob));
	}
	//Methods
	firstParse(I) { //Parse the entire file to get nb of rows and columns available
		this.TotalCols = 0; //Reset previous data
		this.TotalRows = 0;
		JSZip.loadAsync(this.RawData).then(function(zip) { //Read the archive to get the structure
			this.ZIP = zip;
			InputParser_XLSX.getMeta(this, zip).then(function() { //Get the metadata
				this.stream(function(row, selected, parser) { //Step function
					let l = row.length;
					if(l > this.TotalCols) {this.TotalCols = l}
					this.TotalRows++;
					if(I && I.Step) {I.Step(row, this.TotalRows, parser)}
				}.bind(this), function() { //Completion function
					this.FirstParsed = true;
					this.parse(I);
				}.bind(this), I);
			}.bind(this));
		}.bind(this), function(e) { //What to do on failure of archive reading
			this.Error = true;
			this.ErrorDetails = e;
			this.parse(I); //We call the parse again so that the error message and status are reflected in the preview box and the input table
			if(I && I.Error) {I.Error(e)}
		}.bind(this));
	}
	stream(f, complete, I) { //Stream the input and send the row to the function provided as argument
		let w = InputParser_XLSX.initWorker(); //Initialize the webworker
		this.Worker = w; //Expose the worker so that the parsing can be killed following outside events
		let sheet = this.ZIP.file("xl/worksheets/sheet" + (this.Options.Sheet.getValue() + 1) + ".xml");
		let o = this.parsingOptions();
		let onError = function(e) { //Error loading the file
			this.Error = true;
			this.ErrorDetails = e;
			if(I && I.Error) {I.Error(e)}
			this.parseEnd(w, o, complete);
		}.bind(this);
		sheet.async("arraybuffer").then(function(ab) { //Get the sheet as an arraybuffer and transfer it to the worker
			if(I && I.ApplyToHeader) {o.ApplyToHeader = true}
			let parser = { //A parser object that is used to catch abort events by the user
				abort: function() {
					w.terminate(); //Kill the worker
					this.Worker = undefined;
					if(complete) {complete(o.Selected, o)} //Execute the complete function
				}.bind(this),
				FirstParsed: this.FirstParsed,
			};
			w.onmessage = function(e) { //What to do when the worker sends a row
				if(e.data.Done) { //Parsing is done
					/*if(complete) { //Execute the user function on complete
						complete(o.Selected, o);
						w.terminate(); //Close the worker on completion
						this.Worker = undefined; //Release the exposed worker
					}*/
					this.parseEnd(w, o, complete);
				}
				else { //Parsing is on-going
					this.processRow(e.data.Row, parser, f, o); //Process the row and run the function provided by the user, when needed
				}
			}.bind(this);
			w.onmessageerror = function(e) {onError(e.message)} //Catch errors thrown by the worker
			w.onerror = function(e) {onError(e.message)}
			w.postMessage({Buffer: ab, SharedStrings: this.SharedStrings}, [ab]); //Transfer the ownership of the arraybuffer to the worker
		}.bind(this));
	}
	parseEnd(w, o, complete) { //Completion of the streaming
		w.terminate(); //Kill the worker
		this.Worker = undefined;
		if(complete) {complete(o.Selected, o)} //Execute the complete function
	}
}