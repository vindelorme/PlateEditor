//*********************************************************************************
// SECTION object - Second layer used to organize reporting of data in the analyzer
//*********************************************************************************
class Section {
	constructor(I) {
		this.ID = I.ID;
		this.Bloc = I.Bloc; //Parent bloc object
		this.Name = I.Name; //Internal name
		this.TableType = (I.TableType || "Simple"); //Defines the table type to let the analyzer know how to export it. Values can be [Simple, Inner]
		this.Summary = I.Summary; //Whether this section contains a summary table
		if(this.Summary) { //In this case, keeping the values computed facilitates the creation and maintenance of the summary table
			this.Tables = [];
			this.Headers = I.Headers;
			I.Tables.forEach(function(t, i) { //Array of object with Label property
				let table = {ID: this.ID + "_Table_" + i, Columns: []}
				if(t.Visible !== undefined) {table.Visible = t.Visible}
				else {table.Visible = true}
				if(t.Title !== undefined) {table.Title = t.Title}
				else {table.Title = "Table " + i}
				this.Headers.forEach(function(h) { //For each header, there will be a storage using an object keyed with the header name
					table.Columns.push({Label: h, Visible: true, Values: []}); //Initialize empty arrays to receive the values
				});
				this.Tables.push(table);
			},this);
		}
		return this;
	}
	//Static methods
	static getTables(s) { //For the section object passed, return the tables to be exported as an HTML collection of DOM elements
		if(s.Summary) { //For summary, do not include the hidden tables
			let array = [];
			s.Tables.forEach(function(t) {
				let wrapper = GetId(t.ID);
				if(wrapper.style.display != "none") { //Export the table if visible
					array.push(wrapper.lastChild);
				}
			});
			return array;
		}
		switch(s.TableType) {
			case "Simple": return GetId(s.ID).getElementsByClassName("Table");
			default: return GetId(s.ID).getElementsByClassName("OuterTable");
		}
	}
	static fullName(s) { //Provide a name representing the full data embedded in the section
		let names = [s.Bloc.File, s.Bloc.Name, s.Name].map(function(n) {return Report.cleanFileName(n)}); //Clean each name individually
		let name = "(" + names[0] + ")_" + names[1] + "_[" + names[2] + "]"; //Merge the names together into a single string: (fileName)_BlocName_[SectionName]
		return name.replace(/_{2,}/g, '_'); //Eliminate consecutive _
	}
	static fileHeader(s) { //Prepare a header for the file to be exported, that summarizes exactly where these data belongs to
		let names = [s.Bloc.Name, s.Name].map(function(n) {return Report.cleanFileName(n)}); //Clean each name individually
		return "Data for Result file: [" + s.Bloc.File + "]; Parameter:  [" + names[0] + "]; Table: [" + names[1] + "]\n"; //Merge the names together into a single string
	}
	//Methods
	HTML(title) { //Prepare the inner html for a section
		let html = "";
		html += "<fieldset><legend>" + title + "</legend><div class=\"Section_Controls\"></div><div id=\"" + this.ID + "\" class=\"Section\">";
		if(this.Summary) {
			html += "<div>"; //Wrapping div
			this.Tables.forEach(function(t) {
				html += "<div id=\"" + t.ID + "\" style=\"float: left;border: 1px solid darkred;border-radius: 5px;padding: 5px; margin: 5px\"></div>";
			});
			html += "</div>";
		}
		html += "</div></fieldset>";
		return html
	}
	replaceContent(content) {
		let me = GetId(this.ID);
		me.innerHTML = content;
		return this;
	}
	activateControls() { //Activate control elements within this section
		let me = GetId(this.ID);
		me.previousSibling.append(LinkCtrl.buttonBar([
			{Label: "Export", Title: "Click to export the data for this section", Click: function() {this.export({FileName: Section.fullName(this)})}.bind(this)},
			{Label: "Printable version", Title: "Click to view the data in a new window, allowing for printing or easy copy-pasting in other applications", Click: function() {this.printable()}.bind(this)},
		]));
	}
	updateTable(tableIndex, ColumnName, entry, newRow, I) { //Update the table of index given, updating the row containing entry in ColumnName with newRow
		let t = this.Tables[tableIndex];
		let c = this.Headers.indexOf(ColumnName); //Find the column index where to search the entry
		if(c == -1) {console.warn("Could not find '" + ColumnName + "' column in table headers", this); return this}
		let n = t.Columns[c].Values.indexOf(entry); //Search the entry
		if(n > -1) { //The value exist, update it
			t.Columns.forEach(function(col, i) {
				col.Values[n] = newRow[i];
			});
		}
		else { //First time the value is seen, create a new element
			t.Columns.forEach(function(col, i) {
				col.Values.push(newRow[i]);
			});
		}
		let updatedTable = Analyzer.objectToTable(t.Columns, {Sync: true});
		let target = GetId(t.ID);
		target.innerHTML = "<p class=\"Title\">" + t.Title + "</p>" + updatedTable.HTML;
		if(I && I.Visible !== undefined) {
			if(I.Visible) {target.style.display = "block"}
			else {target.style.display = "none"}
		}
		return this;
	}
	hideAllTables() { //Hide all tables for this summary section
		if(this.Summary) {
			this.Tables.forEach(function(t) {
				GetId(t.ID).style.display = "none";
			});
		}
		return this;
	}
	hasData(tableIndex, ColumnName, entry) { //For the summary section, check if the entry exists in the specified table
		let found = false;
		let t = this.Tables[tableIndex];
		let c = this.Headers.indexOf(ColumnName);
		if(c == -1) {return false} //Header with this name not found
		let val = t.Columns[c].Values;
		let l = val.length;
		let i = 0;
		while(!found && i < l) {
			if(val[i] == entry) {found = true}
			i++;
		}
		return found;
	}
	export(I) { //Export the table data of this section
		let tables = Section.getTables(this);
		let l = tables.length;
		let save = Section.fileHeader(this);
		let title = "";
		for(let i=0; i<l; i++) {
			let t = tables[i];
			if(i == 0) {title = t.previousSibling.innerText} //The first table always has a title
			else { //For the following tables, it depends
				save += "\n\n"; //Separator between tables
				if(this.TableType == "Inner") {title = t.previousSibling.innerText} //In this case, each table has a header
				else {title = undefined} //No need of title otherwise
			}
			save += Analyzer.tableToString(t, {Title: title, TableType: this.TableType});
		}
		let blob = new Blob([save], {type : "text/plain;charset=utf-8"});
		if(I && I.BlobOnly) {return blob} //If only the blob is required (chaining with other files), exit here by returning the blob
		let fileName = "Results.txt";
		if(I && I.FileName) {fileName = I.FileName + ".txt"}
		Form.download(save, {FileName: fileName});
		return this;
	}
	printable() { //Open a new window containing only the table and allowing easy copy-pasting / printing
		Reporter.printable(GetId(this.ID).innerHTML);
		return this;
	}
}