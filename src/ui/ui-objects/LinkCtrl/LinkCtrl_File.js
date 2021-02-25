//*******************************************************************************
// LINKCTRL_FILE object - Extension of the HTML file input for better interaction
//*******************************************************************************
class LinkCtrl_File extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "File";
		this.Multiple = I.Multiple; //Whether multiple files are accepted
		this.Accept = I.Accept; //What file type should be accepted. Provided as a string without space, as in the accept attribute of the html file input (.xxx,.xxx)
		this.DragMsg = "Drag and drop your files here"; //Default message to display in the drop box
		return this;
	}
	//Static Methods
	static dropMsg(msg) { //return the html for the msg to display as inner content of the drop box
		return "<div class=\"LinkCtrl_FileDropInner\">" + msg + "</div>";
	}
	//Methods
	html() { //Initialize the html for the control
		let html = "";
		html += "<span title=\"Reset the file selection\" class=\"LinkCtrl LinkCtrl_Round LinkCtrl_Resting\">Clear</span>&nbsp;";
		html += "<span id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
		html += "Browse..." //Add the label
		let multiple = "";
		if(this.Multiple) {multiple = "multiple"}
		let accept = "";
		if(this.Accept) {accept = " accept=" + this.Accept}
		html += "<input type=\"file\" id=\"" + this.Control + "\" style=\"display: none\" " + multiple + accept + ">"; //hidden input
		html += "</span>"; //Closure of the control
		html += this.fileInfo();
		
		html += "<div class=\"LinkCtrl_FileDrop\">" + LinkCtrl_File.dropMsg(this.DragMsg) + "</div>";
		
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		let root = GetId(this.Me); //The hosting span for the control
		let input = root.children[0]; //The hidden input
		let clear = root.previousElementSibling; //The clear button
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
		let drop = root.nextElementSibling.nextElementSibling; //The drop box
		drop.addEventListener("dragenter", function(e) {
			e.target.className = "LinkCtrl_FileDropHover LinkCtrl_FileDrop";
			e.target.innerHTML = "";
			e.preventDefault();
		});
		drop.addEventListener("dragexit", function(e) {
			e.target.className = "LinkCtrl_FileDrop";
			e.target.innerHTML = LinkCtrl_File.dropMsg(this.DragMsg) ;
			e.preventDefault();
		}.bind(this));
		drop.addEventListener("dragover", function(e) {
			e.preventDefault();
		});
		drop.addEventListener("drop", function(e) {
			e.preventDefault();
			e.target.className = "LinkCtrl_FileDrop";
			let files = e.dataTransfer.files;
			let l = files.length;
			let valid = [];
			let formatSupported = this.Accept.split(","); //Generate an array of accepted formats
			for(let i=0; i<l; i++) { //Loop the incoming files
				formatSupported.forEach(function(format) {
					if(files[i].name.endsWith(format)) {valid.push(files[i])} //Select only the files with supported format
				});
			}
			let v = valid.length;
			let msg = "";
			if(v == 0) {
				msg = "No valid files found. Supported formats: " + this.Accept;
				this.setValue([]);
			}
			else {
				let diff = l - valid.length; //Number of rejected files
				if(diff > 0) { //At least one file rejected
					if(diff > 1) {msg = diff + " files with unauthorized format were rejected"}
					else {msg = "A file with unauthorized format was rejected"}
				}
				if(this.Multiple == true) {this.setValue(valid)} //Multiple files allowed
				else { //Single file allowed
					if(valid.length > 1) {
						if(msg.length > 0) {msg += ".<br>"}
						msg += "Only one file allowed! The first valid file was added";
					}
					this.setValue([valid[0]]);
				}
			}
			if(msg.length > 0) {
				e.target.innerHTML = LinkCtrl_File.dropMsg(msg) ;
				e.target.className = "LinkCtrl_FileDrop LinkCtrl_FileDropError";
			}
			else {
				e.target.innerHTML = LinkCtrl_File.dropMsg(this.DragMsg) ;
				e.target.className = "LinkCtrl_FileDrop";
			}
		}.bind(this));
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element. Note that this couldn't be tested properly (FileList object makes trouble)
		this.Value = v;
		if(ui) {
			//ui.children[0].value = v; //The value of the hidden input is updated
			ui.nextElementSibling.remove();
			ui.insertAdjacentHTML("afterend", this.fileInfo());
		}
	}
	fileInfo() { //Returns an html string indicating the file(s) selected
		let html = "<span"; //Area to display the file selected
		let v = this.Value; //Array of selected files
		let l = v.length;
		if(l == 0) {return html + " style=\"color: salmon;\">&nbsp;No files selected</span>"} //No files selected, exit here
		if(l == 1) {html += ">&nbsp;" + v[0].name} //Only one file: display the full name
		else { //Multiple files: display the number of files selected, the details go into the title attribute
			let title = " title=\"";
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