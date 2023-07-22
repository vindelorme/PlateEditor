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
		this.UI.DataView = {Selected: "Column", init: function() {return}}; //Simple mimic to replace the control
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
	static waitMsg(count, itemName) {
		let msg = "<div class=\"HitStatus\">";
		msg += "<span class=\"Warning\">Scanning for hit values, please wait...</span>";
		msg += "Parsed <span class=\"LineStatus\">1</span>";
		msg += " / " + count + " " + itemName;
		msg += "</div><div class=\"ResolveStatus\"></div>";
		return msg;
	}
	static logRange(content, plate, toResolve) { //Log the ranges and plates associated to this well content in the toResolve array, so that it can be resolved later
		if(content.Ranges.length > 0) { //At least one range is there
			content.Ranges.forEach(function(r) { //Loop the ranges
				if(r.Range.Definition !== undefined) { //Ignore ranges without definitions (not resolvable)
					let found = toResolve.find(function(a) {return a.Range.Name == r.Range.Name});
					if(found === undefined) { //Init a new entry for this range
						toResolve.push({Range: r.Range, Plate: [plate]});
					}
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
			case "Global": //FALL-THROUGH
			case "Custom": //Global search, first get the aggregated control values, then get the hits
				this.waitMessage(o.Params); //Displays waiting message
				await this.aggregateCtrl(High, Low, resultIndex, o); //Aggregate the control values for the entire result file, then re-compute the entire file to normalize the data and extract the "hits"
				this.reportControl(High, Low, resultIndex, o);
				let data = await this.findHitsGlobal(High, Low, resultIndex, o); //Wait for the hit list to come back then report it
				this.update(); //Update sections with the final hit list
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
				High.Stats[resultIndex] = []; //Initialize the array to recover the data
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
				this.Result.Mapper.scan(this.Result, {Custom: f}, o).then(function(data) { //Execute the scan
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
		if(this.UI.Mode.Selected == "Custom") { //Create a pseudo-object that matches with the global method
			let stats = [];
			stats[resultIndex] = []; //Initialize array
			let high = this.UI.CustomHigh.getValue();
			params.forEach(function(p) {
				stats[resultIndex].push({Average: high, SD: "", N: ""}); //Only the user-provided value can be added here
			});
			return {Name: "High", Tags: [], Stats: stats}
		}
		else { //Global method
			let name = this.UI.ControlHigh.Selected;
			return this.Controls.find(function(c) {return c.Name == name})
		}
	}
	getControlLow(resultIndex, params) { //Return the Low Control
		if(this.UI.Mode.Selected == "Custom") { //Create a pseudo-object that matches with the global method
			let stats = [];
			stats[resultIndex] = [];
			let low = this.UI.CustomLow.getValue();
			params.forEach(function(p) {
				stats[resultIndex].push({Average: low, SD: "", N: ""});
			});
			return {Name: "Low", Tags: [], Stats: stats}
		}
		else {
			let name = this.UI.ControlLow.Selected;
			return this.Controls.find(function(c) {return c.Name == name})
		}
	}
	reportControl(High, Low, resultIndex, o) { //Write a report for the summary of the control values
		let CV = this.Options.CV.getValue();
		o.Params.forEach(function(param, i) { //Process all parameters
			let h = High.Stats[resultIndex][i];
			let l = Low.Stats[resultIndex][i];
			let json = { //JSON to create the section
				Data: [{
					Groups: [
						{Name: High.Name + " (100%)", DataPoints: [ [h.N + " values"] ]},
						{Name: Low.Name + " (0%)", DataPoints: [ [l.N + " values"] ]}
					],
					SubGroups: [], //Array must be present, even if empty
				}],
				StatRows: true,
				Stats: [h, l] //Stats are directly provided
			};
			if(h.N === "") {json.Data[0].Groups[0].DataPoints[0][0] = "Custom value"} //Make it pretty for the Custom Mode
			if(l.N === "") {json.Data[0].Groups[1].DataPoints[0][0] = "Custom value"}
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Control summary");
			section.Data = JSON.stringify(json); //Save the data as string in the section
		}, this);
		this.update(); //Update the sections
		return this;
	}
	findHitsGlobal(High, Low, resultIndex, o) { //Extract hits from the result file, using global average calculated earlier
		let percent = this.UI.Threshold.getValue();
		let t = percent / 100;
		let title = "Global Hits (" + percent + "%)";
		if(this.UI.Mode.Selected == "Custom") {title = "Custom Hits (" + percent + "%)"}
		let diff = []; //Array to hold the diffs for each parameter
		let counts = []; //How many hits for each parameter
		let toResolve = []; //Array that will hold the plate name for each range that need to be resolved
		o.Params.forEach(function(param, i) { //Prepare arrays for each parameters
			let json = this.emptyJSON(); //Empty JSON architecture to represent the hit table
			json.SyncScrolling = true;
			diff[i] = High.Stats[resultIndex][i].Average - Low.Stats[resultIndex][i].Average;
			counts[i] = 0; //Count of hits for each parameter
			let s = Report.getBloc(this, Report.blocName(param)).getSection(title, {
				Type: "Multiple",
				JSON: [json],
				Changed: true //Reset previous table
			}); 
			GetId(s.ID).insertAdjacentHTML("beforebegin", Report_Hits.waitMsg(this.Result.Parser.SelectedRows, "lines"));
		}, this);
		if(diff.reduce(function(acc, val) {return (acc && (val == 0))}, true)) { //If all diffs are zero, its a Fail...
			return Promise.resolve({
				Status: "Fail",
				Section: title,
				Resolvable: [],
				Hits: counts,
				Msg: "The average for the High and Low controls are the same! Check the selected controls and try again"
			});
		}
		o.Items = 0; //Reset the item count before starting new parsing with the same object
		let f = function(well, plate, row, output, parser) { //The function to run on each line
			let wellIndex = well.Index;
			let content = this.Layout[wellIndex];
			output.Params.forEach(function(param, i) { //Check values for all parameters
				let section = Report.getBloc(this, Report.blocName(param)).getSection(title, {Changed: false}); //Get the section that was initialized before
				if(output.Items % 2000 == 0) { //Every 1000 lines, report the progress
					let p = GetId(section.ID).parentElement.getElementsByClassName("LineStatus")[0];
					p.innerHTML = output.Items; //Update with the current line number
					section.update(); //Update the section with hits found so far
				}
				if(content.Type == 0 || content.Type == 1) {return} //Exclude any well that has been tagged as pure control type
				if(diff[i] == 0) {return} //Do something only if the diff is not zero
				let val = Number(row[param.Index]);
				let norm = 0;
				if(diff[i] < 0) {norm = 1 - (High.Stats[resultIndex][i].Average - val) / diff[i]}
				else {norm = (val - Low.Stats[resultIndex][i].Average) / diff[i]}
				if(norm >= t) { //Found a hit
					counts[i]++; //Increment the hit count for this parameter
					let results = [{Type: "text", Value: counts[i]}, plate, well.Name, content.HTML, val, norm * 100];
					let json = this.emptyJSON(); //empty json object structure
					json.Data[0].Groups.forEach(function(g, j) { //Populate the empty json with the data
						g.DataPoints[0] = [ results[j] ];
					});
					section.addRow({Data: [json]}, counts[i]); //Use the counts as comparator to ensure all hits are added, as counts are all unique
					Report_Hits.logRange(content, plate, toResolve); //Log the range/plate if needed
					if(counts[i] >= output.HitLimit) { //Stop the search when too many hits are found for a single parameter
						output.Overflow = {Param: param.Name}; //Log the parameter that overflowed
						parser.abort(); //Abort the search
					}
				}
			}, this);
		}.bind(this);
		return new Promise(function(resolve) { //Run the scan
			this.Result.Mapper.scan(this.Result, {Custom: f}, o).then(function(data) { //After Scan is complete
				let out = {Status: "Done", Msg: "Done", Hits: counts, Section: title, Resolvable: toResolve};
				if(data.Overflow !== undefined) { //Hit limit was reached
					out.Status = "Overflow";
					out.Msg = "Hit limit (" + o.HitLimit + ") reached for parameter: " + data.Overflow.Param + "; search aborted";
				}
				resolve(out);
			});
		}.bind(this));
	}
	reportHits(data, params, resultIndex) { //Screening done, report hits and update the waiting messages
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			let section = bloc.getSection(data.Section);
			let S = GetId(section.ID).parentElement; //Root for the feedback messages
			let p = S.getElementsByClassName("HitStatus")[0]; //The paragraph with the status
			let msg = "";
			if(data.Status == "Fail" || data.Status == "Overflow" || data.Status == "Aborted") { //Error during screening
				msg = "<span class=\"Warning\">" + data.Msg + "</span>";
				section.Tables[0].Title = data.Msg; //Internally update the title with the text, for export
			}
			else { //Completed normally
				let out = "Found " + data.Hits[i] + " Hits";
				msg = "<span class=\"Success\">" + out + "</span>";
				section.Tables[0].Title = out; //Internally update the title with the text, for export
			}
			p.innerHTML = msg; //Update the html
		}, this);
		return this;
	}
	async resolveHitNames(data, params, resultIndex) { //Resolve all names by parsing the data plate by plate and resolving through all sections
		let totalPlate = data.Resolvable.reduce(function(acc, val) { //Check the total number of plates to compute
			return acc += val.Plate.length;
		}, 0);
		let count = 0; //Current count of plate
		let pairing = this.Results.Array[resultIndex].Pairing;
		if(pairing === undefined) { //No resolution needed in this case
			this.convertRangeNames(data, params); //Convert the tags into simple names
			return this;
		}
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
						if(count == 0) { //On the first pass, clean up the hitStatus that is now indicated as the table title
							GetId(section.ID).parentElement.getElementsByClassName("HitStatus")[0].remove();
						}
						section.resolveNames({ //Resolve the names for this section
							Range: r.Range,
							Plate: p,
							Names: resolved,
							Total: totalPlate,
							Count: count,
							Report: this
						});
						section.update(); //Update the section with the new names
					}, this);
				}
				current = plateCounter.next(); //Go to the next plate
				count++;
			}
			if(this.Stop) { //Termination signal has been received
				this.convertRangeNames(data, params); //Convert the remaining tags into simple names
				return this;
			}
		}
	}
	async findHitsLocal(High, Low, resultIndex, o) { //Find hits using the aggregated control values at the plate level
		let percent = this.UI.Threshold.getValue();
		let toResolve = [];
		let plates = this.Result.PlatesID;
		let l = plates.length;
		o.Threshold = percent / 100;
		o.Title = "Plate Hits (" + percent + "%)";
		o.Counts = []; //How many hits for each parameter
		o.Params.forEach(function(param, i) { //Prepare arrays for each parameters
			o.Counts[i] = 0;
			let json = this.emptyJSON();
			json.SyncScrolling = true; //Allow sync scrolling of the report table
			let section = Report.getBloc(this, Report.blocName(param)).getSection(o.Title, {
				Type: "Multiple",
				JSON: [json],
				Changed: true //Reset previous table
			});
			GetId(section.ID).insertAdjacentHTML("beforebegin", Report_Hits.waitMsg(l, "plates")); //Feedback message
		}, this);
		Report.lock(this, l); //Lock the report and start
		let plateCounter = Report.plateIterator(plates); //A generator to loop over the plates
		let current = plateCounter.next();
		let running = 0; //Counter for the index of the running plate
		while(current.done == false && this.Cancel == false && o.Overflow === undefined) { //Do this until the plate counter is exhausted or the user cancel the action
			let currentPlate = current.value.toString(); //Current plate to analyze. Should always be used as a text, force it here for generic index
			High.Stats[resultIndex] = []; //Remove previous data to ensure new ones are retrieved
			Low.Stats[resultIndex] = [];
			await this.getValuesLocal(High, Low, resultIndex, o, currentPlate, toResolve); //Collect values to extract hits
			this.plateSummary(High, Low, resultIndex, o, currentPlate, running); //Store control data
			this.getHits(High, Low, resultIndex, o, currentPlate, toResolve, running); //Collect hits
			this.update(); //Update the section after the hit search is completed
			current = plateCounter.next();
			this.UI.Plate.setValue(running); //Ensures that the control is set at the same value as the last computed plate
			this.pairStatus(running); //Also adjust the pairing info
			running++; //Next plate index
			Report.plateCount(running + 1); //Next plate analysis will start after this
		}
		High.Stats[resultIndex] = undefined; //Remove previous data to prevent interference with Global hit find
		Low.Stats[resultIndex] = undefined;
		Report.unlock();
		let out = {Status: "Done", Msg: "Done", Hits: o.Counts, Section: o.Title, Resolvable: toResolve};
		if(o.Overflow !== undefined) { //Hit limit was reached
			out.Status = "Overflow";
			out.Msg = "Hit limit (" + o.HitLimit + ") reached for parameter: <b>" + o.Overflow.Param + "</b>; search aborted";
		}
		else {
			if(this.Cancel === true) {
				out.Status = "Aborted";
				out.Msg = "Found " + o.Counts + " hits. Search aborted by user request";
			}
		}
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
		return new Promise(function(resolve) { //Start the scan
			this.Result.Mapper.scan(this.Result, {Custom: f}, o).then(function(data) { //After scan is complete
				data.Params.forEach(function(param, i) { //Log the average values for all parameters
					High.Stats[resultIndex][i] = Coordinate.statValue(data.Values[i].H);
					Low.Stats[resultIndex][i] = Coordinate.statValue(data.Values[i].L);
				});
				resolve();
			});
		}.bind(this));
	}
	getHits(High, Low, resultIndex, o, currentPlate, toResolve, running) { //Find the hits in the values stored for the current plate
		let t = o.Threshold;
		o.Params.forEach(function(param, i) { //Check values for all paramaters
			let section = Report.getBloc(this, Report.blocName(param)).getSection(o.Title); //Get the section that was initialized before
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
						o.Counts[i]++; //Update the counts
						let index = o.Counts[i];
						let results = [{Type: "text", Value: index}, currentPlate, well.Name, content.HTML, val, norm * 100];
						let json = this.emptyJSON(); //Empty json architecture
						json.Data[0].Groups.forEach(function(g, j) { //Populate the json with the data
							g.DataPoints[0] = [ results[j] ];
						});
						section.addRow({Data: [json]}, o.Counts[i]); //Push data to the table
						Report_Hits.logRange(content, currentPlate, toResolve); //Log the range/plate if needed
						if(o.Counts[i] >= o.HitLimit) { //Stop the search when too many hits are found for a single parameter
							o.Overflow = {Param: param.Name}; //Log the parameter that overflowed
						}
					}
				}, this);
			}
			let p = GetId(section.ID).parentElement.getElementsByClassName("LineStatus")[0];
			p.innerHTML = running + 1; //Update with the current plate number
		}, this);
		return this;
	}
	done(data, params) { //Screening done, last clean up
		if(data.Status == "Fail") {return this}
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			let section = bloc.getSection(data.Section);
			let p = GetId(section.ID).parentElement.getElementsByClassName("ResolveStatus"); //The div with the resolution status
			if(p.length >0) { //If the html element still exists, update the feedback message
				if(this.Stop) {p[0].innerHTML = "<span class=\"Warning\">Name resolution stopped</span>"}
				else {p[0].innerHTML = ""}
			}	
			if(this.Cancel) { //Search was cancelled
				let span = GetId(section.ID).parentElement.getElementsByClassName("HitStatus"); //The paragraph with the status
				if(span.length > 0) { //If the html element still exists, update the feedback message
					span[0].innerHTML = "<span class=\"Warning\">Found " + data.Hits[i] + " Hits; Search not completed (cancelled)</span>";
				}
			}
		}, this);
		return this;
	}
	plateSummary(High, Low, resultIndex, o, plate, running) { //Log the control values found for each plate
		let change = false;
		if(running == 0) {change = true} //If this is the first plate, reset the section
		o.Params.forEach(function(param, i) { //Process all parameters
			let json = { //json object architecture for this table
				Data: [{
					Groups: [
						{Name: High.Name + " (100%)", DataPoints: [ [] ]},
						{Name: Low.Name + " (0%)", DataPoints: [ [] ]},
					],
					SubGroups: [] //Must be present even if empty
				}]
			}
			let options = {Type: "StatsTable", JSON: json, Summary: true, Changed: change};
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Plate Summary", options);
			section.addRow({Data: []}, plate, {
				Stats: [ //No need to supply a json data as the stats are pre-computed
					High.Stats[resultIndex][i],
					Low.Stats[resultIndex][i]
				]
			});
		}, this);
	}
	emptyJSON() { //Return the base structure of the json needed to build the hit table
		let json = {
			Data: [
				{
					Groups: [
						{Name: "#", DataPoints: [ [] ]},
						{Name: "Plate", DataPoints: [ [] ]},
						{Name: "Well", DataPoints: [ [] ]},
						{Name: "Content", DataPoints: [ [] ]},
						{Name: "Raw value", DataPoints: [ [] ]},
						{Name: "Normalized value", DataPoints: [ [] ]},
					],
					SubGroups: [],
				}
			]
		}
		return json;
	}
	convertRangeNames(data, params) { //In case there are no defintions attached to the result file, convert the html tags back into simple names
		params.forEach(function(param) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			let section = bloc.getSection(data.Section);
			let hitStatus = GetId(section.ID).parentElement.getElementsByClassName("HitStatus");
			if(hitStatus.length > 0) { //If clean up has not already be done elsewhere (this happens when hit resolution is cancelled)
				hitStatus[0].remove(); //clean up the hitStatus that is now indicated as the table title
			}
			let coll = GetId(section.ID).getElementsByClassName("Resolvable"); //The HTMLcollection of elements to resolve in this section. Recall it each time, because the number of element remaining will decrease after each turn
			let l = coll.length;
			for(let i=0;i<l;i++) { //Travel the collection to update the data
				let index = coll[i].parentElement.parentElement.rowIndex; //Index of this line in the hit table
				section.Tables[0].Data.Data[0].Groups[3].DataPoints[0][index] = coll[i].innerText; //Recover only the text
			}
			section.update(); //Update the section with the new names
		}, this);
		return this;
	}
}