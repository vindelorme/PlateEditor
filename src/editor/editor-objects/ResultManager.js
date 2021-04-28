//**************************************************************
// RESULTMANAGER object - Handling of results data for the plate
//**************************************************************
class ResultManager {
	constructor(root, source) { //root is the root ID for drawing, source is the RespTable with the result objects
		this.Results = source;
		this.Anchors = {
			Root: root,
			Map_ResultTable: root + "_ResultTable",
			Map_Parameters: root + "_Parameters",
			ResultTab: root + "_ResultTab",
			Heatmap: root + "_Heatmap",
			HeatmapOptions: root + "_HeatmapOptions",
			Extremums: root + "_Extremums",
			ExtremumSource: root + "_ExtremumSource",
			PlateSelect: root + "_PlateSelect",
			LayerSelect: root + "_LayerSelect",
			Pairing: root + "_Pairing",
		}
		this.ResultTab = undefined;
		let action = function(v) {this.draw(this.Results.Selected[0])}.bind(this);
		this.PlateSelect = LinkCtrl.new("Select", {ID: this.Anchors.PlateSelect, Title: "Select the plate to use for display", Default: 0, Label: "Plate", List: [1], NavBar: true, Lookup: true, Change: action});
		this.LayerSelect = LinkCtrl.new("Select", {ID: this.Anchors.LayerSelect, Title: "Select the layer that will be used to display information in the tooltip", Default: 0, NavBar: true, Label: "Layer", List: [1]});
		this.HeatmapOptions = {
			Low: LinkCtrl.new("Color", {ID: this.Anchors.HeatmapOptions, Title: "Color for the lowest value", Default: "lightblue", Label: "0", Chain: {Index: 0}, Change: action}),
			Medium: LinkCtrl.new("Color", {ID: this.Anchors.HeatmapOptions, Title: "Color for the average value", Default: "white", Label: "50", Chain: {Index: 1}, Change: action}),
			High: LinkCtrl.new("Color", {ID: this.Anchors.HeatmapOptions, Title: "Color for the highest value", Default: "tomato", Label: "100", Chain: {Index: 2, Last: true}, Change: action}),
		}
		this.ExtremumSource = LinkCtrl.new("Select", {ID: this.Anchors.ExtremumSource, Default: 0, Label: "Source", List: ["Global", "Plate", "Custom"], Change: function(v) {
			this.extremum(v);
		}.bind(this), Title: "Source of the min and max values to build the heatmap. Global: use parameter min/max values from the entire file; Plate: use parameter min/max values from the selected plate only; Custom: manually entered min and max values (applies to all parameters)"}),
		this.Extremums = {
			Min: LinkCtrl.new("Number", {ID: this.Anchors.Extremums, Default: 0, Label: "Min", Chain: {Index: 0}, Title: "Custom value for the minimum"}),
			Max: LinkCtrl.new("Number", {ID: this.Anchors.Extremums, Default: 0, Label: "Max", Chain: {Index: 1, Last: true}, Title: "Custom value for the maximum"}),
		}
		return this;
	}
	//Static methods
	
	//Methods
	init() { //Prepare the html
		let html = "";
		html += "<div style=\"overflow: auto\">"; //Options ribbon
			html += "<fieldset style=\"float: left\"><legend>Plate view</legend><div id=\"" + this.Anchors.PlateSelect + "\"></div></fieldset>";
			html += "<fieldset style=\"float: left\"><legend>Pairing</legend><div id=\"" + this.Anchors.Pairing + "\"></div></fieldset>";
			html += "<fieldset style=\"float: left\"><legend>Linked Layer</legend><div id=\"" + this.Anchors.LayerSelect + "\"></div></fieldset>";
			html += "<fieldset style=\"float: left\"><legend>Heatmap</legend><div id=\"" + this.Anchors.HeatmapOptions + "\"></div></fieldset>";
			html += "<fieldset style=\"float: left\"><legend>Min & Max</legend>";
				html += "<div id=\"" + this.Anchors.ExtremumSource + "\" style=\"float: left\"></div>";
				html += "<div id=\"" + this.Anchors.Extremums + "\" style=\"float: left; display: none; margin-left: 5px\"></div>"; //Custom values for the min/max
			html += "</fieldset>";
		html += "</div>";
		html += "<div id=\"" + this.Anchors.ResultTab + "\" class=\"LinkCtrl_Tab LinkCtrl_Round\" style=\"margin-top: 10px; padding-left: 10px;\"><p>Click on a result file to display heatmaps for selected parameters</p></div>"; //Result tab
		GetId(this.Anchors.Root).innerHTML = html;
		this.PlateSelect.init();
		this.LayerSelect.init();
		this.ExtremumSource.init();
		if(Editor.Plate) {this.layerUpdate()} //Update the layer selection control
		Object.values(this.HeatmapOptions).forEach(function(o) {o.init()});
		Object.values(this.Extremums).forEach(function(o) {o.init()});
		let update = LinkCtrl.button({Label: "Update", Title: "Click to redraw the heatmaps with the current custom values", Click: function() {
			let r = this.Results.Selected[0]; //The selected result
			this.draw(r);
		}.bind(this)});
		let ext = GetId(this.Anchors.Extremums);
		ext.insertAdjacentHTML("beforeend", "&nbsp;"); //Space for the button
		ext.append(update);
		let hm = LinkCtrl.button({Label: "More...", Title: "Click here to select templates and see more options for heatmap colors", Click: function() {
			this.heatmapTemplates();
		}.bind(this)});
		let opt = GetId(this.Anchors.HeatmapOptions);
		opt.insertAdjacentHTML("beforeend", "&nbsp;"); //Space for the button
		opt.append(hm);
		return this;
	}
	layerUpdate() { //Update the LayerSelect control with a list corresponding to the current number of layers
		let list = [];
		let l = Editor.Plate.Layers.length;
		for(let i=0; i<l; i++) {list.push(i+1)}
		this.LayerSelect.updateList(list);
		return this;
	}
	extremum(source) { //Handle changes for the extremums options
		if(source == 2) {GetId(this.Anchors.Extremums).style.display = "block"} //Custom, set the visibility of the min/max
		else { //Draw straight in the other cases
			GetId(this.Anchors.Extremums).style.display = "none";
			let r = this.Results.Selected[0]; //The selected result
			this.draw(r);
		}
		return this;
	}
	addResults(results) { //Add inputs passed to the array of results
		let R = this.Results;
		let first = R.Array.length; //Index of the first result element that will be added
		if(first == 0) {this.init()}
		R.Array = R.Array.concat(results);
		R.setValue([first]);
		return this;
	}
	mapParameters(inputs, BackToImport) { //Allow mapping and selection of parameters for available results
		let concat = true; //Whether the inputs passed should be concatenated to the results if the mapping is accepted
		if(inputs === undefined) { //If nothing is passed, we are in edition mode, no need to concatenate
			inputs = this.Results.Array;
			concat = false;
		}
		if(inputs.length == 0) {return this} //No results available
		Mapper.map(inputs, {Validate: true, BackToImport: BackToImport,
			Done: function() { //What to do on mapping completion
				if(concat) {this.addResults(inputs)} //Concat the inputs to the results
				inputs.forEach(function(r) { //For each inputs
					r.Mapper = Mapper.new(r.Mapping); //Create the mapper object
					Result.updateParameters(r); //Update the selected parameters
				});
				this.Results.update(); //Update the result table
				this.draw(this.Results.Selected[0]); //Draw the selected result
			}.bind(this), OnChange: function(r) { //What to do on change of mapping config
				r.Validated = false; //Ensures that the file is scanned again if mapping configuration is changed
				Result.updateParameters(r);
				this.Results.update(); //Update the result table
			}.bind(this), Parameters: [ //Parameters to be mapped
				Mapper.well({Required: true}), //For results, a well mapping is required
				Mapper.plate(),
				Mapper.import(),
				Mapper.numeric(),
			],
		});
	}
	draw(result, I) { //Draw the data for result object passed
		let tab = GetId(this.Anchors.ResultTab);
		if(result.Validated == false) { //Result not validated
			tab.innerHTML = "<p class=\"Error\" style=\"text-align: center\">Result file not validated</p>";
			if(I === undefined) {this.validate(result)} //Prompt to validate, will not show if a second parameter is provided, which happens when the plate is resized
			return this;
		}
		tab.style.height = tab.clientHeight + "px"; //Lock the panel in its present state
		let array = [];
		let tabs = []; //Array to hold the new tabs for the TabControl
		this.PlateSelect.updateList(result.PlatesID);
		let plateIndex = this.PlateSelect.getValue();
		Pairing.resize(result); //Resize the Pairing array in case of change of plate size
		Pairing.setLinkedPlate(result, plateIndex, this.Anchors.Pairing); //Update pairing information for the selected plate
		this.ResultTab = new TabControl({ //Create the TabControl to initialize the tabs as TabPanel objects
			ID: this.Anchors.ResultTab,
			Multiple: true,
			Tabs: [],
			AfterDelete: function(l) {this.deleteParam(l)}.bind(this),
		});
		let index = 0; //Tracker for the tab index
		this.ResultTab.init(); //Draw the tabControl
		result.Parameters.forEach(function(p, i) { //Loop the parameters to build the corresponding Heatmaps
			if(p.Selected) { //Only selected parameters should be used
				p.ID = this.Anchors.Heatmap + "_" + index;
				this.ResultTab.addTab({ //Add a tab for each parameter to output
					Label: p.Name,
					SetActive: true,
					Controls: ["Delete"],
					Content: {Type: "HTML", Value: "<fieldset><legend>" + p.Name + " &bull; </legend><div id=\"" + p.ID + "\" style=\"position: relative\"><span class=\"Error\">Preparing preview, please wait...</span></div></fieldset>"}
				});
				let b = LinkCtrl.buttonBar([ //Create the button bar
					Result.getAsJPGControl(result, i),
					Result.getAsHTMLControl(result, i),
				], true); //The second argument is to get the buttonbar inline 
				b.style.fontWeight = "normal";
				b.style.fontSize = "0.7em";
				GetId(p.ID).previousSibling.append(b); //Append the button
				index++;
			}
		}, this);
		let plate = this.PlateSelect.Selected;
		result.draw(plate, this.gradColors(), tab, this.extremumObject()); //Draw the Heatmaps, using the selected source for min/max
		return this;
	}
	extremumObject() { //Return an object containing the min/max properties needed to build a heatmap
		switch(this.ExtremumSource.Selected) { 
			case "Global": return undefined; //The global values are stored at the parameter level
			case "Plate": return {Local: true};
			case "Custom": return {Min: this.Extremums.Min.getValue(), Max: this.Extremums.Max.getValue()};
		}
	}
	gradColors() { //Return the colors for the heatmap gradient
		return [
			CSSCOLORS.fetchRGB(this.HeatmapOptions.Low.getValue()),
			CSSCOLORS.fetchRGB(this.HeatmapOptions.Medium.getValue()),
			CSSCOLORS.fetchRGB(this.HeatmapOptions.High.getValue())
		];
	}
	validate(result) { //Validate the well data and assign min/max values for all parameters
		let id = "Form_ValidateResult"; //Root ID for the form
		let report = id + "_Output";
		let lineCount = id + "_LineCount";
		let html = "<div id=\"" + report + "\"><p class=\"Error\">Validating file, please wait...</p><p style=\"display:none\">Rows processed: <span id=\"" + lineCount + "\">0</span></p></div>"; //Prepare the html for the form
		Form.open({
			ID: id,
			HTML: html,
			Title: "Data validation",
			Buttons: [
				{Label: "Back to mapping", Icon: {Type: "Back", Space: true}, Click: function() {
					this.mapParameters();
					Form.close(id);
				}.bind(this)},
				{Label: "Done", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() {
					Form.close(id);
					if(result.Validated) {this.draw(result)}
				}.bind(this)},
			],
		});
		let plate = Editor.Plate;
		if(plate === undefined) {GetId(report).children[0].innerHTML = "No plate defined, cannot validate the well data now"; return} //Failure 
		GetId(report).children[1].style.display = "block";
		Mapper.scan(result, {Log: true, MinMax: true, Custom: function(output) { //Custom function to run at each row
			let selected = output.Items;
			if(500 * Math.round(selected / 500) - selected == 0 && GetId(lineCount)) {GetId(lineCount).innerHTML = selected} //Only once every 500 lines to save FPS
		}}).then(function(output) { //After the scan is complete, report the results
			let out = "";
			if(output.Items > 0) { //OK
				result.Validated = true;
				result.PlatesID = output.PlatesID;
				out += "<p class=\"Success\" style=\"text-align: center\">Validation successful!</p>";
				out += "<ul><li>Valid wells: " + output.Items + "</li>";
				out += "<li>Plates found: " + output.PlatesID.length + "</li></ul>";
			}
			else { //No valid wells found
				result.Validated = false;
				result.PlatesID = [];
				out += "No valid well data found";
			}
			if(GetId(lineCount)) {GetId(lineCount).innerHTML = output.Items}
			if(GetId(report)) {GetId(report).innerHTML = out}
			Result.updateParameters(result);
			this.Results.update();
		}.bind(this));
	}
	highlight(array) { //Draw the highlight image at the coordinates provided. Each element in array is an object specifying the image to draw and the coordinates x and y
		let sel = this.Results.Selected; //The selected result file
		if(sel.length == 0) {return this} //No result selected
		sel[0].Parameters.forEach(function(p) { //For all parameters in the selected file
			if(p.Selected) {p.highlight(array)} //To the highlight for selected parameters
		});
		return this;
	}
	deleteParam(l) { //Unselect the parameter of index l for the result file selected. The index l is not the index in the Parameters array! It is the tab index
		let r = this.Results.Selected[0]; //The selected result
		let selected = r.Parameters.filter(function(p) {return p.Selected}); //Start by selecting only the selected parameters
		selected[l].Selected = false; //Then the index is directly the position in the array, update the parameter
		Result.updateMapping(r);
		this.Results.update();
		return this;
	}
	deleteResult(r) { //Delete the result object passed by removing the Heatmap displayed, if any
		if(this.Results.Array.length > 1) {this.init()} //At least one result remain after deletion
		else {
			GetId(Editor.Anchors.Main.Results).innerHTML = "<p>Load a result file to continue</p>";
		}
		return this;
	}
	heatmapTemplates() { //Open a form to display heatmap templates and other options for heatmap colors
		let id = "Form_HeatmapTemplate";
		let current = id + "_Colors";
		let template = id + "_Template";
		let colors = {
			Low: LinkCtrl.new("Color", {ID: current, Title: "Color for the lowest value", Default: this.HeatmapOptions.Low.getValue(), Label: "0", Chain: {Index: 0}}),
			Medium: LinkCtrl.new("Color", {ID: current, Title: "Color for the average value", Default: this.HeatmapOptions.Medium.getValue(), Label: "50", Chain: {Index: 1}}),
			High: LinkCtrl.new("Color", {ID: current, Title: "Color for the highest value", Default: this.HeatmapOptions.High.getValue(), Label: "100", Chain: {Index: 2, Last: true}}),
		}
		let HMtemplates = CSSCOLORS.HMtemplates();
		let html = "";
		html += "<div style=\"float: left; text-align: center\">";
			html += "<p><b>Selected colors:</b></p>";
			html += "<div id=\"" + current + "\"></div>";
		html += "</div>";
		html += "<div style=\"margin-left:200px\">";
			html += "<p><b>Templates:</b></p>";
			html += "<div id=\"" + template + "\" style=\"overflow: auto\">";
			HMtemplates.forEach(function(h, i) {
				html += "<label class=\"LinkCtrl LinkCtrl_Round LinkCtrl_Resting\" style=\"margin: 5px\" name=\"" + i + "\" title=\"Click on the template to apply its colors\">";
				h.forEach(function(c) {
					html += "<span style=\"background-color: " + c + "; border: 1px solid black; margin-right: 2px\">&nbsp;&nbsp;&nbsp;&nbsp;</span>";
				});
				html += "</label>";
				if(i % 2 == 1) {html += "<br>"}
			});
			html += "</div>";
		html += "</div>";
		Form.open({
			ID: id,
			HTML: html,
			Title: "Heatmaps",
			Buttons: [
				{Label: "Done", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() { //Assign the selected colors to the controls and redraw the plate
					this.HeatmapOptions.Low.setValue(colors.Low.getValue());
					this.HeatmapOptions.Medium.setValue(colors.Medium.getValue());
					this.HeatmapOptions.High.setValue(colors.High.getValue());
					this.draw(this.Results.Selected[0]);
					Form.close(id);
				}.bind(this)}, 
				{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id)}}
			],
			onInit: function() { //Init the linkCtrl with the form
				Object.values(colors).forEach(function(c) {c.init()});
				GetId(template).addEventListener("click", function(e) { //Event attached to the main template div
					let t = e.target;
					switch(t.nodeName) {
						case "SPAN": t = t.parentElement; break; //The click happened on the color span, rebase to the hosting label
						case "LABEL": break; //the click happened on the hosting label
						default: return; //Any other case, we don't care
					}
					let index = Number(t.attributes.name.value); //Index of the heatmap
					colors.Low.setValue(HMtemplates[index][0]); //Redefine the controls with template colors
					colors.Medium.setValue(HMtemplates[index][1]);
					colors.High.setValue(HMtemplates[index][2]);
				});
				let b = LinkCtrl.button({Label: "Invert", Title: "Click here to invert the color gradient", Click: function() { //Invert button
					let low = colors.Low.getValue();
					let high = colors.High.getValue();
					colors.Low.setValue(high);
					colors.High.setValue(low);
				}});
				let here = GetId(current);
				here.insertAdjacentHTML("beforeend", "<br><br>");
				here.append(b);
			},
		});
	}
	//TO BE UPDATED WITH STREAM-WRITE CAPABILITIES WHEN POSSIBLE...
	pushLayout(r) { //Merge layout data with the result file provided
		let limit = 5000;
		if(r.Validated == false) { //Cannot process unvalid result file
			Editor.Console.log({Message: "The selected result has not been validated. Update mapping parameter and try again.", Gravity: "Error"});
			return this;
		}
		let id = "Form_PushLayout";
		let output = id + "_output";
		let html = "";
		html += "<fieldset><legend>Notice</legend>Use this tool to push the layout data into the current result file.<p class=\"Error\">Only " + limit + " rows will be processed, to prevent the browser to run out of memory.</p>";
		html += "Range data will be resolved to their definition (if they exist) for the definition plate currently selected.<br>";
		html += "Please ensure the desired plate is selected before continuing.</fieldset>";
		html += "<div><p id=\"" + output + "\">Press the start button below when ready to continue</div>";
		let start = function() {
			GetId(output).innerHTML = "<span class=\"Error\">Preparing file, please wait...</span>";
			r.pushLayout(limit).then(function(out) { //run asynchronously
				let save = Papa.unparse(out.Data, {delimiter: "\t"});
				let target = GetId(output); //Important to access the element after the file has been generated
				if(target) { //If the form is still open and the operation has not been cancelled
					let url = URL.createObjectURL(new Blob([save], {type: 'text/plain;charset=utf-8'}));
					let msg = "<span class=\"Success\">Completed.</span>";
					if(out.Aborted) {msg = "<span class=\"Error\">Aborted after " + limit + " rows!<br>Consider reducing the size of your file.</span>"}
					target.innerHTML = msg + "<p>Click <a href=\"" + url + "\" download=\"Merged_Data.txt\">here</a> to download the generated file</p>";
					Form.replaceButtons(id, [{Label: "Close", Click: function() {URL.revokeObjectURL(url); Form.close(id)}}]); //Revoke the URL has it is no longer useful
				}
			});
		}
		Form.open({
			ID: id,
			HTML: html,
			Size: 500,
			Title: "Push layout",
			Buttons: [
				{Label: "Start", Click: start},
				{Label: "Cancel", Click: function() {Form.close(id)}},
			],
		});
		return this;
	}
}