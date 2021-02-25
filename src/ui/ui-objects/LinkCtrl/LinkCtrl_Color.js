//////////////////////////////////////////////////////////////////////////////////////////////
// LINKCTRL_COLOR object - a custom color input with sets of interaction /////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
class LinkCtrl_Color extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Color";
		return this;
	}
	//Methods
	html() { //Initialize the html for the control
		var html = "<label id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
		if(this.ControlLeft) { //The control is first, the label after
			html += "<span id=\"" + this.Control + "\" class=\"LinkCtrl_Color\" title=\"" + this.Title + "\" style=\"background-color: " + this.Value + "\">&nbsp;&nbsp;&nbsp;&nbsp;</span>"; //4 spaces, to get the color box wide enough
			if(this.HasLabel) {html += "&nbsp;" + this.Label} //Add the label
		}
		else { //The other way around
			if(this.HasLabel) {html += this.Label + "&nbsp;"} //Add the label
			html += "<span id=\"" + this.Control + "\" class=\"LinkCtrl_Color\" title=\"" + this.Title + "\" style=\"background-color: " + this.Value + "\">&nbsp;&nbsp;&nbsp;&nbsp;</span>"; //4 spaces, to get the color box wide enough
		}
		html += "</label>"; //Closure of the control
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		GetId(this.Me).addEventListener("click", function(e) {
			Form_Color({
				Caller: this,
				after: this.change,
			});
		}.bind(this));
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element
		this.Value = v;
		if(ui) {ui.children[0].style.backgroundColor = v}
	}
}