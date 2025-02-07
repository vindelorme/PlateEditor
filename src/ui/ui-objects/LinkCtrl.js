//***********************************************************************************************
// LINKCTRL object - Extension of the HTML controls for direct interaction with object properties
//***********************************************************************************************
class LinkCtrl {
	constructor(I) {
		this.ID = I.ID; //ID of the html element containing the control
		this.Default = I.Default; //Default value of the control upon initialization
		this.Value = I.Default; //Keeping the value in the object ensures that it can be recovered even after the html control is destroyed
		this.Title = (I.Title || ""); //Text used to populate the title field of the label
		this.Label = (I.Label || ""); //Test used as label for the control
		this.ControlLeft = (I.ControlLeft || false);//Whether the control should be at the left of the label, instead of the right
		this.NewLine = (I.NewLine || false); //Whether to go to the next line AFTER this control
		this.Preserve = (I.Preserve || false); //Whether to preserve previous content or not.
		this.change = (I.Change || function(v) {}.bind(this)); //Additional function to run in case the value of the control is changed. The function will receive the new value
		this.Chain = I.Chain; //An object composed of the mandatory "Index" property and optional "Last" property, to control the chaining. If undefined, the chaining is off (standalone control)
		if(this.Chain) {this.Index = this.Chain.Index} //In case of chaining, the index of the control in the chain.
		else { //Defining an index allow to chain elements by "sticking" them together in a control bar. Useful for vertical layout
			if(I.Index && I.Index > -1) {this.Index = I.Index}
			else {this.Index = 0}
		}
		this.Disabled = I.Disabled; //To init the control in a disable stage
		this.Me = this.ID + "_" + this.Index;
		this.Control = this.Me + "_Control";
	}
	//Static methods
	static new(type, I) { //Create a new LnkCtrl object of the desired type
		if(I === undefined) {console.error("Required options missing for LinkCtrl. Aborted."); return} //Check for required options
		if(I.ID === undefined || I.ID == "") {console.error("Required ID missing for LinkCtrl. Aborted."); return}
		if(type != "Button" && type != "ButtonBar" && I.Default === undefined) { //Default value required, except for buttons
			console.error("Required default value missing for LinkCtrl. Aborted.");
			return;
		}
		switch(type) { //Create the desired element
			case "Checkbox": return new LinkCtrl_Checkbox(I);
			case "Text": return new LinkCtrl_Text(I);
			case "TextArea": return new LinkCtrl_TextArea(I);
			case "Number": return new LinkCtrl_Number(I);
			case "Select": return new LinkCtrl_Select(I);
			case "Color": return new LinkCtrl_Color(I);
			case "Radio": return new LinkCtrl_Radio(I);
			case "File": return new LinkCtrl_File(I);
			case "Button": return new LinkCtrl_Button(I);
			case "ButtonBar": return new LinkCtrl_ButtonBar(I);
			default: //Exit if the type is unknown
				console.error("Unknown type requested for LinkCtrl (" + type + "). Aborted.");
				return;
		}
	}
	//***************
	//DEPRECATED: USE THE LINKCTRL.NEW IMPLEMENTATION INSTEAD
	//***************
	static button(I) { //Output the node for a button with the desired options: ID, Title, Label, Disabled, Click, Icon
		if(I === undefined) {console.error("Required options missing for Button. Aborted."); return} //Check for required options
		var span = document.createElement("span"); //Spawn the node for the button
		var classes = "LinkCtrl LinkCtrl_Round";
		if(I.Disabled) {classes += " LinkCtrl_Disabled"}
		else {classes += " LinkCtrl_Resting"}
		span.style.whiteSpace = "pre";
		span.className = classes; //Add the class to the element
		if(I.ID) {span.id = I.ID}
		if(I.Title) {span.title = I.Title}
		if(I.Label) {span.innerHTML = I.Label}
		if(I.Icon) {
			let icon = this.icon(I.Icon); //Generate the icon html
			if(I.Icon.Left) {span.insertAdjacentHTML("afterbegin", icon)} //Icon first
			else {span.insertAdjacentHTML("beforeend", icon)} //Icon last
		}
		if(I.Click && !I.Disabled) { //Attach the event if defined and the button is not disabled
			span.addEventListener("click", I.Click);
		}
		return span;
	}
	static buttonBar(I, Inline) { //Output the nodes for a bar of buttons with the desired options: Buttons
		if(I === undefined) {console.error("Required buttons missing for button bar. Aborted."); return} //Check for required options
		var div = document.createElement("div"); //Spawn the container node
		if(Inline) {div.className = "LinkCtrl_Inline"}
		I.forEach(function(b, i) {
			if(i > 0) {div.insertAdjacentHTML("beforeend", " ")} //To space the buttons evenly
			div.append(this.button(b));
		}, this);
		return div;
	}
	//***************
	//***************
	//***************
	static icon(I) { //Create the html needed to display an icon, based on the provided options
		let html = "";
		if(I.Space) {html += "&nbsp;"}
		html += "<span class=\"LinkCtrl_Icon"; //Mind the initial space
		if(I.Active !== undefined) {
			if(I.Active) {html += " LinkCtrl_IconActive"}
			else {html += " LinkCtrl_IconResting"}
		}
		switch(I.Size) {
			case "Big": html += " LinkCtrl_IconBig"; break;
			case "Medium": html += " LinkCtrl_IconMedium"; break;
			default: html += " LinkCtrl_IconSmall"; break;
		}
		html += "\"";
		if(I.Title) {html += " title=\"" + I.Title + "\""}
		if(I.Attributes) { //Custom attributes with values can be added
			I.Attributes.forEach(function(a) {
				html += " " + a.Name + "=\"" + a.Value + "\"";
			});
		}
		let position = "";
		switch(I.Type) {
			case "Reset": position = "0px 0px"; break;
			case "Setting": position = "-50px 0px"; break;
			case "Zoom": position = "-100px 0px"; break;
			case "Move": position = "-150px 0px"; break;
			case "Delete": position = "-200px 0px"; break;
			case "Edit": position = "0px -50px"; break;
			case "Tag": position = "-50px -50px"; break;
			case "Ok": position = "-100px -50px"; break;
			case "Cancel": position = "-150px -50px"; break;
			case "Back": position = "-200px -50px"; break;
			case "Up": position = "0px -100px"; break;
			case "Down": position = "-50px -100px"; break;
			case "Bottom": position = "-100px -100px"; break;
			case "Top": position = "-150px -100px"; break;
			case "Load": position = "-200px -100px"; break;
			case "Save": position = "0px -150px"; break;
			case "ZoomOut": position = "-50px -150px"; break;
			case "ZoomIn": position = "-100px -150px"; break;
			case "New": position = "-150px -150px"; break;
			case "Warning": position = "-200px -150px"; break;
			case "Left": position = "0px -200px"; break;
			case "Right": position = "-50px -200px"; break;
			case "Last": position = "-100px -200px"; break;
			case "First": position = "-150px -200px"; break;
			default: position = "-200px -200px"; break; //Last slot is a blank icon
		}
		let filter = "";
		switch(I.Color) {
			case "Red": filter = " filter: sepia(100%) saturate(1500%)"; break;
			case "Green": filter = " filter: sepia(100%) saturate(2000%) hue-rotate(100deg)"; break;
			case "Yellow": filter = " filter: sepia(50%) hue-rotate(15deg) saturate(5000%)"; break;
			default: break;
		}
		html += "style=\"background-position: " + position + ";" + filter + "\"></span>";
		return html;
	}
	//Getter
	get Classes() { //Returns a text representing the classes to be added to the label hosting the control
		return this.getClass();
	}
	get HasLabel() { //Whether a text has been provided as label
		return (this.Label.length > 0); 
	}
	//Methods
	getClass(I) { //Returns a text representing the classes to be added to the label hosting the control. Can be provided options for proper control
		let txt = "";
		if(this.Type == "Checkbox" && this.Value) {txt += " LinkCtrl_Active"} //For active checkbox
		else { //Normal case
			if(this.Disabled) {txt += " LinkCtrl_Disabled"}
			else {txt += " LinkCtrl_Resting"}
		}
		if(I && I.ForceMiddle) {return txt} //From here on, process the rounding effects based on the position of the control in the chain
		let c = this.Chain;
		if(c) { //Chaining
			if(c.Index == 0 || c.NewLine) { //First element in the chain
				if(I === undefined || I.RightOnly === undefined) {txt += " LinkCtrl_RoundL"}
			}
			else {txt += " LinkCtrl_Chain"} //Note: currently, this css class is empty
			if(c.Last) { //Last element in the chain
				if(I && I.LeftOnly) {return txt}
				else {txt += " LinkCtrl_RoundR"}
			} 
		}
		else { //No chaining, standalone control
			if(I && I.RightOnly) {txt += " LinkCtrl_RoundR"}
			else {
				if(I && I.LeftOnly) {txt += " LinkCtrl_RoundL"}
				else {txt += " LinkCtrl_Round"} //Default case
			}
		}
		return txt;
	}
	init() { //Initialize the control on the page by appending the html in the ID container
		let container = GetId(this.ID);
		if(container === null || container === undefined) { //Do nothing if the container does not exist
			console.warn("DOM element for LinkCtrl not found, init() method aborted");
			return this;
		}
		let html = this.html();
		if(this.Chain && this.Chain.NewLine) {html = "<br>" + this.html()}
		if(this.Chain && this.Index > 0) {container.insertAdjacentHTML("beforeend", html)} //Chaining, preserve previous content
		else {
			if(this.Preserve) {container.insertAdjacentHTML("beforeend", html)} //Preserve previous content
			else {container.innerHTML = html} //erase
		}
		this.bindEvents();
		return this; //For chaining, with .change() in particular
	}
	bindEvents() {console.warn("bindEvents function not defined for this control; no events attached")} //Attach the events to the control. Specific to each control and added here only as default fallback
	setValue(v) { //Set the value of the control, updating the html classes if possible
		let me = GetId(this.Me);
		this.updateValue(v, me);
		return this;
	}
	getValue() { //Return the value of the control. Identical to calling obj.Value, but added for consistency with the setValue() method
		return this.Value;
	}
	setDefault(v) { //Set the default value of the control, wihtout changing its value by itself
		this.Default = v;
		return this;
	}
	default() { //Set the value of the control to its defaults
		return this.setValue(this.Default);
	}
	remove() { //Remove the element from the page. For elements with NewLine = true, the <br> will also be deleted
		let me = GetId(this.Me);
		if(me === null) {return this} //Nothing to do if this control does not exist on the page
		if(this.NewLine === true) { 
			let next = me.nextElementSibling
			if(next.nodeName == "BR") {next.remove()} //Check that we are indeed targeting a br before removing anything important...
		}
		me.remove(); //Delete the element
		return this;
	}
	focus() { //Set the focus to the element. This uses the native focus() of the browser and results may vary...
		let me = GetId(this.Me);
		if(me) {me.focus()}
		return this;
	}
}