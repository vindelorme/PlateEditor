//***********************************************************************************
// LINKCTRL_SELECT object - Extension of the HTML select input for better interaction
//***********************************************************************************
class LinkCtrl_Select extends LinkCtrl {
	constructor(I) {
		super(I); //Call the super class constructor and pass in the input object
		this.Type = "Select";
		this.List = (I.List || []); //List of available options in the select element
		this.NavBar = I.NavBar; //Whether to add navBar elements to this select
		if(I.Lookup) {
			this.Lookup = {Active: false, Query: "", Values: [], LastVisited: 0}
		}
		return this;
	}
	//Getter
	get Selected() { //Return the name of the selected item; use .getValue() to get its index
		return this.List[this.Value];
	}
	//Methods
	html() { //Initialize the html for the control
		let html = "";
		if(this.NavBar) { //Add navigation elements
			let middle = this.getClass({ForceMiddle: true});
			html += "<span style=\"white-space: pre\">"; //Wrapping span
				html += "<span class=\"LinkCtrl" + this.getClass({LeftOnly: true}) + "\" title=\"Move to the first element\" style=\"padding: 0.5em 0.2em;\">" + LinkCtrl.icon({Type: "First"}) + "</span>"; //First element
				html += "<span class=\"LinkCtrl" + middle + "\" title=\"Move one element backward\" style=\"border-right: none; border-left: none; padding: 0.5em 0.2em;\">" + LinkCtrl.icon({Type: "Left"}) + "</span>"; //Go one before
				html += "<label id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + middle + "\">"; //Opening label for the control
				html += this.htmlInternal(); //Select element
				html += "</label>"; //Closure of the control
				html += "<span class=\"LinkCtrl" + middle + "\" title=\"Move one element forward\" style=\"border-right: none; border-left: none; padding: 0.5em 0.2em\">" + LinkCtrl.icon({Type: "Right"}) + "</span>"; //Go one after
				html += "<span class=\"LinkCtrl" + this.getClass({RightOnly: true}) + "\" title=\"Move to the last element\" style=\"padding: 0.5em 0.2em\">" + LinkCtrl.icon({Type: "Last"}) + "</span>"; //Last element
			html += "</span>"; //Closure of the wrapping span
		}
		else {
			html += "<label id=\"" + this.Me + "\" title=\"" + this.Title + "\" class=\"LinkCtrl" + this.Classes + "\">"; //Opening label for the control
			html += this.htmlInternal();
			html += "</label>"; //Closure of the control
		}
		if(this.NewLine) {html += "<br>"} //Newline after this control if needed
		return html;
	}
	htmlInternal() { //The html of the elements within the label. This subfunction is useful here when calling an update of the List within the select
		let html = "";
		if(this.ControlLeft) { //The control is first, the label after
			html += this.htmlInput(); //Add the input
			if(this.HasLabel) {html += "&nbsp;" + this.Label} //Add the label
		}
		else { //The other way around
			if(this.HasLabel) {html += this.Label + "&nbsp;"} //Add the label
			html += this.htmlInput(); //Add the input
		}
		if(this.Lookup) {html += this.htmlLookup()} //Append elements enabling value lookup in the list
		return html;
	}
	htmlInput() { //Html for the input per se
		let html = "<select id=\"" + this.Control + "\" title=\"" + this.Title + "\" class=\"LinkCtrl_Select\">";
		html += this.htmlOptions();
		html += "</select>";
		return html;
	}
	htmlLookup() { //Html for the lookup icon and element
		let html = LinkCtrl.icon({Type: "Zoom", Title: "Click here to search values in the list", Active: false, Space: true});
		html += "<div class=\"LinkCtrl_SelectLookup\" style=\"display: none\">";
			html += "<input type=\"text\" size=\"15\" title=\"Type your search here and press enter to navigate the results\">"; //Text area for the search
			html += "<div style=\"line-height: normal; color: black\"></div>"; //output for the result
		html += "</div>";
		return html;
	}
	bindEvents(I) { //Bind the events to the control
		let me = GetId(this.Me);
		let select = me.children[0];
		select.addEventListener("change", function(e) {
			var newVal = e.target.selectedIndex;
			this.Value = newVal;
			this.change(newVal);
		}.bind(this));
		if(this.Lookup) { //Below events are for the lookup items
			let lookup = me.children[1];
			let div = me.children[2];
			let text = div.children[0];
			let out = div.children[1];
			let timeout = undefined;
			lookup.addEventListener("click", function(e) { //Handle for the visibility of the search bar
				let s = div.style;
				if(this.Lookup.Active == false) { //Make div visible
					lookup.classList.replace("LinkCtrl_IconResting", "LinkCtrl_IconActive"); //Other classes must be maintained, so replace is required
					me.classList.replace("LinkCtrl_Resting", "LinkCtrl_Active");
					s.display = "block";
					s.left = (lookup.offsetLeft - 20) + "px";
					this.Lookup = {Active: true, Values: [], LastVisited: 0, Query: ""}
//**********************************************************************************************
//We need to wait until the function has run and the browser updated the visibility of the input
//before trying to set the focus, otherwise it will happen on an invisible element and fail...
					window.setTimeout(function() {text.focus()}, 0);
//**********************************************************************************************
				}
				else { //Hide the div
					this.Lookup.Active = false;
					s.display = "none";
					lookup.classList.replace("LinkCtrl_IconActive", "LinkCtrl_IconResting"); //Other classes must be maintained, so replace is required
					me.classList.replace("LinkCtrl_Active", "LinkCtrl_Resting");
					text.value = "";    //Reset the fields
					out.innerHTML = ""; //
				}
			}.bind(this));
			text.addEventListener("keyup", function(e) { //Handle for the lookup
				let LU = this.Lookup;
				let query = text.value;
				if(query == "") {out.innerHTML = ""; return} //No query, do nothing
				if(e.key == "Enter") { //Reaction when the user press enter
					if(LU.Values.length == 0) {out.innerHTML = ""; return} //No values, do nothing
					else { //loop through the results
						let item = LU.Values[LU.LastVisited]
						this.setValue(item).change(item);
						LU.LastVisited++; //Move to the next
						if(LU.LastVisited == LU.Values.length) {LU.LastVisited = 0} //Restart looping from the beginning
					}
				}
				else { //The user is typing, update the element after a short timeout, to prevent overflow
					LU.Query = query;
					let p = new Promise(function(resolve) { //A promise that will resolve when the search is complete
						let result = [];
						let RG = new RegExp(query, "i"); //Case insensitive search
						this.List.forEach(function(l, i) {
							if(RG.test(l)) {result.push(i)}
						});
						resolve(result);
					}.bind(this));
					if(timeout) {clearTimeout(timeout)}
					timeout = setTimeout(function() {
						out.innerHTML = "Searching..."; //Reset the field
						p.then(function(result) { //Wait for the promise and display the result
							LU.Values = result;
							LU.LastVisited = 0;
							let l = result.length;
							let msg = "";
							switch(l) {
								case 0: msg = "No match!"; break;
								case 1: msg = "Found 1 match"; break;
								default: msg = "Found " + l + " matches"; break;
							}
							if(text.value == query) {out.innerHTML = msg} //Only write if the result corresponds to the initial query
							else { //Additional protection to remove the 'searching' message if there are no query left
								if(text.value == "") {out.innerHTML = ""}
							}
						});
					}, 200); //Short time out
				}
			}.bind(this));
		}
		if(this.NavBar) { //Bind events to the navbar elements
			let back = me.previousSibling;
			let first = back.previousSibling;
			let next = me.nextSibling;
			let last = next.nextSibling;
			first.addEventListener("click", function(e) {this.setValue(0).change(0)}.bind(this));
			last.addEventListener("click", function(e) {
				let l = this.List.length - 1;
				this.setValue(l).change(l);
			}.bind(this));
			next.addEventListener("click", function(e) {
				let l = this.List.length - 1;
				let v = this.Value;
				if(v < l) {this.setValue(v + 1).change(v + 1)}
			}.bind(this));
			back.addEventListener("click", function(e) {
				let v = this.Value;
				if(v > 0) {this.setValue(v - 1).change(v - 1)}
			}.bind(this));
		}
		return this;
	}
	updateValue(v, ui) { //Update the value of the html control, following value change. v is the new value, ui refers to the hosting element
		this.Value = v;
		if(ui) {ui.children[0].selectedIndex = v}
		return this;
	}
	htmlOptions() { //Returns an html string to populate a select control with available elements in the list
		var html = "";
		var selected = "";
		this.List.forEach(function(a, i) {
			if(i == this.Value) {selected = "selected"}
			else {selected = ""}
			html += "<option value=\"" + i + "\" " + selected + ">" + a + "</option>";
		}, this);
		return html;
	}
	updateList(list) { //Update the control with a new list provided in input as an array
		this.List = list;
		if(this.Value >= list.length) {this.Value = list.length - 1} //Less items than before, rebase to be at the highest possible
		let select = GetId(this.Control);
		if(select === null) {return this} //No control on the page means no html to update
		select.innerHTML = this.htmlOptions(); //Re-create the html using the updated list
		return this;
	}
	disable() { //Disable the select
		var me = GetId(this.Me);
		if(me === null) {return this} //No control on the page means nothing else to update
		me.children[0].disabled = true;
		if(this.NavBar) {
			//Disable NavBar elements
		}
		return this;
	}
}