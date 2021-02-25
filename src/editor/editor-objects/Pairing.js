//***********************************************************************
//PAIRING Object - To handle data pairing between results and definitions
//***********************************************************************
class Pairing {
	constructor(I) {
		this.Result = I.Result;
		this.Definition = I.Range.Definition;
		this.RangeName = I.Range.Name;
		this.Mode = I.Mode;
		this.Count = 0; //Number of paired items
		return this;
	}
	//Static Methods
	static form(results, definitions) { //Open a form to manipulate data pairing
		let id = "Form_Pairing";
		let Anchors = {
			Def: id + "_Def",
			Result: id + "_Res",
			Options: id + "_Options",
			Pairs: id + "_Pairs",
			Preview: id + "_Preview",
		}
		//let preview = LinkCtrl.new("TextArea", {ID: Anchors.Preview, Default: "", Disabled: true}); //The preview textArea
		let action = function(r) {
			Tables.Pairs.Array = r.Pairs; //Show the pairs available for the selected result file
			Tables.Pairs.update();
			Pairing.preview(r, Anchors.Preview); //Build the preview of pairing
		}
		let Tables = {
			Defs: new RespTable({ID: Anchors.Def, Array: definitions, Fields: ["Name", "DefInfo"], Headers: ["Range", "Properties"], NoControls: true}),
			Results: new RespTable({ID: Anchors.Result, Array: results, Fields: ["Name", "Plate Count"], NoControls: true,
				onSelect: function(newSelect) {
					action(newSelect[0]);
				}
			}),
			Pairs: new RespTable({ID: Anchors.Pairs, Array: [], Fields: ["RangeName", "Mode", "Count"], Headers: ["Range", "Paired by", "Paired items"], 
				onSelect: function(newSelect) { //Build the preview on select
					
				},
			}),
		}
		let opt = {
			Mode: LinkCtrl.new("Select", {ID: Anchors.Options, Default: 0, Label: "Pair by", List: ["Plate Name", "Custom"], NewLine: true, Change: function(v) {
				console.log("Mode", v);
			}.bind(this), Title: "Whether the result and definition plates should be linked directly through their names, or the index with which they appear in the file."}),
			/*
			From: LinkCtrl.new("Select", {ID: Anchors.Options, Default: 0, Label: "From Index", List: ["First available", "Custom"], Preserve: true, Index: 1, Change: function(v) {
				if(v == 1) { //Custom
					
				}
			}.bind(this), Title: "Index of the Result plate that is used to start pairing the definition plate"}),
			*/
		}
		Form.open({
			ID: id,
			HTML: 	
				"<fieldset style=\"width: 290px; float: left; overflow: auto\"><legend>Results</legend><div id=\"" + Anchors.Result + "\"></div></fieldset>" +
				"<fieldset style=\"width: 200px; float: left; overflow: auto\"><legend>Pairing Options</legend><div id=\"" + Anchors.Options + "\"></div></fieldset>" +
				"<fieldset style=\"width: 290px; float: left; overflow: auto\"><legend>Definitions</legend><div id=\"" + Anchors.Def + "\"></div></fieldset>" +
				"<fieldset style=\"width: 345px; float: left; overflow: auto; clear: both; \"><legend>Pairs defined</legend><div id=\"" + Anchors.Pairs + "\"></div></fieldset>" +
				"<fieldset style=\"width: 345px; float: left; overflow: auto\"><legend>Preview</legend><div id=\"" + Anchors.Preview + "\" style=\"max-height: 300px; overflow: auto;\"></div></fieldset>",
			Title: "Data pairing",
			Size: 900,
			Buttons: [
				{Label: "Ok", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() {
					//
					//
					//
					Form.close(id);
				}.bind(this)},
				{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id)}}
			],
			onInit: function() {
				Object.values(Tables).forEach(function(t) {t.init()}); //Init the tables
				Object.values(opt).forEach(function(o) {o.init()}); //Init the options
				let b = LinkCtrl.buttonBar([
					{Label: "Add new pair", Click: function() {
						let r = Tables.Results.Selected[0]; //The selected result
						Pairing.addPair({Result: r, Mode: opt.Mode.Selected, Range: Tables.Defs.Selected[0]});
						action(r);
					}, Title: "Pair the selected result with the selected definition, using current options"},
				]);
				GetId(Anchors.Options).append(b);
			},
		});
	}
	/*static preview(p, target) { //For the Pairing object passed, build the html preview of the items paired and display it in the element with ID target
		let html = "<table class=\"Table PreviewTable\"><tr><th>Result Plate</th><th>Definition Plate</th></tr>";
		//let txt = "Result Plate\tDefinition Plate\n"
		p.PairingTable.forEach(function(p) {
			html += "<tr><td>" + p[0] + "</td><td>" + p[1] + "</td></tr>";
			//txt += p[0] + "\t" + p[1] + "\n";
		});
		html += "</table>";
		GetId(target).innerHTML = html;
		//return txt;
	}*/
	static preview(r, target) { //For the Result object passed, build the html preview of the items paired and display it in the element with ID target
		let html = "<table class=\"Table PreviewTable\"><tr><th>Result Plate</th><th>Definition Plate</th></tr>";
		if(r.PairingTable !== undefined) {
			r.PairingTable.forEach(function(p, i) {
				html += "<tr><td>" + r.PlatesID[i] + "</td><td>" + p + "</td></tr>";
			});
		}
		html += "</table>";
		GetId(target).innerHTML = html;
	}
	static addPair(I) { //Add a new pair to the result file passed, using the options indicated
		let r = I.Result;
		if(r.Pairs === undefined) {r.Pairs = []} //Initialize the pair array if needed
		//****
		//NEED SOMETHING SMARTER: PAIRS ALREADY DEFINED SHOULDN'T COME AGAIN!
		r.Pairs.push(new Pairing(I));
		//
		//****
		Pairing.build(r);
	}
	static build(r) { //Build the pairing array out of the pairs defined for the result object passed
		if(r.PairingTable === undefined) {r.PairingTable = Array(r.PlatesID.length)} //initialize the pairing array if needed
		r.Pairs.forEach(function(pair) { //For each pair defined
			switch(pair.Mode) { //Use the config to update the PairingTable
				case "Plate Name": Pairing.matchByName(r, pair); break;
				default: return;
			}
		});
	}
	static matchByName(r, pair) { //Update the PairingTable of the result object using a name-matching process with the definition defined by this pair
		let defID = pair.Definition.PlatesID;
		let count = 0; //How many pairs are held
		r.PlatesID.forEach(function(p, i) { //For each plate in the PlatesID array of the result object, search for a match in the Definition array
			let val = defID.find(function(e) {return e == p}); //Search for a match
			if(val !== undefined) { //Pair it if found
				r.PairingTable[i] = val;
				count++;
			} 
		});
		pair.Count = count; //Update the count for this pair
	}
	//Methods

}