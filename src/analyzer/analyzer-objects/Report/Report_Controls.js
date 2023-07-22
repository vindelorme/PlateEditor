//*******************************************************************************
// REPORT_CONTROLS object - A report object to display and navigate controls data
//*******************************************************************************
class Report_Controls extends Report {
	constructor(o) {
		super(o);
		let source = window.opener.zFactor;
		[source.Controls.N, source.Controls.P].forEach(function(control) { //Mark all controls as selected
			control.forEach(function(c) {c.Selected = true});
		});
		let controlHTML = "";
		controlHTML += "<div id=\"PleaseWait\" style=\"display: none\"><span class=\"Warning\">Computing, please wait...</span><p class=\"Note\">Table interaction is disabled while computing</p></div>";
		controlHTML += "<div id=\"PairNeeded\" style=\"display: none\"><p class=\"Warning\">Select at least one Positive and one Negative control to continue!</p></div>";
		controlHTML += "<div id=\"SelectMenu\">";
		controlHTML += "<fieldset style=\"margin-bottom: 10px\"><legend>Positive</legend><div id=\"Ctrl_Pos\"></div></fieldset>";
		controlHTML += "<fieldset style=\"margin-bottom: 10px\"><legend>Negative</legend><div id=\"Ctrl_Neg\"></div></fieldset>";
		controlHTML += "</div>";
		this.Menu.addTabs([
			{Label: "Controls", SetActive: true, Content: {Type: "HTML", Value: controlHTML} },
		]);
		this.UI.DataView = {Selected: "Column", init: function() {return}}; //Simple mimic to replace the control
		this.UI.P = new RespTable({ID: "Ctrl_Pos", Fields: ["Name"], RowNumbers: true, Multiple: true, NoControls: true, Array: source.Controls.P, onSelect: function() {
			this.Changed = true;
			this.compute();
		}.bind(this)});
		this.UI.N = new RespTable({ID: "Ctrl_Neg", Fields: ["Name"], RowNumbers: true, Multiple: true, NoControls: true, Array: source.Controls.N, onSelect: function() {
			this.Changed = true;
			this.compute();
		}.bind(this)});
		let b = LinkCtrl.button({Label: "Compute all Plates", Title: "Click here to compute the Z-factor/Window summaries for all plates", Click: function() {
			this.zScoreAllPlates();
		}.bind(this)});
		GetId(this.Anchors.PlateDoAll).append(b);
		//********************
		//How likely are we to have more than 4~6 controls in total? So this might not be needed...
		//********************
		/*let b_pos = LinkCtrl.buttonBar([
			{Label: "Unselect all", Title: "Click here to unselect all positive controls", Click: function() {this.UI.P.setValue([]); this.computeZFactor()}.bind(this)},
			{Label: "Select all", Title: "Click here to select all positive controls", Click: function() {this.UI.P.selectAll(); this.computeZFactor()}.bind(this)},
		]);
		GetId("Ctrl_Pos").parentElement.prepend(b_pos);
		let b_neg = LinkCtrl.buttonBar([
			{Label: "Unselect all", Title: "Click here to unselect all negative controls", Click: function() {this.UI.N.setValue([]); this.computeZFactor()}.bind(this)},
			{Label: "Select all", Title: "Click here to select all negative controls", Click: function() {this.UI.N.selectAll(); this.computeZFactor()}.bind(this)},
		]);
		GetId("Ctrl_Neg").parentElement.prepend(b_neg);*/
		//
		//
		//
		this.ColumnOnly = true;
		return this;
	}
	//Static Methods
	static combinationName(n, p) { //For the combination of negative and positive control object given, return the combination name as a string
		return "[" + p.Name + "] vs [" + n.Name + "]";
	}
	//Getter, Setter
	get HasChanged() { //This getter check whether the data selected have changed compared to last time it was logged
		return this.Changed;
	}
	//Methods
	do() {
		this.compute();
		return this;
	}
	lockMenu() { //Lock the menu tables
		this.UI.N.lock(); //Lock the tables to prevent spamming
		this.UI.P.lock();
		GetId("PleaseWait").style.display = "block";
		GetId("PairNeeded").style.display = "none";
		GetId("SelectMenu").style.display = "none"; //Also hide the menu. Never too safe...
		return this;
	}
	unlockMenu() { //Unlock the menu tables
		this.UI.N.unlock();
		this.UI.P.unlock();
		this.Changed = false; //Reset this state for next run of compute
		GetId("PleaseWait").style.display = "none";
		GetId("SelectMenu").style.display = "block";
		return this;
	}
	pairNeeded() { //Indicates that at least a pair of Neg/Pos control is needed to continue
		GetId("PairNeeded").style.display = "block";
		this.unlockMenu();
		return this;
	}
	getControlValues(selectedPlate) { //Retrieve the values for all controls and parameters, for the selected plate
		[this.UI.N.Selected, this.UI.P.Selected].forEach(function(control) { //For each of the selected negative and positive control
			control.forEach(function(c) { //For each control
				c.Values = []; //Reset value arrays to accept new values
			});
		});
		let resultIndex = this.Results.SelectedIndices[0] + 1; //The index of the result file selected (1-based), unique
		let o = {Items: 0, Neg: this.UI.N.Selected, Pos: this.UI.P.Selected, Params: []} //Output object containing the data for one plate
		this.Params.forEach(function(p, i) { //Initialize empty array to receive the values for each selected parameters that is set as numeric
			if(p.Selected && p.Numeric) { //This parameter is selected and numeric type, continue
				o.Params.push({Index: i, Name: p.Name, ResultIndex: resultIndex}); //Ensure unicity of parameter names, even accross multiple results
				[o.Neg, o.Pos].forEach(function(control) { //For each of the negative and positive control arrays
					control.forEach(function(c) { //For each control
						c.Values.push([]); //Create empty arrays to receive the values
					});
				});
			}
		}, this);
		this.waitMessage(o.Params); //This displays waiting message
		let custom = function(well, plate, row, output, parser) { //The function to run on each line
			if(plate == selectedPlate) { //We are on the right plate
				let wellIndex = well.Index;
				[output.Neg, output.Pos].forEach(function(control) { //For each of the negative and positive controls
					control.forEach(function(c) { //Check for each control
						if(c.Tags.includes(wellIndex)) { //This control is tagged on this well
							output.Params.forEach(function(param, i) { //Log the values for all parameters
								let v = row[param.Index];
								if(v == "") {c.Values[i].push("")} //Number("") returns 0
								else {c.Values[i].push(Number(v))}
							});
						}
					});
				});
			}
		}
		return new Promise(function(resolve) {
			this.Result.Mapper.scan(this.Result, {Custom: custom}, o).then(function(data) {
				resolve(data);
			});
		}.bind(this));
	}
	compute() { //Compute the z-factor for selected items
		this.lockMenu(); //Block interaction with the menu tables
		let neg = this.UI.N.Selected[0];
		let pos = this.UI.P.Selected[0];
		if(neg === undefined || pos === undefined) {return this.pairNeeded()} //Need at least one pair of control to do something
		let plate = this.SelectedPlate;
		this.getControlValues(plate).then(function(data) { //Collect values for this plate
			data.Params.forEach(function(param, i) { //Process all parameters
				this.valueTable(data, i, param);
				let JSONarray = this.processZscore(data, i, param);
				if(this.Result.PlatesID.length > 1) { //If there are more than one plate attached to this result, then also create/update the Plate summary table
					this.plateSummary(data, i, param, plate, JSONarray);
				}
			}, this);
			this.update(); //Update the sections
			this.unlockMenu();
		}.bind(this));
	}
	valueTable(data, valueIndex, param) { //Create the table holding values for all controls, using values for the parameter at the index given
		let groups = [];
		[data.Neg, data.Pos].forEach(function(controls) { //Process all the controls
			controls.forEach(function(c) {
				groups.push({Name: c.Name, DataPoints: [c.Values[valueIndex]]});
			});
		});
		let json = { //Build the json for this section
			Data: [{ //Only one object in this array
				Groups:	groups,
				SubGroups: [],
			}],
			Headers: {
				Cols: [
					{Name: "Negative Controls", Span: data.Neg.length},
					{Name: "Positive Controls", Span: data.Pos.length},
				]
			},
			StatRows: true,
		}
		let section = Report.getBloc(this, Report.blocName(param)).getSection("Values", {Type: "Single"});
		section.Data = JSON.stringify(json);
		return this;
	}
	processZscore(data, valueIndex, param) { //Process the stats for each controls in order to compute the z-factors
		let subgroups = [];
		let groupsZ = [];
		let groupsW = [];
		data.Neg.forEach(function(n, i) { //Process all the Negative controls as rows
			data.Pos.forEach(function(p, j) { //Process all the positive controls as cols
				let N = Coordinate.statValue(n.Values[valueIndex]); //Compute the stats
				let P = Coordinate.statValue(p.Values[valueIndex]);
				let Z = this.zScoreFromStats(N, P);
				let W = this.windowFromStats(N, P);
				if(i == 0) { //This is the first row, create the object
					groupsZ.push({Name: p.Name, DataPoints: [ [Z] ]}); //Add the calculated stats
					groupsW.push({Name: p.Name, DataPoints: [ [W] ]});
				}
				else { //For following rows, push into the Datapoints array
					groupsZ[j].DataPoints.push([Z]);
					groupsW[j].DataPoints.push([W]);
				}
			}, this);
			subgroups.push({Name: n.Name, DataPoints: []}); //Rows will not need datapoints as their are all in the column
		}, this);
		let jsonZ = { //Build the json for this stat
			Data: [{
				Groups: groupsZ,
				SubGroups: subgroups,
			}],
			Title: "Z'"
		};
		let jsonW = { //Build the json for this stat
			Data: [{
				Groups: groupsW,
				SubGroups: subgroups,
			}],
			Title: "Window"
		};
		[jsonZ, jsonW].forEach(function (j) {
			j.Headers = {
				Cols: [{Name: "Positive Controls", Span: data.Pos.length}],
				Rows: [{Name: "Negative Controls", Span: data.Neg.length}],
			};
		});
		let section = Report.getBloc(this, Report.blocName(param)).getSection("Performance indicators", {Type: "Multiple", JSON: [jsonZ, jsonW]});
		return [jsonZ, jsonW];
	}
	zScoreFromStats(neg, pos) { //Compute the z score from the stats calculated from the +/- controls
		let z = 1 - 3 * ((pos.SD + neg.SD) / Math.abs(pos.Average - neg.Average));
		return {Class: this.classForZ(z), Value: z};
	}
	windowFromStats(neg, pos) { //Compute the window from the stats calculated from the +/- controls
		let n = neg.Average;
		let p = pos.Average;
		let w = Math.max(n, p) / Math.min(n, p); //Window
		return {Class: this.classForW(w), Value: w}
	}
	classForW(w) { //Return the appropriate class for the window value
		if(w > 2) {return "good"}
		if(w > 1) {return "neutral"}
		return "bad";
	}
	classForZ(z) { //Return the appropriate class for the z value
		if(z > 0.4) {return "good"}
		if(z > 0.2) {return "neutral"}
		return "bad";
	}
	plateSummary(data, valueIndex, param, plate, scores) { //Update the plate summary by adding a row for the plate in each relevant table
		let jsonArray = []; //Each table will be represented by a distinct JSON
		data.Neg.forEach(function(p, i) {
			data.Pos.forEach(function(n, j) {
				let comb = Report_Controls.combinationName(n, p); //Name for the combination
				let Z = scores[0].Data[0].Groups[j].DataPoints[i]; //Retrieve the stats
				let W = scores[1].Data[0].Groups[j].DataPoints[i];
				let json = {
					Data: [{
						Groups: [
							{Name: "Plate", DataPoints: [ [plate] ]},
							{Name: "Z'", DataPoints: [Z]}, //Z and W are already arrays
							{Name: "W", DataPoints: [W]},
						],
						SubGroups: [] //This array must be present, but remains empty (pure column table)
					}],
					Title: comb,
					SyncScrolling: true,
					StatRows: true
				};
				jsonArray.push(json); //Push the newly build json
			}, this);
		}, this);
		let section = Report.getBloc(this, Report.blocName(param)).getSection("Plate Summary", {Type: "Multiple", JSON: jsonArray, Summary: true, Changed: this.HasChanged});
		section.addRow({Data: jsonArray}, plate);
	}
	async zScoreAllPlates() { //Compute zScore for all available plates. Use a counter and a yielding loop to process the plates sequentially and prevent memory overflow
		this.Cancel = false;
		this.lockMenu(); //Block interaction with the menu tables
		let neg = this.UI.N.Selected[0];
		let pos = this.UI.P.Selected[0];
		if(neg === undefined || pos === undefined) {return this.pairNeeded()} //Need at least one pair of control to do something
		let plates = this.Result.PlatesID;
		Report.lock(this, plates.length); //Lock the report and start
		let plateCounter = Report.plateIterator(plates); //A generator to loop over the plates
		let current = plateCounter.next();
		let running = 0;
		while(current.done == false && this.Cancel == false) { //Do this until the plate counter is exhausted or the user cancel the action
			let currentPlate = current.value.toString(); //Current plate to analyze. Should always be used as a text, force it here for generic index
			if(Report.hasData(this, currentPlate) == false) { //There is no need to parse if the plate has already been computed
				let data = await this.getControlValues(currentPlate); //Parse data
				data.Params.forEach(function(param, i) {
					this.valueTable(data, i, param);
					let JSONarray = this.processZscore(data, i, param);
					this.plateSummary(data, i, param, currentPlate, JSONarray);
				}, this);
				this.update(); //Update the sections
			}
			this.UI.Plate.setValue(running); //Ensures that the control is set at the same value as the last computed plate
			this.pairStatus(running); //Also adjust the pairing info
			current = plateCounter.next();
			running++;
			Report.plateCount(running + 1);
		}
		this.unlockMenu();
		Report.unlock();
		return this;
	}
}