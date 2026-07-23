//*************************************************************************
// CONFIG object - Object holding the adjustable configuration and defaults 
//*************************************************************************
class Config {
	constructor(I) {
		this.Root = I.Root;
		this.Properties = {};
		return this;
	}
	//Static methods
	static fontList() {
		return ["arial", "times"];
	}
	static getCSS(propName, val) { //Returns the css string corresponding to the value of the property passed
		switch(propName) {
			case "Size": return "font-size: " + val + "px;";
			case "Font": return "font-family: " + val + ";";
			case "Bold": if(val) {return "font-weight: bold;"} break;
			case "Italic": if(val) {return "font-style: italic;"} break;
			case "Color": return "color: " + val + ";";
			case "Alpha": return "opacity: " + val + ";";
			case "Align": return "text-align: " + val + ";";
			case "Padding": return "padding: " + val + "px;";
			default: return "";
		}
		return "";
	}
	static fontCanvas(o) { //Build and return the config of the string that can be used in the canvas
		let font = "";
		if(o !== undefined) {
			if(o.Bold !== undefined && o.Bold == true) {font += " bold"}
			if(o.Italic !== undefined && o.Italic == true) {font += " italic"}
			font += " " + o.Size + "px " + o.Font;
		}
		return font;
	}
	//Methods
	id(main, sub) { //Returns an id string based on the main and sub categories
		return this.Root + "_" + main + "_" + sub;
	}
	init() { //Init the configuration controls on the page
		let tabs = [];
		Object.values(this.Properties).forEach(function(p, i) { //Prepare tabs for the menu
			let html = "";
			let propName = Object.keys(this.Properties)[i];
			Object.keys(p).forEach(function(k) { //Prepare the html containers
				html += "<fieldset id=\"" + this.id(propName, k) + "\"><legend>" + k + "</legend></fieldset>";
			}, this);
			tabs.push({
				Label: propName,
				Content: {Type: "HTML", Value: html},
			});
		}, this);
		tabs[0].Active = true; //Activate the first tab as default
		this.Menu = new TabControl({ //Create the menu
			ID: this.Root,
			Preserve: true,
			Layout: "Vertical",
			Tabs: tabs,
		}).init(); //Init the menu on creation
		Object.values(this.Properties).forEach(function(p) { //Init the LinkCtrls of each properties
			Object.values(p).forEach(function(v) {
				Object.values(v).forEach(function(l) {
					l.init();
				});
			});
		});
		return this;
	}
	get(main, sub, prop) { //Returns the value of the property corresponding to main and sub
		let p = this.Properties[main][sub][prop];
		if(p.Type == "Select") {return p.Selected}
		else {return p.getValue()}
	}
	set(value, main, sub, prop) { //Change the value of the property corresponding to main and sub
		this.Properties[main][sub][prop].setValue(value);
	}
	default(value, main, sub, prop, I) { //Change the default value of the property corresponding to main and sub
		this.Properties[main][sub][prop].Default = value;
		if(I && I.Set) {this.Properties[main][sub][prop].setValue(value)} //Also set the value to the new default if required
	}
	values(main, sub) { //Returns all values of the properties corresponding to main and sub
		let o = Object.entries(this.Properties[main][sub]).map(function(a) {
			let val = a[1].getValue();
			if(a[1].Type == "Select") {val = a[1].Selected}
			return [a[0], val];
		});
		return Object.fromEntries(o);
	}
	valuesCSS(main, sub) { //Returns all values of the properties corresponding to main and sub, as a css compatible string
		let style = "";
		Object.entries(this.Properties[main][sub]).forEach(function(a, i) {
			if(i > 0) {style += " "}
			let val = a[1].getValue();
			if(a[1].Type == "Select") {val = a[1].Selected}
			style += Config.getCSS(a[0], val);
		}, this);
		return style;
	}
}