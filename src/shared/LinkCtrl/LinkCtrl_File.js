//*******************************************************************************
// LINKCTRL_FILE object - Extension of the HTML file input for better interaction
//*******************************************************************************
class LinkCtrl_File extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "File";
		this.Multiple = I.Multiple; //Whether multiple files are accepted
		this.Accept = I.Accept; //What file type should be accepted. Provided as a string as in the accept attribute of the html file input (.xxx,.xxx)
		return this;
	}
	//Methods
	html() { //Initialize the html for the control
		var html = "";
		html += "<span title=\"Reset the file selection\" class=\"LinkCtrl LinkCtrl_Round LinkCtrl_Resting\">Clear</span>&nbsp;";
		html += "<span id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
		html += "Browse..." //Add the label
		if(this.Multiple) {var multiple = "multiple"}
		else {var multiple = ""}
		if(this.Accept) {var accept = " accept=" + this.Accept}
		else {var accept = ""}
		html += "<input type=\"file\" id=\"" + this.Control + "\" style=\"display: none\" " + multiple + accept + ">"; //hidden input
		html += "</span>"; //Closure of the control
		html += this.fileInfo();
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		var root = GetId(this.Me); //The hosting span for the control
		var input = root.children[0]; //The hidden input
		var clear = root.previousElementSibling; //The clear button
		root.addEventListener("click", function() {input.click()}); //Activate the file:input button to open the file selection browsing window)
		input.addEventListener("change", function() {
			this.Value = input.files;
			root.nextElementSibling.remove(); //The following span is removed and replaced with an updated one
			root.insertAdjacentHTML("afterend", this.fileInfo());
			this.change(input.files);
		}.bind(this));
		clear.addEventListener("click", function() {
			this.Value = [];
			root.nextElementSibling.remove(); //The following span is removed and replaced with an updated one
			root.insertAdjacentHTML("afterend", this.fileInfo());
			this.change();
		}.bind(this));
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element. Note that this couldn't be tested properly (FileList object makes trouble)
		this.Value = v;
		if(ui) {
			ui.children[0].value = v; //The value of the hidden input is updated
			ui.nextElementSibling.remove();
			ui.insertAdjacentHTML("afterend", this.fileInfo());
		}
	}
	fileInfo() { //Returns an html string indicating the file(s) selected
		var html = "<span"; //Area to display the file selected
		var v = this.Value; //Array of selected files
		var l = v.length;
		if(l == 0) {return html + " style=\"color: salmon;\">&nbsp;No files selected</span>"} //No files selected, exit here
		if(l == 1) {html += ">&nbsp;" + v[0].name} //Only one file: display the full name
		else { //Multiple files: display the number of files selected, the details go into the title attribute
			var title = " title=\"";
			for(let i=0;i<l;i++) { //FileCollection has no forEach available
				if(i>0) {title += ", "}
				title += v[i].name;
			}
			html += title + "\">&nbsp;" + l + " Files selected.";
		}
		html += "</span>";
		return html;
	}
}