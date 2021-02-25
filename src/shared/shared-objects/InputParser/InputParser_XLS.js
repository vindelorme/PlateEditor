//***********************************************************************
// INPUTPARSER_XLS - A parser for xls files that fully supports streaming
//***********************************************************************
class InputParser_XLS extends InputParser {
	constructor(I) {
		super(I);
		this.Type = "XLS";
		this.Help = "Parsing of .xls Excel files with streaming capabilities";
		let target = Form_Import.Anchors.ParserOptions; //Target ID for the options
		this.Options = Object.assign(this.Options, { //These options require a new parsing to be performed
			Sheet: LinkCtrl.new("Select", {ID: target, Label: "Sheet", Default: 0, List: [], Preserve: true, NewLine: true, Index: 5, Change: function() {
				if(this.Worker) {this.Worker.terminate()}
				this.FirstParsed = false; //Need to reevaluate available rows/cols
				this.parse();
			}.bind(this), Title: "The sheet to import"}),
		});
		this.Worker = undefined; //WebWorker used to process the file
		this.SharedStrings = undefined;
	}
	//Static methods
	static getMeta(parser) { //A promise that fulfills after metaData are collected, or reject with the error
		return new Promise(function(resolve, reject) {
			let reader = new FileReader();
			reader.onerror = function(e) { //Handle reading errors
				reject(reader.error); //The function receives an event as argument but the error description is in the reader property
			}
			reader.onload = function(e) { //After opening the file, process it
				let ab = e.target.result; //ArrayBuffer
				let dv = new DataView(e.target.result);
				InputParser_XLS.getOffsets(parser, dv); //Metadata
				let cursor = InputParser_XLS.getSheets(parser, ab, dv); //Sheets informations
				if(parser.BIFFversion == 6) {InputParser_XLS.getSharedStrings(parser, ab, dv, cursor)} //Sharedstring are only present for BIFF8
				resolve();
			}
			reader.readAsArrayBuffer(parser.RawData); //Start the file reading process
		});
	}
	static getOffsets(parser, dv) { //Recover meta data from the file and store them in the object property
		let version = dv.getUint16(26, true); //Read the coumpound file version to know the sector size
		switch(version) {
			case 3: parser.SectorSize = 512; break;
			case 4: parser.SectorSize = 4096; break;
			default: throw(new Error("Unknown CPF version"));
		}
		let dir = (dv.getUint32(48, true) + 1) * parser.SectorSize; //Calculate offset based on sector#, this points to the directory stream
		parser.DirStreamOffset = dir;
		parser.StreamSize = (dv.getUint32(dir + 128 + 124, true) << 32) + dv.getUint32(dir + 128 + 120, true); //Workbook stream size, read as a Uint64
	}
	static getSheets(parser, ab, dv) { //Collect the sheet informations
		let WorkbookSector = dv.getUint32(parser.DirStreamOffset + 128 + 116, true);
		let WorkbookOffset = (WorkbookSector + 1 ) * parser.SectorSize;
		parser.WorkbookSector = WorkbookSector;
		parser.WorkbookOffset = WorkbookOffset;
		let cursor = WorkbookOffset + 4;
		parser.BIFFversion = dv.getUint16(cursor, false); //Biff version, can be read as big endian. It should be 6 for BIFF8, but can be lower for older versions
		cursor += 4; //The BOF is 16 bytes long for BIFF8 but only 8 for earlier versions, so we try not to go to far to be sure not to miss the BoundSheet stream
		let read = dv.getUint16(cursor, true); //Initial value
		let end = dv.byteLength; //Safety against infinite while loop...
		while(read != 133 && cursor < end) { //Loop until the BoundSheet code (85 00) is found
			cursor += 1;
			read = dv.getUint16(cursor, true);
		}
		if(read != 133) {throw(new Error("Could not find BoundSheet stream..."))}
		cursor += 2; //Skip the 2 bytes corresponding to the BoundSheet code
		parser.Sheets = []; //Prepare an array for the sheets
		let list = []; //Array of sheet name that is used to populate the select control
		let newSheet = true;
		while(newSheet && cursor < end) { //Collect all the sheet information
			let sheetOffset = dv.getUint32(cursor + 2, true) + WorkbookOffset; //Sheet offset is from the start of the workbook offset
			let sheetType = dv.getUint8(cursor + 6, true); //SheetType, must be 0 for a worksheet
			cursor += 8; //Name length read at offset 8 from BoundSheet code
			let l = dv.getUint16(cursor, true); //Name length
			if(parser.BIFFversion < 6) { //In older version of BIFF, the length is coded with only one byte, not 2...
				l = dv.getUint8(cursor, true);
				cursor += 1;
			}
			else {cursor += 2} //Position the cursor just after the name length, at the start of the string
			if(sheetType == 0) { //Sheets other than worksheets are ignored
				let td = new TextDecoder("windows-1252"); //Let's hope text encoding is same for everyone since it is 1 byte per character...
				let view = new Uint8Array(ab, cursor, l);
				let name = td.decode(view);
				parser.Sheets.push({Name: name, Offset: sheetOffset});
				list.push(name);
			}
			cursor += l; //Position the cursor just after the sheet name
			if(dv.getUint16(cursor, true) != 133) {newSheet = false} //Last sheet has been read
			else {cursor += 2} //Position the cursor just after the boundsheet code to prepare for reading the next sheet
		}
		if(cursor > end) {throw(new Error("EOF reached after sheets metadata"))}
		let l = parser.Sheets.length - 1;
		for(let i=0; i<l; i++) { //Define the length of each sheet based on the offset of the sheet above
			let s = parser.Sheets[i];
			s.Length = parser.Sheets[i+1].Offset - s.Offset;
		}
		let lastSheet = parser.Sheets[l];
		lastSheet.Length = parser.StreamSize; //For the last sheet, use the WB stream size as limit
		parser.Options.Sheet.updateList(list);
		return cursor;
	}
	static getSharedStrings(parser, ab, dv, cursor) { //Gather the shared strings. This only applies for BIFF8 (version 6)
		parser.SharedStrings = []; //Reset previous values
		let read = dv.getUint16(cursor, true); //Initial value
		let end = dv.byteLength; //Safety against infinite while loop...
		while(read != 252 && cursor < end) { //Loop until the SharedString code (FC 00) is found
			cursor += 1;
			read = dv.getUint16(cursor, true);
		}
		if(read != 252) {throw(new Error("Could not find SharedString stream..."))}
		let n = dv.getUint16(cursor + 2, true); //The size of the record, in bytes
		let offset = 12; //Position the cursor at the beginning of the first string
		while(offset < n) { //Get all the shared strings
			let o = this.parseString(ab, dv, cursor + offset);
			parser.SharedStrings.push(o.Str);
			offset += o.Offset;
		}
	}
	static buildSheetAB(ab, sheet, SectorSize, wbOffset, wbSector, BIFFversion) { //For older versions of BIFF, there seems to be cases where the FAT are not in a direct sequence and the arraybuffer needs reshuffling
		if(BIFFversion == 6) {return ab.slice(sheet.Offset, sheet.Offset + sheet.Length)} //Only BIFF for which there is no INDEX / DBCELL needs reshuffling
		let dv = new DataView(ab);
		let FAT = (dv.getUint32(76, true) + 1) * SectorSize; //Offset location of the first compound File FAT array
		let ordered = new Uint8Array(ab.byteLength); //A typed array containing the arraybuffer data in the right order
		let i = 0;
		let next = dv.getInt32(FAT + wbSector * 4, true); //Index of the next sector in chain after the wbSector. Signed int is used to quickly recognize Free Sector (FFFF FFFF; -1) that mark the end of the track
		let start = wbOffset; //Offset for the start of the workbook
		let temp = new Uint8Array(ab.slice(start, start + SectorSize)); //First piece of the buffer
		ordered.set(temp); //Set the first piece at the 0 position
		//console.log(FAT, next, start, temp);
		while(next != -1) { //Loop until the end of the FAT sectors
			//console.log(next, i);
			start = (next + 1) * SectorSize;
			temp = new Uint8Array(ab.slice(start, start + SectorSize)); //Next piece of the buffer
			ordered.set(temp, (i + 1) * SectorSize);
			next = dv.getInt32(FAT + next * 4, true);
			i++;
		}
		//console.log(ordered);
		start = sheet.Offset - wbOffset; //Since the buffer is reshuffled and starts directly with the workbook sector, the wbOffset should be removed from the sheet offset to get to the right position
		return ordered.buffer.slice(start, start + sheet.Length);
	}
	static parseString(ab, dv, cursor) { //Parse a string record starting at the cursor position given; also returns the offset needed to reach the next record
		let td = new TextDecoder("windows-1252"); //Sorry for other text encoding, it will be for future updates...
		let l = dv.getUint16(cursor, true); //Size of the string (characters)
		let flags = dv.getUint8(cursor + 2, true);
		let offset = 3; //Position the cursor after the meta
		let fHighByte = flags & 1; //0000 0001
		let fExtSt = flags & 4; //0000 0100
		let fRichSt = flags & 8; //0000 1000
		let ignored = 0; //Additional Bytes ignored because of weird format shit
		if(fExtSt) {ignored += dv.getUint32(cursor + offset, true); offset += 4}
		if(fRichSt) {ignored += dv.getUint16(cursor + offset, true) * 4; offset += 2} //cRun * 4 Bytes each
		let view = [];
		if(fHighByte) { //Each character is encoded over 2 bytes
			td = new TextDecoder("utf-8");
			l = 2 * l;
			view = new Uint16Array(ab, cursor + offset, l);
		}
		else {view = new Uint8Array(ab, cursor + offset, l)}
		return {Str: td.decode(view), Offset: offset + ignored + l}
	}
	static initWorker(parser) {
		let onMessage = function(e) { //What to do inside the worker when a message is received
			//console.log("Receiving data in worker", e.data);
			let buffer = e.data.Buffer; //Incoming arrayBuffer containing the excel sheet
			let l = buffer.byteLength;
			let sst = e.data.SharedStrings; //Shared strings for resolution of string
			let WBoffset = e.data.WBoffset;
			offset = e.data.SheetOffset; //Offset of the sheet from the beginning of the file
			let dv = new DataView(buffer);
			self.metaSheet(dv, WBoffset, l); //Init the parsing by checking sheet structural info and placing the cursor at the right location for cell reading
			//console.log("Meta done", self.Blocs, self.BIFF);
			self.parse(buffer, dv, offset, sst, l);
			//console.log("Worker Done");
			postMessage({Done: true}); //Process end
		}
		let metaSheet = function(dv, WBoffset, l) { //Init the parsing by checking sheet structural info and placing the cursor at the right location for cell reading
			if(dv.getUint16(0, true) != 2057) {throw(new Error("Sheet BOF location incorrect")); return} //Worksheet BOF code: 0908
			let cursor = dv.getUint16(2, true) + 4; //Position the cursor at the end of the BOF record
			let biff = dv.getUint16(4, false); //Should be 6 for BIFF5-8
			self.BIFF = biff; //Biff version for the sheet
			if(biff == 6) { //For these versions, we expect the Index to follow immediately the BOF
				if(dv.getUint16(cursor, true) != 523) {throw(new Error("No index available after BOF")); return} //Index code: 0B02
				let length = dv.getUint16(cursor + 2, true); //Length of the index record
				let firstRow = dv.getUint32(cursor + 8, true);
				let lastRow = dv.getUint32(cursor + 12, true);
				if(self.BIFFversion < 6) { //In lower versions, the first/last Rows are encoded over 2 bytes
					firstRow = dv.getUint16(cursor + 8, true);
					lastRow = dv.getUint16(cursor + 10, true);
					cursor += 16; //Position the cursor at the first Row bloc location
				}
				else {
					cursor += 20; //Position the cursor at the first Row bloc location
				}
				let n = Math.ceil((lastRow - firstRow) / 32); //Blocs of 32 Rows required to fit all the data
				let blocs = [];
				for(let i=0; i<n; i++) { //Store the offset for each DBCEll
					blocs.push(dv.getUint32(cursor + 4 * i, true) + WBoffset); //Offsets are encoded by 4 bytes and the workbook offset should be added
				}
				if(blocs.length == 0) {throw(new Error("Could not find any Row bloc offset")); return}
				self.Blocs = blocs;
			}
			else { //In older versions of excel, there is no Index, so need to go through all the Cell Table until the first CELL record is found
				let end = dv.byteLength; //Safety against infinite while loop...
				let read = dv.getUint16(cursor, true); //Initial value
				while(read != 520 && cursor < end) { //Loop until the ROW code (08 02) is found
					cursor += 1;
					read = dv.getUint16(cursor, true);
				}
				if(read != 520) {throw(new Error("Could not find Cell Table stream..."))}
				while(read == 520 && cursor < end) { //Now loop until the last ROW record
					cursor += 20; //All row record are 16 Bytes + 2 bytes code + 2 bytes length = 20 bytes total
					read = dv.getUint16(cursor, true);
				}
				if(cursor >= end) {throw(new Error("Could not find any Cell records..."))}
				self.FirstCellOffset = cursor; //Save the location of the first cell record
				//console.log(cursor);
			}
		}
		let parse = function(ab, dv, offset, sst, l) { //Parse the sheet data
			self.RowIndex = 0; //Starting row Index
			if(self.Blocs) { //The file has DBCell sectors and needs to be parsed bloc per bloc
				let n = self.Blocs.length; //Number of blocs
				self.Blocs.forEach(function(o, i) { //For each bloc
					let b = o - offset; //Offset stored in blocs are from the begining of the file, so need to remove the sheet offset from it
					let firstRowOffset = dv.getUint32(b + 4, true); //Offset of the first row from the start of the DBcell
					let firstCellOffset = (b - firstRowOffset) + 20 + dv.getUint16(b + 8, true); //Offset of the first cell of the first row, from the end of the first row record (whose length is 20 bytes)
					if(i == (n - 1)) {end = l} //For the last bloc, end is set as the end of the sheet
					else {end = this.Blocs[i + 1] - offset} //Otherwise, the start of the next dBCell is used as end point
					//console.log("Parsing bloc " + i, b, firstRowOffset, firstCellOffset, end);
					this.getRows(ab, dv, sst, firstCellOffset, end);
				}, self); //Self is used as the this context in the foreach loop
			}
			else { //In older versions, no dBCell...
				//console.log(dv.getUint16(self.FirstCellOffset, true));
				this.getRows(ab, dv, undefined, self.FirstCellOffset, ab.byteLength);
			}
		}
		let getRows = function(ab, dv, sst, start, end) { //Get the rows available from the start to end bytes of the buffer
			self.Cursor = start; //Position the cursor at the first cell location
			let row = [];
			let done = false;
			while(!done && self.Cursor < end) { //Parse all data until the buffer is exhausted
				let c = self.cell(ab, dv, sst);
				//console.log("Worker cell", c);
				done = c.Done;
				if(!done) { //A valid cell data is received
					let cellRow = c.Row;
					while(self.RowIndex < cellRow && self.RowIndex < 65536) { //Fill the gaps between rows if any. A second stop condition is added for security (65535 = max number of row possible for XLS files)
						//console.log("Worker posting", row, self.Cursor);
						postMessage({Row: row}); //Post the completed row and start a new one
						row = [];
						self.RowIndex++;
					}
					row[c.Col] = c.Value;
					if(c.More !== undefined) { //Case of multiple records
						c.More.forEach(function(v, i) {row[c.Col + i + 1] = v}); //Push all the cell values
					}
				}
				else { //All data collected, submit the completed row
					//console.log("Worker posting (done)", row, self.Cursor);
					postMessage({Row: row});
					self.RowIndex++;
				}
			}
		}
		let cell = function(ab, dv, sst) { //Process the cell at the current cursor location
			let cursor = self.Cursor;
			let dataType = dv.getUint16(cursor, true);
			let recLen = dv.getUint16(cursor + 2, true); //Size of the cell record in Bytes, excluding header code and size
			let parsed = { //Data for the parsed cells
				Row: dv.getUint16(cursor + 4, true),
				Col: dv.getUint16(cursor + 6, true),
				Value: undefined,
				Done: false,
			}
			switch(dataType) { //Cell value is evaluated depending on the record type
				case 253: //FD00 SharedString
					parsed.Value = sst[dv.getUint32(cursor + 10, true)]; break;
				case 515: //0302 Number, as a 64bit IEEE floating-point 
					parsed.Value = dv.getFloat64(cursor + 10, true); break;
				case 126: case 638: //7E00 RK or 7E02 RK
					parsed.Value = self.parseRK(cursor + 10, dv); break;
				case 189: //BD00 MulRK, multiple RK numbers to read
					parsed.Value = self.parseRK(cursor + 10, dv); //First value read as the others
					parsed.More = []; //Array to receive additional RK values
					let start = cursor + 16; //Position of the next RK record
					let stop = cursor + recLen + 2; //Cursor + 4 + recLen is the full size, but two last bytes are for the index of the last column
					while(start < stop) { //Accumulate the values until the chain is exhausted
						parsed.More.push(self.parseRK(start, dv));
						start += 6;
					}
					//console.log("MULRK", parsed, cursor, recLen, start, stop);
					break;
				case 215: //D700 DBCell, mark the end of the cell data for BIFF5-8 files
					parsed.Done = true; break;
				case   6: case 518: case 1030: //0600 Formula or 0602 Formula or 0604 Formula
					let bytes = [];
					for(let i=0; i<8; i++) {bytes.push(dv.getUint8(cursor + 10 + i, true))} //Collect bytes for the FormulaValue field
					if(bytes[6] == 255 && bytes[7] == 255) { //fExprO = 0xFFFF, boolean/error/blank/string can be stored
						switch(bytes[0]) {
							case 0: //A string is stored in this formula
								let o = self.parseString(ab, dv, cursor + recLen + 8); //A string record immediately follows the formula record. It starts with the string code (0702) and the record length (total 4 bytes), followed by a string structure
								parsed.Value = o.Str; //The parsed string
								self.Cursor += (o.Offset + 4); //Need to offset by the size of the string record to get to the next cell
								break; 
							case 1: //boolean value => Read bytes[2]
								if(bytes[2] == 0) {parsed.Value = "FALSE"}
								else {parsed.Value = "TRUE"}
								break; 
							case 2:  //Error value => Read bytes[2]
								switch(bytes[2]) {
									case 0: parsed.Value = "#NULL!"; break;
									case 7: parsed.Value = "#DIV/0!"; break;
									case 15: parsed.Value = "#VALUE!"; break;
									case 23: parsed.Value = "#REF!"; break;
									case 29: parsed.Value = "#NAME?"; break;
									case 36: parsed.Value = "#NUM!"; break;
									case 42: parsed.Value = "#N/A"; break;
								}
								break;
							default: break; //Includes case 3, Blank
						}
					}
					else {parsed.Value = dv.getFloat64(cursor + 10, true)} //Numerical value
					break;
				case 516: case 214: //0402 Label, D600 RString (for older versions without sst)
					let td = new TextDecoder("windows-1252"); //Sorry for other text encoding, it will be for future updates...
					let view = new Uint8Array(ab, cursor + 12, dv.getUint16(cursor + 10, true));
					parsed.Value = td.decode(view);
					break;
				case 513: break; //0102 Blank cell
				case 190: break; //BE00 MulBlank
				case 517: break; //0502 BoolErr
				//break;
				default: //Other values should mark the end of the cell table
					parsed.Done = true; break;
			}
			self.Cursor += (recLen + 4); //Move the cursor to the next cell
			return parsed;
		}
		let parseRK = function(cursor, dv) { //Parse and return the value for the RK number
			let temp = dv.getUint8(cursor, true);
			let fX100 = temp & 1; //Bitwise comparison with 1: 00000001, will return 1 if and only if the first bit is 1
			let fInt = temp & 2; //Bitwise comparison with 2: 00000010, will return 2 if and only if the second bit is 1
			let num = undefined;
			//console.log(temp, fX100, fInt);
			if(fInt == 2) {num = dv.getInt32(cursor, true) >> 2} //The stored number is a signed integer, it should be shifted 2 bits because of the metadata
			else { //30 most significant bits of a 64-bit binary floating point number, see iEEE754
				let bytes = [temp, dv.getUint8(cursor + 1, true), dv.getUint8(cursor + 2, true), dv.getUint8(cursor + 3, true)]; //4 bytes containing the data; first byte has only 6 bits of data
				let sign = 1 - (2 * (bytes[3] >> 7));
				let exponent = ((((bytes[3] << 1) & 0xff) << 3) | (bytes[2] >> 4)) - ((1 << 10) - 1); //0xff = 1111 1111
				let mantissa = ((bytes[2] & 0x0f) * Math.pow(2, 48)) + (bytes[1] * Math.pow(2, 40)) + ((bytes[0] & 0xfc) * Math.pow(2, 32)); //Other bytes are all null; 0x0f = 0000 1111;  0xfc = 1111 1100
				if (exponent == 1024) { //Particular cases
					if (mantissa != 0) {return NaN}
					else {return sign * Infinity}
				}
				if (exponent == -1023) {num = sign * mantissa * Math.pow(2, -1022 - 52)} // Denormalized
				else {num = sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent)}
			}
			if(fX100 == 1) {return num / 100}
			else {return num}
		}
		let code ="";
		code += "self.cell = " + cell.toString() + "; ";
		code += "self.parseRK = " + parseRK.toString() + "; ";
		code += "self.metaSheet = " + metaSheet.toString() + "; ";
		code += "self.parse = " + parse.toString() + "; ";
		code += "self.getRows = " + getRows.toString() + "; ";
		code += "self.parseString = " + this.parseString.toString().replace("parseString", "function") + "; ";
		code += "self.Cursor = 0; ";
		code += "self.BIFFversion = " + parser.BIFFversion + "; "; //BIFF Version for the file
		code += "onmessage = " + onMessage.toString() + ";";
		let blob = new Blob([code], {type: "application/javascript"});
		return new Worker(URL.createObjectURL(blob));
	}
	//Methods
	firstParse(I) { //Parse the entire file to get nb of rows and columns available
		this.TotalCols = 0; //Reset previous data
		this.TotalRows = 0;
		InputParser_XLS.getMeta(this).then(function() { //Get the metadata
			this.stream(function(row, selected, parser) { //Step function
				let l = row.length;
				if(l > this.TotalCols) {this.TotalCols = l}
				this.TotalRows++;
				if(I && I.Step) {I.Step(row, this.TotalRows, parser)}
			}.bind(this), function() { //Completion function
				this.FirstParsed = true;
				this.parse(I);
			}.bind(this), I); //Pass options to the stream to catch errors
		}.bind(this), function(error) { //What to do if the reading fail
			this.Error = true;
			this.ErrorDetails = error;
			if(I && I.Error) {I.Error(error)}
		});
	}
	stream(f, complete, I) { //Stream the input and send the row to the function provided as argument
		let w = InputParser_XLS.initWorker(this); //Initialize the webworker
		this.Worker = w; //Expose the worker so that the parsing can be killed following outside events
		let o = this.parsingOptions();
		if(I && I.ApplyToHeader) {o.ApplyToHeader = true}
		let reader = new FileReader();
		let onError = function(e) { //Error loading the file
			this.Error = true;
			this.ErrorDetails = e;
			if(I && I.Error) {I.Error(e)}
			this.parseEnd(w, o, complete);
		}.bind(this);
		reader.onerror = function(e) {onError(reader.error)} //Catch errors thrown by the FileReader
		reader.onload = function(e) { //After the file is loaded
			let ab = e.target.result; //the arraybuffer
			let sheet = this.Sheets[this.Options.Sheet.getValue()]; //Selected sheet object
			//let sheetAB = ab.slice(sheet.Offset, sheet.Offset + sheet.Length); //A slice of the arraybuffer that contains the sheet data
			let sheetAB = InputParser_XLS.buildSheetAB(ab, sheet, this.SectorSize, this.WorkbookOffset, this.WorkbookSector, this.BIFFversion); //A slice of the arraybuffer that contains the sheet data
			w.postMessage({Buffer: sheetAB, SharedStrings: this.SharedStrings, WBoffset: this.WorkbookOffset, SheetOffset: sheet.Offset}, [sheetAB]); //Transfer ownership of the arraybuffer to the worker and initiate the parsing
		}.bind(this);
		let parser = { //A parser object that is used to catch abort events by the user
			abort: function() {this.parseEnd(w, o, complete)}.bind(this),
			FirstParsed: this.FirstParsed,
		};
		w.onmessage = function(e) { //What to do when the worker sends a row
			//console.log("Data from worker", e.data);
			//
			//setTimeout(w.terminate(), 1000); //FOR TEST
			//
			
			if(e.data.Done) {this.parseEnd(w, o, complete)} //Parsing is done
			else { //Parsing is on-going
				this.processRow(e.data.Row, parser, f, o); //Process the row and run the function provided by the user, when needed
			}
			
		}.bind(this);
		w.onmessageerror = function(e) {onError(e.message)} //Catch errors thrown by the worker
		w.onerror = function(e) {onError(e.message)}
		reader.readAsArrayBuffer(this.RawData); //Start the file reading process
	}
	parseEnd(w, o, complete) { //Completion of the streaming
		w.terminate(); //Kill the worker
		this.Worker = undefined;
		if(complete) {complete(o.Selected, o)} //Execute the complete function
	}
	/*chunk(f, I) { //Chunk a piece of the input and apply the provided function on each chunk
	
	}
	bulk(f) { //Fully Parse the input, in a single block, and execute the function passed as argument after cleaning. Don't do this for big files, use stream() instead 
	
	}*/
	
	/*
	//LET'S SEE IF ALL THAT MESS IS USEFUL ONE DAY...
	this.FAT = Array(dv.getUint32(44, true)); //Array of FAT, will be used to store their sector#
	this.FAT = []; //Array of FAT, will be used to store their sector#
	this.MiniFAT = Array(dv.getUint32(64, true)); //Array of miniFAT, will be used to store their sector#
	this.DIFAT = dv.getUint32(72, true); //Number of DIFAT sectors
	if(this.MiniFAT.length > 0) {this.MiniFAT[0] = (dv.getUint32(60, true) + 1) * this.SectorSize} //Register 1st miniFAT location
	let i = 76; //From this location, gather the FAT sectors
	let sector = dv.getInt32(76, true); //We use the signed int to quickly recognize FS (FFFF FFFF; -1) value that mark the end of the track
	while(sector != -1 && i < 512) { //Gather the FAT sectors from the header
		this.FAT.push((sector + 1) * this.SectorSize);
		i += 4;
		sector = dv.getInt32(i, true); //Refresh the sector
	}
	if(this.DIFAT > 0) { //If additional DIFAT are required to locate all the FAT, traverse them the same way
		let max = dv.getUint32(44, true); //The max number of FAT that we expect
		let n = 109; //The number of FAT already counted from the header
		i = (dv.getUint32(68, true) + 1) * this.SectorSize; //1st DIFAT location, the others just follow
		sector = dv.getInt32(i, true); //Here again, we use the signed integer
		while(sector != -1 && n < max) { //Gather all the remaining FAT sectors
			this.FAT.push((sector + 1) * this.SectorSize);
			i += 4;
			n++;
			sector = dv.getInt32(i, true); //Here again, we use the signed integer
		}
	}
	let miniFatOffset = dv.getInt32(60, true); //We use the signed version to quickly recognize FEFF FFFF values (EOC)
	if(miniFatOffset < 0) {this.MiniFat = []} //No miniFat
	else {this.MiniFat = [dv.getUint32(60, true)]} //Get the offset for the first miniFat location
	*/
}