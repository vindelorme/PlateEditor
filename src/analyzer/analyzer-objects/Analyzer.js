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
			return log + Unit.shiftForUnit(v.Name);
		}
		return log;
	}
	static isNumeric(v) { //Returns a boolean to indicate if the value is text or number
		return (v !== undefined && v.toFixed !== undefined && isNaN(v) == false);
	}
	static divHeight(n) { //Compute the height of the div required to display n rows
		return (1.65 * (n + 0.5)) + "em"; //Row height is ~1.65em (1.25em + 0.4 padding) per default, add half a row to let the user know something is below
	}
	static rowWidth(n, maxL) { //Compute the width of a row to accomodate n elements with their max length given
		let width = maxL * n * 0.9 * (1 - (0.2 * maxL/20)); //font-size is 0.9em; the last factor is to shorten longest numbers (up to 20%), because 1 digit is less than 0.9em in width
		width = Math.max(width, 2);
		return width + "em";
	}
	static noData() { //The string used to indicate this cell has no data
		return "<span class=\"Warning\">&Oslash;</span>";
	}
	static header(o) { //Return the html header for the row/col object provided
		if(o.Unit) {
			let html = "<span class=\"Header_Conc\" name=\"" + o.Name + "\">";
			if(this.Report.Options.LogScale.getValue()) {html += this.headerConcLog(o.Name)}
			else {html += o.Name}
			return html + "</span>";
		}
		return o.Name;
	}
	static headerConcLog(name, shift) { //Wrap the name into a log10(...) text
		if(shift) {name = Unit.rootForUnit(name)}
		return "Log<sub>10</sub>(" + name + ")";
	}
	static valueHeader(v) { //Return the html header for the value object v
		if(v.Type == "Conc") {
			let log = this.logValue(v);
			let out = "";
			if(this.Report.Options.LogScale.getValue()) {out = this.roundNb(log)}
			else {out = this.roundNb(v.Value)}
			return "<th class=\"Value_PlaceHolder Header_Conc\" value=\"" + v.Value + "\" logvalue=\"" + log + "\" shift=\"" + Unit.shiftForUnit(v.Name) + "\">" + out + "</th>";
		}
		return "<th>" + v.Name + "</th>";
	}
	static cellForValue(v, I) { //prepare a cell to hold a numeric or textual value
		let c = " class=\"";
		let inner = v;
		let value = "";
		let title = "";
		if(v === "" || v === undefined) {inner = this.noData()} //Mind the type equality, because 0 == "" evaluates to true
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
	static arrayToRow(array, I) { //Convert the array of values into an innerTable with a single row
		let html = "";
		let maxLength = 0;
		if(array.length == 0) {html += "<td>" + this.noData() + "</td>"}
		else {
			array.forEach(function(e, i) {
				let o = {Border: true, Index: i, ReturnLength: true}
				if(I) {
					if(I.Types) {o.Type = I.Types[i]}
					if(I.Titles) {o.Title = I.Titles[i]}
				}
				let out = this.cellForValue(e, o);
				html += out.HTML;
				maxLength = Math.max(maxLength, out.Length); //Log the max length of the string to display
			}, this);
		}
		return "<div class=\"InnerTable_Wrapper\"><table class=\"InnerTableRow\" style=\"min-width: " + this.rowWidth(array.length, maxLength) + "\"><tr>" + html + "</tr></table></div>";
	}
	static arrayToColumn(array, columnIndex, I) { //Convert the array provided into a single column table and compute the stats for it
		let options = this.Report.Options;
		let style = "";
		if(options.Collapse.getValue()) {
			let row = options.Rows.getValue();
			style = " style=\"max-height: " + this.divHeight(row);
			if(array.length <= row) {style += "; overflow-y: unset\""}
			else {style += "; overflow-y: scroll\""}
		}
		let html = "<td class=\"Border\"";
		let l = array.length;
		if(l > 1) {html += " style=\"vertical-align: top\""}
		html += "><div class=\"InnerTable_Wrapper\"" + style;
		if(I && I.Sync) {html += " onmouseenter=\"Analyzer.scrollActive = " + columnIndex + "\" onscroll=\"Analyzer.syncScrolling()\""}
		html += "><table class=\"InnerTable\">";
		let stats = {Total: 0, Avg: "", SD: "", CV: "", N: 0} //Keep defaults as text so that nothing is displayed if no or not enough elements to calculate it
		let numericOnly = []; //An array to store only numeric values, in case some text is also present
		array.forEach(function(val, i) {
			let v = val;
			if(val.Value !== undefined) {v = val.Value}
			let isNumeric = this.isNumeric(v);
			let type = "#";
			if(isNumeric == false) {type = "Text"}
			else { //Push the numeric values only and exclude the text
				numericOnly.push(v);
				stats.Total += v;
			} 
			html += "<tr>" + this.cellForValue(v, {Type: type, Class: val.Class}) + "</tr>"; 
		}, this);
		if(l == 0) {html += "<tr><td>" + this.noData() + "</td></tr>"} //The array was empty
		html += "</table></div></td>";
		let n = numericOnly.length;
		if(n > 0) { //At least one numeric value was found
			let avg = stats.Total / n;
			stats.Avg = avg;
			if(n > 1) {
				let variance = numericOnly.map(function(v) {//return an array for which each element x is now (x-avg)^2
					return(Math.pow(v - avg, 2));
				}); 
				let sumVariance = variance.reduce(function(a, b) {return(a + b)});
				let SD = Math.sqrt(sumVariance / n); //Population SD, computed with 1/N (For Sample SD, we should use 1/N-1, but population SD is more natural: [8, 12] => pSD = 2; sSD = 2.82)
				stats.SD = SD;
				stats.CV = 100 * SD / avg;
			}
		}
		stats.N = l;
		if(n != l) {stats.N = n + " (" + l + ")"} //Inform that not all values were used
		return {HTML: html, Stats: stats}
	}
	static objectToTable(o, I) { //Return an html table representing the array of object passed. Each object should have a "Values" property, containing the array of values
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
	}
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
	static groupedTable(rows, cols, values, aggregation) { //Build a 2d/grouped table using the rows/cols data and values provided. Rows/Cols are arrays of objects that include a Values property, in which the tags array hold the index where to find the values in the values array provided
		let html = "";
		html += "<table class=\"OuterTable\">";
		let headTop = "<tr><td rowspan=\"2\"></td><td rowspan=\"2\"></td>"; //Table headers, leave two empty columns for the legend; use <td> so that it has no borders
		let headBottom = "<tr>";
		cols.forEach(function(col) { //Travel the cols to prepare the headers
			let l = col.Values.length;
			if(l == 1) {headTop += "<th rowspan = \"2\">" + this.header(col) + "</th>"} //Only one value for this group
			else { //A group with more than one values
				headTop += "<th colspan=\"" + col.Values.length + "\">" + this.header(col) + "</th>"; //The header for the group
				col.Values.forEach(function(v) { //Append all the values 
					headBottom += this.valueHeader(v);
				}, this);
			}
		}, this);
		html += headTop + "</tr>" + headBottom + "</tr>";
		rows.forEach(function(row, i) { //Travel the rows
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
//*************************************************
//Methods for the export of data tables to txt file
//*************************************************
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
}