//////////////////////////////////////////////////////////////////////////////////////////////
// LINKCTRL_RADIO object - Extension of the HTML radio input for better interaction //////////
//////////////////////////////////////////////////////////////////////////////////////////////
class LinkCtrl_Radio extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Radio";
		this.List = (I.List || []);
		return this;
	}
	//Getter
	get Selected() { //Return the name of the selected item; use .Value to get its index
		return this.List[this.Value];
	}
	//Methods
	html() {
		let html = "<span id=\"" + this.Me + "\" title=\"" + this.Title + "\">"; //Wrapper
		let label = this.HasLabel;
		if(label) {html += "<span class=\"LinkCtrl" + this.getClass({LeftOnly: true}) + "\">" + this.Label + "</span>"}
		this.List.forEach(function(l, i) {
			let checked = "";
			if(this.Value == i) {checked = "checked"} //Active choice
			html += "<label for=\"" + this.Control + "_" + i + "\" class=\"LinkCtrl" + this.classes(i, label) + "\">"; //Opening the label
			if(this.ControlLeft) { //Input first, then label
				html += "<input type=\"radio\" id=\"" + this.Control + "_" + i + "\" name=\"" + this.Control + "\" " + checked + " itemNb=\"" + i + "\">";
				html += l;
			}
			else { //The other way around
				html += l;
				html += "<input type=\"radio\" id=\"" + this.Control + "_" + i + "\" name=\"" + this.Control + "\" " + checked + " itemNb=\"" + i + "\">";
			}
			html += "</label>"; //Closing the label
		}, this);
		html += "</span>";
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		let labels = GetId(this.Me).children; //Note that this is an HTML collection, not an array
		let l = labels.length;
		let start = 0;
		let i = 0;
		if(this.HasLabel) { //The first span will allow cycling between the values when clicked
			labels[0].addEventListener("click", function(e) {
				let l = this.List.length;
				let newValue = this.Value + 1;
				if(newValue < l) {this.setValue(newValue).change(newValue)}
				else {this.setValue(0).change(0)}
			}.bind(this));
			i++;
		} 
		while(i<l) {
			labels.item(i).children[0].addEventListener("click", function(e) {
				let selected = Number(e.target.getAttribute("itemNb"));
				this.updateValue(selected, e.target.parentElement.parentElement);
				this.change(selected);
			}.bind(this));
			i++;
		}
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element
		let index = Number(v);
		if(isNaN(index) || index < 0 || index >= this.List.length) {console.warn("Could not update Radio control with the value given (" + index + ")"); return} //If the value provided is fucked up, alert and exit
		if(ui) {
			let label = ui.children.item(index); //The label for the element to select
			if(this.HasLabel) {label = ui.children.item(index + 1)} //Ignore the header
			if(label) {
				let oldLabel = ui.children.item(this.Value);
				if(this.HasLabel) {oldLabel = ui.children.item(this.Value + 1)}
				if(oldLabel) { //May happen that nothing is selected, depending on the value passed at creation of the control
					oldLabel.children[0].checked = false;
					oldLabel.classList.replace("LinkCtrl_Active", "LinkCtrl_Resting");
				}
				label.children[0].checked = true;
				label.classList.replace("LinkCtrl_Resting", "LinkCtrl_Active");
			}
		}
		this.Value = index;
	}
	classes(i, label) { //Returns a text representing the classes to be added to the label hosting the control at index i.
		let txt = " LinkCtrl_Resting";
		if(this.Value == i) { //Active choice
			txt = " LinkCtrl_Active";
		}
		if(i == 0 && label == false) {txt += " LinkCtrl_RoundL"} //First choice with no label
		if(i == this.List.length - 1) {txt += " LinkCtrl_RoundR"} //last choice
		return txt;
	}
}