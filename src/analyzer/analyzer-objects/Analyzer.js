//**************************************************************************************************************
// ANALYZER object - Allow presentation of result and data analysis in a window separated from the Layout Editor
//**************************************************************************************************************
class Analyzer {
	constructor() {return this}
	//Static Methods
	static init(I) { //Read the method and prepare the report accordingly
		this.Report = Report.new(I).init();
		return this;
	}
	static roundNb(n) { //Round the number using decimal value recovered from the report control
		let d = this.Report.Options.Decimals.Selected;
		if(n.toFixed === undefined || d == "All") {return n} //Not a number or all decimals required
		return n.toFixed(d);
	}
	static logValue(v) { //Compute the log10 of the value v for the report passed
		let log = Math.log10(v.Value);
		if(this.Report.Options.Shift.getValue()) { //Shift to the higher unit
			return log + Unit.shiftForUnit(v.Unit);
		}
		return log;
	}
	static isNumeric(v) { //Returns a boolean to indicate if the value is text or number
		return Decimal.isNumeric(v);
	}
	static divHeight(n) { //Compute the height of the div required to display n rows
		return (1.65 * (n + 0.5)) + "em"; //Row height is ~1.65em (1.25em + 0.4 padding) per default, add half a row to let the user know something is below
	}
	static rowWidth(n, maxL) { //Compute the width of a row to accomodate n elements with their max length given
		let width = maxL * n * 0.9 * (1 - (0.2 * maxL/20)); //font-size is 0.9em; the last factor is to shorten longest numbers (up to 20%), because 1 digit is less than 0.9em in width
		width = Math.max(width, 2);
		return width + "em";
	}
	static noData(f) { //The string used to indicate this cell has no data
		switch(f) {
			case "txt": return "Ø";
			default: return "<span class=\"Warning\">&Oslash;</span>";
		}
	}
	static header(o, F) { //Return the header for the row/col object provided
		if(o.Unit) {
			let name = o.Name;
			if(F.Log) {name = this.headerConcLog(o.Unit, F.Format)}
			switch(F.Format) {
				case "html": return "<span class=\"Header_Conc\" name=\"" + o.Name + "\">" + name + "</span>";
				case "txt": return name;
			}
		}
		return o.Name;
	}
	static headerConcLog(name, f, shift) { //Wrap the name into a log10(...) text
		if(shift) {name = Unit.rootForUnit(name)}
		switch(f) {
			case "html": return "Log<sub>10</sub>(" + name + ")";
			case "txt": return "Log10(" + name + ")";
		}
	}
	static valueHeader(v, F, span, dir) { //Return the html header for the value object v
		let dirspan = "";
		if(span) { //Cases where span is undefined or zero are naturally excluded here
			switch(F.Format) {
				case "html": 
					if(dir == "Row") {dirspan = " rowspan=\"" + span + "\""}
					else {dirspan = " colspan=\"" + span + "\""}
					break;
				case "txt": 
					if(dir === undefined || dir == "Col") {dirspan = Analyzer.blankCell("txt").repeat(span - 1)} //No need to span for rows, done elsewhere
					break;
			}
		}
		if(v.Type == "Conc") { //Process concentration headers differently
			let log = this.logValue(v);
			let out = "";
			switch(F.Format) {
				case "html":
					if(F.Log) {out = this.roundNb(log)}
					else {out = this.roundNb(v.Value)}
					return "<th" + dirspan + " class=\"Value_PlaceHolder Header_Conc\" value=\"" + v.Value + "\" logvalue=\"" + log + "\" shift=\"" + Unit.shiftForUnit(v.Unit) + "\">" + out + "</th>";
				case "txt": //For text export, format also depends on the displayed option
					if(F.Log) {
						if(F.Displayed) {return this.roundNb(log) + dirspan + "\t"}
						else {return log + dirspan + "\t"}
					}
					else {
						if(F.Displayed) {return this.roundNb(v.Value) + dirspan + "\t"}
						else {return v.Value + dirspan + "\t"}
					}
			}
		}
		if(v.Type == "Range") { //For ranges, output the resolved name
			let resolved = this.Report.ResolvedNames[v.OriginIndex];
			if(resolved !== undefined) {
				let name = resolved[v.RangeIndex - 1];
				if(name !== undefined) {
					switch(F.Format) { //These cases are for regular headers (not concentrations)
						case "html": return "<th" + dirspan + " RootName=\"" + v.Name + "\">" + name + "</th>";
						case "txt": return name + dirspan + "\t";
					}
				}
			}
		}
		switch(F.Format) { //These cases are for regular headers (not concentrations)
			case "html": return "<th" + dirspan + ">" + v.Name + "</th>";
			case "txt": return v.Name + dirspan + "\t";
		}
	}
	static cellForValue(v, F, I) { //prepare a cell to hold a numeric or textual value
		if(F.Format == "txt") { //This case is pretty simple
			if(v === "" || v === undefined) {return this.noData("txt")} //Mind the type equality, because 0 == "" evaluates to true
			if(F.Displayed) {return this.roundNb(v)}
			else {return v}
		}
		let c = " class=\"";
		let inner = v;
		let value = "";
		let title = "";
		if(v === "" || v === undefined) {inner = this.noData(F.Format)} //Mind the type equality, because 0 == "" evaluates to true
		if(I) { //Look the options
			if(I.Class) {c += I.Class + " "}
			if(I.Border && I.Index > 0) {c += "BorderLeft "}
			if(I.Type == "#" && v !== "" && v !== undefined) { //Number should use the value placeHolder
				inner = this.roundNb(v);
				c += "Value_PlaceHolder";
				value = " value=\"" + v + "\"";
			}
			if(I.Title) {title = " title=\"" + I.Title + "\""}
			if(I.ReturnLength) {
				let html = "<td" + c + "\"" + value + title + ">" + inner + "</td>";
				if(v === "" || v === undefined) {return {HTML: html, Length: 2}}
				else {
					if(inner.length === undefined) { //In case the value is a number that we want to treat as text
						return {HTML: html, Length: inner.toString().length}
					}
					return {HTML: html, Length: inner.length}
				}
			}
		}
		return "<td" + c + "\"" + value + title + ">" + inner + "</td>";
	}
	static arrayToRow(array, F, I) { //Convert the array of values into an innerTable with a single row
		let out = "";
		let maxLength = 0;
		if(array.length == 0) {
			switch(F.Format) {
				case "txt": out += this.noData("txt"); break;
				case "html": out += "<td>" + this.noData() + "</td>"; break;
			}
		}
		if(F.Format == "txt") { //Case txt is simple
			array.forEach(function(e, i) {
				if(i > 0) {out += "\t"}
				out += this.cellForValue(e, F);
			}, this);
			if(I.ColumnLength !== undefined) { //A padding is needed to reach the max number of columns
				let n1 = I.ColumnLength - array.length;
				if(array.length == 0) {n1--} //Not sure why, but needed to work
				if(n1 > 0) {out += this.blankCell("txt").repeat(n1)}
			}
			return out;
		}
		else { //Following code is only for html
			array.forEach(function(e, i) {
				let o = {Border: true, Index: i, ReturnLength: true}
				if(I) {
					if(I.Types) {o.Type = I.Types[i]}
					if(I.Titles) {o.Title = I.Titles[i]}
				}
				let cell = this.cellForValue(e, F, o);
				out += cell.HTML;
				maxLength = Math.max(maxLength, cell.Length); //Log the max length of the string to display
			}, this);
			//
			//Sounded like a good idea to have same behavior as the txt file (aligned to the left)
			//But it will be more complicated than that when there are multiple data in the json.Data array
			//Must have a new strategy in place if this is really needed.
			//Somehow the centered appearance in html is probably just as good...
			//
			/*if(I.ColumnLength !== undefined) { //A padding is needed to reach the max number of columns
				let n2 = I.ColumnLength - array.length;
				if(array.length == 0) {n2--} //Not sure why, but needed to work
				if(n2 > 0) {out += this.blankCell("html").repeat(n2)}
			}*/
			return "<td class=\"Border\"><div class=\"InnerTable_Wrapper\"><table class=\"InnerTableRow\" style=\"min-width: " + this.rowWidth(array.length, maxLength) + "\"><tr>" + out + "</tr></table></div></td>";
		}
	}
	static arrayToColumn(i, json, F, headers) { //Produce a column output for the subgroup object i
		switch(F.Format) {
			case "txt": return this.arrayToColumn_Txt(i, json, F, headers);
			case "html": 
				let out = "";
				json.Groups.forEach(function(c) { //Loop the cols	
					out += this.arrayToColumn_HTML(c.DataPoints[i], F).HTML;
				}, this);
				return out;
		}
	}
	static arrayToColumn_Txt(i, json, F, headers) { //Produce a column output for the subgroup object i, in a txt format
		let out = "";
		let MaxRow = json.Groups.reduce(function(acc, val) {return Math.max(acc, val.DataPoints[i].length)}, 0); //Maximum number of row to expect
		let gap = this.blankCell("txt"); //Gap to append to each row to keep the alignment
		if(F.Gap !== undefined) {gap = this.blankCell("txt").repeat(F.Gap)} //Use the precalculated value if it exists
		else { //In case of headers, a second gap is needed
			if(headers !== undefined && headers !== null) {
				if(headers.Rows !== undefined) {gap += this.blankCell("txt")} 
			}
		}
		if(MaxRow == 0) {return this.noData("txt")}
		for(let j=0; j<MaxRow; j++) { //Produce the row-per-row output
			if(j > 0) {out += "\n" + gap}
			json.Groups.forEach(function(g) { //Loop the columns
				let val = g.DataPoints[i][j]; //Value at this location
				if(val !== undefined) {out += this.cellForValue(val, F)} //Add it if defined
				else { //No value defined here
					if(j == 0) {out += this.noData("txt")} //If this was the first row, it means the column is empty
				}
				out += "\t"; //In all cases, insert a gap to keep the alignment
			}, this);
		}
		return out;
	}
	static arrayToColumn_HTML(array, F, I) { //Convert the array provided into a single column html table
		let options = this.Report.Options;
		let style = "";
		if(options.Collapse.getValue()) {
			let row = options.Rows.getValue();
			style = " style=\"max-height: " + this.divHeight(row);
			if(array.length <= row) {style += "; overflow-y: unset\""}
			else {style += "; overflow-y: scroll\""}
		}
		//let html = "<td class=\"Border\"";
		let l = array.length;
		//if(l > 1) {html += " style=\"vertical-align: top\""} //Maybe better not to use it, to be consistent in formatting
		let html = "<td class=\"Border\" style=\"vertical-align: top\">";
		html += "<div class=\"InnerTable_Wrapper\"" + style;
		if(I && I.Sync) {html += " onmouseenter=\"Analyzer.scrollActive = " + I.ColumnIndex + "\" onscroll=\"Analyzer.syncScrolling()\""}
		html += "><table class=\"InnerTable\">";
		array.forEach(function(val, i) {
			let v = val;
			if(val.Value !== undefined) {v = val.Value}
			let type = "#";
			if(this.isNumeric(v) == false) {type = "Text"}
			html += "<tr>" + this.cellForValue(v, F, {Type: type, Class: val.Class}) + "</tr>"; 
		}, this);
		if(l == 0) {html += "<tr><td>" + this.noData() + "</td></tr>"} //The array was empty
		html += "</table></div></td>";
		let stats = Coordinate.statValue(array);
		return {HTML: html, Stats: stats}
	}
	/*static objectToTable(o, I) { //Return an html table representing the array of object passed. Each object should have a "Values" property, containing the array of values
		let html = "";
		html += "<table class=\"OuterTable\">";
		html += "<tr><td></td>"; //Table headers, leave an empty columns for the legend; use <td> so that it has no borders
		o.forEach(function(column) { //Append the headers
			if(column.Visible) {html += "<th>" + column.Label + "</th>"}
		}); 
		html += "</tr><tr><td></td>";
		let stats = [];
		o.forEach(function(column, c) { //Compute stats for all columns. Only visible columns will be displayed
			let output = this.arrayToColumn(column.Values, c, I);
			stats.push(output.Stats);
			if(column.Visible) {html += output.HTML}
		}, this);
		if(I && I.StatsOnly) {return {Stats: stats}} //The rest of the html is not processed if only the stats are needed
		html += "</tr><tfoot>";
		html += "<tr title=\"Mean of the numerical values for this column. Not available for text\"><td>Average</td>";
		o.forEach(function(column, c) {
			if(column.Visible) {html += Analyzer.cellForValue(stats[c].Avg, {Type: "#"})}
		});
		html += "</tr>";
		html += "<tr title=\"Standard deviation of the numerical values for this column. Available with 2 or more values\"><td>SD</td>";
		o.forEach(function(column, c) {
			if(column.Visible) {html += Analyzer.cellForValue(stats[c].SD, {Type: "#"})}
		});
		html += "</tr>";
		let display = "none";
		if(this.Report.Options.CV.getValue()) {display = "table-row"} //Show CV only if desired
		html += "<tr class=\"CV_Row\" style=\"display: " + display + "\" title=\"Coefficient of variation for the numerical values in this column. Available with 2 or more values\"><td>CV (%)</td>";
		o.forEach(function(column, c) {
			if(column.Visible) {html += Analyzer.cellForValue(stats[c].CV, {Type: "#"})}
		});
		html += "</tr>";
		html += "<tr title=\"Count of valid numerical values for this column. If textual, invalid or empty values are present, the total count of values is indicated in parenthesis\"><td>N</td>";
		o.forEach(function(column, c) {
			if(column.Visible) {html += "<td>" + stats[c].N + "</td>"} //There is no need to adjust decimals here as N is an integer
		});
		html += "</tr></tfoot>";
		html += "</table>";
		return {HTML: html, Stats: stats}
	}*/
	static syncScrolling() { //Sync column scrolling within a table
		let t = event.target;
		let tr = t.parentElement;
		let me = tr.cellIndex - 1;
		let i = this.scrollActive;
		if(i == me) { //This is the element triggering the scroll on the other divs
			this.Scroll = t.scrollTop; //Log its scroll value
			let htmlCollection = tr.parentElement.getElementsByClassName("InnerTable_Wrapper"); //This is NOT an array, so we have to use a for loop to traverse it
			let l = htmlCollection.length;
			for(let j=0; j<l; j++) { //For each synchronized div
				if(j != i) { //If you are not the one that triggered the scroll
					let div = htmlCollection[j];
					div.scrollTop = this.Scroll; //Update the scroll position. This will trigger the scroll event for this element, which will do nothing
				}
			}
		}
	}
	/*static groupedTable(header, rows, cols, values, aggregation) { //Build a 2d/grouped table using the rows/cols data and values provided. Rows/Cols are arrays (lvl1, lvl2) containing array of objects that include a Values property, in which the tags array hold the index where to find the values in the values array provided
		let html = "<table class=\"OuterTable\">" + header;
		let rowSpan = rows[1].reduce(function(acc, row) {acc += row.Values.length}, 0); //Get the total span needed for the level 2, if any
		rows[0].forEach(function(row, i) { //Travel the rows level 1
			let r = row.Values.length;
			if(r == 1) { //This group has only one value, it needs only one row
				html += "<tr><th>" + this.header(row) + "</th>" + this.valueHeader(row.Values[0]); //There is only one value
				html += this.groupedDataRow(row.Values[0], cols, values, aggregation);
				html += "</tr>";
			}
			else { //Several rows are needed
				html += "<tr><th rowspan=\"" + r + "\">" + this.header(row) + "</th>";
				row.Values.forEach(function(rowV, j) {
					if(j > 0) {html += "<tr>"}
					html += this.valueHeader(rowV);
					html += this.groupedDataRow(rowV, cols, values, aggregation);
					html += "</tr>";
				}, this);
			}
			html += "</tr>";
		}, this);
		html += "</table>";
		return {HTML: html}
	}
	static groupedDataRow(row, cols, values, aggregation) { //Prepare a row of data for the row object passed, by collecting and appending the values for all cols
		let html = "";
		let rowTag = row.Tags;
		cols.forEach(function(col) { //Travel the groups
			col.Values.forEach(function(v) { //Travel all the items
				let data = []; //The data to recover for this row/col coordinate
				v.Tags.forEach(function(t) {
					if(rowTag.includes(t)) {data.push(Number(values[t]))} //Insert data at indices of well shared by the row and the col
				});
				let out = this.arrayToColumn(data); //Compute the stats for the values and prepare the html for a vertical table
				let S = out.Stats;
				switch(aggregation) { //How to display multiple data will be different depending on aggregation
					case "Row": html += "<td class=\"Border\">" + this.arrayToRow(data, {Types: Array(data.length).fill("#")}) + "</td>"; break; //Display values as a horizontal table
					case "Average": html += this.cellForValue(S.Avg, {Class: "BorderSpaced", Type: "#"}); break;
					case "Avg, SD, N": html += "<td class=\"Border\">" + this.arrayToRow([S.Avg, S.SD, S.N], {Types: ["#", "#", "Text"], Titles: ["Average", "SD", "N"]}) + "</td>"; break;
					default: html += out.HTML; break;
				}
			}, this);
		}, this);
		return html;
	}
//Methods for the export of data tables to txt file
	static tableToString(table, I) { //Convert the DOM element table into a text string suitable for export as a tab-delimited file
		let txt = "";
		if(I && I.Title) {txt = I.Title + "\n"} //Add a title if needed
		let rows = table.rows;
		let r = rows.length;
		let start = 0; //Index of the row where to start the for loop
		if(I && I.TableType) {
			switch(I.TableType) {
				case "Inner": //In this case, the table has inner tables within its columns
					txt += this.rowToString(rows[0]) + "\n"; //Prepare the headers
					txt += this.innerRowToString(rows[1]) + "\n"; //The tricky part is to export correctly the inner tables
					start = 2; //The footer part is straightforward
				//FALL-THROUGH
				case "Simple": case "Mixed":
					for(let i=start; i<r; i++) { //Prepare the output
						if(rows[i].style.display != "none") { //Ignore hidden rows
							if(i > start) {txt += "\n"}
							txt += this.rowToString(rows[i]);
						}
					}
				break;
				case "Grouped":
					txt = "Aggregation method: " + this.Report.UI.DataView.Selected + "\n";
					txt += this.groupedTableToString(table);
				break;
			}
		}
		return txt;
	}
	static rowToString(row) { //Convert a DOM row element into a string. The row contains only text/numbers as inner content
		let out = "";
		let cells = row.cells;
		let c = cells.length;
		let format = (this.Report.Options.ExportFormat.getValue() == 1); //true means use the formatted data
		let log = undefined;
		if(this.Report.Options.LogScale !== undefined) {log = this.Report.Options.LogScale.getValue()}
		for(let j=0; j<c; j++) {
			if(j > 0) {out += "\t"}
			out += this.valueFromCell(cells[j], format, log);
		}
		return out;
	}
	static valueFromCell(cell, format, log) { //Extract the value for the DOM cell object provided, formatted as in the cell or the real file value based on the format boolean
		if(format) {return cell.innerText} //Easy
		if(cell.hasAttribute("logvalue") && log) {return cell.getAttribute("logvalue")}
		if(cell.hasAttribute("value")) {return cell.getAttribute("value")}
		return cell.innerText;
	}
	static innerRowToString(row, I) { //Convert a DOM row table containing an innerTable with values into a string
		let format = (this.Report.Options.ExportFormat.getValue() == 1); //true means use the formatted data
		let log = undefined;
		if(this.Report.Options.LogScale !== undefined) {log = this.Report.Options.LogScale.getValue()}
		let start = 1;
		if(I && I.Start) {start = I.Start}
		let inner = "";
		let index = 0;
		let dataFound = true;
		let l = row.cells.length;
		while(dataFound) { //As long as we can find data within the innerTables, create a new line with the data
			let temp = "\t";
			dataFound = false; //The loop should stop when no more data are found
			for(let n=start; n<l; n++) { //Travel all the columns to collect the data. Start at the specified column index
				let cell = row.cells[n].children[0].children[0].rows[index]; //The cell is wrapped in a table, within a div
				let content = "";
				if(cell) { //If this cell exist, get its content
					dataFound = true; 
					content = this.valueFromCell(cell.children[0], format, log);
				}
				if(n > start) {temp += "\t"} //In any case, add a tab to respect column ordering
				temp += content;
			}
			if(dataFound) { //We found something, collate it to the string to output
				if(index > 0) {
					inner += "\n";
					if(I && I.AfterLine !== undefined) {inner += I.AfterLine}
				}
				inner += temp;
			}
			index++; //Increment the index and continue until the data are exhausted
		}
		return inner;
	}
	static groupedTableToString(table) { //Convert a DOM grouped table into a string
		let format = (this.Report.Options.ExportFormat.getValue() == 1); //true means use the formatted data
		let log = undefined;
		if(this.Report.Options.LogScale !== undefined) {log = this.Report.Options.LogScale.getValue()}
		let txt = "";
		let rows = table.rows;
		let aggreg = this.Report.UI.DataView.Selected; //Data representation will depend on this factor
		let AllCols = this.groupedColCount(rows[0].cells); //The number of data columns to output
		let eltMax = this.groupedEltMaxPerCol(rows, AllCols);
		txt += this.groupedHeader(rows[0], rows[1], AllCols, eltMax, format, log); //Headers for the table
		let r = rows.length;
		for(let i=2; i<r; i++) { //Travel the rows, ignoring the headers, to build the output
			txt += "\n" + this.groupedHeaderRow(rows[i].cells[0], rows[i].cells[1], format, log);
			let n = rows[i].cells.length;
			let start = n - AllCols; //Rows for elements within a group have one column header only and should start with a different offset
			switch(aggreg) { //The aggregation method indicates what to expect for the inner Tables
				case "Column": txt += this.innerRowToString(rows[i], {Start: start, AfterLine: "\t"}); break; //The entire row is processed by this method. Important to add a tab after each line to keep correct column ordering
				case "Average": //In this mode, a simple cell hold the value
					for(let j=0; j<AllCols; j++) { //Travel the cols to build the output
						txt += "\t" + this.valueFromCell(rows[i].cells[start + j], format, log);
					}
				break;
				default: //Remaining cases, data are in line and a InnerTableRow hold the data
					for(let j=0; j<AllCols; j++) { //Travel the cols to build the output
						txt += this.rowTableToString(rows[i].cells[start + j].children[0].children[0], eltMax[j], format, log); //The child table is within a div
					}
				break;
			}
		}
		return txt;
	}
	static groupedColCount(cells) { //For a grouped table, calulate the number of columns by flattening the sub-groups
		let cols = 0; //The number of data columns to output
		let h = cells.length;
		for(let i=2; i<h; i++) { //Navigate the headers to define the number of cols
			let cell = cells[i];
			if(cell.hasAttribute("rowspan")) {cols++} //Individual cell that "count" only for 1
			else {cols += Number(cell.getAttribute("colspan"))} //Group: add the number of sub-groups
		}
		return cols;
	}
	static groupedEltMaxPerCol(rows, c) { //For a grouped table of c data column, capture the max number of elements per column, for each column
		let r = rows.length;
		let eltMax = []; //Results are stored in an array the size of the number of column
		let aggreg = this.Report.UI.DataView.Selected;
		switch(aggreg) { //The aggregation method indicates what to expect for the inner Tables
			case "Row": //Rows of n values. In this case, need to count the max number of values per row, for each column
				eltMax = Array(c).fill(0);
				for(let i=2; i<r; i++) { //Look all rows, ignoring the headers
					let inner = rows[i].getElementsByClassName("InnerTableRow");
					for(let j=0; j<c; j++) { //Go through the inner tables; there must be exactly one per column to output
						eltMax[j] = Math.max(eltMax[j], inner[j].rows[0].cells.length); //Log the max value
					}
				}
			break;
			case "Avg, SD, N": eltMax = Array(c).fill(3); break; //Rows of 3 values
			default: eltMax = Array(c).fill(1); break; //Rows have only one value
		}
		return eltMax;
	}
	static groupedHeader(Top, Bottom, c, eltMax, format, log) { //For a grouped table, build the output for the headers using eltMax array to pad with tabs and respect column indentation
		let headerTop = "";
		let headerBottom = "";
		let topOffset = 2; //Tracker to follow the cells traversed in the top row. This row starts with two empty cells that span the bottom row
		let bottomOffset = 0; //Tracker to follow the cells traversed in the bottom row
		for(let i=0; i<c; i++) { //Navigate the data columns
			let cell = Top.cells[topOffset];
			if(cell.hasAttribute("rowspan")) { //Individual cell that "count" only for 1
				let pad = "".padEnd(eltMax[i] - 1, "\t");
				headerTop += "\t" + pad;
				headerBottom += this.valueFromCell(cell, format, log) + "\t" + pad;
			}
			else { //A group with multiple columns
				let l = Number(cell.getAttribute("colspan")); //The number of elements in this group
				headerTop += this.valueFromCell(cell, format, log); //Name of the group
				for(let j=0; j<l; j++) { //Prepare the headers
					let pad = "".padEnd(eltMax[i] - 1, "\t");
					headerTop += "\t" + pad; //Pad with enough tab to respect column indentation
					headerBottom += this.valueFromCell(Bottom.cells[bottomOffset], format, log) + "\t" + pad;
					bottomOffset++;
				}
				i += (l - 1); //Also need to increment the column count
			}
			topOffset++;
		}
		return "\t\t" + headerTop + "\n" + "\t\t" + headerBottom;
	}
	static groupedHeaderRow(first, second, format, log) { //For a grouped table, prepare the header for a row given its two first cells
		if(first.hasAttribute("rowspan")) { //This marks the beginning of a group
			return this.valueFromCell(first, format, log) + "\t" + this.valueFromCell(second, format, log);
		}
		else {
			if(first.nextSibling.nodeName == "TD") { //Member of a group
				return "\t" + this.valueFromCell(first, format, log);
			}
			else { //Group with only one element
				return this.valueFromCell(first, format, log) + "\t" + this.valueFromCell(second, format, log);
			}
		}
	}
	static rowTableToString(table, pad, format, log) { //Convert the rowTable given into a string. Pad with the number of tab given if necessary to respect column order
		let txt = "";
		let cells = table.rows[0].cells;
		let n = cells.length;
		for(let i=0; i<pad; i++) {
			if(i<n) {txt += "\t" + this.valueFromCell(cells[i], format, log)}
			else {txt += "\t"}
		}
		return txt;
	}
	*/
//************************************************************************
//NEW METHOD USING A COMMON JSON OBJECT AS STANDARD BETWEEN HTML/TXT/GRAPH
//************************************************************************
	static encodeJSON(rows, cols, data) { //Encode the incoming rows, cols and data into a common JSON object, and return it
		let o = {Data: []}; //Initialize the object
		let Flat = {Lvl1: {Rows: [], Cols: []}, Lvl2: {Rows: [], Cols: []} };
		let RowHeaders = GroupTable.flattenLevel(rows[0], Flat.Lvl1.Rows); //Start by flattening all this mess and build the headers, for each level 1
		let ColHeaders = GroupTable.flattenLevel(cols[0], Flat.Lvl1.Cols);
		if(RowHeaders !== undefined || ColHeaders !== undefined) { //If at least one header exists
			o.Headers = {Rows: RowHeaders, Cols: ColHeaders}
		}
		GroupTable.prepareWrapping(rows, cols, Flat, o); //Prepare the wrapping based on lvl2
		GroupTable.populateData(o.Data, data)//Compute the datapoints arrays
		return o;
	}
	static exportJSON(j, format) { //Convert the json object into a readable string, html or txt depending on the format
		let log = undefined;
		if(this.Report.Options.LogScale !== undefined) {log = this.Report.Options.LogScale.getValue()} //Not all reports support this option
		let F = { //Formatting object
			Displayed: (this.Report.Options.ExportFormat.getValue() == 1), //true means use the displayed data,
			Log: log,
			Format: format,
			Aggregation: (this.Report.UI.DataView.Selected || undefined),
		}; 
		if(j.Wrapping) { //In case of wrapping, a wrapper table is necessary
			let table = new WrapTable(j.Wrapping); //Returns a WrapTable object that can be interacted with
			return table.export(j, F); //Returns the final html string
		}
		else {
			return GroupTable.export(j.Data[0], F, j.Headers);
		}
	}
	static tableStart(f) {
		if(f == "html") {return "<table class=\"OuterTable\">"}
		return "";
	}
	static tableEnd(f) {
		if(f == "html") {return "</table>"}
		return "";
	}
	static rowStart(f) {
		if(f == "html") {return "<tr>"}
		return "";
	}
	static rowEnd(f) {
		switch(f) {
			case "html": return "</tr>";
			case "txt": return "\n";
		}
	}
	static blankCell(f) {
		switch(f) {
			case "html": return "<td></td>";
			case "txt": return "\t";
		}
	}
	static blankHeader(f, I) {
		switch(f) {
			case "html": 
				let span = "";
				if(I) {
					if(I.Dir == "Row") {span = " rowspan=\"" + I.Span + "\""}
					else {span = " colspan=\"" + I.Span + "\""}
				}
				return "<th" + span + "></th>";
			case "txt": return "\t";
		}
	}
}