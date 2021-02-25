//*******************************************************************************
// LINKCTRL_TEXT object - Extension of the HTML text input for better interaction
//*******************************************************************************
class LinkCtrl_Text extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Text";
		this.Size = (I.Size || 12);
		return this;
	}
	//Methods
	html() { //Initialize the html for the control
		var html = "<label id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
		if(this.ControlLeft) { //The control is first, the label after
			html += "<input type=\"text\" id=\"" + this.Control + "\" title=\"" + this.Title + "\" class=\"LinkCtrl_Text\" value=\"" + this.Value + "\" size=\"" + this.Size + "\">";
			if(this.HasLabel) {html += "&nbsp;" + this.Label} //Add the label
		}
		else { //The other way around
			if(this.HasLabel) {html += this.Label + "&nbsp;"} //Add the label
			html += "<input type=\"text\" id=\"" + this.Control + "\" title=\"" + this.Title + "\" class=\"LinkCtrl_Text\" value=\"" + this.Value + "\" size=\"" + this.Size + "\">";
		}
		html += "</label>"; //Closure of the control
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		GetId(this.Me).children[0].addEventListener("change", function(e) {
			var newVal = e.target.value;
			this.Value = newVal;
			this.change(newVal);
		}.bind(this));
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the jquery of the hosting element
		this.Value = v;
		if(ui) {ui.children[0].value = v}
	}
}