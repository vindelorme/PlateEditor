//***********************************************************************************
// LINKCTRL_BUTTON object - Extension of the HTML button input for better interaction
//***********************************************************************************
class LinkCtrl_Button extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Button";
		this.Icon = I.Icon; //Icon to use for the button. Should be a structured object {Type, Color, Space, Active, Size, Title, Attributes}
		this.Click = I.Click; //Function to execute on click
		return this;
	}
	//Methods
	node() { //Return a new span node representing this button
		let span = document.createElement("span"); //Spawn the node for the button
		span.style.whiteSpace = "pre";
		span.className = "LinkCtrl" + this.Classes; //Add the class to the element
		span.id = this.Me;
		if(this.Title) {span.title = this.Title}
		if(this.Label) {span.innerHTML = this.Label}
		if(this.Icon) {
			let icon = LinkCtrl.icon(this.Icon); //Generate the icon html
			if(this.Icon.Left) {span.insertAdjacentHTML("afterbegin", icon)} //Icon first
			else {span.insertAdjacentHTML("beforeend", icon)} //Icon last
		}
		this.Button = span; //Log the span html object as the new button control
		return span;
	}
	html() { //Initialize the html for the control
		let html = this.node().outerHTML; //Html for the button
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	bindEvents() { //Bind the events to the control
		if(this.Click !== undefined) { //Attach the event if defined
			GetId(this.Me).addEventListener("click", function(e) {
				if(!this.Disabled) {this.Click()} //Execute the action if not disabled
			}.bind(this));
		}
		return this;
	}
	updateValue(v, ui) { //Update the value of the html control. For button, no value is displayed or set by the user, but the function still works
		this.Value = v; //Can be used to store and retrieve values programmatically, if needed
		return this;
	}
	update() { //Update the html of the object
		let me = GetId(this.Me);
		if(me !== null) {me.replaceWith(this.node())}
		this.bindEvents();
		return this;
	}
	disable() { //Disable the button
		this.Disabled = true;
		this.update();
		return this;
	}
	enable() {
		this.Disabled = false;
		this.update();
		return this;
	}
}