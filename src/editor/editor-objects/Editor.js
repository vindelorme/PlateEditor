//******************************************************
//EDITOR object - Root object for handling of plates
//******************************************************
class Editor {
	constructor() {}
	//Static Methods
	static init() { //Initialize the editor. This generates all the controls and buttons
		this.Root = "Editor";
		this.pixelRatio = 2; //Provides better resolution for the canvas
		let menuRoot = this.Root + "_Menu";
		let mainRoot = this.Root + "_Main";
		let popupRoot = this.Root + "_Popup";
		this.Anchors = {
			Menu: {
				Root: menuRoot,
				Areas: menuRoot + "Areas",
				AreaOptions: menuRoot + "AreaOptions",
				Results: menuRoot + "Results",
				Plate: menuRoot + "Plate",
				Layout: menuRoot + "Layout",
				Conc: menuRoot + "Concentration",
				DRC: menuRoot + "Conc_DRC",
				Analysis: menuRoot + "Analysis",
			},
			Main: {
				Root: mainRoot,
				Plate: mainRoot + "Plate",
				Results: mainRoot + "Results",
			},
			Popup: {
				Root: popupRoot,
				Well: popupRoot + "Well",
				Area: popupRoot + "Area",
				Conc: popupRoot + "Conc",
				Select: popupRoot + "Select",
				Data: popupRoot + "Data",
				ResolvedName: popupRoot + "ResolvedName",
			}
		}
		let html = "<div id=\"" + this.Anchors.Popup.Well + "\" style=\"font-weight: bold\"></div>"; //Well information
		html += "<div id=\"" + this.Anchors.Popup.Area + "\"></div>"; //Area information
		html += "<div id=\"" + this.Anchors.Popup.Conc + "\"></div>"; //Conc information
		html += "<div id=\"" + this.Anchors.Popup.Select + "\"></div>"; //Selection information
		html += "<div id=\"" + this.Anchors.Popup.Data + "\"></div>"; //Parameter value information
		GetId(this.Anchors.Popup.Root).innerHTML = html; //Popuplate the inner html of the popup
		this.Menu = new TabControl({
			ID: this.Anchors.Menu.Root,
			Multiple: true,
			Stack: true,
			Layout: "Menu",
			Tabs: [
				{Label: "Plate", Active: true, Content: {
					Type: "HTML",
					Value: "<fieldset><div id=\"" + this.Anchors.Menu.Plate + "\"></div></fieldset><fieldset id=\"" + this.Anchors.Menu.Layout + "\"><legend>Options</legend></fieldset>", //<legend>Format</legend>
				}},
				{Label: "Areas", Content: {
					Type: "HTML",
					Value: "<fieldset></fieldset><fieldset id=\"" + this.Anchors.Menu.Areas + "\"><legend>Areas available</legend></fieldset><fieldset id=\"" + this.Anchors.Menu.AreaOptions + "\"><legend>Options</legend></fieldset>", //<legend>Management</legend> style=\"max-height: 500px; overflow: auto\"
				}},
				{Label: "Concentration", Content: {Type: "HTML", Value: "<fieldset id=\"" + this.Anchors.Menu.Conc + "\"></fieldset><fieldset id=\"" + this.Anchors.Menu.DRC + "\"><legend>Dose-response</legend></fieldset>"} }, //<legend>Management</legend>
				{Label: "Results", Content: {Type: "HTML", Value: "<fieldset></fieldset><fieldset id=\"" + this.Anchors.Menu.Results + "\"><legend>Results available</legend></fieldset>"} }, //<legend>Controls</legend> style=\"max-height: 500px; overflow: auto\"
				{Label: "Analysis", Content: {Type: "HTML", Value: "<div id=\"" + this.Anchors.Menu.Analysis + "\"></div>"} },
			],
		});
		this.Main = new TabControl({
			ID: this.Anchors.Main.Root,
			Multiple: true,
			Layout: "Menu",
			Tabs: [
				{Label: "Layout", Active: true, Content: {Type: "HTML", Value: "<div id=\"" + this.Anchors.Main.Plate + "\"><p>Choose a plate format or load a layout to start</p></div>"} },
				{Label: "Data", Content: {Type: "HTML", Value: "<div id=\"" + this.Anchors.Main.Results + "\" style=\"position: relative\"><p>Load a result file to continue</p></div>"} }, //The position styling is to correctly display the popup for the lookup select
			]
		});
		this.Tables = {
			Areas: new RespTable({ID: this.Anchors.Menu.Areas, Fields: ["Type", "Name", "Color", "Other"], Preserve: true, FullWidth: true, RowNumbers: true,
				onDelete: function(a) {this.deleteArea(a)}.bind(this)}),
			Results: new RespTable({ID: this.Anchors.Menu.Results, Fields: ["Name", "Size", "Info", "Validated"], Headers: ["Name", "Size", "Parameters", "&check;"], Preserve: true, FullWidth: true, RowNumbers: true,
				onDelete: function(r) {this.deleteResult(r)}.bind(this),
				onSelect: function(newSelect, oldSelect, newIndices, oldIndices) { //Redraw when necessary
					if(oldSelect[0]) { //Something already selected
						if(newIndices[0] != oldIndices[0] || newSelect[0].Validated == false) {this.ResultManager.draw(newSelect[0])} //If a different result is selected, redraw. If the result was not validated, redraw also
					}
					else {this.ResultManager.draw(newSelect[0])}
				}.bind(this),
				onUpdate: function() {this.Report()}.bind(this),
			}),
		}
		this.Controls = {
			Plate: {
				Rows: LinkCtrl.new("Number", {ID: this.Anchors.Menu.Plate, Title: "Number of rows", Min: 1, Max: 48, Default: 4, Label: "Rows", Chain: {Index: 0}}), 
				Cols: LinkCtrl.new("Number", {ID: this.Anchors.Menu.Plate, Title: "Number of columns", Min: 1, Max: 48, Default: 6, Label: "Columns", Chain: {Index: 1, Last: true}}), 
			},
			Area: {
				Lock: LinkCtrl.new("Checkbox", {ID: this.Anchors.Menu.AreaOptions, Label: "Lock Areas", Default: true, Preserve: true, Chain: {Index: 0}, Change: function() {}.bind(this), Title: "If checked, prevent tagged areas from being replaced when tagged again"}),
				Strict: LinkCtrl.new("Checkbox", {ID: this.Anchors.Menu.AreaOptions, Label: "Strict Mode", Default: true, Chain: {Index: 1, Last: true}, Change: function(v) {this.strictMode(v)}.bind(this), Title: "If checked, prevent areas with types 'Sample' or 'Range' to overlap with 'Controls'"}),
			},
			Concentration: {
				Value: LinkCtrl.new("Number", {ID: this.Anchors.Menu.Conc, Title: "Value for the concentration", Min: 0, Default: 20, Label: "Value", Preserve: true, Chain: {Index: 0}}),
				Unit: LinkCtrl.new("Select", {ID: this.Anchors.Menu.Conc, Title: "Unit for the concentration", Default: 2, Label: "Unit", ControlLeft: true, Chain: {Index: 1, Last: true}, List: Unit.list({Name: true})}),
				Doses: LinkCtrl.new("Number", {ID: this.Anchors.Menu.DRC, Title: "Total number of doses in the dose-response curve", Min: 0, Default: 10, Label: "Doses", Preserve: true, Chain: {Index: 0}}),
				Rep: LinkCtrl.new("Number", {ID: this.Anchors.Menu.DRC, Title: "How many times the same dose should be replicated side-by-side", Min: 0, Default: 1, Label: "Replicates", ControlLeft: true, Chain: {Index: 1, Last: true}}),
				Operator: LinkCtrl.new("Select", {ID: this.Anchors.Menu.DRC, Title: "Mathematical operator to use for calculation of the next dose", Chain: {Index: 2, NewLine: true}, Default: 0, Label: "Operator", List:["/", "×", "+", "×10^"]}),
				Factor: LinkCtrl.new("Number", {ID: this.Anchors.Menu.DRC, Title: "Number to use with the operator for calculation of the next dose", Chain: {Index: 3, Last: true}, Default: 2, Label: "Factor", ControlLeft: true}),
				Direction: LinkCtrl.new("Radio", {ID: this.Anchors.Menu.DRC, Label: "Direction", Title: "Direction of the dose-response", Default: 0, Chain: {Index: 4, NewLine: true}, List: ["Horizontal", "Vertical"]}),
			},
			Result: {
				
			},
			Analysis: {
				
			},
		}
		this.Console = new EditorConsole("Console");
		this.ResultManager = new ResultManager(this.Anchors.Main.Results, this.Tables.Results);
		this.Menu.init();
		this.Main.init();
		Object.values(this.Tables).forEach(function(t) {t.init()});
		Object.values(this.Controls).forEach(function(c) {
			Object.values(c).forEach(function(l) {l.init()});
		});
		GetId(this.Anchors.Menu.Plate).prepend(LinkCtrl.buttonBar([
			{Label: "96 wells", Title: "Create the layout for a 96-well plate (8 Rows × 12 Columns)", Click: function() {this.newPlate(8, 12)}.bind(this)},
			{Label: "384 wells", Title: "Create the layout for a 384-well plate (16 Rows × 24 Columns)", Click: function() {this.newPlate(16, 24)}.bind(this)},
			{Label: "1536 wells", Title: "Create the layout for a 1536-well plate (32 Rows × 48 Columns)", Click: function() {this.newPlate(32, 48)}.bind(this)},
			{Label: "Custom", Title: "Create the layout for a plate with the number of Rows and Columns as specified", Click: function() {
				var r = this.Controls.Plate.Rows.getValue();
				var c = this.Controls.Plate.Cols.getValue();
				this.newPlate(r, c);
			}.bind(this)},
		]));
		GetId(this.Anchors.Menu.Layout).append(LinkCtrl.buttonBar([
			{Label: "Load", Title: "Load a layout from file", Icon: {Type: "Load", Space: true}, Click: function() {this.load()}.bind(this)},
			{Label: "Save", Title: "Save the current layout", Icon: {Type: "Save", Space: true}, Click: function() {this.save()}.bind(this)},
			{Label: "Reset", Title: "Reset the entire project: areas, tags, concentrations and results will be removed", Icon: {Type: "Reset", Space: true}, Click: function() {
				this.warn().then(function() {this.reset()}.bind(this), function() {});
			}.bind(this)},
		]));
		GetId(this.Anchors.Menu.Areas).previousSibling.append(LinkCtrl.buttonBar([
			{Label: "Definitions", Title: "Edit definitions for available ranges", Click: function() {this.definitions()}.bind(this)},
			{Label: "Edit", Title: "Edit the selected area", Icon: {Type: "Edit", Space: true}, Click: function() {this.editArea()}.bind(this)},
			{Label: "New", Title: "Create a new area", Icon: {Type: "New", Space: true}, Click: function() {this.newArea()}.bind(this)},
		]));
		GetId(this.Anchors.Menu.Areas).previousSibling.append(LinkCtrl.buttonBar([
			{Label: "Untag all", Title: "Remove tagged areas for the whole plate", Click: function() {this.untagAllArea()}.bind(this)},
			{Label: "Untag", Title: "Remove tagged areas from the selection", Click: function() {this.untagArea()}.bind(this)},
			{Label: "Tag", Title: "Tag the selected area in the selection", Icon: {Type: "Tag", Space: true},  Click: function() {this.tagArea()}.bind(this)},
		]));
		GetId(this.Anchors.Menu.Conc).prepend(LinkCtrl.buttonBar([
			{Label: "Reset", Title: "Reset Concentration data for the whole plate", Icon: {Type: "Reset", Space: true}, Click: function() {this.resetConc()}.bind(this)},
			{Label: "Untag", Title: "Untag all concentrations from the selection", Click: function() {this.untagConc()}.bind(this)},
			{Label: "Tag", Title: "Tag the defined concentration in the selection", Icon: {Type: "Tag", Space: true}, Click: function() {this.tagConc()}.bind(this)},
		]));
		var drc = GetId(this.Anchors.Menu.DRC);
		drc.insertAdjacentHTML("beforeend", "<br>");
		drc.append(LinkCtrl.button(
			{Label: "Tag DRC", Title: "Tag the defined dose-response in the selection", Icon: {Type: "Tag", Space: true}, Click: function() {this.tagDRC()}.bind(this)}
		));
		GetId(this.Anchors.Menu.Results).previousSibling.append(LinkCtrl.buttonBar([
			{Label: "Add results", Icon: {Type: "New", Space: true}, Title: "Attach new results file to the plate layout", Click: function() {this.newResult()}.bind(this)},
			{Label: "Edit", Title: "Edit the selected result", Icon: {Type: "Edit", Space: true}, Click: function() {this.editResult()}.bind(this)},
			{Label: "Pairing", Title: "Tools for pairing of result and definition plates", Click: function() {this.pairing()}.bind(this)},
			//{Label: "Push Layout", Title: "Push the layout data to the selected result file", Click: function() {this.pushLayout()}.bind(this)}, //Let's review this later, with stream-write capabilities
		]));
		GetId(this.Anchors.Menu.Results).previousSibling.append(LinkCtrl.buttonBar([
			{Label: "Push Layout", Title: "Push the layout data to the selected result file", Click: function() {this.pushLayout()}.bind(this)}, //Let's review this later, with stream-write capabilities
		]));
		GetId(this.Anchors.Menu.Analysis).prepend(LinkCtrl.buttonBar([
			{Label: "Controls", Title: "Aggregate data for the controls defined in the layout and compute Z-factors", Click: function() {this.Report("zFactor")}.bind(this)},
			{Label: "Column Analysis", Title: "Compute statistics for the combinations of all areas and concentrations defined in the layout, organized as individual columns", Click: function() {this.Report("aggregate")}.bind(this)},
			{Label: "Grouped Analysis", Title: "Compute statistics for the combinations of all areas and concentrations defined in the layout, organized as two-entry tables", Click: function() {this.Report("grouped")}.bind(this)},
		]));
		return this;
	}
//**********************
// PLATE-RELATED METHODS
//**********************
	static warn(that, I) { //A form that will warn the user before doing something irreversible and potentially damaging
		if(this.Plate === undefined && this.Tables.Areas.Array.length == 0 && this.Tables.Results.Array.length == 0) {return Promise.resolve()}
		if(I && I.Silent) {return Promise.resolve()} //Skip the warning if it has already been shown and approved before
		let id = "Form_Warning";
		let msg = "This will reset the entire project.<br>All tags, areas, definitions and results will be discarded.";
		let title = "Reset layout";
		switch(that) {
			case "tag": msg = "This will remove all tags for all layers on the plate."; title = "Reset tags"; break;
			case "conc": msg = "This will remove all concentration data for all layers on the plate."; title = "Reset concentrations"; break;
		}
		return new Promise(function (resolve, reject) {
			Form.open({
				ID: id,
				HTML: "<div style=\"text-align: center\"><p>" + msg + "</p><p class=\"Error\">Are you sure you want to continue ?</p></div>",
				Title: title,
				Buttons: [
					{Label: "Reset", Click: function() {Form.close(id); resolve()}},
					{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id); reject()}}
				]
			});
		});
	}
	static reset() { //Reset the whole thing, or part of it
		this.Plate = undefined; //Reset the plate
		this.Main.init(); //Reset the plate vizualization panel
		Object.values(this.Tables).forEach(function(t) {t.empty()}); //Reset the areas and results tables
		this.Console.log({Message: "Project reset", Gravity: "Success", Reset: true});
	}
	static newPlate(r, c) { //Create a new plate
		if(this.Plate) { //A plate already exist
			if(this.Plate.Rows != r || this.Plate.Cols != c) { //Confirmation before resizing
				let id = "Form_Resize";
				let idArea = id + "_RadioArea";
				let idConc = id + "_RadioConc";
				let RadioArea = LinkCtrl.new("Radio", {ID: idArea, Default: 0, Preserve: true, List: ["Keep", "Discard"], Title: "Keep will maintain area tagging data for the wells still available in the new plate"});
				let RadioConc = LinkCtrl.new("Radio", {ID: idConc, Default: 0, Preserve: true, List: ["Keep", "Discard"], Title: "Keep will maintain concentration values for the wells still available in the new plate"});
				let html = "<div style=\"text-align: center\"><p>This will resize your plate to the new dimensions.<br>Select what should be done with previously entered data:</p></div>";
				html += "<fieldset id=\"" + idArea + "\"><legend>Area data</legend></fieldset>";
				html += "<fieldset id=\"" + idConc + "\"><legend>Concentration data</legend></fieldset>";
				html += "<div class=\"Error\" style=\"text-align: center\"><p>Data for wells outside the new plate dimensions will be discarded</p></div>";
				Form.open({
					ID: id,
					HTML: html,
					Title: "Resize plate",
					Buttons: [
						{Label: "Resize", Click: function() {
							this.resize(r, c, RadioArea.Selected, RadioConc.Selected);
							Form.close(id);
						}.bind(this)},
						{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id);}}
					],
					onInit: function() {
						RadioArea.init();
						RadioConc.init();
					}
				});
			}
			else {this.Console.log({Message: "No changes in plate dimensions", Gravity: "Warning"})}
		}
		else { //No plate was defined, create it
			this.Plate = new Plate(this.Anchors.Main.Plate, r, c);
			this.Plate.init();
			this.Menu.closeAll().jumpTo(1);
		}
		return this;
	}
	static resize(r, c, KeepArea, KeepConc) { //Resize the layout to the new dimensions. Keep or erase previous Area/Conc data 
		if(KeepArea == "Discard") {this.untagAllArea({Silent: true})}
		else { //Keep the area data
			if(r <= this.Plate.Rows && c <= this.Plate.Cols) { //In case of downsizing, crop exceeding wells and update the ranges
				Area.resize(this.Tables.Areas.Array, this.Plate, r, c);
				this.Tables.Areas.update(); //Update display to reflect changes
			}
		} 
		if(KeepConc == "Discard") {this.resetConc({Silent: true})}
		Plate.resize(this.Plate, r, c);
		this.Console.log({Message: "Plate dimensions changed", Gravity: "Success", Reset: true});
		return this;
	}
	static save() { //Save the layout
		let save = "["; //Layout is saved as a JSON.stringified array of 2 elts, a plate and areas definitions
		save += Plate.save(this.Plate) + ",";
		let areas = "[";
		let hasArea = false;
		this.Tables.Areas.Array.forEach(function(a, index) { //Save the areas
			if(index > 0) {areas += ","}
			areas += Area.save(a);
			hasArea = true;
		});
		save += areas + "]]";
		if(hasArea == false && this.Plate === undefined) {this.Console.log({Message: "Nothing to save", Gravity: "Warning"}); return this} //No area + no plate = nothing to save
		Form.download(save, {DataType: "text/json;charset=utf-8", FileName: "Layout.save"});
		return this;
	}
	static load() { //Load a layout from file
		let id = "Form_Load";
		let FileCtrl = LinkCtrl.new("File", {ID: "FormLoad_FileSelect", Default: "", Label: "Layout file", Title: "Click to select the file containing the layout definition", Accept: ".save"})
		Form.open({
			ID: id,
			HTML: "<p>Select the Layout file to load</p><div id=\"" + FileCtrl.ID + "\"></div>",
			Title: "Load layout",
			Buttons: [
				{Label: "Next", Click: function() {
					let files = FileCtrl.getValue();
					if(files.length == 0) {alert("No file selected"); return this}
					let reader = new FileReader();
					reader.onload = function(e) {this.loadPreview(e.target.result)}.bind(this);
					reader.readAsText(files[0]);
					Form.close(id);
				}.bind(this)},
				{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id)}}
			],
			onInit: function() {FileCtrl.init()},
		});
		return this;
	}
	static loadPreview(data) { //Load provided data, for preview
		let loadedData = undefined;
		try {loadedData = JSON.parse(data)} catch(error) {this.Console.log({Message: "Unable to load the layout. <i>" + error + "</i>", Gravity: "Error"}); return this}
		let plate = loadedData[0];
		let areas = loadedData[1];
		let id = "Form_LoadPreview";
		let idPlate = id + "_Plate";
		let idAreas = id + "_Areas";
		Form.open({
			ID: id,
			HTML: "<fieldset id=\"" + idPlate + "\"><legend>Plate data</legend></fieldset><fieldset id=\"" + idAreas + "\"><legend>Areas data</legend></fieldset>",
			Title: "Layout preview",
			Buttons: [
				{Label: "Load", Click: function() {
					this.warn().then(function() { //Confirmation for reset, then load data
						this.reset();
						this.loadData(plate, areas);
						Form.close(id);
					}.bind(this), function() {});
				}.bind(this)},
				{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id)}}
			],
			onInit: function() {
				Area.loadPreview(areas, idAreas);
				Plate.loadPreview(plate, idPlate);
			},
		});
	}
	static loadData(plate, areas) { //Load the plate and areas data. Make sure the layout has been reset before using
		if(plate) { //Load plate data if present
			this.newPlate(plate.Rows, plate.Cols);
			Plate.load(this.Plate, plate);
		}
		if(areas && areas.length > 0) {
			Area.load(this.Tables.Areas, areas, this.Plate, plate);
			this.Tables.Areas.update(); //Update the table to reflect any changes in the ranges
		}
		this.Plate.update(); //Update to display the concentrations and update the range info
		this.Menu.closeAll().jumpTo(1);
		this.Console.log({Message: "Layout successfully loaded", Gravity: "Success", Reset: true});
		return this;
	}
//*********************
// AREA-RELATED METHODS
//*********************
	static newArea() { //Open the form with options to create a new area
		var id = "Form_NewArea";
		Area.form({
			ID: id,
			Color: CSSCOLORS.fetch(this.Tables.Areas.Length), //Initial color when opening the form
			Ok: function(Controls, RangeControls) { //What to do when ok is clicked
				if(this.addArea(Controls, RangeControls)) {Form.close(id)}
			}.bind(this),
			Another: function(Controls, RangeControls) { //The user wants more
				if(this.addArea(Controls, RangeControls)) {
					Controls.Name.setValue("").focus(); //Give the focus back to the text to avoid mouse dragging
					Controls.Color.setValue(CSSCOLORS.fetch(this.Tables.Areas.Length));
				}
			}.bind(this),
		});
		return this;
	}
	static addArea(C, R) { //Check and create a new area with the options provided
		let name = C.Name.getValue();
		if(name.length == 0) {alert("Area name must be at least 1 character"); return false}
		if(this.Tables.Areas.hasElement("Name", name)) {alert("This name has already been defined, please choose another one"); return false}
		let color = C.Color.getValue();
		let type = C.Type.Selected;
		if(type == "Range") {
			let rep = R.Replicates.getValue();
			if(rep < 1 || rep > 1536) {alert("Replicates for range must be a valid integer between 1 and 1536"); return false}
			let dir = R.Direction.Selected;
			let priority = R.Priority.Selected;
			let custom = R.Custom.getValue();
			this.Tables.Areas.addRow(new Area({Name: name, Color: color, Type: type, Replicates: rep, Direction: dir, Priority: priority, Custom: custom}));
			return true;
		}
		this.Tables.Areas.addRow(new Area({Name: name, Color: color, Type: type}));
		return true;
	}
	static editArea() { //Edit the selected area
		var sel = this.Tables.Areas.Selected;
		if(sel.length == 0) {this.Console.log({Message: "No area selected", Gravity: "Error"}); return this}
		var id = "Form_EditArea";
		var a = sel[0];
		Area.form({
			ID: id,
			Edit: true,
			Area: a,
			Color: a.Color, //Initial color when opening the form
			Ok: function(Controls, RangeControls) { //What to do when ok is clicked
				let name = Controls.Name.getValue();
				if(a.Name != name) { //The name has changed, check unicity
					if(this.Tables.Areas.hasElement("Name", name)) {alert("This name has already been defined, please choose another one"); return}
				}
				if(name.length == 0) {alert("Area name must be at least 1 character"); return}
				Pairing.rename(a.Name, name); //Rename within Pairing object
				a.Name = name;
				a.Color = Controls.Color.getValue();
				if(a.Type == "Range") { //Update values for ranges
					a.Replicates = RangeControls.Replicates.getValue();
					a.Direction = RangeControls.Direction.Selected;
					a.Priority = RangeControls.Priority.Selected;
					a.Custom = RangeControls.Custom.getValue();
					Area.rangeInfo(a);
				}
				if(this.Plate) {a.update(this.Plate.WellSize, this.Plate.WellMargin)} //Update well display if necessary
				this.Tables.Areas.update();
				Pairing.update(this.ResultManager.Anchors.Pairing); //Update pairing info for result displayed
				Form.close(id);
			}.bind(this),
		});
		return this;
	}
	static tagArea() { //Tag the selected area in the selection
		if(this.Plate === undefined) {return this}
		var a = this.Tables.Areas.Selected;
		if(a.length == 0) {this.Console.log({Message: "No area selected", Gravity: "Error"}); return this}
		var lock = this.Controls.Area.Lock.getValue();
		var strict = this.Controls.Area.Strict.getValue();
		Plate.tagArea(this.Plate, a[0], {Lock: lock, Strict: strict}).then(function(R) { //Tag and return a feedback object
			if(R.Cancel) {return this} //Custom tag was cancelled
			if(R.Selected == 0) {this.Console.log({Message: "No wells selected", Gravity: "Error"}); return this}
			if(a[0].Type == "Range") {this.Plate.updateRange(a[0])} //Update range information if needed
			if(R.Tagged < R.Selected) { //Not all wells were tagged
				if(R.Tagged == 0) { //Nothing was tagged
					this.Console.log({Message: "None of the selected wells (" + R.Selected + ") were tagged", Gravity: "Error"});
				}
				else { //Less than expected
					this.Console.log({Message: "Only " + R.Tagged + " selected wells (out of " + R.Selected + ") were tagged", Gravity: "Warning"});
				}
				return this;
			}
			if(R.Tagged == R.Selected) { //Case both equal to 0 excluded above
				this.Console.log({Message: R.Tagged + " wells tagged", Gravity: "Success"});
			}
			this.Tables.Areas.update(); //Update the table
		}.bind(this));
		return this;
	}
	static untagArea() {
		if(this.Plate === undefined) {return this}
		let R = this.Plate.untag();
		if(R.Untag == 0) {this.Console.log({Message: "No wells selected", Gravity: "Error"}); return this}
		this.Tables.Areas.update()
		this.Console.log({Message: R.Untag + " wells untagged", Gravity: "Success"});
		return this;
	}
	static untagAllArea(I) {
		if(this.Plate === undefined) {return this}
		let A = this.Tables.Areas;
		let plate = this.Plate;
		if(A.Length > 0) {
			this.warn("tag", I).then(function() {
				A.Array.forEach(function(a) { //For each area defined
					a.removeTags(plate); //Remove tags
					a.Tags = []; //Reset the tag arrays
					if(a.Type == "Range") {
						a.MaxRange = 0; //Reset the ranges
						Area.rangeInfo(a); //Update info
					}
				});
				A.update(); //Update the areas table to reflect any changes in ranges
				this.Console.log({Message: "All wells untagged", Gravity: "Success"});
			}.bind(this), function() {});
		}
		else {this.Console.log({Message: "No area defined", Gravity: "Warning"})}
		return this;
	}
	static deleteArea(a) { //Delete selected area a
		if(this.Plate) {a.removeTags(this.Plate)}
		return this;
	}
	static strictMode(bool) { //Switch strict mode ON or OFF
		if(this.Plate === undefined) {return this}
		if(bool) { //Check for conflicts and prevent switching if any
			let conflicts = TypeMap.getConflicts(this.Plate.TypeMap);
			if(conflicts.length > 0) {
				this.Controls.Area.Strict.setValue(false); //Prevent switch
				this.Plate.highlightConflicts(conflicts);
				this.Console.log({Message: "Conflicts detected! Must be resolved before activating strict mode", Gravity: "Error"});
			}
		}
		return this;
	}
//***************************
// DEFINITION-RELATED METHODS
//***************************
	static definitions() { //Edition of the definitions
		let ranges = Area.getRanges();
		if(ranges.length == 0) {this.Console.log({Message: "No ranges defined", Gravity: "Error"}); return this}
		Definition.formEdit(ranges);
		return this;
	}	
//******************************
// CONCENTRATION-RELATED METHODS
//******************************
	static tagConc() { //Tag the concentration in the selected wells
		if(this.Plate === undefined) {return this}
		let S = this.Plate.tagConc(this.Controls.Concentration.Value.getValue(), this.Controls.Concentration.Unit.Selected); //Tag and return a feedback object
		if(S == 0) {this.Console.log({Message: "No wells selected", Gravity: "Error"}); return this}
		else {this.Console.log({Message: "Concentration added in " + S + " wells", Gravity: "Success"})}
		return this;
	}
	static untagConc() { //Untag the concentration in the selected wells
		if(this.Plate === undefined) {return this}
		let S = this.Plate.untagConc(); //Tag and return a feedback object
		if(S == 0) {this.Console.log({Message: "No wells selected", Gravity: "Error"}); return this}
		else {this.Console.log({Message: "Concentration removed in " + S + " wells", Gravity: "Success"})}
		return this;
	}
	static resetConc(I) { //Reset concentrations for the entire plate
		if(this.Plate === undefined) {return this}
		this.warn("conc", I).then(function() {
			this.Plate.resetConc();
		}.bind(this), function() {});
	}
	static tagDRC() { //Tag the specified DRC in the selected wells
		if(this.Plate === undefined) {return this}
		let c = this.Controls.Concentration;
		let op = c.Operator.Selected;
		op = op.replace("×", "*"); //× is good for display but not for math...
		op = op.replace("^", "**"); //^ is good for display but not for math...
		let I = {
			Value: c.Value.getValue(),
			Unit: c.Unit.Selected,
			Doses: c.Doses.getValue(),
			Rep: c.Rep.getValue(),
			Operator: op,
			Factor: c.Factor.getValue(),
			Direction: c.Direction.Selected,
		}
		let S = this.Plate.tagDRC(I);
		if(S == 0) {this.Console.log({Message: "No wells selected", Gravity: "Error"}); return this}
		else {this.Console.log({Message: "DRC added in " + S + " wells", Gravity: "Success"})}
		return this;
	}
//************************
// RESULTS-RELATED METHODS
//************************
	static newResult() { //Add a result file
		Form_Import.open({Chain: true, OnClose: function(data) {
			let results = [];
			data.forEach(function(d) {
				results.push(new Result(d));
			}.bind(this));
			this.ResultManager.mapParameters(results, true); //The second argument (BackToImport) allow the Form_Import to remain open			
			this.Main.jumpTo(1); //Open the data panel
		}.bind(this)});
		return this;
	}
	static editResult() { //Edit Parsing options and parameter selection
		this.ResultManager.mapParameters();
		return this;
	}
	static deleteResult(r) { //Delete selected result
		this.ResultManager.deleteResult(r);
		return this;
	}
	static pushLayout() { //Merge selected result files with layout data
		let selected = this.Tables.Results.Selected;
		if(this.Plate) {
			if(selected.length > 0) {this.ResultManager.pushLayout(selected[0])}
			else {this.Console.log({Message: "No result file selected", Gravity: "Error"})}
		}
		else {this.Console.log({Message: "No plate defined", Gravity: "Error"})}
		return this;
	}
	static pairing() { //Pairing of result and definition plates
		let definitions = Area.getRanges({HasDefinition: true}); //Ranges with definition
		let results = this.Tables.Results.Array.filter(function(r) { //Get the results. 
			if(r.Validated) { //Only validated results
				r["Plate Count"] = r.PlatesID.length; //Create or update the Plate Count property
				return true;
			}
			else return false;
		}); 
		if(definitions.length == 0 || results.length == 0) {this.Console.log({Message: "At least one definition and one validated result files are required for pairing", Gravity: "Error"}); return this}
		Pairing.form(results, definitions); //Open the form for pairing
		return this;
	}
//*************************
// ANALYSIS-RELATED METHODS
//*************************
	static Report(type) { //Update the window.Results data and Open the desired report page
		let results = this.Tables.Results.Array.filter(function(r) {return r.Validated}); //Only validated results
		window.Results = results;
		if(type === undefined) {return this} //No need to do more in that case
		if(this.Plate === undefined) {this.Console.log({Message: "No plate defined", Gravity: "Error"}); return this} //Check that a plate exist
		if(results.length == 0) {this.Console.log({Message: "No result file available", Gravity: "Error"}); return this} //Check that results exist
		switch(type) { //Open the desired report page
			case "zFactor": return this.zFactor();
			case "aggregate": return this.aggregate();
			case "grouped": return this.grouped();
		}
	}
	static zFactor() { //Compute and report z-factor across all plates
		let controls = Area.getControls(this.Tables.Areas.Array);
		if(controls.Count == 0) {this.Console.log({Message: "No controls defined in the current layout", Gravity: "Error"}); return this}
		Reporter.zFactor(controls);
		return this;
	}
	static aggregate() { //Compute and report stats for aggregated areas (column analysis)
		let areas = Area.getAreas(this.Tables.Areas.Array);
		if(areas.Count == 0) {this.Console.log({Message: "No areas defined in the current layout", Gravity: "Error"}); return this}
		Reporter.aggregate(areas);
		return this;
	}
	static grouped() { //Features for grouped analysis
		let areas = Area.getAreas(this.Tables.Areas.Array);
		if(areas.Count == 0) {this.Console.log({Message: "No areas defined in the current layout", Gravity: "Error"}); return this}
		let conc = this.Plate.getConc(); //Loop the plate to get the conc categorized per unit
		Reporter.grouped(areas, conc);
		return this;
	}
}