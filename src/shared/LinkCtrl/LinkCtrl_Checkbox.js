//////////////////////////////////////////////////////////////////////////////////////////////
// LINKCTRL_CHECKBOX object - Extension of the HTML checkbox for better interaction //////////
//////////////////////////////////////////////////////////////////////////////////////////////
class LinkCtrl_Checkbox extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Checkbox";
		return this;
	}
	//Methods
	html() { //Initialize the html for the control
		var val = "";
		if(this.Value) {val = " checked"}
		var html = "<label id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
		if(this.ControlLeft) { //The control is first, the label after
			html += "<input type=\"checkbox\" id=\"" + this.Control + "\" title=\"" + this.Title + "\" class=\"LinkCtrl_ChkBox\"" + val + ">";
			if(this.HasLabel) {html += "&nbsp;" + this.Label} //Add the label
		}
		else { //The other way around
			if(this.HasLabel) {html += this.Label + "&nbsp;"} //Add the label
			html += "<input type=\"checkbox\" id=\"" + this.Control + "\" title=\"" + this.Title + "\" class=\"LinkCtrl_ChkBox\"" + val + ">"; 
		}
		html += "</label>"; //Closure of the control
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		GetId(this.Me).children[0].addEventListener("click", function(e) {
			var newVal = e.target.checked;
			this.Value = newVal;
			var DOMlist = e.target.parentElement.classList; //This is not an array but a DOMTokenList, which has its own methods
			if(newVal) {DOMlist.replace("LinkCtrl_Resting", "LinkCtrl_Active")}
			else {DOMlist.replace("LinkCtrl_Active", "LinkCtrl_Resting")}
			this.change(newVal);
		}.bind(this));
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element
		this.Value = v;
		if(ui) {
			ui.children[0].checked = v;
			var DOMlist = ui.classList; //This is not an array but a DOMTokenList, which has its own methods
			if(v) {DOMlist.replace("LinkCtrl_Resting", "LinkCtrl_Active")}
			else {DOMlist.replace("LinkCtrl_Active", "LinkCtrl_Resting")}
		}
	}
}