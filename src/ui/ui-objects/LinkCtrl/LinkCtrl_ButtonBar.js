//**************************************************************************************
// LINKCTRL_BUTTONBAR object - Extension of the HTML button input for better interaction
//**************************************************************************************
class LinkCtrl_ButtonBar extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "ButtonBar";
		this.Spacing = I.Spacing; //Whether the buttons are compacted or spaced
		this.Buttons = []; //Buttons implemented in this bar
		this.Title = (I.Title || "");
		let n = I.Buttons.length - 1; //Last index
		if(n < 0) {return this} //No buttons defined, exit before crashing in the loop
		I.Buttons.forEach(function(b, i) {
			b.ID = I.ID + "_button";
			if(this.Spacing !== true) { //Append the buttons in a compact styling, without spacing
				b.Chain = {Index: i}; //The chain property will take care of the index for each button
				if(i == n) {b.Chain.Last = true} //Flag the last index
			}
			else {b.ID += "_" + i} //Manually implement the indices
			this.Buttons.push(LinkCtrl.new("Button", b)); //Implement each button as a LinkCtrl_Button object
		}, this);
		this.Inline = I.Inline; //Whether buttons should be forced in a single line
		this.Me = this.ID + "_ButtonBar";
		return this;
	}
	//Methods
	node() { //Return a new span node representing this button
		if(LinkCtrl_ButtonBar.Index === undefined) {LinkCtrl_ButtonBar.Index = 0} //Index to guarantee ID unicity
		let div = document.createElement("div"); //Spawn the container node
		if(this.Inline) {div.className = "LinkCtrl_Inline"}
		div.id = this.Me + "_" + LinkCtrl_ButtonBar.Index;
		div.title = this.Title;
		LinkCtrl_ButtonBar.Index++; //Guarantee unicity for the next button_bar ID
		this.Buttons.forEach(function(b, i) {
			div.append(b.node()); //Append the node for each button
			if(this.Spacing === true) {div.insertAdjacentHTML("beforeend", " ")} //To space the buttons evenly
		}, this);
		return div;
	}
	html() { //Initialize the html for the control
		let html = this.node().outerHTML; //Html for the button
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		this.Buttons.forEach(function(b) {b.bindEvents()});
		return this;
	}
	updateValue(v, ui) { //Update the value of the html control. For button, no value is displayed or set by the user, but the function still works
		this.Value = v; //Can be used to store and retrieve values programmatically, if needed
		return this;
	}
	update() { //Update the html of the object
		this.Buttons.forEach(function(b) {b.update()});
		return this;
	}
	disable() { //Disable the button
		this.Buttons.forEach(function(b) {b.disable()});
		return this;
	}
	enable() {
		this.Buttons.forEach(function(b) {b.enable()});
		return this;
	}
}