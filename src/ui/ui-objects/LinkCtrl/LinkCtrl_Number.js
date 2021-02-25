//************************************************************************************
// LINKCTRL_NUMBER object - Extension of the HTML5 number input for better interaction
//************************************************************************************
class LinkCtrl_Number extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Number";
		this.Size = (I.Size || 5); //Size of the control
		this.Min = (I.Min || -Infinity); //Minimum value accepted
		this.Max = (I.Max || Infinity); //Maximum value accepted
		this.Step = (I.Step || "any"); //How much to increment between each step
		return this;
	}
	//Methods
	html() { //Initialize the html for the control
		var html = "<label id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
		if(this.ControlLeft) { //The control is first, the label after
			html += this.htmlInput(); //Add the input
			if(this.HasLabel) {html += "&nbsp;" + this.Label} //Add the label
		}
		else { //The other way around
			if(this.HasLabel) {html += this.Label + "&nbsp;"} //Add the label
			html += this.htmlInput(); //Add the input
		}
		html += "</label>"; //Closure of the control
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	htmlInput() { //Html for the input per se
		var html = "<input type=\"number\" id=\"" + this.Control + "\" title=\"" + this.Title + "\" class=\"LinkCtrl_Number\" value=\"" + this.Value + "\" style=\"width: " + this.Size + "em\"";
		if(this.Min !== undefined) {html += " min=\"" + this.Min + "\""} //Need to pass the test when min/max = 0, 
		if(this.Max !== undefined) {html += " max=\"" + this.Max + "\""} //
		if(this.Disabled) {html += " disabled"}
		html += " step=\"" + this.Step + "\">";
		return html;
	}
	bindEvents() { //Bind the events to the control
		GetId(this.Me).children[0].addEventListener("change", function(e) {
			let t = e.target;
			var newVal = Number(t.value);
			let error = false;
			if(newVal > this.Max) {newVal = this.Max; error = true} //Adjust the value to fit within the Min/Max
			if(newVal < this.Min) {newVal = this.Min; error = true} //
			if(error) {t.style.color = "red"}
			else {t.style.color = "black"}
			t.value = newVal;
			this.Value = newVal;
			this.change(newVal);
		}.bind(this));
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element
		let val = Number(v);
		if(val > this.Max) {val = this.Max}
		if(val < this.Min) {val = this.Min}
		this.Value = val;
		if(ui) {ui.children[0].value = val}
	}
	setMin(min) { //Update the minimum accepted for this control
		this.Min = min;
		if(this.Value < min) {this.setValue(min)}
		let me = GetId(this.Control);
		if(me) {me.min = min}
		return this;
	}
	setMax(max) { //Update the maximum accepted for this control
		this.Max = max;
		if(this.Value > max) {this.setValue(max)}
		let me = GetId(this.Control);
		if(me) {me.max = max}
		return this;
	}
	disable() { //Disable the control
		this.Disabled = true;
		let me = GetId(this.Me);
		if(me) {
			me.children[0].disabled = true;
			me.classList.replace("LinkCtrl_Resting", "LinkCtrl_Disabled");
		}
		return this;
	}
	enable() { //Enable the control
		this.Disabled = false;
		let me = GetId(this.Me);
		if(me) {
			me.children[0].disabled = false;
			me.classList.replace("LinkCtrl_Disabled", "LinkCtrl_Resting");
		}
	}
}