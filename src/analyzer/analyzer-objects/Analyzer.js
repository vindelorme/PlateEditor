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
			let name = o.Unit;
			if(F.Log) {name = this.headerConcLog(o.Unit, F.Format, F.Shift)}
			switch(F.Format) {
				case "html": return "<span class=\"Header_Conc\" name=\"" + o.Unit + "\">" + name + "</span>";
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
					else {
						if(v.Unit == "MOI") {out = v.Value} //No decimals needed here
						else {out = this.roundNb(v.Value)} //Other cases
					}
					return "<th" + dirspan + " class=\"Value_PlaceHolder Header_Conc\" value=\"" + v.Value + "\" logvalue=\"" + log + "\" shift=\"" + Unit.shiftForUnit(v.Unit) + "\">" + out + "</th>";
				case "txt": //For text export, format also depends on the displayed option
					if(F.Log) {
						if(F.Displayed) {return this.roundNb(log) + dirspan + "\t"}
						else {return log + dirspan + "\t"}
					}
					else {
						if(F.Displayed) {
							if(v.Unit == "MOI") {return v.Value + dirspan + "\t"} //No decimals needed here
							else {return this.roundNb(v.Value) + dirspan + "\t"} //Other cases
						}
						else {return v.Value + dirspan + "\t"}
					}
			}
		}
		if(v.Type == "Range") { //For ranges, output the resolved or generic name
			if(F.GenericRangeName) { //Generic name
				switch(F.Format) {
					case "html": return "<th" + dirspan + ">" + v.Name + "</th>";
					case "txt": return v.Name + dirspan + "\t";
				}
			}
			let resolved = this.Report.ResolvedNames[v.OriginIndex]; //Resolved name
			if(resolved !== undefined) {
				let name = resolved[v.RangeIndex - 1];
				if(name !== undefined) {
					switch(F.Format) {
						case "html": return "<th" + dirspan + " class=\"Value_PlaceHolder Header_Range\" RootName=\"" + v.Name + "\">" + name + "</th>";
						case "txt": return name + dirspan + "\t";
					}
				}
			}
		}
		switch(F.Format) { //These cases are for regular headers (all the rest)
			case "html": return "<th" + dirspan + ">" + v.Name + "</th>";
			case "txt": return v.Name + dirspan + "\t";
		}
	}
	static cellForValue(v, F, I) { //prepare a cell to hold a numeric or textual value
		if(F.Format == "txt") { //This case is pretty simple
			if(v === "" || v === undefined || v === null) {return this.noData("txt")} //Mind the type equality, because 0 == "" evaluates to true
			let val = v;
			if(v.Value !== undefined) {val = v.Value}
			if(F.Displayed) {return this.roundNb(val)}
			else {return val}
		}
		let c = " class=\"";
		let inner = v;
		let value = "";
		let title = "";
		if(v === "" || v === undefined || v === null) {inner = this.noData(F.Format)} //Mind the type equality, because 0 == "" evaluates to true
		if(I) { //Look the options
			if(I.Class) {c += I.Class + " "}
			if(I.Border && I.Index > 0) {c += "BorderLeft "}
			if(I.Type == "#" && v !== "" && v !== undefined && v !== null) { //Number should use the value placeHolder
				inner = this.roundNb(v);
				c += "Value_PlaceHolder";
				value = " value=\"" + v + "\"";
			}
			if(I.Title) {title = " title=\"" + I.Title + "\""}
			if(I.ReturnLength) {
				let html = "<td" + c + "\"" + value + title + ">" + inner + "</td>";
				if(v === "" || v === undefined || v === null) {return {HTML: html, Length: 2}}
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
				out += this.cellForValue(e, F, I);
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
			return "<td class=\"Border\"><div class=\"InnerTable_Wrapper\"><table class=\"InnerTableRow\" style=\"min-width: " + this.rowWidth(array.length, maxLength) + "\"><tr>" + out + "</tr></table></div></td>";
		}
	}
	static arrayToColumn(i, json, F, headers) { //Produce a column output for the subgroup object i
		switch(F.Format) {
			case "txt": return this.arrayToColumn_Txt(i, json, F, headers);
			case "html": 
				let out = "";
				json.Groups.forEach(function(c, j) { //Loop the cols	
					out += this.arrayToColumn_HTML(c.DataPoints[i], F);
					F.ColumnIndex++;
				}, this);
				return out;
		}
	}
	static arrayToColumn_Txt(i, json, F, headers) { //Produce a column output for the subgroup object i, in a txt format
		console.log(i, json, F, headers);
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
				if(val !== undefined) {out += this.cellForValue(val, F, {Type: "#"})} //Add it if defined
				else { //No value defined here
					if(j == 0) {out += this.noData("txt")} //If this was the first row, it means the column is empty
				}
				out += "\t"; //In all cases, insert a gap to keep the alignment
			}, this);
		}
		return out;
	}
	static arrayToColumn_HTML(array, F) { //Convert the array provided into a single column html table
		let options = this.Report.Options;
		let style = "";
		if(options.Collapse.getValue()) {
			let row = options.Rows.getValue();
			style = " style=\"max-height: " + this.divHeight(row);
			if(array.length <= row) {style += "; overflow-y: unset\""}
			else {style += "; overflow-y: scroll\""}
		}
		let l = array.length;
		//if(l > 1) {html += " style=\"vertical-align: top\""} //Maybe better not to use it, to be consistent in formatting
		let html = "<td class=\"Border\" style=\"vertical-align: top\">";
		html += "<div class=\"InnerTable_Wrapper\"" + style;
		if(F.Sync) {html += " onmouseenter=\"Analyzer.scrollActive = " + F.ColumnIndex + "\" onscroll=\"Analyzer.syncScrolling()\""}
		html += "><table class=\"InnerTable\">";
		array.forEach(function(val, i) {
			let v = val;
			let o = {Type: "#"}
			if(val !== undefined && val !== null) {
				if(val.Value !== undefined) {v = val.Value}
				if(val.Class !== undefined) {o.Class = val.Class}
				if(val.Type !== undefined) {o.Type = val.Type}
			}
			if(this.isNumeric(v) == false) {o.Type = "Text"} //Correct the type if needed
			html += "<tr>" + this.cellForValue(v, F, o) + "</tr>"; 
		}, this);
		if(l == 0) {html += "<tr><td>" + this.noData() + "</td></tr>"} //The array was empty
		html += "</table></div></td>";
		return html;
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
//*************************************************************************
//NEW METHODS USING A COMMON JSON OBJECT AS STANDARD BETWEEN HTML/TXT/GRAPH
//*************************************************************************
	static getConfig(format) { //Return a formatting object using the configuration from the UI
		let log = undefined;
		if(this.Report.Options.LogScale !== undefined) { //Not all reports support this option
			log = this.Report.Options.LogScale.getValue();
		}
		return { //Formatting object
			Displayed: (this.Report.Options.ExportFormat.getValue() == 1), //true means use the displayed data,
			Log: log,
			Format: format,
			CV: this.Report.Options.CV.getValue(),
			Shift: this.Report.Options.Shift.getValue(),
			Aggregation: this.Report.UI.DataView.Selected,
			ColumnIndex: 0, //For synchronized scrolling; will be incremented on the fly as columns are added
		}; 
	}
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
		let F = this.getConfig(format);
		if(j.SyncScrolling) {F.Sync = true}
		if(j.GenericRangeName) {F.GenericRangeName = true}
		if(j.Wrapping) { //In case of wrapping, a wrapper table is necessary
			let table = new WrapTable(j.Wrapping); //Returns a WrapTable object that can be interacted with
			return table.export(j, F); //Returns the final html string
		}
		else {
			return GroupTable.export(j, F, j.Headers);
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