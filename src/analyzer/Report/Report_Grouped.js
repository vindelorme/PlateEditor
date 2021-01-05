//************************************************************************************************************************************
// REPORT_GROUPED object - A report object to display and navigate results from aggregated areas and concentrations, as 2-entry tables
//************************************************************************************************************************************
class Report_Grouped extends Report {
	constructor(o) {
		super(o);
		let source = window.opener.Grouped;
		this.Result = source.Result; //Recover incoming data
		this.Params = source.Result.Parameters;
		this.Areas = source.Areas.map(function(a) {a.Available = true; a.Values = [{Name: a.Name, Value: a.Name, Tags: a.Tags}]; return a}); //Mark all items as available
		this.Ranges = source.Ranges.map(function(r) {r.Available = true; return r});
		this.Concentrations = source.Conc.map(function(c) {c.Available = true; return c});
		this.Menu.addTabs([ //Prepare the menu
			{Label: "Plates", SetActive: true, Content: {Type: "HTML", Value: "<fieldset><legend>Result</legend><div id=\"Plate_Select\"></div><div id=\"Plate_All\"></div></fieldset><fieldset><legend>Definitions</legend><div id=\"Definitions_Select\"><i>None available</i></div></fieldset>"} },
			{Label: "Data selected", SetActive: true,
				Content: {
					Type: "HTML",
					Value: "<div id=\"Report_Ready\"><span class=\"warning\">Resolving definitions, please wait...</span></div>" +
					"<fieldset id=\"AddRowCol\"><div id=\"Data_Options\"></div></fieldset>" +
					"<fieldset><legend>Rows</legend><div style=\"max-height: 500px; overflow: auto\" id=\"SelectedRows\"></div></fieldset>" +
					"<fieldset><legend>Columns</legend><div style=\"max-height: 500px; overflow: auto\" id=\"SelectedCols\"></div></fieldset>",
				}
			},
		]);
		this.UI = { //UI to interact with the data
			Plate: LinkCtrl.new("Select", {ID: "Plate_Select", Default: 0, List: this.Result.PlatesID, Label: "Plate", Title: "The result plate for which values will be displayed", Change: this.compute.bind(this)}),
			Rows: new RespTable({ID: "SelectedRows", Fields: ["Name"], RowNumbers: true, Array: [], onDelete: function(e) {e.Available = true}, onUpdate: function(I) {if(I === undefined || I.Action != "Select") {this.compute()}}.bind(this)}),
			Cols: new RespTable({ID: "SelectedCols", Fields: ["Name"], RowNumbers: true, Array: [], onDelete: function(e) {e.Available = true}, onUpdate: function(I) {if(I === undefined || I.Action != "Select") {this.compute()}}.bind(this)}),
			DataView: LinkCtrl.new("Select", {ID: "Data_Options", Default: 0, Label: "Aggregation", List: ["Avg, SD, N", "Average", "Column", "Row"], Preserve: true, Change: this.compute.bind(this),
				Title: "Indicates how multiple values are displayed in the grouped table: arrayed in a single column or in consecutive rows; show only the average; show the average, standard deviation and number of samples"
			}),
		}
		if(this.Result.PlatesID.length > 1) {this.UI.Plate.NavBar = true; this.UI.Plate.Lookup = {Active: false}} //Upgrade the select with navBar and LookUp if more than 10 plates
		//let b = LinkCtrl.button({Label: "Compute all", Title: "Click here to compute the stat summaries for all plates", Click: function() {}.bind(this)});
		//GetId("Plate_All").append(b);
		let buttons = LinkCtrl.buttonBar([
			{Label: "Add Rows", Title: "Click here to add rows of data to the summary table", Click: function() {this.addData("Rows")}.bind(this)},
			{Label: "Add Columns", Title: "Click here to add columns of data to the summary table", Click: function() {this.addData("Cols")}.bind(this)},
		]);
		GetId("AddRowCol").prepend(buttons);
		this.Ranges.forEach(function(r, i) { //For each definition input, prepare a select to change the plate used for resolution of the range item
			let d = r.Definition;
			if(d !== undefined) {
				let sel = LinkCtrl.new("Select", {ID: "Definitions_Select", NewLine: true, Index: i, Default: 0, List: d.PlatesID, Label: d.Area.Name, Title: "The plate to use for the resolution of the names for this range", Change: function(v) {
					this.resolveNames(d, i).then(function(names) { //Fetch the names for the plate selected for this range
						this.ResolvedNames[i] = names; //Update the name property for this definition
						this.updateNames(d.Area, i); //Update the diplayed names
					}.bind(this));
				}.bind(this)});
				if(sel.List.length > 10) {sel.NavBar = true; sel.Lookup = {Active: false} }
				if(i > 0) {sel.Preserve = true}
				this.UI["Definition_" + i] = sel;
			}
		}, this);
		this.resolveAllNames().then(function() { //Start by recovering all definitions names
			this.Ready = true;
			GetId("Report_Ready").remove();
		}.bind(this));
		GetId("Output").innerHTML = "<p class=\"Note\">Add Rows and Columns of data to start</p>"; //Welcome message
		return this;
	}
	//Methods
	addData(entry) { //Addition of rows/cols into the data tables
		let id = "Form_AddData";
		let available = id + "_Available";
		let selected = id + "_Selected";
		let availableMenu = new TabControl({
			ID: available,
			Layout: "Menu",
			Tabs: [
				{Label: "Areas", Active: true, Content: {Type: "HTML", Value: this.available("Areas", available, selected)} },
				{Label: "Ranges", Content: {Type: "HTML", Value: this.available("Ranges", available, selected)} },
				{Label: "Concentrations", Content: {Type: "HTML", Value: this.available("Concentrations", available, selected)} },
			]
		});
		let html = "";
		html += "<fieldset style=\"width:350px; overflow: auto; float: left\"><legend>Data available</legend><p class=\"Note\">Click to select data</p><div id=\"" + available + "\"></div></fieldset>";
		html += "<fieldset style=\"margin-left: 400px;\"><legend>Selected</legend><p class=\"Note\">Click to unselect data</p><div id=\"" + selected + "\" style=\"border-top: 1px solid silver; float: left\"></div></fieldset>";
		Form.open({
			ID: id,
			Size: 800,
			Title: "Add " + entry,
			HTML: html,
			Buttons: [
				{Label: "Ok", Click: function() {
					let rows = GetId(selected).children;
					this.updateSelectedData(entry, rows);
					Form.close(id);
				}.bind(this)},
				{Label: "Cancel", Click: function() {
					let rows = GetId(selected).children;
					this.updateSelectedData(entry, rows, {Cancel: true}); //Cancel flag
					Form.close(id);
				}.bind(this)}
			],
			onInit: function() {
				availableMenu.init();
				let rows = GetId(id).getElementsByClassName("Selectable_Row");
				let l = rows.length;
				for(let i=0; i<l; i++) {
					rows[i].addEventListener("click", function(e) { //Initialize the click event on each row
						this.moveRow(e.target, available, selected);
					}.bind(this));
				}
			}.bind(this),
			onCancel: function() {
				let rows = GetId(selected).children;
				this.updateSelectedData(entry, rows, {Cancel: true})
			}.bind(this),
		});
	}
	available(category, sourceID, targetID) { //Create an html list of the items available for the desired category
		let id = sourceID + "_" + category;
		let html = "<div id=\"" + id + "\" style=\"border-top: 1px solid silver\">";
		let source = this[category];
		source.forEach(function(s, i) {
			let toDisplay = s.Name;
			if(s.Unit) {toDisplay = s.Unit + " (" + s.Values.length + " values)"}
			if(s.Type == "Range") {toDisplay += " (" + s.Values.length + " items)"}
			html += "<div class=\"Selectable_Row\" category=\"" + category + "\" originID=\"" + id + "\" originIndex=\"" + i + "\"";
			if(s.Available == false) {html += " style=\"display: none\""}
			html += ">" + toDisplay + "</div>";
		});
		html += "</div>";
		return html;
	}
	moveRow(div, available, selected) { //Swap the clicked row from available/selected tables
		let cat = div.getAttribute("category");
		let index = Number(div.getAttribute("originIndex"));
		let obj = this[cat][index];
		if(obj.Available) { //Data is available, move to the selected box
			obj.Available = false;
			GetId(selected).insertBefore(div, null); //Move the div
		}
		else { //Not available, remove it from the selected box
			obj.Available = true;
			let target = GetId(div.getAttribute("originID"));
			let childs = target.children;
			let l = childs.length;
			let inserted = false;
			let i = 0;
			while(inserted == false && i<l) { //Find the insertion point
				if(childs[i].getAttribute("originIndex") > index) { //We need the object with the index just above
					target.insertBefore(div, childs[i]);
					inserted = true;
				}
				else {i++}
			}
			if(inserted == false) {target.insertBefore(div, null)} //No insertion point left, append it at the end
		}
	}
	updateSelectedData(entry, rows, I) { //Following selection by the user, update the array of items with the new selection
		let l = rows.length;
		for(let i=0; i<l; i++) { //For each selected item
			let cat = rows[i].getAttribute("category");
			let index = rows[i].getAttribute("originIndex");
			let obj = this[cat][index];
			if(I && I.Cancel) {obj.Available = true} //Unmark selected items on cancel
			else {this.UI[entry].Array.push(this[cat][index])} //Add the resolved item to the corresponding array
		}
		this.UI[entry].update(); //Update the respTable, which will trigger the compute method
	}
	resolveAllNames() { //Resolve the names for all the definitions available
		let promises = [];
		return new Promise(function(resolve) { //Return a promise that will resolve when the parsing is completed
			this.Ranges.forEach(function(r, i) { //For each definition, start the fetching process
				let d = r.Definition;
				if(d !== undefined) {
					promises.push(this.resolveNames(d, i));
				}
				else {promises.push(undefined)} //Push something to maintain index synchronization with Ranges and Definitions arrays
			}, this);
			Promise.all(promises).then(function(names) { //When all the fetching is done, update the object property with the resolved names
				this.ResolvedNames = names;
				resolve();
			}.bind(this));
		}.bind(this));
	}
	resolveNames(d, defIndex) { //Resolve the names for the definition passed
		let a = d.Area;
		let factor = Math.ceil(a.Tagged / a.Replicates);
		let args = {
			Plate: this.UI["Definition_" + defIndex].Selected, //Name of the plate where to look the data
			Factor: factor, //This factor is necessary to find the data in case no well/plate mapping are available
			Default: "", //Default fallback if the element needed is outside the list
			AreaName: a.Name, //To complete generic items
			Column: d.Mapping[Mapper.definition().Name], //Index of the column containing the data to extract
			RangeIndexBase0: a.MaxRange, //Providing the maxRange ensures that the array is filled with generic items if there is not enough definitions available in the file
			FindAll: true,
		}
		return new Promise(function(resolve) {
			d.Mapper.find(d, args).then(function(array) {resolve(array)});
		});
	}
	updateNames(range, index) { //Update the names for the rangeIndex provided, or all the ranges if nothing is passed
		let source = this.Ranges; //Fallback that will be used if range is undefined
		if(range !== undefined) { //A specific range is provided
			source = Array(this.Ranges.length);
			source[index] = range; //This is to ensure we can use the position in the array to find the correct definitions
		}
		let collection = GetId("Output").getElementsByTagName("TH");
		let l = collection.length;
		for(let i=0; i<l; i++) { //Travel the collection and search for matching names
			let th = collection[i];
			let string = th.innerHTML;
			if(th.hasAttribute("RootName")) {string = th.getAttribute("RootName")} //In this case, recover the saved generic name
			else {th.setAttribute("RootName", string)} //Save the generic name before making modifications
			source.forEach(function(r, j) { //For each range
				if(r !== undefined && this.ResolvedNames[j] !== undefined) { //When a single range is provided, only one element of the array is defined. And when the range has no definitions, the resolved names are absent
					let name = r.Name + " #";
					let n = name.length;
					let pos = string.indexOf(name);
					if(pos > -1) { //The title includes this name
						pos += n; //Update position to start at the #
						let end = string.indexOf(" ", pos); //Find the position of the next space
						let RangeIndex = Number(string.substring(pos, end)); //Extract the range index value
						if(end == -1) {RangeIndex = Number(string.substring(pos))} //In cases where the name is not succeded by a unit or another area, the rangeIndex is up to the end of the string
						th.innerHTML = string.replace(name + RangeIndex, this.ResolvedNames[j][RangeIndex - 1]); //Replace the generic name with the definition
					}
				}
			}, this);
		}
	}
	getValues(selectedPlate) { //Retrieve all the parameter values for for the selected plate, as an 2D array the size of the plate
		let o = {Items: 0, Values: [], Params: []} //Output object containing the data for one plate
		this.Params.forEach(function(p, i) { //Initialize empty array to receive the values for each selected parameters that is set as numeric
			if(p.Selected && p.Numeric) { //This parameter is selected and numeric type, continue
				o.Params.push({Index: i, Name: p.Name});
				o.Values.push([]); //Create empty arrays to receive the values for each parameter
			}
		}, this);
		this.waitMessage(o.Params); //This displays waiting message
		let custom = function(well, plate, row, output, parser) { //The function to run on each line
			if(plate == selectedPlate) { //We are on the right plate
				let wellIndex = well.Index;
				output.Params.forEach(function(param, i) { //Log the values for all parameters
					output.Values[i][wellIndex] = row[param.Index];
				});
			}
		}
		return new Promise(function(resolve) {
			this.Result.Mapper.scan(this.Result, {Custom: custom}, o).then(function(data) {
				resolve(data);
			});
		}.bind(this));
	}
	waitMessage(params) { //Display a waiting message
		let msg = "<span class=\"warning\">Parsing values, please wait...</span>";
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, param.Name);
			bloc.Sections.forEach(function(s) {
				if(s.Summary === undefined) {s.replaceContent(msg)}
			});
		}, this);
	}
	compute() { //Do the job
		let rows = this.UI.Rows.Array;
		let cols = this.UI.Cols.Array;
		if(rows.length == 0 || cols.length == 0 || this.Ready != true) {return this}
		let plate = this.UI.Plate.Selected;
		let aggregation = this.UI.DataView.Selected;
		this.getValues(plate).then(function(data) {
			data.Params.forEach(function(p, i) {
				let section = Report.getBloc(this, p.Name).getSection("Values", {TableType: "Grouped"});
				let table = this.valueTable(rows, cols, data, i, aggregation);
				section.replaceContent("<p class=\"Title\">Data for plate: " + plate + "</p>" + table.HTML);
			}, this);
			this.updateNames();
		}.bind(this));
	}
	valueTable(rows, cols, data, paramIndex, aggregation) { //The table that will hold the data
		return Analyzer.groupedTable(rows, cols, data.Values[paramIndex], aggregation);
	}
	/*
	computeStats(I) {
		let plate = this.UI.Plate.Selected;
		this.getValues(plate).then(function(data) { //Collect values for this plate
			let stats = this.processValues(data, plate); //Display the individual values and compute the stats
			if(this.Result.PlatesID.length > 1) { //If there are more than one plate attached to this result, then also create/update the Plate summary table
				this.plateSummary(data, plate, stats);
			}
			if(I && I.UpdateNames) {this.updateNames()}
		}.bind(this));
		return this;
	}
	processValues(data, plate) { //Process incoming data, as an array of object containing the values for each parameter and areas
		let stats = [];
		data.Params.forEach(function(param, i) { //Process all parameters
			let section = Report.getBloc(this, param.Name).getSection("Values", {TableType: "Inner"});
			let table = this.valueTable(data, i);
			section.replaceContent("<p class=\"Title\">Data for plate: " + plate + "</p>" + table.HTML);
			stats.push(table.Stats);
		}, this);
		return stats;
	}
	valueTable(data, valueIndex) { //Create the table holding values for all area, using values for the parameter at the index given
		let o = []; //The array that will be used by the analyzer to create the table
		data.Areas.forEach(function(a) { //Process all the areas
			o.push({Label: a.Name, Values: a.Values[valueIndex], Visible: a.Selected});
		});
		return Analyzer.objectToTable(o);
	}
	plateSummary(data, plate, stats) { //Update the plate summary by adding a row for the plate in each relevant table
		let tables = this.plateSummaryTables(data);
		data.Params.forEach(function(param, i) { //Process all parameters
			let section = Report.getBloc(this, param.Name).getSection("Plate Summary", {Summary: true, Tables: tables, Headers: ["Plate", "Average", "SD", "CV (%)", "N"], TableType: "Inner"});
			if(stats[i]) {
				tables.forEach(function(t, j) { //Loop through the areas
					let s = stats[i][j];
					section.updateTable(j, "Plate", plate, [plate, s.Avg, s.SD, s.CV, s.N], {Visible: t.Visible});
				});
			}
			else {section.hideAllTables()}
		}, this);
	}
	plateSummaryTables(data) {
		let tables = [];
		data.Areas.forEach(function(a) {
			tables.push({Title: a.Name, Visible: a.Selected});
		});
		return tables;
	}
	statsAllPlates() {
		
	}
	*/
}