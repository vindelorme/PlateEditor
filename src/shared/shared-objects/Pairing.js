//***********************************************************************
//PAIRING Object - To handle data pairing between results and definitions
//***********************************************************************
class Pairing {
	constructor(r) {
		this.Result = r;
		this.Pairs = Array(r.PlatesID.length); //An array of pair object. Each item corresponds to the pairing data for the plate at the same index in the PlatesID array
		//this.Mode = undefined;
		return this;
	}
	//Static Methods
	static form(results, ranges) { //Open a form to manipulate data pairing
		let id = "Form_Pairing";
		let Anchors = {
			Def: id + "_Def",
			Result: id + "_Res",
			Auto: id + "_Auto",
			Preview: id + "_Preview",
		}
		let action = function(r) {
			Pairing.preview(Tables, Anchors.Preview); //Build the preview of pairing
		}
		let Tables = {
			Ranges: new RespTable({ID: Anchors.Def, Array: ranges, Fields: ["Name", "DefInfo"], Headers: ["Range", "Properties"], NoControls: true}),
			Results: new RespTable({ID: Anchors.Result, Array: results, Fields: ["Name", "Plate Count"], NoControls: true,
				onSelect: function(newSelect) {action(newSelect[0])}
			}),
		}
		Form.open({
			ID: id,
			HTML:
				"<fieldset style=\"width: 350px; float: left; overflow: auto\" title=\"Select a result file to display the corresponding pairing table below\">" +
					"<legend>Results available</legend><div id=\"" + Anchors.Result + "\"></div></fieldset>" +
				"<fieldset style=\"width: 350px; float: left; overflow: auto\">" +
					"<legend>Definitions available</legend><div id=\"" + Anchors.Def + "\"></div></fieldset>" +
				"<fieldset style=\"width: 500px; clear: both; overflow: auto; float: left\">" +
					"<legend>Pairing Table</legend><div id=\"" + Anchors.Preview + "\" style=\"max-height: 300px; overflow: auto;\"></div></fieldset>" +
				"<fieldset style=\"width: 200px; float: left\">" +
					"<legend>Auto-pairing</legend><div id=\"" + Anchors.Auto + "\"></div></fieldset>",
			Title: "Data pairing",
			Size: 800,
			Buttons: [
				{Label: "Reset", Icon: {Type: "Reset", Space: true, Color: "Red"}, Click: function() {
					let r = Tables.Results.Selected[0]; //The selected result file
					r.Pairing = new Pairing(r); //Reset the pairing object
					Pairing.preview(Tables, Anchors.Preview); //Build the preview
				}, Title: "Delete all pairing data for the selected result"},
				{Label: "Done", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() { //Finished edited the pairing
					let result = Tables.Results.Selected[0]; //The selected result object
					Editor.ResultManager.Results.update(); //Update the table to have the correct result file selected
					Editor.ResultManager.draw(result); //Redraw to set the linked plate and update the display
					Form.close(id);
				} }
			],
			onInit: function() {
				let b = LinkCtrl.buttonBar([
					{Label: "By plate name", Click: function() {
						Pairing.autoPairing("Name", Tables);
						Pairing.preview(Tables, Anchors.Preview); //Re-build the preview after auto-pairing
					}, Title: "Click to automatically pair the plates of the selected result and definition, using their names"},
					{Label: "By plate index", Click: function() {
						Pairing.autoPairing("Index", Tables);
						Pairing.preview(Tables, Anchors.Preview); //Re-build the preview after auto-pairing
					}, Title: "Click to automatically pair the plates of the selected result and definition, using their index"},
				]);
				GetId(Anchors.Auto).insertAdjacentElement("beforeend", b);
				Object.values(Tables).forEach(function(t) {t.init()}); //Init the tables
				Pairing.preview(Tables, Anchors.Preview); //Build the pairing preview for the selected elements on opening of the form 
			},
		});
	}
	static preview(Tables, target) { //Build the html preview of the items paired and display it in the element with ID target
		let r = Tables.Results.Selected[0]; //The selected result file
		let html = "";
		let b = LinkCtrl.button({Label: "", Icon: {Type: "Edit"}, Title: "Click here to edit the pairing for this plate"});
		if(r.Pairing === undefined) {r.Pairing = new Pairing(r)}
		html = "<table class=\"Table PreviewTable\"><tr><th>Result Plate</th><th>Status</th></tr>";
		r.PlatesID.forEach(function(p, i) {
			html += "<tr><td>" + p + "</td><td>";
			let pair = r.Pairing.Pairs[i];
			if(pair !== undefined) {
				if(pair.state !== undefined) {html += pair.state().Html}
				//
				//
				else {html += pair} //We assume in this case that a text is present, yet to be decided
				//
				//
			}
			else {html += Pair.unpaired().Html}
			html += "</td><td class=\"Pairing_Edit_TR\">" + b.outerHTML + "</td></tr>";
		});
		html += "</table>";
		let t = GetId(target);
		t.innerHTML = html;
		let collection = t.getElementsByClassName("Pairing_Edit_TR");
		let l = collection.length;
		for(let i=0; i<l; i++) {
			collection[i].children[0].addEventListener("click", function(e) {
				Pairing.editPair(r, /*d,*/ i, Tables, target);
			});
		}
	}
	static editPair(r, /*d,*/ i, Tables, target) { //Open a form for edition of the pair for result r, plate index i, definition d. On edit, update the preview using Tables and target
		let d = Tables.Ranges.Selected[0].Definition; //The selected definition
		let id = "Form_Pairing_Inner";
		let Anchors = {
			Options: id + "_Options",
		}
		let ctrl = { //LinkCtrl objects in the form
			Plates: LinkCtrl.new("Select", {ID: Anchors.Options, Default: 0, List: d.PlatesID, NavBar: true, Lookup: true}),
		};
		Form.open({
			ID: id,
			HTML: "<fieldset><legend>Plates available</legend><div id=\"" + Anchors.Options + "\"></div></fieldset>",
			Title: "Edit pairing",
			Buttons: [
				{Label: "Ok", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() {
					if(r.Pairing.Pairs[i] === undefined) {r.Pairing.Pairs[i] = new Pair()}
					r.Pairing.Pairs[i].register({RangeName: d.Area.Name, DefPlateIndex: ctrl.Plates.getValue(), DefPlateName: ctrl.Plates.Selected});
					Pairing.preview(Tables, target);
					Form.close(id);
				}.bind(this)},
				{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id)}}
			],
			onInit: function() {
				Object.values(ctrl).forEach(function(c) {c.init()}); //Init the controls
			},
		});
	}
	static setLinkedPlate(result, plateIndex, target) { //For the result object passed, set the correct plates for the linked definition and show the pairing data in the provided target
		if(result.Pairing === undefined) { //No pairing set
			this.status(target, Pair.unpaired());
		} 
		else { //Pairing available
			let pair = result.Pairing.Pairs[plateIndex];
			if(pair === undefined || pair.setDefPlate === undefined) {this.status(target, Pair.unpaired())} //Pairing object but empty pair at this location
			else { //Pair object exist, get its status
				let O = pair.setDefPlate().state();
				this.status(target, O);
			}
		}
	}
	static status(target, I) { //Update the html output in target to match the state provided. Use the options provided when needed to build the message
		let ctrl = LinkCtrl.button({ //The button to edit the pairing
			Label: "", Icon: {Type: "Setting"}, Title: "Click here to edit the pairing setting", Click: function() {Editor.pairing()}
		});
		let html = "";
		switch(I.State) {
			case "unpaired":
				html = I.Html;
				break;
			case "paired":
				html = I.Html;
				break;
			case "broken":
				ctrl = LinkCtrl.button({ //The button to restore the pairing will replace the button to access the settings
					Label: "", Icon: {Type: "Reset"}, Click: function() {
						let result = Editor.Tables.Results.Selected[0]; //The selected result
						let plateIndex = Editor.ResultManager.PlateSelect.getValue(); //The selected result plate (index)
						Pairing.setLinkedPlate(result, plateIndex, target); //Set the correct plates. This will call the status() method as well and update the display
					}, Title: "Click here to set the definition plates as defined in the pairing setting"
				});
				html = I.Html;
				break;
		}
		GetId(target).innerHTML = html; //Update the message
		GetId(target).insertAdjacentElement("beforeend", ctrl); //Insert the button
	}
	static update(target) { //Check and update the selected result to reflect current Pairing status
		let r = Editor.ResultManager.Results.Selected[0]; //The selected result
		if(r === undefined) {return} //Nothing to do if no results are selected
		let index = Editor.ResultManager.PlateSelect.getValue(); //The selected plate
		if(r.Pairing !== undefined && r.Pairing.Pairs[index] !== undefined && r.Pairing.Pairs[index].update !== undefined) {
			let O = r.Pairing.Pairs[index].update();
			Pairing.status(target, O);
		}
	}
	static updateAll(target) { //Update all the pairing data for all the result file. This is typically necessary when definitions are edited/deleted
		Editor.ResultManager.Results.Array.forEach(function(r) { //For each result file
			if(r.Pairing !== undefined) { //If the result has a pairing defined
				let index = -1; //We use this to track the selected plate. Default is a faulty value for all plates
				if(r.Selected) { //If this result file is selected, get the selected plate index to update the status of the pairing
					index = Editor.ResultManager.PlateSelect.getValue(); //The selected plate
				}
				r.Pairing.Pairs.forEach(function(p, i) { //For each pair
					if(p !== undefined && p.update !== undefined) { //If this item is a pair object, update it
						let O = p.update({All: true});
						if(i == index) {Pairing.status(target, O)} //Update the display for the element currently visible
					}
				});
			}
		}, this);
	}
	static resize(result) {
		if(result.Pairing === undefined) {return} //Nothing to do in that case
		let n = result.PlatesID.length;
		let l = result.Pairing.Pairs.length;
		if(l == n) {return} //Same size, nothing to change
		if(l < n) { //Add missing elements
			while(l < n) {
				result.Pairing.Pairs.push(new Pair());
				l++;
			}
		}
		else { //Too much elements, need to remove the excess
			result.Pairing.Pairs.splice(n, l-n);
		}
	}
	static rename(oldName, newName) { //Travel the pair objects and rename the definition using old/new name parameters provided
		Editor.ResultManager.Results.Array.forEach(function(r) { //For every result available
			if(r.Pairing !== undefined) { //If a pairing object exist
				r.Pairing.Pairs.forEach(function(p) {
					if(p !== undefined && p.rename !== undefined) { //If a pair object is defined here, do the rename
						p.rename(oldName, newName);
					}
				});
			}
		});
	}
	static autoPairing(type, Tables) {
		let r = Tables.Results.Selected[0]; //Selected result
		let d = Tables.Ranges.Selected[0].Definition; //Selected definition
		let count = 0; //How many pairs are found
		let defID = d.PlatesID;
		if(type == "Name") { //Pair by name
			r.PlatesID.forEach(function(p, i) { //For each plate in the PlatesID array of the result object, search for a match in the Definition array
				let val = defID.findIndex(function(e) {return e == p}); //Search for a match
				if(val > -1) { //Pair if a match is found
					if(r.Pairing.Pairs[i] === undefined) {r.Pairing.Pairs[i] = new Pair()} //Create a new pair when needed
					r.Pairing.Pairs[i].register({RangeName: d.Area.Name, DefPlateIndex: val, DefPlateName: defID[val]});
					count++;
				}
			});
		}
		else { //Pair by index
			r.PlatesID.forEach(function(p, i) { //For each plate in the PlatesID array of the result object, match with the equivalent index in the Definition array, if it exists
				let val = defID[i];
				if(val !== undefined) { //Pair if a match is found
					if(r.Pairing.Pairs[i] === undefined) {r.Pairing.Pairs[i] = new Pair()} //Create a new pair when needed
					r.Pairing.Pairs[i].register({RangeName: d.Area.Name, DefPlateIndex: i, DefPlateName: val});
					count++;
				}
			});
		}
		if(count == 0) {alert("no matches found!")}
		else {
			let plural = "";
			if(count > 1) {plural = "es"}
			alert(count + " match" + plural + " found");
		}
	}
	//Methods
	
}