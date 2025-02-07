//*********************************************************************************
// SECTION object - Second layer used to organize reporting of data in the analyzer
//*********************************************************************************
class Section {
	constructor(I) {
		this.ID = I.ID;
		this.Bloc = I.Bloc; //Parent bloc object
		this.Name = I.Name; //Internal name
		this.Data = undefined; //Data stored for this section
		this.Type = (I.Type || "Single"); //Defines the table types: Single, StatsTable or Multiple
		if(I.Summary !== undefined) {this.Summary = true}
		let json = I.JSON; //Must be supplied for StatsTable and multiple types
		switch(this.Type) { //Create tables when appropriate
			case "StatsTable":
				this.Tables = [];
				if(json.Wrapping) { //Use the level 2 wrapping to create as many tables as needed
					json.Wrapping.Data.Groups.forEach(function(g, j) {
						let id = this.ID + "_DT_" + j;
						this.Tables.push(new StatsTable(id, g, json));
					}, this);
				}
				else { //There will be only one table
					this.Tables.push(new StatsTable(this.ID + "_DT_" + 0, undefined, json));
				}
				break;
			case "Multiple":
				this.Tables = [];
				json.forEach(function(j, i) {
					let id = this.ID + "_MT_" + i;
					this.Tables.push(new CustomTable(id, j));
				}, this);
				break;
			default: break; //Nothing else to do here
		}
		return this;
	}
	//Static methods
	static fullName(s) { //Provide a name representing the full data embedded in the section
		let names = [s.Bloc.File, s.Bloc.Name, s.Name].map(function(n) {return Report.cleanFileName(n)}); //Clean each name individually
		let name = "(" + names[0] + ")_" + names[1] + "_[" + names[2] + "]"; //Merge the names together into a single string: (fileName)_BlocName_[SectionName]
		return name.replace(/_{2,}/g, '_'); //Eliminate consecutive _
	}
	static fileHeader(s) { //Prepare a header for the file to be exported, that summarizes exactly where these data belongs to
		let header = "[File metadata]\n";
		header += "Result file: " + s.Bloc.File + "\n";
		header += "Parameter: " + s.Bloc.Name + "\n";
		header += "Table: " + s.Name + "\n";
		header += "Plate: " + Analyzer.Report.UI.Plate.Selected + "\n";
		let ranges = Analyzer.Report.Ranges;
		if(ranges !== undefined && ranges.length > 0) { //If ranges exist, output the metadata for them
			ranges.forEach(function(r, i) { //Loop the ranges
				let d = Analyzer.Report.UI["Definition_" + i]; //Corresponding definition
				if(d !== undefined) { //If it exists
					header += "Definition plate for range '" + r.Name + "': " + d.Selected + "\n";
				}
			});
		}
		let agg = Analyzer.Report.UI.DataView.Selected;
		if(agg !== undefined) {header += "Aggregation: " + agg + "\n"} //Aggregation for reports supporting it
		return header + "\n" + "[Data]\n";
	}
	//Getter, Setter
	get TablesHtml() {
		let html = "<div>"; //Wrapping div
		this.Tables.forEach(function(t) {html += t.html()});
		html += "</div>";
		return html;
	}
	//Methods
	HTML(title) { //Prepare the inner html for a section
		let html = "";
		html += "<fieldset><legend>" + title + "</legend><div class=\"Section_Controls\"></div><div id=\"" + this.ID + "\" class=\"Section\">";
		switch(this.Type) {
			case "Multiple": //FALL THROUGH
			case "StatsTable": html += this.TablesHtml; break;
			default: break;
		}
		html += "</div></fieldset>";
		return html
	}
	activateControls() { //Activate control elements within this section
		let me = GetId(this.ID);
		me.previousSibling.append(LinkCtrl.buttonBar([
			{Label: "Export", Title: "Click to export the data for this section", Click: function() {this.export({FileName: Section.fullName(this)})}.bind(this)},
			{Label: "Printable version", Title: "Click to view the data in a new window, allowing for printing or easy copy-pasting in other applications", Click: function() {this.printable()}.bind(this)},
		]));
	}
	replaceContent(content) {
		let me = GetId(this.ID);
		me.innerHTML = content;
		return this;
	}
	update(source) { //Update the content of the section
		switch(this.Type) {
			case "StatsTable": //FALL THROUGH
			case "Multiple": //In this case, update the tables
				this.replaceContent(this.TablesHtml);
				return this;
			default: //Other cases will use the provided or logged content
				let content = {}; 
				if(source) { //Use the provided content if any
					content = source;
				}
				else { //Stored data should be reused
					content = JSON.parse(this.Data); //Using the provided content is faster, so parsing the data should be done only when really necessary
				}
				this.replaceContent(Analyzer.exportJSON(content, "html"));
				break;
		}
		return this;
	}
	export(I) { //Export section data as txt
		let save = Section.fileHeader(this);
		switch(this.Type) {
			case "Multiple": //FALL THROUGH
			case "StatsTable":
				this.Tables.forEach(function(t, i) {
					if(i > 0) {save += "\n"}
					save += "\n" + t.TitleExport + "\n"; //Spacing and title  between tables
					save += Analyzer.exportJSON(t.buildJSON(), "txt"); //Export tables one after the other
				});
				break;
			default:
				let content = JSON.parse(this.Data);
				save += Analyzer.exportJSON(content, "txt");
				break;
		}
		if(I && I.TxtOnly) { //If only the txt is required (chaining with other contents), exit here by returning the txt
			return save;
		}
		if(I && I.BlobOnly) { //If only the blob is required (chaining with other files), exit here by returning the blob
			let blob = new Blob([save], {type : "text/plain;charset=utf-8"});
			return blob;
		}
		let fileName = "Results.txt";
		if(I && I.FileName) {fileName = I.FileName + ".txt"}
		Form.download(save, {FileName: fileName});
		return this;
	}
	printable() { //Open a new window containing only the table and allowing easy copy-pasting / printing
		Reporter.printable(GetId(this.ID).innerHTML);
		return this;
	}
	addRow(json, plate, I) {
		if(this.Tables === undefined) { //Only sections with tables support this feature
			console.warn("This section has no Tables defined to push new row!", this);
			return;
		}
		this.Tables.forEach(function(t, i) { //Update the tables
			t.addRow(json.Data[i], plate, I);
		});
		return this;
	}
	//**********************************************************************************
	//This method is called by the Report_Hits, to resolve the hit names after screening
	//**********************************************************************************
	resolveNames(I) { //For this section, resolve the names for the plate whose values are transferred, by looping the collection of resolvable elements and resolving as needed
		let sectionID = GetId(this.ID);
		let div = sectionID.parentElement.getElementsByClassName("ResolveStatus")[0]; //The div for the status
		if(I.Count == 0) { //This is the first pass, use it to spawn the stop button and display spans
			let b = LinkCtrl.button({Label: "Cancel", Click: function() {this.Stop = true}.bind(I.Report), Title: "Click here to stop the name resolution process"});
			div.innerHTML = "<span></span><span></span>&nbsp;"; //Add spans for the text
			div.append(b); //Add the cancel button
			div.children[0].innerHTML = "Resolving range names, please wait... "; //Update the text msg
		}
		else { //Update the remaining count
			div.children[1].innerHTML = "( Plate " + I.Count + " / " + I.Total + ")&nbsp;"; //Update the plate count msg
		}
		let coll = sectionID.getElementsByClassName("Resolvable"); //The HTMLcollection of elements to resolve in this section. Recall it each time, because the number of element remaining will decrease after each turn
		let l = coll.length;
		for(let i=0;i<l;i++) { //Travel the collection to update the data
			let c = coll[i];
			let rangeName = c.getAttribute("rangename");
			if(rangeName == I.Range.Name) { //Matching range
				let rowIndex = c.parentElement.parentElement.rowIndex; //Go back to the tr to get the index of this row
				let source = this.Tables[0].Data.Data[0].Groups; //Source of the data
				let plate = source[1].DataPoints[0][rowIndex];
				//let plate = sectionID.getElementsByClassName("InnerTable")[1].rows[rowIndex].innerText; //Recover the plate name
				if(plate == I.Plate) { //Matching plate
					let well = JSON.parse(c.getAttribute("well")); //Recover a pseudo-well object
					let newName = I.Names[well.Index];
					if(newName !== undefined && newName !== null && newName.length > 0) { //Update the generic name with the resolved one, if it exists
						c.innerHTML = newName;
						source[3].DataPoints[0][rowIndex] = newName;
					}
				}
			}
		}
		return this;
	}
}