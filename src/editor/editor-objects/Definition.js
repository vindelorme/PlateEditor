//**********************************************************************************************
// DEFINITION object - Attached to an area, define names for each index using an external source
//**********************************************************************************************
class Definition {
	constructor(a, data) {
		this.Area = a;
		this.Input = data;
		this.Parser = data.Parser;
		this.Source = data.Source;
		this.Mapping = data.Mapping;
		this.Mapper = Mapper.new(data.Mapping); //Create the mapper object
		this.PlateIndex = LinkCtrl.new("Select", {ID: Definition.anchors("PlateIndex"), Default: 0, List: [1], NavBar: true, Lookup: true, Label: "Plate", Title: "The plate that will be used for the display of definitions", Change: function(v) {this.previewPlate(v)}.bind(this)});
		this.PlatesID == undefined; //Array of ID for the plates within this definition
		return this;
	}
	//Static Methods
	static anchors(here) { //Return the text for the anchors requested
		let id = "Definition";
		switch(here) {
			case "RangeTable": return id + "_RangeTable";
			case "PlateIndex": return id + "_PlateIndex";
			case "Preview": return id + "_Preview";
			default: return id;
		}
	}
	static formEdit(ranges) { //Open a form for manipulation of definitions for each ranges available
		var table = this.anchors("RangeTable");
		var rangePreview = this.anchors("Preview");
		var previewArea = LinkCtrl.new("TextArea", {ID: rangePreview, Preserve: true, Default: ""});
		var doPreview = function(a) { //Function to render the preview for area a
			previewArea.setValue("Preparing preview, please wait...");
			let d = a.Definition;
			Mapper.scan(d, {Log: true, Preview: {Column: Mapper.definition().Name}}).then(function(out) {
				if(out.Error) {
					if(a.Selected) {previewArea.setValue(out.Error)} //Print it when done, if this area is still selected
				}
				else {
					d.update(out); //Update definition information based on scan output
					if(a.Selected) { //Print it when done, if this area is still selected
						if(out.LimitReached) {out.Preview += "\n... (" + (d.Items - out.Limit) + " items remaining)"}
						previewArea.setValue(out.Preview);
					}
				}
				rangeTable.update();
			});
		}
		var mapping = function(a, data, BackToImport) { //Function to run the mapping for area a with the data provided
			Mapper.map(data, {Validate: true, BackToImport: BackToImport,
				Done: function() {
					a.Definition = new Definition(a, data[0]);
					doPreview(a);
				}, Parameters: [
					Mapper.definition(), //Mandatory
					Mapper.well(), //Optional
					Mapper.plate(), //Optional
				], 
			});
		}
		var rangeTable = new RespTable({
			ID: table,
			Array: ranges,
			Fields: ["Name", "Other", "DefInfo"], Headers: ["Name", "Properties", "Definition"],
			Preserve: true, RowNumbers: true, NoControls: true,
			onSelect: function(array) {
				if(array.length > 0) {doPreview(array[0])}
			}
		});
		let html = ""; //Prepare the html for the form
		html += "<div id=\"" + table + "\" style=\"float: left; width:250px\"><p><b>Ranges available:</b></p></div>";
		html += "<div style=\"margin-left: 270px\">";
			html += "<p><b>Definition preview:</b></p>";
			html += "<div id=\"" + rangePreview + "\"></div>"; 
		html += "</div>";
		var id = "Form_DefinitionEdit";
		Form.open({
			ID: id,
			HTML: html,
			Title: "Definition management",
			Size: 600,
			Buttons: [
				{Label: "Select file", Icon: {Type: "Load", Space: true}, Click: function() {
					var sel = rangeTable.Selected;
					if(sel.length == 0) {alert("No range selected!"); return}
					var a = sel[0];
					Form_Import.open({
						Single: true, //Only one input
						Chain: true,
						OnClose: function(data) {mapping(a, data, true)} //Last argument specifies here that a "back to mapping" option should be available
					});
				}, Title: "Select or change the definition file for the selected Range"},
				{Label: "Edit Mapping", Icon: {Type: "Edit", Space: true}, Click: function() {
					var sel = rangeTable.Selected;
					if(sel.length == 0) {alert("No range selected!"); return}
					var a = sel[0];
					if(a.Definition === undefined) {alert("No file selected!"); return}
					mapping(a, [a.Definition.Input]);
				}, Title: "Edit the column mapping for the definition file attached to the selected Range"},
				{Label: "Reset", Icon: {Type: "Reset", Space: true}, Click: function() {
					var sel = rangeTable.Selected;
					if(sel.length == 0) {alert("No range selected!"); return}
					var a = sel[0];
					a.removeDefinition();
					rangeTable.update();
					doPreview(a);
				}, Title: "Remove the definition for the selected Range"},
				{Label: "Done", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() {
					Pairing.updateAll(Editor.ResultManager.Anchors.Pairing); //Update pairing info for all results
					Form.close(id);
				}, Title: "Close this form"},
			],
			onInit: function() { //Initialize the respTable on open
				rangeTable.init();
				previewArea.init().disable();
				var sel = rangeTable.Selected;
				if(sel.length > 0) {doPreview(sel[0])}
				else { //Force selection of the first element if nothing selected
					rangeTable.setValue([0]);
					doPreview(rangeTable.Selected[0]);
				}
			}
		});
	}
	static formPlate(ranges) { //Open a form for manipulation of plate index and visualization of definitions for each range available
		let table = Definition.anchors("RangeTable");
		let preview = Definition.anchors("Preview");
		let plateIndex = Definition.anchors("PlateIndex");
		let doPreview = function(a) { //Function to render the preview for area a
			let d = a.Definition
			if(d) { //This range has a definition defined
				if(d.PlatesID.length == 0) {GetId(preview).innerHTML = "No wells tagged for this area"}
				else {d.PlateIndex.init().change(d.PlateIndex.Value)} //Initialize the control to select the plate and trigger a change that will render the preview. See previewPlate() for the construction of the preview
			}
			else {GetId(preview).innerHTML = "No definition found for this range"}
		}.bind(this);
		let rangeTable = new RespTable({
			ID: table,
			Array: ranges,
			Fields: ["Name", "Other", "DefInfo"], Headers: ["Name", "Properties", "Definition"],
			Preserve: true, RowNumbers: true, NoControls: true,
			onSelect: function(array) {
				if(array.length > 0) {doPreview(array[0])} //See previewPlate() for the construction of the preview
			}
		});
		let html = ""; //Prepare the html for the form
		html += "<div id=\"" + table + "\" style=\"float: left; width: 250px\">";
			html += "<div style=\"margin-top: 10px; margin-bottom: 20px\"><b>Ranges available:</b></div>";
		html += "</div>";
		html += "<div style=\"margin-left: 270px\">";
			html += "<div style=\"margin-top: 10px; margin-bottom: 10px\"><b>Plate selected:</b>";
				html += "<div id=\"" + plateIndex + "\" style=\"display: inline-block; margin-left: 10px\"></div>";
			html += "</div>";
			html += "<b>Plate preview:</b>";
			html += "<div id=\"" + preview + "\" style=\"margin-top: 5px; overflow: auto\"></div>"; 
		html += "</div>";
		var id = "Form_PlateMap";
		Form.open({
			ID: id,
			HTML: html,
			Title: "Plate map",
			Size: 800,
			Buttons: [
				{Label: "Printable version", Click: function() {
					Reporter.printable(GetId(preview).innerHTML);
				}, Title: "Open the map in a new window to allow easy printing or copy/pasting to other applications"},
				{Label: "Done", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() {
					Pairing.update(Editor.ResultManager.Anchors.Pairing); //Update pairing info for result displayed
					Form.close(id);
				}, Title: "Close this form"},
			],
			onInit: function() { //Initialize the respTable on open
				rangeTable.init();
				var sel = rangeTable.Selected;
				if(sel.length > 0) {doPreview(sel[0])}
				else { //Force selection of the first element if nothing selected
					rangeTable.setValue([0]);
					doPreview(rangeTable.Selected[0]);
				}
			}.bind(this),
		});
	}
	static getAsPlate(d, plateName) { //For the definition object passed, return an array the size of the plate with definitions resolved for each well. Also return an array indicating tagged wells for the area
		let a = d.Area;
		//let factor = Math.ceil(a.Tagged / a.Replicates);
		let plate = d.PlateIndex.Selected; //Name of the plate where to look the data
		if(plateName !== undefined) {plate = plateName}
		let factor = a.MaxRange;
		let args = {
			Plate: plate,
			Factor: factor, //This factor is necessary to find the data in case no well/plate mapping are available
			Default: "", //Default fallback if nothing found, leave it blank
			AreaName: a.Name, //This is use when completing missing elements with generic names
			Column: d.Mapping[Mapper.definition().Name], //Index of the column containing the data to extract
			RangeIndexBase0: a.MaxRange, //Providing the maxRange ensures that the array is filled with generic items if there is not enough definitions available in the file
			FindAll: true,
		}
		return new Promise(function(resolve) {
			d.Mapper.find(d, args).then(function(array) {
				let mode = Mapper.modeWellPlate(d.Mapping);
				let tags = undefined;
				switch(mode) { //For mapping without well location, the array returned is the list of object available, that needs to be converted into an array of well
					case "Plate": //FALL-THROUGH
					case "Direct": array = Area.plateDefinition(a, array); tags = array; break; //Rewrite the array to contain the definition at the correct locations
					case "Well": //FALL-THROUGH
					case "PlateWell": tags = Area.plateDefinition(a, Array(a.MaxRange).fill(1)); //Using a dummy array as definitions allows to recover the tagged wells
				}
				resolve({Definition: array, Tag: tags});
			});
		});
	}
	//Methods
	update(O) { //Update the definition. Use the output data from the scanning if provided
		if(O) { //Scan data are present
			this.Items = O.Items;
			if(O.PlatesID) {this.PlatesID = O.PlatesID} //Recover data from the scan
		}
		if(this.PlatesID === undefined || Mapper.modeWellPlate(this.Mapping) == "Direct") { //No well/plate data, update based on the number of tagged wells
			this.PlatesID = []; //Reset the platesID
			if(this.Area.MaxRange > 0) { //If wells are selected
				let plateNb = Math.ceil(this.Items / this.Area.MaxRange);
				for(let i=0; i<plateNb; i++) { //Prepare the platesID as a generic array
					this.PlatesID.push(i + 1);
				}
			}
		}
		this.Area.DefInfo = "Source: " + this.Source + "<br>" + this.Items + " items / " + this.PlatesID.length + " plates";
		this.PlateIndex.updateList(this.PlatesID).setValue(0); //Update the select element as well
		return this;
	}
	item(w, I) { //Returns a promise that will fulfill with the value of the definition for the well object passed
		let p = this.PlateIndex.getValue(); //The index of the plate
		let plate = this.PlateIndex.Selected; //Name of the plate where to look the data
		if(I !== undefined) { //Use provided plate data when needed
			p = I.Index;
			plate = I.Name;
		}
		//let factor = Math.ceil(this.Area.Tagged / this.Area.Replicates);
		let factor = this.Area.MaxRange;
		let index = p * factor + (w.RangeIndex - 1);
		let args = {
			Plate: plate,
			Well: w.Index, //Index of the well where to find the data
			RangeIndexBase0: w.RangeIndex - 1, //The desired rangeIndex, rebased to start at 0
			Factor: factor, //This factor is necessary to find the data in case no well/plate mapping are available
			Default: "#" + (index + 1), //Default fallback if the element needed is outside the list
			Column: this.Mapping[Mapper.definition().Name], //Index of the column containing the data to extract
		}
		return this.Mapper.find(this, args); //Return a promise that will fulfill with the value of the item
	}
	getPlate(plate) { //Return an array the size of the plate with definitions resolved for each well of the plate with the given name. This is a simplified, embedded version of the static getAsPlate method
		let a = this.Area;
		//let factor = Math.ceil(a.Tagged / a.Replicates);
		let factor = a.MaxRange;
		let args = {
			Plate: plate,
			Factor: factor, //This factor is necessary to find the data in case no well/plate mapping are available
			Default: "", //Default fallback if nothing found, leave it blank
			AreaName: a.Name, //This is use when completing missing elements with generic names
			Column: this.Mapping[Mapper.definition().Name], //Index of the column containing the data to extract
			RangeIndexBase0: a.MaxRange, //Providing the maxRange ensures that the array is filled with generic items if there is not enough definitions available in the file
			FindAll: true,
		}
		return new Promise(function(resolve) {
			this.Mapper.find(this, args).then(function(array) {
				let mode = Mapper.modeWellPlate(this.Mapping);
				switch(mode) { //For mapping without well location, the array returned is the list of object available, that needs to be converted into an array of well
					case "Plate": //FALL-THROUGH
					case "Direct": array = Area.plateDefinition(a, array); //Rewrite the array to contain the definition at the correct locations
				}
				resolve(array);
			}.bind(this));
		}.bind(this));
	}
	previewPlate(plate) { //Chunk a piece of the definition corresponding to the selected plate and present it as a html table
		let preview = Definition.anchors("Preview");
		let p = this.PlateIndex.Selected; //Log the plate name that started the preview
		GetId(preview).innerHTML = "<span class=\"Error\">Preparing preview, please wait...</span>";
		Definition.getAsPlate(this).then(function(o) { //Get the definitions for this plate, then build the html
			let r = Editor.Plate.Rows;
			let c = Editor.Plate.Cols;
			let array = o.Definition;
			let tags = o.Tag;
			let html = "<table class=\"PlateTable\"><tr><th></th>";
			for(let j=0;j<c;j++) { //Headers, for each col
				html += "<th>" + (j + 1) + "</th>";
			}
			html += "</tr>";
			for(let i=0;i<r;i++) { //For each row
				html += "<tr><th>" + Well.alphabet(i) + "</th>";
				for(let j=0;j<c;j++) { //For each col
					let color = "unset";
					let value = array[i * c + j];
					if(tags[i * c + j]) { //A tagged well for the area
						color = "lemonchiffon"; //Using a fixed color here instead of the area color avoids complications
						if(value.length == 0) {value = "<span class=\"Error\">&Oslash;</span>"} //Mark tagged wells without definitions
					}
					else { //Non tagged wells
						if(value.length > 0) {value = "<span class=\"Error\">" + value + "</span>"} //Also mark definitions outside tagged areas
					}
					html += "<td style=\"background-color: " + color + "\">" + value + "</td>";
				}
				html += "</tr>";
			}
			html += "</table>";
			if(p == this.PlateIndex.Selected) { //Append the preview, unless the plate has changed while preparing it
				GetId(preview).innerHTML = html;
			}
		}.bind(this));
	}
}