//***************************************************************************************
// LINKCTRL_TEXTAREA object - Extension of the HTML textarea input for better interaction
//***************************************************************************************
class LinkCtrl_TextArea extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "TextArea";
		return this;
	}
	//Methods
	html() { //Initialize the html for the control
		let html = "<textarea id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl_Round LinkCtrl_TextArea";
		if(this.Disabled) {html += " LinkCtrl_TextAreaDisabled\""}
		else {html += " LinkCtrl_TextAreaEnabled\""}
		if(this.Disabled) {html += " disabled"}
		html += " value=\"" + this.Value + "\">" + this.Value + "</textarea>"; //For textarea, default value on init should be within the node
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		GetId(this.Me).addEventListener("change", function(e) {
			var newVal = e.target.value;
			this.Value = newVal;
			this.change(newVal);
		}.bind(this));
		return this;
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the jquery of the hosting element
		this.Value = v;
		if(ui) {ui.value = v}
		return this;
	}
	disable() { //Disable the textarea
		let me = GetId(this.Me);
		if(me) {
			me.disabled = true;
			me.classList.replace("LinkCtrl_TextAreaEnabled", "LinkCtrl_TextAreaDisabled");
		}
		return this;
	}
}