//*****************************************************************************************************************************************
// REPORT_HITS object - A report object to display and navigate hits gather from all plates, given configured thresholds for the parameters
//*****************************************************************************************************************************************
class Report_Hits extends Report {
	constructor(o) {
		super(o);
		let source = window.opener.Hits;
		this.Layout = source.Layout;
		this.Ranges = source.Ranges; //Array of incoming range
		this.Controls = source.Controls.N.concat(source.Controls.P);
		this.Controls.forEach(function(c) {c.Stats = []}); //Empty arrays to hold the value of the global average when calculated
		GetId(this.Anchors.Output).insertAdjacentHTML("beforebegin", "<fieldset><legend>Options</legend><div id=\"Config\"></div></fieldset><div id=\"Start\" style=\"margin: 10px\"></div>");
		let opt = { //Additional UI options
			Threshold: LinkCtrl.new("Number", {ID: "Start", Default: 50, Label: "Threshold (%)", Chain: {Index: 0},
				Title: "Indicate here the threshold to use for hit selection, as a percentage. All values above the threshold will be selected"
			}),
			Limit: LinkCtrl.new("Select", {ID: "Start", Default: 3, Label: "Hit limit", Chain: {Index: 1, Last: true}, List: [100, 500, 1000, 5000, 10000, 50000],
				Title: "Limit for the number of hits that can be collected by a single parameter. The hit search will stop when any given parameter reaches this limit"
			}),
			Mode: LinkCtrl.new("Radio", {ID: "Config", Default: 0, Label: "Mode", List: ["Global", "Plate", "Custom"],
				Change: function(v) {
					if(v == 2) {
						GetId("Custom").style.display = "block";
						GetId("Control").style.display = "none";
					}
					else {
						GetId("Custom").style.display = "none";
						GetId("Control").style.display = "block";
					}
				}, Title: "Whether the normalization should be done using the aggregated control values from the entire set of plates (Global), on a plate-by-plate basis (Plate), or a set of values manually provided (Custom)",
			}),
			ControlHigh: LinkCtrl.new("Select", {ID: "Control", Default: 0, Label: "Control High (100%)", List: this.Controls.map(function(c) {return c.Name}), Chain: {Index: 0},
				Title: "Select the control to use as reference for the high percentage. The average of all its values will be used as the 100% reference"
			}),
			ControlLow: LinkCtrl.new("Select", {ID: "Control", Default: 0, Label: "Control Low (0%)", List: this.Controls.map(function(c) {return c.Name}), Chain: {Index: 1, Last: true},
				Title: "Select the control to use as reference for the low percentage. The average of all its values will be used as the 0% reference"
			}),
			CustomHigh: LinkCtrl.new("Number", {ID: "Custom", Default: 0, Label: "High (100%)", Chain: {Index: 0}, Title: "The value to use as reference for the high percentage. Will be used as the 100% reference"}),
			CustomLow: LinkCtrl.new("Number", {ID: "Custom", Default: 0, Label: "Low (0%)", Chain: {Index: 1, Last: true}, Title: "The value to use as reference for the low percentage. Will be used as the 0% reference"}),
		}
		Object.assign(this.UI, opt);
		GetId("Config").insertAdjacentHTML("afterend", "<div id=\"Control\"></div><div id=\"Custom\" style=\"display: none\"></div>");
		this.prepareDefinition();
		return this;
	}
	//Static methods
	static waitMsg() {
		return "<div class=\"HitStatus\"><span class=\"Warning\">Scanning for hit values, please wait...</span></div><div class=\"ResolveStatus\"></div>";
	}
	static logRange(content, plate, toResolve) { //Log the ranges and plates associated to this well content in the toResolve array, so that it can be resolved later
		if(content.Ranges.length > 0) { //At least one range is there
			content.Ranges.forEach(function(r) { //Loop the ranges
				if(r.Range.Definition !== undefined) { //Ignore ranges without definitions (not resolvable)
					let found = toResolve.find(function(a) {return a.Range.Name == r.Range.Name});
					if(found === undefined) {toResolve.push({Range: r.Range, Plate: [plate]})} //Init a new entry for this range
					else { //Range already exist, update the plate list...
						if(found.Plate.includes(plate) == false) {found.Plate.push(plate)} //...When necessary
					}
				}
			});
		}
	}
	static compareCtrl(High, Low, ui) { //Compare the controls and return false if same are selected
		if(ui.Mode.Selected == "Custom") {
			if(ui.CustomHigh.getValue() == ui.CustomLow.getValue()) {return false}
		}
		else {
			if(High.Name == Low.Name) {return false}
		}
		return true;
	}
	//Methods
	do() { //This should do nothing here
		if(this.Ready === undefined) { //First activation of the report
			let start = GetId("Start");
			let b = LinkCtrl.button({Label: "Start", Title: "Click here to start computing the hits for all plates of the selected result file", Click: function() {this.compute()}.bind(this)});
			start.insertAdjacentHTML("beforeend", "&nbsp;");
			start.append(b); //Place the button
			start.insertAdjacentHTML("beforeend", "&nbsp;<span id=\"ErrorMsg\" class=\"Warning\"></span>");
			this.Ready = true;
		}
		return this;
	}
	resolveNames() { //Function should be available to allow correct functioning of the pairing display
		return Promise.resolve(undefined);
	}
	updateNames() { //Function should be available to allow correct functioning of the pairing display
		return this;
	}
	async compute() { //Do the job
		this.Cancel = false; //Reset to prepare a new run
		this.Stop = false;
		let resultIndex = this.Results.SelectedIndices[0]; //The index of the result file selected (0-based), unique
		let o = {Items: 0, Params: [], Values: []} //Output object containing the data
		o.HitLimit = this.UI.Limit.Selected; //Hit limit
		this.Params.forEach(function(p, i) { //Initialize empty array to receive the values for each selected parameters that is set as numeric
			if(p.Selected && p.Numeric) { //This parameter is selected and numeric type, continue
				let param = {Index: i, Name: p.Name, ResultIndex: resultIndex + 1}
				o.Params.push(param);
				o.Values.push({H: [], L: []}); //Create empty arrays to receive the values for each parameter
			}
		}, this);
		let High = this.getControlHigh(resultIndex, o.Params);
		let Low = this.getControlLow(resultIndex, o.Params);
		if(Report_Hits.compareCtrl(High, Low, this.UI) == false) {
			GetId("ErrorMsg").innerHTML = "High and Low controls should not be the same! Check your inputs before continuing";
			return;
		}
		else {GetId("ErrorMsg").innerHTML = ""}
		switch(this.UI.Mode.Selected) { //Each mode is treated differently
			case "Global": case "Custom": //Global search, first get the aggregated control values, then get the hits
				this.waitMessage(o.Params); //Displays waiting message
				await this.aggregateCtrl(High, Low, resultIndex, o); //Aggregate the control values for the entire result file, then re-compute the entire file to normalize the data and extract the "hits"
				this.reportControl(High, Low, resultIndex, o);
				let data = await this.findHitsGlobal(High, Low, resultIndex, o); //Wait for the hit list to come back then report it
				this.reportHits(data, o.Params, resultIndex); //Report the hits
				await this.resolveHitNames(data, o.Params, resultIndex); //Start the resolution process
				this.done(data, o.Params); //Finalize
				break;
			case "Plate": //In this mode, plates are treated sequentially
				let end = await this.findHitsLocal(High, Low, resultIndex, o); //Wait for the hit selection process to finish for all plates
				this.reportHits(end, o.Params, resultIndex); //Report the hits
				await this.resolveHitNames(end, o.Params, resultIndex); //Start the name resolution process
				this.done(end, o.Params); //Finalize
				break;
			default: break;
		}
		return this;
	}
	aggregateCtrl(High, Low, resultIndex, o) { //Aggregate the values for the high and low controls provided by their name
		return new Promise(function(resolve) {
			if(High.Stats[resultIndex] !== undefined && Low.Stats[resultIndex] !== undefined) { //Values already exist, resolve
				resolve();
			}
			else { //Scan the result file to get the values
				High.Stats[resultIndex] = [];
				Low.Stats[resultIndex] = [];
				let f = function(well, plate, row, output, parser) { //The function to run on each line
					let wellIndex = well.Index;
					if(High.Tags.includes(wellIndex)) { //This well belongs to the control high
						output.Params.forEach(function(param, i) { //Log the values for all parameters
							output.Values[i].H.push(Number(row[param.Index]));
						});
					}
					if(Low.Tags.includes(wellIndex)) { //Belongs to control low
						output.Params.forEach(function(param, i) { //Log the values for all parameters
							output.Values[i].L.push(Number(row[param.Index]));
						});
					}
				};
				this.Result.Mapper.scan(this.Result, {Custom: f}, o).then(function(data) {
					data.Params.forEach(function(param, i) { //Log the average values for all parameters
						High.Stats[resultIndex][i] = Coordinate.statValue(data.Values[i].H);
						Low.Stats[resultIndex][i] = Coordinate.statValue(data.Values[i].L);
						data.Values[i].H = []; //Free memory space by releasing the list of values
						data.Values[i].L = [];
					});
					resolve();
				});
			}
		}.bind(this));
	}
	getControlHigh(resultIndex, params) { //Return the high Control
		if(this.UI.Mode.Selected == "Custom") { //Create an object in situ to match the custom parameters
			let stats = [];
			stats[resultIndex] = [];
			let high = this.UI.CustomHigh.getValue();
			params.forEach(function(p) {
				stats[resultIndex].push({Average: high, SD: "", N: ""});
			});
			return {Name: "Custom High", Tags: [], Stats: stats}
		}
		else {
			let name = this.UI.ControlHigh.Selected;
			return this.Controls.find(function(c) {return c.Name == name})
		}
	}
	getControlLow(resultIndex, params) { //Return the Low Control
		if(this.UI.Mode.Selected == "Custom") { //Create an object in situ to match the custom parameters
			let stats = [];
			stats[resultIndex] = [];
			let low = this.UI.CustomLow.getValue();
			params.forEach(function(p) {
				stats[resultIndex].push({Average: low, SD: "", N: ""});
			});
			return {Name: "Custom Low", Tags: [], Stats: stats}
		}
		else {
			let name = this.UI.ControlLow.Selected;
			return this.Controls.find(function(c) {return c.Name == name})
		}
	}
	waitMessage(params) { //Display a waiting message
		let msg = "<br><span class=\"Warning\">Aggregating control values, please wait...</span>";
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			bloc.Sections.forEach(function(s) {
				if(s.Summary === undefined) {s.replaceContent(msg)}
			});
		}, this);
		return this;
	}
	reportControl(High, Low, resultIndex, o) { //Write a report for the summary of the control values
		o.Params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			let section = bloc.getSection("Control summary");
			let html = "<table class=\"OuterTable\" style=\"margin-top: 20px\"><tr><td></td><th>" + High.Name + " (100%)</th><th>" + Low.Name + " (0%)</th></tr>";
			html += "<tfoot>";
			html += "<tr><td>Average</td>" + Analyzer.cellForValue(High.Stats[resultIndex][i].Average, {Type: "#"}) + Analyzer.cellForValue(Low.Stats[resultIndex][i].Average, {Type: "#"}) + "</tr>";
			html += "<tr><td>SD</td>" + Analyzer.cellForValue(High.Stats[resultIndex][i].SD, {Type: "#"}) + Analyzer.cellForValue(Low.Stats[resultIndex][i].SD, {Type: "#"}) + "</tr>";
			let display = "none";
			if(this.Options.CV.getValue()) {display = "table-row"} //Show CV only if desired
			html += "<tr class=\"CV_Row\" style=\"display: " + display + "\"><td>CV</td>" + Analyzer.cellForValue(High.Stats[resultIndex][i].CV, {Type: "#"}) + Analyzer.cellForValue(Low.Stats[resultIndex][i].CV, {Type: "#"}) + "</tr>";
			html += "<tr><td>N</td>" + Analyzer.cellForValue(High.Stats[resultIndex][i].N, {Type: "#"}) + Analyzer.cellForValue(Low.Stats[resultIndex][i].N, {Type: "#"}) + "</tr>";
			html += "</tfoot></table>";
			section.replaceContent(html);
			section.TableType = "Mixed"; //This is to allow export of the OuterTable
		}, this);
		return this;
	}
	findHitsGlobal(High, Low, resultIndex, o) { //Extract hits from the result file, using global average calculated earlier
		let percent = this.UI.Threshold.getValue();
		let t = percent / 100;
		let title = "Hits for threshold " + percent + "%";
		let diff = []; //Array to hold the diffs for each parameter
		let counts = []; //How many hits for each parameter
		let toResolve = []; //Array that will hold the plate name for each range that need to be resolved
		o.Params.forEach(function(param, i) { //Prepare arrays for each parameters
			diff[i] = High.Stats[resultIndex][i].Average - Low.Stats[resultIndex][i].Average;
			counts[i] = 0;
			let section = Report.getBloc(this, Report.blocName(param)).getSection(title, { //Create or retrieve the section for all parameters
				Summary: false, //Using a falsy value that is not undefined allow the tables with OuterTable class to be exported normally, while preventing the content to be overwritten when using waitMessage
				Tables: [{Visible: true}],
				Headers: ["#", "Plate", "Well", "Content", "Raw value", "Normalized value"],
				TableType: "Inner",
			});
			section.initTable(0, this.Options, {WaitMsg: Report_Hits.waitMsg()});
		}, this);
		if(diff.reduce(function(acc, val) {return (acc && (val == 0))}, true)) { //If all diffs are zero, its a Fail...
			return Promise.resolve({Status: "Fail", Section: title, Resolvable: [], Hits: counts, Msg: "The average for the High and Low controls are the same! Check the selected controls and try again"});
		}
		let f = function(well, plate, row, output, parser) { //The function to run on each line
			let wellIndex = well.Index;
			let content = this.Layout[wellIndex];
			if(content.Type == 0 || content.Type == 1) {return} //Exclude any well that has been tagged as pure control type
			output.Params.forEach(function(param, i) { //Check values for all parameters
				if(diff[i] != 0) { //Do something only if the diff is not zero
					let val = Number(row[param.Index]);
					let norm = 0;
					if(diff[i] < 0) {norm = 1 - (High.Stats[resultIndex][i].Average - val) / diff[i]}
					else {norm = (val - Low.Stats[resultIndex][i].Average) / diff[i]}
					if(norm >= t) { //Found a hit
						counts[i]++;
						let section = Report.getBloc(this, Report.blocName(param)).getSection(title); //Get the section that was initialized before
						section.addRow(0, [counts[i], plate, well.Name, content.HTML, val, norm * 100], ["", "", "", "", "#", "#"]); //Update the table
						Report_Hits.logRange(content, plate, toResolve); //Log the range/plate if needed
						if(counts[i] >= output.HitLimit) { //Stop the search when too many hits are found for a single parameter
							output.Overflow = {Param: param.Name}; //Log the parameter that overflowed
							parser.abort(); //Abort the search
						}
					}
				}
			}, this);
		}.bind(this);
		return new Promise(function(resolve) {
			this.Result.Mapper.scan(this.Result, {Custom: f}, o).then(function(data) {
				let out = {Status: "Done", Msg: "Done", Hits: counts, Section: title, Resolvable: toResolve};
				if(data.Overflow !== undefined) {out.Status = "Overflow", out.Msg = "Hit limit (" + o.HitLimit + ") reached for parameter: <b>" + data.Overflow.Param + "</b>; search aborted"}
				resolve(out);
			});
		}.bind(this));
	}
	reportHits(data, params, resultIndex) { //Screening done and update the waiting messages
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			let section = bloc.getSection(data.Section);
			let S = GetId(section.ID);
			let p = S.getElementsByClassName("HitStatus")[0]; //The paragraph with the status
			if(data.Status == "Fail" || data.Status == "Overflow") {p.innerHTML = "<span class=\"Warning\">" + data.Msg + "</span>"}
			else {p.innerHTML = "<span class=\"Success\">Found " + data.Hits[i] + " Hits</span>"}
		}, this);
		return this;
	}
	async resolveHitNames(data, params, resultIndex) { //Resolve all names by parsing the data plate by plate and resolving through all sections
		let totalPlate = data.Resolvable.reduce(function(acc, val) {return acc += val.Plate.length}, 0);
		let count = 0; //Current count of plate
		let pairing = this.Results.Array[resultIndex].Pairing;
		if(pairing === undefined) {return} //No resolution needed in this case
		let l = data.Resolvable.length; //Number of range to process
		for(let i=0; i<l; i++) { //Loop the ranges
			let r = data.Resolvable[i];
			let def = r.Range.Definition; //The definition for this range
			let plateCounter = Report.plateIterator(r.Plate); //A generator to loop over the result plates
			let current = plateCounter.next();
			while(current.done == false && this.Stop == false) { //Loop all the result plates and stops if a signal is triggered
				let p = current.value.toString(); //Name of the current result plate to analyze. Should always be used as a text, force it here for generic index
				let plateIndex = this.UI.Plate.List.findIndex(function(n) {return n == p}); //Index of the result plate
				let pair = pairing.Pairs[plateIndex]; //The pair object defined for this result plate
				let defPlate = def.PlatesID[0]; //Use this as a fallback value in case no pairing is available
				if(pair !== undefined) { //Only paired plates needs resolution
					defPlate = pair.getPair(r.Range.Name); //Use the paired definition plate when available
					let resolved = await def.getPlate(defPlate.Name); //Fetch all the names for this definition plate
					params.forEach(function(param) { //Process all parameters
						let bloc = Report.getBloc(this, Report.blocName(param));
						let section = bloc.getSection(data.Section);
						section.resolveNames({Range: r.Range, Plate: p, Names: resolved, Total: totalPlate, Count: count, Report: this});
					}, this);
				}
				current = plateCounter.next(); //Go to the next plate
				count++;
			}
			if(this.Stop) {return} //Termination signal has been received
		}
	}
	async findHitsLocal(High, Low, resultIndex, o) { //Find hits using the aggregated control values at the plate level
		let percent = this.UI.Threshold.getValue();
		let toResolve = [];
		o.Threshold = percent / 100;
		o.Title = "Plate Hits (" + percent + "%)";
		o.Counts = []; //How many hits for each parameter
		o.Params.forEach(function(param, i) { //Prepare arrays for each parameters
			o.Counts[i] = 0;
			let section = Report.getBloc(this, Report.blocName(param)).getSection(o.Title, { //Create or retrieve the section for all parameters
				Summary: false, //Using a falsy value that is not undefined allow the tables with OuterTable class to be exported normally, while preventing the content to be overwritten when using waitMessage
				Tables: [{Visible: true}],
				Headers: ["#", "Plate", "Well", "Content", "Raw value", "Normalized value"],
				TableType: "Inner",
			});
			section.initTable(0, this.Options, {WaitMsg: Report_Hits.waitMsg()});
		}, this);
		let plates = this.Result.PlatesID;
		Report.lock(this, plates.length); //Lock the report and start
		let plateCounter = Report.plateIterator(plates); //A generator to loop over the plates
		let current = plateCounter.next();
		let running = 0;
		while(current.done == false && this.Cancel == false && o.Overflow === undefined) { //Do this until the plate counter is exhausted or the user cancel the action
			let currentPlate = current.value.toString(); //Current plate to analyze. Should always be used as a text, force it here for generic index
			High.Stats[resultIndex] = []; //Remove previous data to ensure new ones are retrieved
			Low.Stats[resultIndex] = [];
			await this.getValuesLocal(High, Low, resultIndex, o, currentPlate, toResolve); //Collect values to extract hits
			this.plateSummary(High, Low, resultIndex, o, currentPlate); //Store control data
			this.getHits(High, Low, resultIndex, o, currentPlate, toResolve); //Collect hits
			current = plateCounter.next();
			this.UI.Plate.setValue(running); //Ensures that the control is set at the same value as the last computed plate
			this.pairStatus(running); //Also adjust the pairing info
			running++;
			Report.plateCount(running + 1);
		}
		High.Stats[resultIndex] = undefined; //Remove previous data to prevent interference with Global hit find
		Low.Stats[resultIndex] = undefined;
		Report.unlock();
		let out = {Status: "Done", Msg: "Done", Hits: o.Counts, Section: o.Title, Resolvable: toResolve};
		if(o.Overflow !== undefined) {out.Status = "Overflow", out.Msg = "Hit limit (" + o.HitLimit + ") reached for parameter: <b>" + o.Overflow.Param + "</b>; search aborted"}
		return out;
	}
	getValuesLocal(High, Low, resultIndex, o, currentPlate, toResolve) { //Gather values from controls and parameters for the current plate, in a single pass
		o.Params.forEach(function(param, i) { //For all parameters
			o.Values[i].P = []; //Reset the parameter values before accumulating again
			o.Values[i].H = []; //Same for controls
			o.Values[i].L = [];
		});
		let f = function(well, plate, row, output, parser) { //The function to run on each line
			if(plate != currentPlate) {return} //Not the right plate
			let wellIndex = well.Index;
			let content = this.Layout[wellIndex];
			if(content.Type == 2 || content.Type == 3) { //For wells that were tagged as a range or sample type
				output.Params.forEach(function(param, i) { //Store values for all paramaters
					output.Values[i].P.push({Well: well, Value: Number(row[param.Index])}); //Push the values
				});
			}
			else { //Other wells (controls)
				if(High.Tags.includes(wellIndex)) { //This well belongs to the control high
					output.Params.forEach(function(param, i) { //Log the values for all parameters
						output.Values[i].H.push(Number(row[param.Index]));
					});
				}
				if(Low.Tags.includes(wellIndex)) { //Belongs to control low
					output.Params.forEach(function(param, i) { //Log the values for all parameters
						output.Values[i].L.push(Number(row[param.Index]));
					});
				}
			}
		}.bind(this);
		return new Promise(function(resolve) {
			this.Result.Mapper.scan(this.Result, {Custom: f}, o).then(function(data) {
				data.Params.forEach(function(param, i) { //Log the average values for all parameters
					High.Stats[resultIndex][i] = Coordinate.statValue(data.Values[i].H);
					Low.Stats[resultIndex][i] = Coordinate.statValue(data.Values[i].L);
				});
				resolve();
			});
		}.bind(this));
	}
	getHits(High, Low, resultIndex, o, currentPlate, toResolve) { //Find the hits in the values stored for the current plate
		let t = o.Threshold;
		let pairing = this.Results.Array[resultIndex].Pairing;
		o.Params.forEach(function(param, i) { //Check values for all paramaters
			let diff = High.Stats[resultIndex][i].Average - Low.Stats[resultIndex][i].Average;
			if(diff != 0) { //Do something only if the diff is not zero
				o.Values[i].P.forEach(function(value) { //Loop all the values for this parameter
					let val = value.Value;
					let well = value.Well;
					let content = this.Layout[well.Index];
					let norm = 0;
					if(diff < 0) {norm = 1 - (High.Stats[resultIndex][i].Average - val) / diff}
					else {norm = (val - Low.Stats[resultIndex][i].Average) / diff}
					if(norm >= t) { //Found a hit
						let section = Report.getBloc(this, Report.blocName(param)).getSection(o.Title); //Get the section that was initialized before
						let index = o.Counts[i];
						o.Counts[i]++; //Update the counts
						section.addRow(0, [index + 1, currentPlate, well.Name, content.HTML, val, norm * 100], ["", "", "", "", "#", "#"]); //Update the table
						Report_Hits.logRange(content, currentPlate, toResolve); //Log the range/plate if needed
						if(o.Counts[i] >= o.HitLimit) { //Stop the search when too many hits are found for a single parameter
							o.Overflow = {Param: param.Name}; //Log the parameter that overflowed
							//parser.abort(); //Abort the search
						}
					}
				}, this);
			}
		}, this);
		return this;
	}
	done(data, params) {
		if(data.Status == "Fail") {return this}
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			let section = bloc.getSection(data.Section);
			let p = GetId(section.ID).getElementsByClassName("ResolveStatus")[0]; //The div with the resolution status
			if(this.Stop) {p.innerHTML = "<span class=\"Warning\">Name resolution stopped</span>"}
			else {p.innerHTML = ""}
			if(this.Cancel) {
				let span = GetId(section.ID).getElementsByClassName("HitStatus")[0]; //The paragraph with the status
				span.innerHTML = "<span class=\"Warning\">Found " + data.Hits[i] + " Hits; Search not completed (cancelled)</span>";
			}
		}, this);
		return this;
	}
	plateSummary(High, Low, resultIndex, o, plate) { //Log the control values found for each plate
		let tables = [
			{Title: High.Name + " (100%)", Visible: true},
			{Title: Low.Name + " (0%)", Visible: true},
		];
		o.Params.forEach(function(param, i) { //Process all parameters
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Plate Summary", {Summary: true, Tables: tables, Headers: ["Plate", "Average", "SD", "N"], TableType: "Inner"});
			tables.forEach(function(t, j) { //Loop through the control combinations
				let row = [plate];
				let source = undefined;
				if(j == 0) {source = High.Stats[resultIndex][i]}
				else {source = Low.Stats[resultIndex][i]}
				row.push(source.Average, source.SD, source.N); //Push the stats
				section.updateTable(j, "Plate", plate, row, {Visible: true});
			});
		}, this);
	}
}