//***********************************************************************
//PAIRING Object - To handle data pairing between results and definitions
//***********************************************************************
class Pairing {
	constructor(I) {
		this.Result = I.Result;
		this.Definition = I.Definition;
		this.Mode = I.Mode;
		this.From = I.From;
		return this;
	}
	//Static Methods
	static form(results, definitions) { //Open a form to manipulate data pairing
		if(this.Pairs === undefined) {this.Pairs = []} //Initialize pairing array
		let id = "Form_Pairing";
		let Anchors = {
			Def: id + "_Def",
			Result: id + "_Res",
			Options: id + "_Options",
			Pairs: id + "_Pairs",
			Preview: id + "_Preview",
		}
		let action = function() {Pairing.preview(Tables.Results.Selected[0], Tables.Defs.Selected[0], opt)}
		let Tables = {
			Defs: new RespTable({ID: Anchors.Def, Array: definitions, Fields: ["Name", "DefInfo"], Headers: ["Range", "Properties"], NoControls: true}),
			Results: new RespTable({ID: Anchors.Result, Array: results, Fields: ["Name", "Plate Count"], NoControls: true}),
			Pairs: new RespTable({ID: Anchors.Pair, Array: this.Pairs, Fields: [], Headers: ["Result", "Definition", "Paired items"]}),
		}
		let opt = {
			Mode: LinkCtrl.new("Select", {ID: Anchors.Options, Default: 0, Label: "Pair by", List: ["Plate Name", "Plate Index"], NewLine: true, Change: function(v) {
				console.log("Mode", v);
			}.bind(this), Title: "The method to use to pair the result and definition plates together"}),
			From: LinkCtrl.new("Select", {ID: Anchors.Options, Default: 0, Label: "From Index", List: ["First available", "Custom"], Preserve: true, Index: 1, Change: function(v) {
				console.log("From", v);
			}.bind(this), Title: "Index of the Result plate that is used to start pairing the definition plate"}),
		}
		let preview = LinkCtrl.new("TextArea", {ID: Anchors.Preview, Default: "", Disabled: true});
		Form.open({
			ID: id,
			HTML: 	
				"<fieldset style=\"width: 290px; float: left; overflow: auto\"><legend>Results</legend><div id=\"" + Anchors.Result + "\"></div></fieldset>" +
				"<fieldset style=\"width: 200px; float: left; overflow: auto\"><legend>Pairing Options</legend><div id=\"" + Anchors.Options + "\"></div></fieldset>" +
				"<fieldset style=\"width: 290px; float: left; overflow: auto\"><legend>Definitions</legend><div id=\"" + Anchors.Def + "\"></div></fieldset>" +
				"<fieldset style=\"width: 345px; float: left; overflow: auto; clear: both; \"><legend>Pairs defined</legend><div id=\"" + Anchors.Pairs + "\"></div></fieldset>" +
				"<fieldset style=\"width: 345px; float: left; overflow: auto\"><legend>Preview</legend><div id=\"" + Anchors.Preview + "\"></div></fieldset>",
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
				preview.init();
				let b = LinkCtrl.buttonBar([
					{Label: "Add new pair", Click: function() {
						let p = new Pairing({Mode: opt.Mode.Selected, From: opt.From.Selected});
					}, Title: "Pair the selected result with the selected definition, using current options"},
				]);
				GetId(Anchors.Options).append(b);
			},
		});
	}
	//Methods

}