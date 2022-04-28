//************************************************************************************************
// REPORT_AGGREGATE object - A report object to display and navigate results from aggregated areas
//************************************************************************************************
class Report_Aggregate extends Report {
	constructor(o) {
		super(o);
		let source = window.opener.Aggregate;
		source.Combinations.A.forEach(function(c) {c.Selected = true}); //Mark all areas as selected
		this.Ranges = source.Ranges;
		this.Menu.addTabs([ //Prepare the menu
			{Label: "Areas", SetActive: true, Content: {Type: "HTML", Value: "<div style=\"max-height: 500px; overflow: auto\" id=\"Areas\"></div>"} },
		]);
		this.UI.A = new RespTable({ID: "Areas", Fields: ["Name"], RowNumbers: true, NoControls: true, Multiple: true, Array: source.Combinations.A, onSelect: this.computeStats.bind(this)});
		let b = LinkCtrl.button({Label: "Compute all", Title: "Click here to compute the stat summaries for all plates", Click: function() {this.statsAllPlates()}.bind(this)});
		GetId(this.Anchors.PlateDoAll).append(b);
		let bar = LinkCtrl.buttonBar([
			{Label: "Unselect all", Title: "Click here to unselect all areas", Click: function() {this.UI.A.setValue([]); this.computeStats()}.bind(this)},
			{Label: "Select all", Title: "Click here to select all areas", Click: function() {this.UI.A.selectAll(); this.computeStats()}.bind(this)},
		]);
		GetId("Areas").parentElement.prepend(bar);
		this.prepareDefinition();
		return this;
	}
	//Methods
	do() {
		if(this.NameResolved) { //Names were already resolved, proceed
			this.computeStats();
		}
		else { //First resolve the names
			this.resolveAllNames().then(function() { //Start by recovering all definitions names
				this.NameResolved = true;
				this.computeStats(); //Compute the stats
			}.bind(this));
		}
		return this;
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
		let factor = a.MaxRange;
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
			d.Mapper.find(d, args).then(function(array) {
				let mode = Mapper.modeWellPlate(d.Mapping);
				switch(mode) { //For mapping without well location, the array returned is the list of object available, can be returned as is. Otherwise, should convert the plate array to a flat array of item
					case "Plate": //FALL-THROUGH
					case "Direct": resolve(array); break;
					case "Well": //FALL-THROUGH
					case "PlateWell": 
						let items = [];
						this.Ranges[defIndex].Values.forEach(function(v) { //Look at the individual items for this range
							items.push(array[v.Tags[0]]); //Get the index of the first well tagged for this rangeItem, and log its definition. We enforce here that other wells for this RangeItem share the same definition, even if this is wrong
						});
						resolve(items);
					break;
				}
			}.bind(this));
		}.bind(this));
	}
	updateNames(range, index) { //Update the names for the rangeIndex provided, or all the ranges if nothing is passed
		let source = this.Ranges;
		if(range !== undefined) { //A specific range is provided
			source = Array(this.Ranges.length);
			source[index] = range; //Create an empty array except for this index. This is to ensure we can use this index to find the matching definitions
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
	getValues(selectedPlate) { //Retrieve the values for all areas and parameters, for the selected plate
		this.UI.A.Array.forEach(function(a) { //For each area
			a.Values = []; //Reset value arrays to accept new values
		});
		let resultIndex = this.Results.SelectedIndices[0] + 1; //The index of the result file selected (1-based), unique
		let o = {Items: 0, Areas: this.UI.A.Array, Params: []} //Output object containing the data for one plate
		this.Params.forEach(function(p, i) { //Initialize empty array to receive the values for each selected parameters that is set as numeric
			if(p.Selected) { //This parameter is selected, continue
				o.Params.push({Index: i, Name: p.Name, ResultIndex: resultIndex, Numeric: p.Numeric});
				o.Areas.forEach(function(a) { //For each area
					a.Values.push([]); //Create empty arrays to receive the values
				});
			}
		}, this);
		this.waitMessage(o.Params); //This displays waiting message
		let custom = function(well, plate, row, output, parser) { //The function to run on each line
			if(plate == selectedPlate) { //We are on the right plate
				let wellIndex = well.Index;
				output.Areas.forEach(function(a) { //For each area
					if(a.Tags.includes(wellIndex)) { //This area is tagged on this well
						output.Params.forEach(function(param, i) { //Log the values for all parameters
							if(param.Numeric) {a.Values[i].push(Number(row[param.Index]))}
							else {a.Values[i].push(row[param.Index])}
						});
					}
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
		let msg = "<br><span class=\"Warning\">Parsing values, please wait...</span>";
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			bloc.Sections.forEach(function(s) {
				if(s.Summary === undefined) {s.replaceContent(msg)}
			});
		}, this);
	}
	computeStats() {
		let plate = this.UI.Plate.Selected;
		this.getValues(plate).then(function(data) { //Collect values for this plate
			let stats = this.processValues(data, plate); //Display the individual values and compute the stats
			if(this.Result.PlatesID.length > 1) { //If there are more than one plate attached to this result, then also create/update the Plate summary table
				this.plateSummary(data, plate, stats);
			}
			this.updateNames();
		}.bind(this));
		return this;
	}
	processValues(data, plate) { //Process incoming data, as an array of object containing the values for each parameter and areas
		let stats = [];
		data.Params.forEach(function(param, i) { //Process all parameters
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Values", {TableType: "Inner"});
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
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Plate Summary", {Summary: true, Tables: tables, Headers: ["Plate", "Average", "SD", "CV (%)", "N"], TableType: "Inner"});
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
	async statsAllPlates() { //Compute data for all plates, one after the other
		this.Cancel = false;
		let plates = this.Result.PlatesID;
		let tables = this.plateSummaryTables({Areas: this.UI.A.Array});
		Report.lock(this, plates.length); //Lock the report and start
		let plateCounter = Report.plateIterator(plates); //A generator to loop over the plates
		let current = plateCounter.next();
		let running = 0;
		while(current.done == false && this.Cancel == false) { //Do this until the plate counter is exhausted or the user cancel the action
			let currentPlate = current.value; //Current plate to analyze
			let section = Report.getBloc(this, this.Blocs[this.FirstBlocIndex].Name).getSection("Plate Summary", {Summary: true, Tables: tables, Headers: ["Plate", "Average", "SD", "CV (%)", "N"], TableType: "Inner"}); //Get the first section available. All sections share the data so we don't have to test for each of them
			if(section.hasData(0, "Plate", currentPlate) == false) { //If the values for this plate are not already logged, process it
				let data = await this.getValues(currentPlate)
				let stats = this.processValues(data, currentPlate); //Display the individual values and compute the stats
				this.plateSummary(data, currentPlate, stats);
				this.UI.Plate.setValue(running); //Ensures that the control is set at the same value as the last computed plate
			}
			current = plateCounter.next();
			running++;
			Report.plateCount(running + 1);
		}
		Report.unlock();
	}
}