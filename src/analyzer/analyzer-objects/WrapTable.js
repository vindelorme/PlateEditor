//***************************************************************************************
// WRAPTABLE object - Class used for the building of a wrapping table for 2D group tables
//***************************************************************************************
class WrapTable {
	constructor(w) {
		this.Headers = w.Headers; //Wrapping headers
		this.Data = w.Data; //Wrapping data
		return this;
	}
	//Static Methods
	
	//Methods
	export(json, F) { //Output the html for the table
		let out = Analyzer.tableStart(F.Format);
		out += this.colHeaders(json, F); //Prepare the column headers
		let constant = {
			RowCycle: (this.Data.SubGroups.length || 1), //How many times the level 1 values should be repeated (in rows)
			RowValues: json.Data[0].SubGroups.length, //Number of level 1 values
			HeadTrack: {Index: 0, HeaderIndex: 0}, //Keeps track of the header indices during the loop
			WrapTrack: {Index: 0, HeaderIndex: 0},
		}
		let totalRow = constant.RowCycle * constant.RowValues;
		F.Gap = this.rowTxtGaps(json); //Number of gaps needed to accomodate the data, for column + txt export
		for(let i=0; i<totalRow; i++) { //Go through all the rows
			out += Analyzer.rowStart(F.Format);
			out += this.rowHeaders(json, i, constant, F); //Append the headers for this row
			out += this.rowData(json, i, constant, F); //Loop the cols to add the cell values
			out += Analyzer.rowEnd(F.Format);
		}
		out += Analyzer.tableEnd(F.Format);
		return out;
	}
	colHeaders(json, F) { //Prepare the headers for the columns of this table
		let out = "";
		let f = F.Format;
		let gap = 0; //This gap represents the number of columns that need to stay blank to accomodate the row headers
		if(this.Data.SubGroups.length > 0) { //There is some level 2 items
			if(this.Headers !== undefined && this.Headers.Rows !== undefined) {gap += 2} //If the wrapping has headers, add 2
			else {gap++} //Otherwise only one gap is needed
		}
		if(this.Data.Groups.length == 0) { //Case where there are no level 2 wrapping for the columns
			let j = json.Data[0];
			F.ColumnsLength = j.Groups.map(function(g) { //Compute the array that tells the max number of subcolumns for each columns
				return g.DataPoints.reduce(function(acc, val) {return Math.max(acc, val.length)}, 0);
			});
			return GroupTable.export_ColHeaders(j, F, json.Headers, gap);
		}
		if(json.Headers !== undefined && json.Headers.Rows !== undefined) {gap += 2} //If the level 1 also has headers, add one more gap
		else {gap++}
		let blank = Analyzer.blankCell(f).repeat(gap); //The blank columns to be added in front of the column headers
		let head = Array(4).fill(""); //Initialize empty array for the headers
		let colLengths = []; //Array to log the lengths of each level 2 column, to build the level 2 headers
		this.Data.Groups.forEach(function(g, i) { //For each level 2 value, append the corresponding level 1 headers
			F.ColumnsLength = json.Data[i].Groups.map(function(g) { //Compute the array that tells the max number of subcolumns for each columns
				return g.DataPoints.reduce(function(acc, val) {return Math.max(acc, val.length)}, 1);
				//Using a starting value of 1 here ensures that at least one blank will be counted, even for a single, empty column
			});
			head[3] += Group.colValueHeaders(json.Data[i], F); //******************* LEVEL 1 VALUES **************
			if(json.Headers !== undefined && json.Headers.Cols !== undefined) { 
				head[2] += Group.colHeaders(json.Headers.Cols, F); //******************* LEVEL 1 HEADERS **************
			}
			let n = json.Data[i].Groups.length;
			let columnSize = n;
			if(f == "txt") {
				switch(F.Aggregation) { //Two cases requires addition of additional spans
					case "Row": //Add as many gap as the max number of elements in the dataPoints arrays
						columnSize = F.ColumnsLength.reduce(function(acc, val) {return acc + val}, 0); //Sum of all column lengths
						break;						
					case "Avg, SD, N": columnSize = n * 3; break; //Each column has a length of 3
				}
			}
			colLengths.push(columnSize); //Log the size of this column
			head[1] += Analyzer.valueHeader(g, F, columnSize); //******************* LEVEL 2 VALUE **************
		});
		if(this.Headers !== undefined && this.Headers.Cols !== undefined) { //level 2 header, the final line, when needed
			F.ColumnsLength = []; //Reset this array to repurpose it for level 2 headers
			let track = 0; //Tracker for the colLengths array
			this.Headers.Cols.forEach(function(h) { //For each header
				let sum = 0;
				let s = 1; //Span of this header, represent the number of groups it is composed of
				if(h !== null && h !== undefined) {s = h.Span}
				for(let i=0; i<s; i++) {sum += colLengths[i + track]} //Sum the data
				if(h !== null && h !== undefined) {
					switch(f) {
						case "html": head[0] += "<th colspan=\"" + sum + "\">" + Analyzer.header(h, F) + "</th>"; break;
						case "txt": head[0] += Analyzer.header(h, F) + Analyzer.blankCell("txt").repeat(sum); break;
					}
				}
				else {
					switch(f) {
						case "html": head[0] += Analyzer.blankHeader("html", {Dir: "Col", Span: sum}); break;
						case "txt": head[0] += Analyzer.blankCell("txt").repeat(sum); break;
					}
				}
				track += s;
			});
		}
		head.forEach(function(h) {
			if(h.length > 0) {out += Analyzer.rowStart(f) + blank + h + Analyzer.rowEnd(f)}
		});
		return out;
	}
	rowHeaders(json, i, constant, F) {
		let out = "";
		let n = constant.RowValues;
		let cycle = constant.RowCycle;
		let lvl2Index = Math.floor(i / n);
		let lvl1Index = i % n;
		if(this.Headers !== undefined && this.Headers.Rows !== undefined) { //LEVEL 2 HEADER
			if(lvl2Index == constant.WrapTrack.Index) { //This is the right position
				let h = this.Headers.Rows[constant.WrapTrack.HeaderIndex];
				if(h !== undefined && h !== null) { //JSON parsing yields empty array elements as null
					switch(F.Format) {
						case "html": out += "<th rowspan=\"" + (h.Span * n) + "\">" + Analyzer.header(h, F) + "</th>"; break;
						case "txt": out += Analyzer.header(h, F) + "\t"; break;
					}
					constant.WrapTrack.Index += h.Span;
				}
				else { //An empty slot is required to keep the alignment
					out += Analyzer.blankHeader(F.Format, {Span: n, Dir: "Row"});
					constant.WrapTrack.Index += 1;
				}
				constant.WrapTrack.HeaderIndex++;
			}
			else { //For txt, need to add a blank for alignement because there is no rowspan as in html
				if(F.Format == "txt") {out += Analyzer.blankCell("txt")}
			}
		}
		if(i % n == 0) { //This marks the start of a new level 1 cycle and the next level 2 value
			if(this.Data.SubGroups.length > 0) {out += Analyzer.valueHeader(this.Data.SubGroups[lvl2Index], F, n, "Row")} //LEVEL 2 VALUE
			if(i > 0) {constant.HeadTrack = {Index: 0, HeaderIndex: 0}} //Reset the level 1 tracker for a new cycle
		}
		else { //For txt, need to add a blank for alignement because there is no rowspan as in html
			if(F.Format == "txt") {out += Analyzer.blankCell("txt")}
		}
		let row = json.Data[lvl2Index].SubGroups[lvl1Index]; //Current lvl 1 value
		out += GroupTable.export_RowHeader(row, lvl1Index, constant.HeadTrack, F, json.Headers); //LEVEL 1 HEADER / VALUE
		return out;
	}
	rowTxtGaps(json) { //Compute the number of gaps (Tabs) to add in front of this row, for txt export
		let gap = 1;
		if(json.Headers !== undefined && json.Headers !== null) {
			if(json.Headers.Rows !== undefined) {gap++}
		}
		if(this.Headers !== undefined && this.Headers.Rows !== undefined) {gap++}
		if(this.Data.SubGroups.length > 0) {gap++}
		return gap;
	}
	rowData(json, i, constant, F) { //Append the row of data at line i
		let out = "";
		let n = constant.RowValues;
		let cycle = constant.RowCycle;
		let lvl1Index = i % n; //Index of the data in the DataPoints array for this row
		let lvl2Index = Math.floor(i / n); //Index of the first object carrying the data for this row
		if(this.Data.Groups.length > 0) { //Objects are sorted column-by-column, so need to find the right objects for this row
			let m = this.Data.Groups.length * cycle; //Total number of objects available
			let collected = []; //Array of Data objects index to be collected and appended for this row
			while(lvl2Index < m) { //Process until the end of the col level2 values
				collected.push(lvl2Index);
				lvl2Index += cycle; //Increment by the level2 row value number at each loop
			}
			if(F.Format == "txt" && F.Aggregation == "Column") { //Special case that need to be treated differently
				out += this.export_RowData(json, collected, lvl1Index, F); //No need to supply headers
			}
			else { //All other cases
				collected.forEach(function(v, k) { //Append the elements one after the other
					if(k > 0 && F.Format == "txt") {out += Analyzer.blankCell("txt")}
					let o = json.Data[v];
					F.ColumnsLength = o.Groups.map(function(g) { //Compute the array that tells the max number of subcolumns for each columns
						return g.DataPoints.reduce(function(acc, val) {return Math.max(acc, val.length)}, 0);
					});
					out += GroupTable.export_RowData(lvl1Index, o, F); //No need to supply headers
				});
			}
			return out;
		}
		else { //Objects are in order
			let j = json.Data[lvl2Index];
			F.ColumnsLength = j.Groups.map(function(g) { //Compute the array that tells the max number of subcolumns for each columns
				return g.DataPoints.reduce(function(acc, val) {return Math.max(acc, val.length)}, 0);
			});
			return GroupTable.export_RowData(lvl1Index, j, F); //No need to supply headers
		}
	}
	export_RowData(json, collected, lvl1Index, F) { //Export data for this row in columns, by constructing the column arrays row-by-row
		let out = "";
		let MaxRow = 0;
		/*let gap = 1;
		if(json.Headers !== undefined && json.Headers !== null) {
			if(json.Headers.Rows !== undefined) {gap++}
		}
		if(this.Headers !== undefined && this.Headers.Rows !== undefined) {gap++}
		if(this.Data.SubGroups.length > 0) {gap++}
		gap = Analyzer.blankCell("txt").repeat(gap); //Gaps to leave at each row start
		*/
		let gap = Analyzer.blankCell("txt").repeat(F.Gap);
		collected.forEach(function(v) { //Loop the columns to find the max nb of rows
			let max = json.Data[v].Groups.reduce(function(acc, val) {return Math.max(acc, val.DataPoints[lvl1Index].length)}, 0);
			MaxRow = Math.max(MaxRow, max); //Update MaxRow so that it really ends up as the biggest for all collected Groups
		});
		if(MaxRow == 0) {return Analyzer.noData("txt")} //Nothing to do anymore
		for(let j=0; j<MaxRow; j++) { //Produce the row-per-row output
			if(j > 0) {out += "\n" + gap} //Start of a new line
			collected.forEach(function(v, k) { //Go through the Column Groups
				let o = json.Data[v];
				o.Groups.forEach(function(g) { //Loop the columns in this group
					let val = g.DataPoints[lvl1Index][j]; //Value at this location
					if(val !== undefined) {out += Analyzer.cellForValue(val, F)} //Add it if defined
					else { //No value defined here
						if(j == 0) {out += Analyzer.noData("txt")} //If this was the first row, it means this column is empty
					}
					out += "\t"; //In all cases, insert a gap to keep the alignment
				});
			});
		}
		return out;
	}
}