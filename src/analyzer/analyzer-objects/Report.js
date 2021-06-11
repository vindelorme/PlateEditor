//****************************************************************************
// REPORT object - Holds the values and controls available to analyze the data
//****************************************************************************
class Report {
	constructor(o) {
		this.Title = o.Title;
		this.Anchors = {
			Output: "Output",
			Menu: "Menu",
			Options: "Options",
			Export: "Export",
			Results: "Results",
			PlateSelect: "PlateSelect",
			ResultPlate: "ResultPlate",
			PlateDoAll: "PlateDoAll",
			PairingTarget: "PairingTarget",
		}
		let html = "";
		html += "<div id=\"" + this.Anchors.Menu + "\"></div>";
		html += "<div id=\"" + this.Anchors.Output + "\"></div>"
		GetId("Main").innerHTML = html;
		this.Results = new RespTable({ //RespTable object controling the available result files
			ID: this.Anchors.Results,
			Array: window.opener.Results.map(function(r) {r.LoggedPlate = 0; return r}), //On init, set the logged plate property to 0 for each result
			Fields: ["Name", "Size", "Info"], Headers: ["Name", "Size", "Parameters"],
			onSelect: function(s, os, i, oi) { //What to do on result selection
				if(i[0] == oi[0]) {return} //Same result is selected, do nothing
				Report.saveState(this, oi[0]); //Save the current tab opened for the old selection (selected result)
				this.setPlates().do();
				Report.restoreState(this, i[0]); //Restore the opened tab for the newly opened result
			}.bind(this), FullWidth: true, RowNumbers: true, NoControls: true,
		});
		this.Blocs = []; //Array of bloc objects
		this.Output = new TabControl({ //Tab to manipulate the Bloc objects
			ID: this.Anchors.Output,
			Layout: "Horizontal",
			Tabs: [],
		});
		this.Menu = new TabControl({ //Menu for the report page
			ID: this.Anchors.Menu,
			Multiple: true,
			Layout: "Menu",
			Tabs: [
				{Label: "Options", Active: true, Content: {Type: "HTML", Value: "<div id=\"" + this.Anchors.Options + "\"></div>"} },
				{Label: "Export", Active: true, Content: {Type: "HTML", Value: "<div id=\"" + this.Anchors.Export + "\"></div>"} },
				{Label: "Results", Active: true, Content: {Type: "HTML", Value: "<div id=\"" + this.Anchors.Results + "\"></div>"} },
				{Label: "Plates", Active: true, Content: {Type: "HTML", Value:
					"<fieldset id=\"" + this.Anchors.PlateSelect + "\">" +
						"<legend>Result</legend>" +
						"<div id=\"" + this.Anchors.ResultPlate + "\"></div>" +
						"<div style=\"text-align: center; margin-bottom: 10px\" id=\"" + this.Anchors.PairingTarget + "\"></div>" +
						"<div id=\"" + this.Anchors.PlateDoAll + "\"></div>" +
					"</fieldset>"}
				},
			],
		});
		this.Options = {
			Collapse: LinkCtrl.new("Checkbox", {ID: this.Anchors.Options, Label: "Collapse tables", Default: true, Chain: {Index: 0}, Change: function(v) {
				let r = this.Options.Rows;
				if(v) {r.enable()}
				else {r.disable()}
				this.refresh("Rows", {Collapse: v, Rows: r.getValue()});
			}.bind(this), Title: "Tick to limit the number of rows displayed in tables"}),
			Rows: LinkCtrl.new("Number", {ID: this.Anchors.Options, Label: "Rows", Default: 10, Min: 2, Step: 1, Chain: {Index: 1, Last: true}, Change: function(v) {
				this.refresh("Rows", {Collapse: true, Rows: v});
			}.bind(this), Title: "Maximum number of rows to show for each table"}),
			Decimals: LinkCtrl.new("Select", {ID: this.Anchors.Options, Label: "Decimals", Default: 3, List: [0, 1, 2, 3, 4, 5, 6, "All"], Chain: {Index: 2, NewLine: true}, Change: function(v) {
				this.refresh("Decimals");
			}.bind(this), Title: "Number of decimals to show for the computed values. Parsed values from the file are not affected"}),
			CV: LinkCtrl.new("Checkbox", {ID: this.Anchors.Options, Label: "Show CV", Default: false, Chain: {Index: 3, Last: true}, Change: function(v) {
				this.refresh("CV", {Show: v});
			}.bind(this), Title: "Tick to show the coefficient of varation (CV, %) for the data"}),
			LogScale: LinkCtrl.new("Checkbox", {ID: this.Anchors.Options, Label: "Log Scale", Default: false, Chain: {Index: 4, NewLine: true}, Change: function(v) {
				this.refresh("Log");
			}.bind(this), Title: "Tick to show the concentration data in log scale"}),
			Shift: LinkCtrl.new("Checkbox", {ID: this.Anchors.Options, Label: "Shift unit", Default: false, Chain: {Index: 5, Last: true}, Change: function(v) {
				this.refresh("Log");
			}.bind(this), Title: "Tick to shift the concentration data to their closest parent value (i.e. M or g/mL) when using the log scale"}),
			ExportFormat: LinkCtrl.new("Radio", {ID: this.Anchors.Export, Default: 0, Label: "Export values", List: ["From file", "Displayed"], Title: "Controls wheter the exported data should be as they appear in the file (From file), or as they appear in the table (Displayed)"}),
		}
		this.UI = { //Container for specific LinkCtrl elements
			Plate: LinkCtrl.new("Select", {ID: this.Anchors.ResultPlate, Default: 0, List: [], Label: "Plate", Change: function(index) {
				this.Result.LoggedPlate = index; //Log the selected plate for this result file
				this.pairStatus(index);
				this.do();
			}.bind(this), Title: "The result plate for which values will be displayed"}),
		}
		this.Menu.init();
		this.Output.init();
		this.Results.init();
		Object.values(this.Options).forEach(function(o) {o.init()});
		GetId(this.Anchors.Export).append(LinkCtrl.buttonBar([ //Export functionalities
			{Label: "Export All", Title: "Export all the data generated by the report, as a zip file containing tab-delimited text files", Click: this.exportAll.bind(this)},
		]));
		return this;
	}
	//Static methods
	static new(o) {
		switch(o.Method) {
			case "zFactor": return new Report_Controls(o);
			case "Aggregate": return new Report_Aggregate(o);
			case "Grouped": return new Report_Grouped(o);
			case "Hits": return new Report_Hits(o);
			default: return new Report(o);
		}
	}
	static getBloc(report, name) { //Return the desired bloc object (identified by its name) for the report passed
		let found = false;
		let i = 0;
		let blocs = report.Blocs;
		let l = blocs.length;
		while(!found && i<l) {
			if(blocs[i].Name == name) {found = true}
			else {i++}
		}
		if(found) { //Bloc already exists, call it back
			report.Output.Tabs[i].set("Enabled"); //Blocs that are called can be set back as enabled
			return report.Blocs[i];
		}
		else { //Create the bloc
			report.Result.OpenedTab = i; //Set the default state on bloc opening
			return report.newBloc(name, i);
		} 
	}
	static *plateIterator(source) { //A generator function that create a generator object for counting plates
		let l = source.length;
		for(let i=0; i<l; i++) {
			yield source[i];
		}
	}
	static lock(report, plates) { //Lock the report while parsing data
		let id = "Report_Mask";
		Form.open({
			ID: id,
			HTML: "<p><span class=\"warning\">Parsing in progress, please wait...<span></p><p>Processing plate <span id=\"Mask_PlateNumber\">1</span> / " + plates + "</p>",
			Title: "Analysis in progress...",
			Buttons: [
				{Label: "Abort", Click: function() {report.cancel()}}
			],
			onCancel: function() {report.cancel()},
		});
	}
	static unlock() { //Release the report after parsing
		Form.close("Report_Mask");
	}
	static plateCount(p) { //Update the count of completed plates while analyzing all of them
		let target = GetId("Mask_PlateNumber");
		if(target) {target.innerHTML = p}
	}
	static cleanName(report) { //Return the cleaned name of the selected result for the report object passed, as a safe(r) string to be used for a file name
		let n = report.Result.Name;
		let l = n.lastIndexOf(".");
		if(l > -1) {return this.cleanFileName(n.substring(0, l))} //The fileName without the extension and cleaned
		else {return this.cleanFileName(n)} //In case the file name is already without extension
	}
	static cleanFileName(n) { //Clean the provided name to make it a safe(r) string to be used for a file name
		if(n == "" || n === undefined) {return "unknown"} //Let's have a fallback for weird cases
		return n.trim() //Starts by removing space characters at both ends
			.replace(/[^a-z0-9_\-\[\]\(\)\.]/gi, "_") //Replace all undesirable characters with "_"
			.replace(/_{2,}/g, "_"); //Collapse consecutive "_" into one
	}
	static saveState(r, resultIndex) { //Save the state of the panels opened for the result of index passed, for the report provided
		r.Results.Array[resultIndex].OpenedTab = r.Output.active(); //Save the active bloc
		r.Output.disable(); //Disable all the tabs. Tabs that are called by getBloc() later during the do() will be set as active
	}
	static restoreState(r, resultIndex) {
		let n = r.Results.Array[resultIndex].OpenedTab;
		if(n !== undefined) {r.Output.jumpTo(n)} //Need a control for the first opening case
	}
	static blocName(param) { //Build a unique bloc name using the properties of the parameter object provided
		return param.ResultIndex + ". " + param.Name;
	}
	//Getter and setter
	get Result() { //Get the result file currently selected
		let r = this.Results.Selected[0];
		if(r === undefined) {this.Results.setValue([0])}
		return this.Results.Selected[0];
	}
	get FirstBlocIndex() { //For the result file selected, get the index of the first bloc containing its data
		let start = (this.Results.SelectedIndices[0] + 1) + ". "; //The start of the name for all the parameters of the selected result file
		let found = false;
		let i = 0;
		let blocs = this.Blocs;
		let l = blocs.length;
		while(!found && i<l) {
			if(blocs[i].Name.startsWith(start)) {found = true}
			else {i++}
		}
		if(found) {return i}
		else {return undefined}
	}
	get Params() {
		return this.Result.Parameters;
	}
	//Methods
	init() { //Init the controls on the page
		Object.values(this.UI).forEach(function(v) {v.init()});
		this.setPlates(); //Update plate list and pairing data
		this.do(); //Do the job
		return this;
	}
	do() {} //Do the job. Each child report has its own implementation of what to do
	setPlates() { //Update the plate list to match that of the selected result; this will also trigger a pairStatus to update the pairing info
		let ui = this.UI.Plate;
		let plates = this.Result.PlatesID;
		ui.List = plates;
		if(plates.length > 1) { //Update the navigation tools
			ui.NavBar = true;
			ui.Lookup = {Active: false}
		}
		else {
			ui.NavBar = false;
			ui.Lookup = undefined;
		}
		let v = this.Result.LoggedPlate; //Logged plate for this result file
		ui.setValue(v) //Set the selection to the right plate
		ui.init(); //Initialize to re-build the display
		this.pairStatus(v); //Update pairing data for the selected plate
		return this;
	}
	pairStatus(index, I) { //Update the pairing information for the result plate selected
		let target = GetId(this.Anchors.PairingTarget);
		let P = this.Result.Pairing;
		if(P === undefined) {target.innerHTML = Pair.unpaired().Html; return} //This plate has no pairing information, escape here
		let pair = this.Result.Pairing.Pairs[index];
		if(pair === undefined) {target.innerHTML = Pair.unpaired().Html; return} //This plate has no pairing information, escape here
		if(this.Ranges) {
			let pairInfo = pair.getDefPlate(this.Ranges);
			pairInfo.forEach(function(p, i) { //Loop the pairInfo
				let ui = this.UI["Definition_" + p.RangeIndex];
				if(I && I.Check) { //Comparison only
					if(p.DefPlateIndex == ui.getValue()) { //OK
						pair.Table[i].Broken = false;
					}
					else { //Set as broken
						pair.Table[i].Broken = true;
					}
				}
				else { //Setter for the definition
					ui.setValue(p.DefPlateIndex).change(); //Trigger a change to update the displayed names
					pair.Table[i].Broken = false;
				}	
			}, this);
		}
		let O = pair.state();
		target.innerHTML = O.Html; //Output
		return this;
	}
	newBloc(name, index) {
		let id = "Bloc_" + index;
		let bloc = new Bloc({Name: name, ID: id, File: this.Result.Name});
		this.Blocs.push(bloc);
		this.Output.addTab({Label: name, SetActive: true, Content: {Type: "HTML", Value: "<p>Data for Result file: " + this.Result.Name + "</p><div id=\"" + id + "\"><span class=\"warning\">Initializing the report, please wait...</span></div>"} });
		return bloc.init();
	}
	cancel() {
		this.Cancel = true;
		return this;
	}
	refresh(what, I) { //Refresh the report
		switch(what) {
			case "Rows": this.refreshRows(I); break;
			case "Decimals": this.refreshDecimals(I); break;
			case "CV": this.refreshCV(I.Show); break;
			case "Log": this.refreshLog(I); break;
			break;
		}
		return this;
	}
	refreshRows(I) { //Update the number of rows displayed per table
		let height = "unset";
		if(I.Collapse) {height = Analyzer.divHeight(I.Rows)}
		let HTMLcollection = GetId("Output").getElementsByClassName("InnerTable_Wrapper");
		let l = HTMLcollection.length;
		for(let i=0; i<l; i++) {
			let elt = HTMLcollection[i];
			let items = elt.children[0].rows.length;
			elt.style.maxHeight = height;
			if(items <= I.Rows) {elt.style.overflowY = "unset"}
			else {elt.style.overflowY = "scroll"}
		}
		return this;
	}
	refreshDecimals(I) { //Update the number of decimals displayed
		let HTMLcollection = [];
		if(I && I.LogOnly) {HTMLcollection = GetId("Output").getElementsByClassName("Value_PlaceHolder Header_Conc")} //Limit to the relevant items for log scale
		else {HTMLcollection = GetId("Output").getElementsByClassName("Value_PlaceHolder")}
		let l = HTMLcollection.length;
		for(let i=0; i<l; i++) { //Update all the value placeholders
			let elt = HTMLcollection[i];
			if(elt.hasAttribute("value")) { //Locate elements with a value attribute
				let val = Number(elt.getAttribute("value"));
				if(I && I.Log) {
					val = Math.log10(val);
					if(I.Shift) {val += Number(elt.getAttribute("shift"))} //Shift to the higher unit
				}
				if(val != "" && (isNaN(val) == false)) { //If convertion to a number falls into NaN, it means the value is a text, so leave it as it is
					elt.innerHTML = Analyzer.roundNb(val);
				}
			}
		}
		if(I && I.LogOnly) {return} //No need to adjust this for log scale
		let tables = GetId("Output").getElementsByClassName("InnerTableRow");
		let m = tables.length;
		for(let i=0; i<m; i++) { //For each table
			let t = tables[i];
			let n = t.rows[0].cells.length; //Get the number of cells (these tables have only one row)
			let maxLength = 2; //Minimum length
			for(let j=0; j<n; j++) { //Travel each cell for this row
				maxLength = Math.max(maxLength, t.rows[0].cells[j].innerText.length); //Using innerText solve the issue of the <span> for empty cells
			}
			t.style.minWidth = Analyzer.rowWidth(n, maxLength); //Update tables min-width
		}
		return this;
	}
	refreshCV(bool) { //Show or hide the computed CV values
		let HTMLcollection = GetId("Output").getElementsByClassName("CV_Row");
		let l = HTMLcollection.length;
		let display = "none";
		if(bool) {display = "table-row"}
		for(let i=0; i<l; i++) {
			HTMLcollection[i].style.display = display;
		}
		return this;
	}
	refreshLog(I) { //Refresh log scale options
		let show = this.Options.LogScale.getValue();
		let shift = this.Options.Shift.getValue();
		let HTMLcollection = GetId("Output").querySelectorAll("span.Header_Conc"); //update the text for the headers
		let l = HTMLcollection.length;
		for(let i=0; i<l; i++) { //Loop the headers
			let elt = HTMLcollection[i];
			if(show) {elt.innerHTML = Analyzer.headerConcLog(elt.getAttribute("name"), shift)} //LogScale on
			else {elt.innerHTML = elt.getAttribute("name")} //Off
		}
		this.refreshDecimals({LogOnly: true, Log: show, Shift: shift}); //Refresh the value display
		/*let HTMLcollection = GetId("Output").getElementsByClassName("Value_PlaceHolder Header_Conc");
		let l = HTMLcollection.length;
		for(let i=0; i<l; i++) {
			let elt = HTMLcollection[i];
			let val = Math.log10(Number(elt.getAttribute("value")));
			if(shift) { //Shift on
				val += Unit.shiftForUnit()
			}
			elt.setAttribute("logvalue", val);
			if(show) {elt.innerHTML = Analyzer.roundNb(val)} //This option only affects display when log scale is turned on
		}*/
	}
	exportAll() { //Export all data for available blocs and sections
		let Z = new JSZip();
		let id = "Form_Save";
		let outputID = id + "_Output";
		let fileName = "ExportAll.zip";
		Form.open({ //Open a form for feedback to the user
			ID: id,
			HTML: "<p id=\"" + outputID + "\"><span class=\"warning\">Preparing zip archive, please wait...</span></p>",
			Title: "Export data",
			Buttons: [{Label: "Close", Click: function() {Form.close(id)}}],
		});
		this.Blocs.forEach(function(bloc) {
			let mainDir = Z.folder(bloc.File);
			//let dir = Z.folder(Report.cleanFileName(bloc.Name));
			let dir = mainDir.folder(Report.cleanFileName(bloc.Name));
			bloc.Sections.forEach(function(section) {
				let blob = section.export({BlobOnly: true});
				dir.file(Report.cleanFileName(section.Name + ".txt"), blob);
			});
		});
		Z.generateAsync({type: "blob"}).then(function (b) {
			let target = GetId(outputID); //Access the element only at the end
			if(target) {
				let url = URL.createObjectURL(b);
				//target.innerHTML = "<p>Click <a href=\"" + url + "\" download=\"" + fileName + "\">here</a> to download the generated zip file</p>";
				target.innerHTML = "<p>Click on the link below to download and save your file:</p><p style=\"text-align: center;\"><a href=\"" + url + "\" download=\"" + fileName + "\">" + fileName + "</a></p>"
				Form.replaceButtons(id, [{Label: "Close", Click: function() {URL.revokeObjectURL(url); Form.close(id)}}]); //Revoke the URL has it is no longer useful
			}
		});
		return this;
	}
}