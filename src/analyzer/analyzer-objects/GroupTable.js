//*******************************************************************
// GROUPTABLE object - Class used for the building of 2D group tables
//*******************************************************************
class GroupTable {
	constructor() {return}
	//Static Methods
	static flattenSeries(a, array) { //Flatten the incoming area into a new object that will be pushed into the provided array. Returns the header information for this area, if any
		switch(a.Category) {
			case "Concentrations": //In this case, flatten the values
				a.Values.forEach(function(v) {
					array.push(Group.newTyped(v, "Conc", {SetNameAsValue: true})); //Keep the value field to calculate the log when needed
				});
				return {Type: "Conc", Name: a.Name, Span: a.Values.length, Unit: a.Unit} //Output the corresponding header
			case "Ranges":
				a.Values.forEach(function(v) {
					array.push(Group.newTyped(v, "Range", {OriginIndex: a.OriginIndex})); //Keep the Range metadata to access its definition
				});
				return {Type: "Range", Name: a.Name, Span: a.Values.length, OriginIndex: a.OriginIndex} //Output the corresponding header
			default:
				array.push(new Group(a)); //Push in the array
				return; //Returns nothing as there are no headers required
		}
	}
	static flattenLevel(level, array) { //Flatten an array containing areas to be flattened within the provided array, and return the corresponding header array
		let header = [];
		let HasHeader = false;
		level.forEach(function(l) { //Flatten each areas within the input array and collect the corresponding headers
			let h = this.flattenSeries(l, array); //Flatten it
			header.push(h); //Push the corresponding header
			if(h !== undefined) {HasHeader = true} //At least one element had a header
		}, this);
		if(HasHeader) {return header} //Only return a header if at least one element had a header
	}
	static intersect(a, b) { //Return the intersection of the 2 input tag arrays
//*****************************************************************************************************
//This method computes the intersection of 2 arrays in a manner that is consistent with the specific
//structure of the tag arrays: these arrays do not have redundant elements, are limited to <1536 elts
//and their elements are pure numerical values (indices). Do not use it as a general method to compute
//the intersection of any two arrays!
//Because we need to travel one of the two array in full all the time with the filter function, better
//use the smallest one for this task. The other array that is bigger will be reduce at every step and
//we do not need to travel it in full since the findIndex method will stop at the first occurence.
//So for performance optimization, it seems to be a good idea to check which array is smaller.
//*****************************************************************************************************
		let small = a;
		let big = b;
		if(a.length > b.length) {small = b; big = a} //Check and assign the small array to the filter procedure
		let safeCopy = big.slice(); //A shallow copy that we will manipulate during the procedure
		let inter = small.filter(function(e) { //Return a new array containing the elements that pass the test.
			let i = safeCopy.findIndex(function(c) {return c == e}); //This loop will stop at the first occurence
			if(i > -1) {
				safeCopy.splice(i, 1); //Remove this element to accelerate next search
				return true; //This element should be kept as it intersects both arrays
			}
			return false; //Not a duplicate: discard it
		});
		return inter;
	}
	static mergeTags(input, tags) { //Re-process the tags of level1 areas based on level2 tags provided
		let copy = [];
		input.forEach(function(a) { //Go through the level1 areas
			let n = new Group(a); //Copy all properties of a into a new object
			n.Tags = this.intersect(a.Tags, tags);; //Update the tags
			copy.push(n);
		}, this);
		return copy;
	}
	static prepareWrapping(rows, cols, Flat, o) { //Prepare the wrapping for the object o, based on lvl 2 data
		let RowGroupHeaders = undefined;
		let ColGroupHeaders = undefined;
		if(rows[1].length > 0) { //Re-process level1 tags according to level2 grouping
			RowGroupHeaders = this.flattenLevel(rows[1], Flat.Lvl2.Rows);
			Flat.Lvl2.Rows.forEach(function(wrap) { //Each level2 item play the role of a wrapper for all level 1
				let temp = this.mergeTags(Flat.Lvl1.Rows, wrap.Tags); //Re-process the tags and output the modified array
				o.Data.push({SubGroups: temp, Groups: []}); //Push as a new object
			}, this);
		}
		else { //There is no wrapping for the rows, so there will be only one object to build
			o.Data.push({SubGroups: Flat.Lvl1.Rows, Groups: []});
		}
		if(cols[1].length > 0) { //Re-process level1 tags according to level2 grouping
			ColGroupHeaders = this.flattenLevel(cols[1], Flat.Lvl2.Cols);
			let newData = [];
			Flat.Lvl2.Cols.forEach(function(wrap) { //Each level2 item play the role of a wrapper for all level 1
				let temp = this.mergeTags(Flat.Lvl1.Cols, wrap.Tags); //Re-process the tags and output the modified array
				o.Data.forEach(function(d) { //Apply the object as groups to all existing object with a subgroup
					let g = temp.map(function(t) {return new Group(t)}); //A copy of the object is needed
					newData.push({SubGroups: d.SubGroups, Groups: g}); //Push the updated copy
				});
			}, this);
			o.Data = newData; //Use the newly generated array. In this construction, objects are appended col-by-col
		}
		else { //There is no wrapping for the cols, so there will be only one object to propagate along the existing objects
			o.Data.forEach(function(d) { //Apply the object as groups to all existing object with a subgroup
				d.Groups = Flat.Lvl1.Cols.map(function(col) {
					return new Group(col);
				});
			});
		}
		if(rows[1].length > 0 || cols[1].length > 0) { //Build the wrapping object if necessary
			o.Wrapping = {Data: {SubGroups: Flat.Lvl2.Rows, Groups: Flat.Lvl2.Cols} }
			if(ColGroupHeaders !== undefined || RowGroupHeaders !== undefined) { //Complete with headers when needed
				o.Wrapping.Headers = {Rows: RowGroupHeaders, Cols: ColGroupHeaders}
			}
		}
	}
	static populateData(object, data) { //Populate data within the array of objects
		object.forEach(function(o) { //For each object
			o.Groups.forEach(function(g) { //For each column
				let t = g.Tags;
				if(o.SubGroups.length > 0) {
					o.SubGroups.forEach(function(s) { //For each row
						let inter = this.intersect(s.Tags, t); //Compute the intersection
						let values = inter.map(function(v) {return data[v]});//Tag arrays contains well indices that can be used to retrieve the values in the data array
						g.DataPoints.push(values); //Push the constructed data array
					}, this);
				}
				else { //Case of a table with only column representation
					g.DataPoints.push(t.map(function(v) {return data[v]})); //No intersection required, the tag indicates which values to aggregate
				}
			}, this);
		}, this);
	}
//*************************************************
//Methods for the export of the json to HTML OR TXT
//*************************************************
	static export(json, F, headers) { //Output the passed json as a html/txt string. Headers can optionally be switched off
		let out = "";
		let f = F.Format;
		let data = json.Data[0]; //Without wrapping, all data are contained in a single data array
		F.ColumnsLength = data.Groups.map(function(g) { //Compute the array that tells the max number of subcolumns for each columns
			return g.DataPoints.reduce(function(acc, val) {return Math.max(acc, val.length)}, 0);
		});
		out += Analyzer.tableStart(f);
		out += this.export_ColHeaders(data, F, headers); //Column headers
		let track = {Index: 0, HeaderIndex: 0}; //Keeps track of the header indices during the loop
		if(data.SubGroups.length > 0) {
			data.SubGroups.forEach(function(r, i) { //Loop the rows
				out += Analyzer.rowStart(f);
				out += this.export_RowHeader(r, i, track, F, headers) //Header for this row
				out += this.export_RowData(i, data, F, headers); //Formatted innerTable data for the row
				out += Analyzer.rowEnd(f);
			}, this);
		}
		else { //Case of a table with only column representation
			out += Analyzer.rowStart(f);
			out += Analyzer.blankCell(f); //Empty cells for the row headers that are absent
			out += this.export_RowData(0, data, F, headers); //Formatted innerTable data for the row
			out += Analyzer.rowEnd(f);
			if(json.StatRows) { //Last series of rows with statistics, when needed
				out += WrapTable.export_StatRows(json, F); //Important to use the full json here, as this method is generic
			}
		}
		out += Analyzer.tableEnd(f);
		return out;
	}
	static export_ColHeaders(o, F, headers, gaps) { //Prepare the output for the column headers of the GrouTable passed as an object
		let out = "";
		let gap = "";
		let f = F.Format;
		if(gaps) {gap = Analyzer.blankCell(f).repeat(gaps)} //Additional gaps to be added when needed. Cases undefined and 0 are both excluded
		if(headers !== undefined) { //Create the headers
			if(headers.Rows !== undefined) {gap += Analyzer.blankCell(f)} //A blank will be needed to accomodate the row headers
			if(headers.Cols !== undefined) {
				out += Analyzer.rowStart(f);
				out += gap + Analyzer.blankCell(f); //Leave another blank for the row header
				out += Group.colHeaders(headers.Cols, F);
				out += Analyzer.rowEnd(f);
			}
		}
		out += Analyzer.rowStart(f);
		out += gap + Analyzer.blankCell(f); //Blank(s) to accomodate row headers
		out += Group.colValueHeaders(o, F);
		out += Analyzer.rowEnd(f);
		return out;
	}
	static export_RowHeader(row, i, T, F, headers) { //Prepare the html header of row, index i
		let out = "";
		if(headers !== undefined && headers.Rows !== undefined) { //If headers are present, check when if it is the right index to append it
			if(i == T.Index) { //This is the right position
				let h = headers.Rows[T.HeaderIndex];
				if(h !== undefined && h !== null) { //JSON parsing yields empty array elements as null
					switch(F.Format) {
						case "html": out += "<th rowspan=\"" + h.Span + "\">" + Analyzer.header(h, F) + "</th>"; break;
						case "txt": out += Analyzer.header(h, F) + "\t"; break;
					}
					T.Index += h.Span;
				}
				else { //An empty slot is required to keep the alignment
					out += Analyzer.blankHeader(F.Format);
					T.Index += 1;
				}
				T.HeaderIndex++;
			}
			else { //For txt, need to add a blank for alignement because there is no rowspan as in html
				if(F.Format == "txt") {out += Analyzer.blankCell("txt")}
			}
		}
		out += Analyzer.valueHeader(row, F); //Values of this Header for the row
		return out;
	}
	static export_RowData(i, json, F, headers) { //Prepare the data table for the row index i of the json object
		let out = "";
		if(F.Aggregation == "Column") { //The Col aggregation is more complex and needs to be treated row-per-row
			return Analyzer.arrayToColumn(i, json, F, headers);
		}
		json.Groups.forEach(function(c, j) { //For all other cases, proceed normally by looping the cols
			if(j > 0 && F.Format == "txt") {out += "\t"}
			let S = Coordinate.statValue(c.DataPoints[i]); //Get the stats for this array
			switch(F.Aggregation) {
				case "Row": //Display values as a horizontal table
					out += Analyzer.arrayToRow(c.DataPoints[i], F, {Types: Array(c.DataPoints[i].length).fill("#"), ColumnLength: F.ColumnsLength[j]});
					break;
				case "Average": //Only the average is shown
					out += Analyzer.cellForValue(S.Average, F, {Class: "BorderSpaced", Type: "#"});
					break;
				case "Avg, SD, N": //Avg, SD, N; Similar to row but with fixed column lengths of 3
					out += Analyzer.arrayToRow([S.Average, S.SD, S.N], F, Coordinate.headerObject("Row"));
					break;
			}
		});
		return out;
	}
}