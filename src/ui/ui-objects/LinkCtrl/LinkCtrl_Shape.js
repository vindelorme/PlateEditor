//////////////////////////////////////////////////////////////////////////////////////////
// LINKCTRL_Shape object - a shape selector with sets of interaction /////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
class LinkCtrl_Shape extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Shape";
		this.Size = 20;
		if(I.Size !== undefined) {this.Size = I.Size} //Size of the shape to draw, which will also define the size of the box for preview
		return this;
	}
	//Methods
	html() { //Initialize the html for the control
		let html = "<label id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
		let S = this.Size;
		let R = Grapher.PixelRatio;
		let CanvasHTML = "<canvas id=\"" + this.Control + "\" class=\"LinkCtrl_Shape\" width=\"" + (R * S) + "\" height=\"" + (R * S) + "\" style=\"width: " + S + "px; height: " + S + "px; title=\"" + this.Title + "\">";
		if(this.ControlLeft) { //The control is first, the label after
			html += CanvasHTML;
			if(this.HasLabel) {html += "&nbsp;" + this.Label} //Add the label
		}
		else { //The other way around
			if(this.HasLabel) {html += this.Label + "&nbsp;"} //Add the label
			html += CanvasHTML;
		}
		html += "</label>"; //Closure of the control
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		GetId(this.Me).addEventListener("click", function(e) {
			Form_Shape({
				Caller: this,
				after: this.change,
				Size: this.Size,
			});
		}.bind(this));
		this.setValue(this.Value); //Draw the selected shape on init
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element
		this.Value = v;
		if(ui) {Shape.previewCanvas(ui.children[0], v, this.Size, {Clear: true})} //Clear previous drawing to avoid overlap
	}
}