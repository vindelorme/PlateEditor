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
		controlHTML += "<fieldset style=\"margin-bottom: 10px\"><legend>Positive</legend><div id=\"Ctrl_Pos\"></div></fieldset>";
		controlHTML += "<fieldset style=\"margin-bottom: 10px\"><legend>Negative</legend><div id=\"Ctrl_Neg\"></div></fieldset>";
		this.Menu.addTabs([
			{Label: "Controls", SetActive: true, Content: {Type: "HTML", Value: controlHTML} },
		]);
		this.UI.P = new RespTable({ID: "Ctrl_Pos", Fields: ["Name"], RowNumbers: true, Multiple: true, NoControls: true, Array: source.Controls.P, onSelect: this.computeZFactor.bind(this)});
		this.UI.N = new RespTable({ID: "Ctrl_Neg", Fields: ["Name"], RowNumbers: true, Multiple: true, NoControls: true, Array: source.Controls.N, onSelect: this.computeZFactor.bind(this)})
		let b = LinkCtrl.button({Label: "Compute all", Title: "Click here to compute the Z-factor/Window summaries for all plates", Click: function() {this.zScoreAllPlates()}.bind(this)});
		GetId(this.Anchors.PlateDoAll).append(b);
		let b_pos = LinkCtrl.buttonBar([
			{Label: "Unselect all", Title: "Click here to unselect all positive controls", Click: function() {this.UI.P.setValue([]); this.computeZFactor()}.bind(this)},
			{Label: "Select all", Title: "Click here to select all positive controls", Click: function() {this.UI.P.selectAll(); this.computeZFactor()}.bind(this)},
		]);
		GetId("Ctrl_Pos").parentElement.prepend(b_pos);
		let b_neg = LinkCtrl.buttonBar([
			{Label: "Unselect all", Title: "Click here to unselect all negative controls", Click: function() {this.UI.N.setValue([]); this.computeZFactor()}.bind(this)},
			{Label: "Select all", Title: "Click here to select all negative controls", Click: function() {this.UI.N.selectAll(); this.computeZFactor()}.bind(this)},
		]);
		GetId("Ctrl_Neg").parentElement.prepend(b_neg);
		return this;
	}
	//Static Methods
	static combinationName(n, p) { //For the combination of negative and positive control object given, return the combination name as a string
		return "[" + p.Name + "] vs [" + n.Name + "]";
	}
	//Methods
	do() {
		this.computeZFactor();
		return this;
	}
	getControlValues(selectedPlate) { //Retrieve the values for all controls and parameters, for the selected plate
		[this.UI.N.Array, this.UI.P.Array].forEach(function(control) { //For each of the negative and positive control arrays
			control.forEach(function(c) { //For each control
				c.Values = []; //Reset value arrays to accept new values
			});
		});
		let resultIndex = this.Results.SelectedIndices[0] + 1; //The index of the result file selected (1-based), unique
		let o = {Items: 0, Neg: this.UI.N.Array, Pos: this.UI.P.Array, Params: []} //Output object containing the data for one plate
		this.Params.forEach(function(p, i) { //Initialize empty array to receive the values for each selected parameters that is set as numeric
			if(p.Selected && p.Numeric) { //This parameter is selected and numeric type, continue
				//o.Params.push({Index: i, Name: resultIndex + ". " + p.Name}); //Ensure unicity of parameter names, even accross multiple results
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
	waitMessage(params) { //Display a waiting message
		let msg = "<span class=\"warning\">Parsing values, please wait...</span>";
		params.forEach(function(param, i) { //Process all parameters
			let bloc = Report.getBloc(this, Report.blocName(param));
			bloc.Sections.forEach(function(s) {
				if(s.Summary === undefined) {s.replaceContent(msg)}
			});
		}, this);
	}
	computeZFactor() { //Compute the z-factor for selected items
		let neg = this.UI.N.Selected[0];
		let pos = this.UI.P.Selected[0];
		if(neg === undefined && pos === undefined) {return} //Need at least one control to do something
		let plate = this.UI.Plate.Selected;
		this.getControlValues(plate).then(function(data) { //Collect values for this plate
			let stats = this.processValues(data, plate); //Display the individual values and compute the stats
			let scores = this.processZscore(stats, data, plate); //Compute and display the z-factor
			if(this.Result.PlatesID.length > 1) { //If there are more than one plate attached to this result, then also create/update the Plate summary table
				this.plateSummary(data, plate, scores);
			}
		}.bind(this));
	}
	processValues(data, plate) { //Process incoming data, as an array of object containing the values for each parameter and controls
		let stats = [];
		data.Params.forEach(function(param, i) { //Process all parameters
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Values", {TableType: "Inner"});
			let table = this.valueTable(data, i);
			section.replaceContent("<p class=\"Title\">Data for plate: " + plate + "</p>" + table.HTML);
			stats.push(table.Stats);
		}, this);
		return stats;
	}
	valueTable(data, valueIndex) { //Create the table holding values for all controls, using values for the parameter at the index given
		let html = "";
		let o = []; //The array that will be used by the analyzer to create the table
		[data.Neg, data.Pos].forEach(function(controls) { //Process all the controls
			controls.forEach(function(c) {
				o.push({Label: c.Name, Values: c.Values[valueIndex], Visible: c.Selected});
			});
		});
		return Analyzer.objectToTable(o);
	}
	processZscore(stats, data, plate) { //Process the stats for each controls in order to compute the z-factors
		let scores = [];
		data.Params.forEach(function(param, i) { //Process all parameters
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Z-factors");
			let table = this.zScoreTable(stats[i], data);
			section.replaceContent("<p class=\"Title\">Data for plate: " + plate + "</p>" + table.HTML);
			scores.push(table.Score);
		}, this);
		return scores;
	}
	zScoreTable(stats, data) { //Compute the z-scores and report the results as an HTML table
		let l = data.Neg.length;
		let html = "";
		let scores = []; //To log the z/w values calculated for this plate
		let todo = [ //There are 2 tables to output
			{Name: "Z'", Method: this.zScoreFromStats.bind(this), Scores: []},
			{Name: "Window", Method: this.windowFromStats.bind(this), Scores: []},
		];
		let enough = false;
		todo.forEach(function(t, n) { //Prepare a table for both the z and window scoring
			html += "<table class=\"Table\"";
			if(n > 0) {html += "style=\"margin-top: 20px\""} //Spacing between tables
			html += "><tr><th>" + t.Name + "</th>";
			data.Pos.forEach(function(p) { //Start with the positive controls as horizontal headers
				if(p.Selected) {html += "<th>" + p.Name + "</th>"}
			});
			html += "</tr>";
			data.Neg.forEach(function(n, i) { //Add one row for each negative control
				if(n.Selected) {html += "<tr><th>" + n.Name + "</th>"}
				data.Pos.forEach(function(p, j) { //Each row has as many columns as positive controls
					let score = t.Method(stats[i], stats[l + j]);
					t.Scores.push(score);
					if(p.Selected && n.Selected) {
						html += Analyzer.cellForValue(score.Value, {Class: score.Class, Type: "#"});
						enough = true;
					}
				}, this);
				if(n.Selected) {html += "</tr>"}
			}, this);
			html += "</table>";
		}, this);
		if(enough == false) {return {HTML: "<span class=\"warning\">Select at least one negative and one positive control to calculate a Z-factor!</span>"}}
		return {HTML: html, Score: todo}
	}
	zScoreFromStats(neg, pos) { //Compute the z score from the stats calculated from the +/- controls
		let z = 1 - 3 * ((pos.SD + neg.SD) / Math.abs(pos.Avg - neg.Avg));
		return {Class: this.classForZ(z), Value: z};
	}
	windowFromStats(neg, pos) { //Compute the window from the stats calculated from the +/- controls
		let n = neg.Avg;
		let p = pos.Avg;
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
	plateSummary(data, plate, scores) { //Update the plate summary by adding a row for the plate in each relevant table
		let tables = this.plateSummaryTables(data);
		data.Params.forEach(function(param, i) { //Process all parameters
			let section = Report.getBloc(this, Report.blocName(param)).getSection("Plate Summary", {Summary: true, Tables: tables, Headers: ["Plate", "Z'", "Window"], TableType: "Inner"});
			if(scores[i]) {
				let Zscores = scores[i][0].Scores;
				let Wscores = scores[i][1].Scores;
				tables.forEach(function(t, j) { //Loop through the control combinations
					section.updateTable(j, "Plate", plate, [plate, Zscores[j], Wscores[j]], {Visible: t.Visible});
				});
			}
			else {section.hideAllTables()}
		}, this);
	}
	plateSummaryTables(data) { //Retrieve the tables that should be updated by the set of data received
		let tables = [];
		data.Neg.forEach(function(p) {
			data.Pos.forEach(function(n) {
				tables.push({Title: Report_Controls.combinationName(n, p), Visible: (n.Selected && p.Selected)});
			});
		});
		return tables;
	}
	async zScoreAllPlates() { //Compute zScore for all available plates. Use a counter and a yielding loop to process the plates sequentially and prevent memory overflow
		this.Cancel = false;
		let plates = this.Result.PlatesID;
		let tables = this.plateSummaryTables({Neg: this.UI.N.Array, Pos: this.UI.P.Array});
		Report.lock(this, plates.length); //Lock the report and start
		let plateCounter = Report.plateIterator(plates); //A generator to loop over the plates
		let current = plateCounter.next();
		let running = 0;
		while(current.done == false && this.Cancel == false) { //Do this until the plate counter is exhausted or the user cancel the action
			let currentPlate = current.value.toString(); //Current plate to analyze. Should always be used as a text, force it here for generic index
			let section = Report.getBloc(this, this.Blocs[this.FirstBlocIndex].Name).getSection("Plate Summary", {Summary: true, Tables: tables, Headers: ["Plate", "Z'", "Window"]}); //Get the first section available. All sections share the data so we don't have to test for each of them
			if(section.hasData(0, "Plate", currentPlate) == false) { //If the values for this plate are not already logged, process it
				let data = await this.getControlValues(currentPlate); //Collect values for this plate
				let stats = this.processValues(data, currentPlate); //Display the individual values and compute the stats
				let scores = this.processZscore(stats, data, currentPlate); //Compute and display the z-score
				this.plateSummary(data, currentPlate, scores);
				this.UI.Plate.setValue(running); //Ensures that the control is set at the same value as the last computed plate
				this.pairStatus(running); //Also adjust the pairing info
			}
			current = plateCounter.next();
			running++;
			Report.plateCount(running + 1);
		}
		Report.unlock();
	}
}