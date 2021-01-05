//*******************************************************************************************
// FORM_IMPORT - Form with options for the selection and parsing of files used to import data
//*******************************************************************************************
class Form_Import {
	constructor() {}
	//Static Methods
	static open(I) { //Open the form. Optional title can be supplied
		this.init(I); //Initialize the class
		if(I.Single) {this.Multiple = false} //Single input mode
		else {this.Multiple = true}
		this.Chain = I.Chain; //Tell the form not to reset after parsing is done, so that the user can come back on this form if needed
		this.Controls.File.Multiple = this.Multiple;
		let title = "Data Import";
		if(I && I.Title) {title = I.Title}
		Form.open({
			ID: this.ID,
			HTML: this.html(),
			Title: title,
			Size: 800,
			Buttons: this.Buttons.Step1,
			onInit: function() {this.bindEvents()}.bind(this), //Initialize the LinkCtrl inputs
			onCancel: function() {this.cancel()}.bind(this),
		});
		if(I && I.OnClose) {this.OnClose = I.OnClose} //The function to run at closure. It will receive the parsed data as an array of structured objects in parameter
		return this;
	}
	static init(I) { //Initialize internal (private) properties if not set
		if(this.Init) {return}
		else {
			var id = "Form_Import";
			this.ID = id;
			this.Anchors = {
				Input: id + "_Input",
				Table: id + "_InputTable",
				InputType: id + "_InputType",
				InputSelection: id + "_InputSelection",
				Parsing: id + "_Parsing",
				Parser: id + "_Parser",
				ParserOptions: id + "_ParserOptions",
				Preview: id + "_Preview",
				PreviewBox: id + "_PreviewBox",
				WaitMask: id + "_WaitMask",
				WaitMaskCurrent: id + "_WaitMaskCurrent",
				WaitMaskTotal: id + "_WaitMaskTotal",
				WaitMaskList: id + "_WaitMaskList",
			}
			this.Controls = {
				File: LinkCtrl.new("File", {ID: this.Anchors.Input, Default: "", Accept: ".txt,.csv,.xls,.xlsx"}),
				ManualName: LinkCtrl.new("Text", {ID: this.Anchors.Input, Default: "", Label: "Name", NewLine: true, Title: "Type a name for your data here"}),
				Manual: LinkCtrl.new("TextArea", {ID: this.Anchors.Input, Default: "", Preserve: true, Index: 1, Title: "Type or paste your data here"}),
				Table: new RespTable({ID: this.Anchors.Table, Fields: ["Name", "Format", "Source", "Type"], RowNumbers: true, Preserve: true, onSelect: function(S, oldS, index, oldIndex) {this.selectInput(index, oldIndex)}.bind(this)}),
				InputType: LinkCtrl.new("Radio", {ID: this.Anchors.InputType, List: ["From file(s)", "Manual input"], Default: 0, ControlLeft: true, Change: function() {this.changeInputType()}.bind(this), Title: "Type of input desired"}),
				Preview: LinkCtrl.new("Checkbox", {ID: this.Anchors.Preview, Default: true, Label: "Show", NewLine: true, Change: function() {this.togglePreview()}.bind(this), Title: "Tick to display a preview of the parsing results"}),
			}
			this.Buttons = { //Definitions of buttons used in the form
				Step1: [ //Form dialog, step 1
					{Label: "Next", Click: function() {this.next()}.bind(this)},
					{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {this.cancel()}.bind(this)}
				],
				Step2: [ //Form dialog, step 2
					{Label: "Back", Icon: {Type: "Back", Space: true}, Click: function() {this.back()}.bind(this)},
					{Label: "Done", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() {this.done()}.bind(this)},
					{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {this.cancel()}.bind(this)}
				],
			}
			this.Step = 1; //Initialize the form at its first step
			this.Init = true;
		}
		return this;
	}
	static bindEvents() { //Initialize the LinkCtrl inputs and dynamic behaviour to the elements of the form
		var b = LinkCtrl.button({Label: "Add", Title: "Add the input", Click: function() {this.addInput()}.bind(this)});
		GetId(this.Anchors.InputSelection).append(b); //Button to add the input to the table
		this.Controls.Table.init();
		this.Controls.InputType.init().change(); //Trigger a change on init to append the correct html attached to the selected input
	}
	static changeInputType() { //Follows a change in the selected input type
		switch(this.Controls.InputType.Selected) {
			case "From file(s)": this.Controls.File.init(); break;
			case "Manual input": 
				this.Controls.ManualName.init();
				this.Controls.Manual.init();
				break;
			default: break;
		}
		return this;
	}
	static addInput() { //Add input to the input list
		var T = this.Controls.Table;
		if(this.Multiple == false && T.Length > 0) {alert("Only one input allowed!"); return this}
		switch(this.Controls.InputType.Selected) {
			case "From file(s)": //Add a file to the list of input
				var fileList = this.Controls.File.getValue();
				var l = fileList.length;
				for(let i=0;i<l;i++) { //For each file. fileList is a file collection, not an array, so forEach doesn't work here
					var f = InputObject.new("File", fileList[i]);
					T.addRow(f);
				}
				this.Controls.File.setValue([]); //Prepare for next import
				break;
			case "Manual input": //Add manually entered data
				var data = this.Controls.Manual.getValue();
				if(data.length > 0) { //Don't input empty values
					var m = InputObject.new("Manual", {Data: data, Name: this.Controls.ManualName.getValue()});
					T.addRow(m);
					this.Controls.Manual.setValue(""); //Reset the fields for next import
					this.Controls.ManualName.setValue("");
				}
				break;
			default: return this;
		}
		if(T.Selected.length == 0) {T.setValue([0])}
		return this;
	}
	static selectInput(index, oldIndex) {
		if(index[0] == oldIndex[0]) {return}
		let T = this.Controls.Table;
		let input = T.Selected[0];
		if(input !== undefined && this.Step == 2) {
			this.showParsingControls(input); //Show controls and init the parsing
			input.InputParser.parse({Limit: input.Controls.Limit.Selected, Input: input});
		}
		return this;
	}
	static showParsingControls(input) { //Initialize the parsing controls for the input passed. Internal use only
		this.Controls.Preview.init(); //Preview show/hide control
		input.Controls.Limit.init(); //Preview Limit control
		input.Controls.Parser.init(); //Control for the parser selection
		input.InputParser.init(); //Init the LinkCtrl options for the parser
	}
	static next() { //Next step in the form input form
		let T = this.Controls.Table;
		if(T.Length == 0) {alert("No input selected!"); return}
		T.hideControls(); //Hide input table controls
		this.Step++;
		Form.replaceButtons(this.ID, [{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {this.close()}.bind(this)}]); //Remove next button
		this.parsingStart(T.Array);
		let input = T.Selected[0];
//*****************************************
//No input selected: force selection of the first element.
//This can happen when going back to delete an item, then clicking next without selection
		if(input === undefined) {
			T.setValue([0]);
			input = T.Selected[0];
		}
//*****************************************
		let selected = T.SelectedIndices[0];
		let promises = [];
//*****************************************
//For Each input, trigger a change to create a parser object and parse the file.
//Parsing is necessary to ensure something is done,
//even if this item is not clicked later by the user to adjust the parsing configuration.
//Only the selected item needs to build its preview
		T.Array.forEach(function(a, i) { //Start parsing of all inputs as asynchronous tasks (promises)
			let noPrev = true;
			if(i == selected) {noPrev = false} //Only the selected input will need to prepare a preview
			promises.push(
				new Promise(function(resolve) {
					a.Controls.Parser.change(undefined, {
						NoInit: true, NoPreview: noPrev,
						Step: function(row, n, parser) {
							let html = "";
							if(parser.FirstParsed == false) {html = "(Pre-parsing) - "}
							if(5000 * Math.round(n / 5000) - n == 0) { //Only once every 5000 rows to save FPS
								GetId(this.Anchors.WaitMaskList).children[i].children[1].innerHTML = html + n;
							}
						}.bind(this),
						Complete: function(n) {
							this.parsingUp(i, n); //when the parsing is completed, update the file counter and resolve
							a.Status = undefined;
							resolve();
						}.bind(this),
						Error: function(e) {
							this.parsingError(i, e);
							a.Status = "Error";
							resolve();
						}.bind(this), //Catch the error here
					});
				}.bind(this))
			);
		}, this);
//*****************************************
		Promise.all(promises).then(function() { //After all files have been parsed, swith to next tab
			this.parsingDone();
			this.showParsingControls(input);
			T.update(); //Update the table to reflect any file in error
			Form.replaceButtons(this.ID, this.Buttons.Step2); //Buttons for parsing
		}.bind(this));
	}
	static back() { //A step backward
		this.Step--;
		GetId(this.Anchors.InputSelection).style.display = "block";
		GetId(this.Anchors.Parsing).style.display = "none";
		this.Controls.Table.showControls();
		Form.replaceButtons(this.ID, this.Buttons.Step1);
	}
	static togglePreview() { //Toggle the visibility of the preview box
		var bool = this.Controls.Preview.getValue();
		if(bool) {GetId(this.Anchors.PreviewBox).style.display = "block"}
		else {GetId(this.Anchors.PreviewBox).style.display = "none"}
	}
	static parsingStart(array) { //Display a wait message for the array of input
		this.ParsedInputs = 0;
		let n = array.length;
		GetId(this.Anchors.WaitMaskTotal).innerHTML = n;
		let list = "";
		for(let i=0;i<n;i++) {
			list += "<li><span>" + array[i].Name + ": </span><span>0</span><span> Rows found</span></li>";
		}
		GetId(this.Anchors.WaitMaskList).innerHTML = list;
		let mask = GetId(this.Anchors.WaitMask);
		let childs = mask.nextElementSibling.children;
		let h = Math.max(childs[0].offsetHeight, childs[1].offsetHeight) + "px"; //Adjust the size of the mask, so that it fits on all the content
		let w = mask.nextElementSibling.offsetWidth + "px";
		mask.style.height = h;
		mask.style.width = w;
		mask.style.display = "block";
	}
	static parsingUp(index, nbRows) { //One more file parsed
		this.ParsedInputs++;
		GetId(this.Anchors.WaitMaskCurrent).innerHTML = this.ParsedInputs;
		let list = GetId(this.Anchors.WaitMaskList).children[index];
		list.children[1].innerHTML = nbRows;
		list.insertAdjacentHTML("beforeend", ". DONE");
		list.style.color = "green";
	}
	static parsingError(index, error) { //An error occured during file parsing
		let list = GetId(this.Anchors.WaitMaskList).children[index];
		let name = list.children[0].innerHTML;
		list.innerHTML = "<span>" + name + "ERROR</span>";
		list.style.color = "red";
	}
	static parsingDone() { //Display controls
		GetId(this.Anchors.WaitMask).style.display = "none";
		GetId(this.Anchors.InputSelection).style.display = "none";
		GetId(this.Anchors.Parsing).style.display = "block";
		this.togglePreview();
	}
	static done() { //Done
		let data = [];
		let onError = false;
		this.Controls.Table.Array.forEach(function(input) { //Loop the input objects
			let parser = input.InputParser;
			if(input.Status !== undefined && input.Status == "Error") {onError = true}
			else { //Push only valid inputs
				data.push({
					Source: input.Source,
					Name: input.Name,
					Size: parser.SelectedRows + " Rows &times; " + parser.SelectedCols + " Cols",
					Other: parser.Info,
					Headers: parser.Headers,
					Parser: parser,
					Input: input,
				});
			}
		});
		if(onError) { //At least one input is in error and won't be exported. Ask confirmation
			Form.open({
				ID: this.ID + "_Confirm",
				HTML: "<p style=\"color: tomato; padding:0em 1em\">Inputs on error will not be exported. Are you sure you want to continue?</p>",
				Title: "Confirm export",
				Buttons: [
					{Label: "Ok", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() {
						Form.close(this.ID + "_Confirm"); //Close the confirmation popup
						this.close(data); //Close the Form_Import
					}.bind(this)},
					{Label: "Cancel", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(this.ID + "_Confirm")}.bind(this)}, //Just close the confirmation popup
				],
				onCancel: function() {Form.close(this.ID + "_Confirm")}.bind(this), //Similar to cancel
			});
		}
		else {this.close(data)} //Close straight
	}
	static reset() { //Reset prior to closure
		this.Controls.Table.empty(); //Empty the input list
		this.Step = 1; //Move back to step 1
		return this;
	}
	static cancel() { //Cancelling import of data: reset the form and close it without calling OnClose method
		this.reset();
		Form.close(this.ID);
	}
	static close(data) { //Close the form. Contrary to cancel, this will call OnClose normally and keep the form open if chain is needed
		if(this.OnClose) {this.OnClose(data)} //Send data to the close function
		if(this.Chain === undefined || this.Chain == false) { //Do not reset unless this form is not chained with another
			this.cancel();
		}
		return this;
	}
	static html() { //The html of the form
		var html = "";
		html += "<div id=" + this.Anchors.WaitMask + " class=\"Form_Import_DisableMask\">";
			html += "<p><b>Parsing in progress, Please wait...</b></p>";
			html += "<p><i>Parsed: <span id=" + this.Anchors.WaitMaskCurrent + ">0</span> / <span id=" + this.Anchors.WaitMaskTotal + "></span></i></p>";
			html += "<ul id=" + this.Anchors.WaitMaskList + "></ul>";
		html += "</div>";
		html += "<div>"; //Main body of the form
			html += "<div class=\"Form_Import_Left\">";
				html += "<fieldset><legend>Inputs selected</legend>"; //Input list
					html += "<div id=\"" + this.Anchors.Table + "\" style=\"width: 320px; overflow: auto\"></div>";
				html += "</fieldset>"; 
			html += "</div>";
			html += "<div class=\"Form_Import_Right\">";
				html += "<fieldset id=\"" + this.Anchors.InputSelection + "\"><legend>Input selection</legend>"; //Input field
					html += "<div id=\"" + this.Anchors.InputType + "\"></div>";
					html += "<div id=\"" + this.Anchors.Input + "\"></div>";
				html += "</fieldset>";
				html += "<fieldset id=\"" + this.Anchors.Parsing + "\" style=\"display: none\"><legend>Parsing</legend>"; //Parsing field, hidden at the first place
					html += "<div id=\"" + this.Anchors.Parser + "\" style=\"margin-bottom: 10px;\"></div>";
					html += "<fieldset style=\"float: left;\"><legend><i>Options</i></legend>";
						html += "<div id=\"" + this.Anchors.ParserOptions + "\"></div>";
					html += "</fieldset>";
					html += "<fieldset><legend><i>Preview</i></legend>";
						html += "<div id=\"" + this.Anchors.Preview + "\"></div>"; //Control checkbox
						html += "<div id=\"" + this.Anchors.PreviewBox + "\" class=\"Form_Import_Preview\"></div>"; //Preview 
					html += "</fieldset>";
				html += "</fieldset>";
			html += "</div>";
		html += "</div>";
		return html;
	}
}