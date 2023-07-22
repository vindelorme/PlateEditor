//***************************************************************
// TABCONTROL object - One or multiple tabs, with control options
//***************************************************************
class TabControl { 
	constructor(I) { //ID and array of Tabs objects to be passed to the constructor in input
		this.ID = I.ID; //Container for the tabs
		this.Tabs = []; //An array of TabPanel objects
		this.LastKey = 0; //Tracker to give a unique key to each TabPanel objects
		this.Preserve = (I.Preserve || false); //Whether previous content in the ID container should be preserved or erased. Default is to erase previous content
		this.AutoInit = (I.AutoInit || false); //Will fall as false unless explicitely defined as true
		this.Multiple = (I.Multiple || false); //This allows opening of multiple panels. Only available for Menu Layout. Default is only one panel open at a time
		this.Disabled = (I.Disabled || false); //Whether the navigation should be disabled for this tab
		this.Stack = I.Stack; //Whether tab contents should stack on top of each other, instead of being left-floating
		this.Layout = (I.Layout || "Horizontal"); //Layout of the tab. Horizontal is the default, were headers and contents are stacked horizontally one after another. Menu allows an 'accordion menu'-like layout, whith a header and the content directly following, altogether stacked vertically. Vertical allows the headers to be stacked in a column, followed by the contents
		this.AfterDelete = (I.AfterDelete || function(i) {}); //Additional actions to be taken after deletion of a tab. The function receives the index of the deleted tab as argument
		if(I.Tabs) {
			I.Tabs.forEach(function(t, i) { //Create the TabPanel Object using user input
				t.Key = i;
				t.Parent = this;
				if(this.Disabled) {t.Disabled = true}
				this.Tabs.push(new TabPanel(t));
				this.LastKey++;
			}, this);
		}
		if(this.AutoInit) {this.init()} //Append the buttons on the page directly on construction
		return this; //For chaining
	}
	//Methods
	getTabIndex(key) { //Returns the index of the TabPanel object having its property Key equal to the argument provided
		var l = this.Tabs.length;
		for(let i=0;i<l;i++) { //Loop the tabs
			if(this.Tabs[i].Key == key) {return i}
		}
		return -1; //Fallback if nothing is found
	}
	indexForLabel(label) { //Returns the index of the TabPanel object having its property Label equal to the argument provided
		var l = this.Tabs.length;
		for(let i=0;i<l;i++) { //Loop the tabs
			if(this.Tabs[i].Label == label) {return i}
		}
		return -1; //Fallback if nothing is found
	}
	disable() { //Set the TabControl in disabled state and update the TabPanels accordingly
		this.Disabled = true;
		this.Tabs.forEach(function(t) {t.set("Disabled")});
		return this;
	}
	enable() { //Set the TabControl in enabled state and update the TabPanels accordingly
		this.Disabled = false;
		this.Tabs.forEach(function(t) {t.set("Enabled")});
		return this;
	}
	active() { //Returns the index of the active tab
		if(this.Multiple) { //In this case, returns an array of active elements
			var array = [];
			this.Tabs.forEach(function(t, i) {
				if(t.Active) {array.push(i)}
			});
			return array;
		}
		else { //Only one active tab at a time, returns the index of the winner
			var l = this.Tabs.length;
			for(let i=0;i<l;i++) { //Loop the tabs
				if(this.Tabs[i].Active) {return i}
			}
		}
	}
	init() { //Initialize the html for the tabs in the ID container
		if(this.Tabs.length == 0) {return this} //Nothing there, end of the story...
		let container = GetId(this.ID);
		if(container === null || container === undefined) {return this} //Do nothing if the container does not exist
		if(!container.classList.contains("LinkCtrl_Tab")) {container.classList.add("LinkCtrl_Tab")}; //Add classes for the tab
		if(!container.classList.contains("LinkCtrl_Round")) {container.classList.add("LinkCtrl_Round")};
		let html = "";
		switch(this.Layout) {
			case "Horizontal": //In this case, the headers are prepared first horizontally, followed by the contents
				html += "<div class=\"LinkCtrl_TabHeaders\">"; //Wrapper div for the headers
				this.Tabs.forEach(function(t, i) {
					html += t.initHeader();
				});
				html += "</div>"; //End of Header wrapper
				html += "<div class=\"LinkCtrl_TabContents\">"; //Wrapper div for the contents
				this.Tabs.forEach(function(t) { //Add the contents
					html += t.initContent();
				}); 
				html += "</div>"; //End of Content wrapper
				break;
			case "Menu": //In this case, contents are displayed directly below the active headers, on top of each others
				this.Tabs.forEach(function(t) {
					html += "<div class=\"LinkCtrl_TabHeaders\">" + t.initHeader() + "</div>";
					html += "<div class=\"LinkCtrl_TabContents\">" + t.initContent() + "</div>";
				});
				break;
			case "Vertical": //In this case, headers are displayed in a column, then contents are adjacent and also in a column
				html += "<div class=\"LinkCtrl_TabHeaders\" style=\"float: left;\">"; //Wrapper div for the headers
				this.Tabs.forEach(function(t, i) {
					html += t.initHeader() + "<br>";
				});
				html += "</div>"; //End of Header wrapper
				html += "<div class=\"LinkCtrl_TabContents\">"; //Wrapper div for the contents
				this.Tabs.forEach(function(t) { //Add the contents
					html += t.initContent();
				}); 
				html += "</div>"; //End of Content wrapper
				break;
			default: return this; //Exit here if an unknown layout is requested
		}
		if(this.Preserve) {container.insertAdjacentHTML("beforeend", html)} //Preserve previous content
		else {container.innerHTML = html} //Erase previous content
		this.bindEvents(); //Attach the events to the tab headers
		return this;
	}
	bindEvents(index) { //Bind the events to the Tabs, or only the tab with the index provided
		let me = GetId(this.ID);
		if(me === null || me === undefined) {return} //Do nothing if the container does not exist
		let source = this.Tabs;
		if(index) {source = [this.Tabs[index]]} //If the index is provided
		source.forEach(function(t, i) { //For each tab, bind the events
			let header = GetId(t.Anchors.Header);
			header.addEventListener("click", this.click.bind(this)); //Need to bind the object otherwise this refers to the header in the callback
		}, this);
		return this;
	}
	click(e) { //Action to be taken when click event occurs in a tab header section
		let t = e.target;
		let key = Number(t.getAttribute("tabKey")); //The unique Key of the TabPanel
		let index = this.getTabIndex(key);
		if(t.hasAttribute("tabaction")) { //Click was on a control
			switch(t.getAttribute("tabAction")) {
				case "Setting": break;
				case "Edit": break;
				case "Move": break;
				case "Delete": this.deleteConfirm(index); break;
				default: break;
			}
		}
		else { //Click was on the tab
			if(t.classList.contains("LinkCtrl_Active")) { //The tab is active
				//if(this.Multiple && this.Layout == "Menu") {this.Tabs[index].set("Resting")} //In this case, it is fine to hide any items
				if(this.Multiple) {this.Tabs[index].set("Resting")} //In this case, it is fine to hide any items
				else {this.Tabs[index].fold()} //Fold or unfold the content, one tab should always be active
			} 
			else {
				if(t.classList.contains("LinkCtrl_Disabled")) {return} //Nothing to do in case the tab is disabled
				this.jumpTo(index); //Default action
			}
		}
		return this;
	}
	jumpTo(index) { //Jump to the tab with the provided index
		this.Tabs[index].set("Active");
		if(!this.Multiple) { //Only one tab active, need to deactivate previously activated tab
			this.Tabs.forEach(function(t, i) { //Loop the tabs
				if(t.Active && i != index) {t.set("Resting")} //This tab needs to be deactivated
			});
		}
		return this;
	}
	setOpen(array) { //Set open the tabs with their index in the array provided, close the others. Only for tabs with Multiple enabled!
		if(this.Multiple) {
			this.Tabs.forEach(function(t, i) {
				if(array.includes(i)) {t.set("Active")}
				else {t.set("Resting")}
			});
		}
		return this;
	}
	closeAll() { //Close all the tabs
		this.Tabs.forEach(function(t) {t.set("Resting")});
		return this;
	}
	openAll() { //Open all the tabs
		this.Tabs.forEach(function(t) {t.set("Active")});
		return this;
	}
	addTabs(array) { //Append new tabs provided as an array
		array.forEach(function(a) {this.addTab(a)}, this);
		return this;
	}
	addTab(I) { //Create a new tab using the properties passed as an object in input
		if(I === undefined) {return this} //Nothing provided
		I.Key = this.LastKey; //
		I.Parent = this; 	  //Add or rewrite essential properties for the new tab
		I.Active = false;	  //
		if(this.Disabled) {I.Disabled = true}
		this.Tabs.push(new TabPanel(I)); //Create the new tab
		let l = this.Tabs.length - 1; //Last element added is sure to be at this location in the Tabs array
		if(this.LastKey == 0) {this.init()} //If this is the first tab, initialize the tab
		else {this.addTabHTML(l)} //Add the html for the new tab. This will succeed only if the containers are available
		if(I.SetActive) {this.jumpTo(l)}
		this.LastKey++; //Neutralize previous key to guarantee unicity
		return this.Tabs[l+1]; //Return the newly created tab
	}
	addTabHTML(index) { //Internal use. Create the HTML for the tab of the desired index, if the containers exist. The html is simply appended at the end
		var me = GetId(this.ID);
		if(me === null || me === undefined) {return} //Do nothing if the container does not exist
		if(!me.classList.contains("LinkCtrl_Tab")) {return} //The container exist but has not yet been initialized as a tab
		var tab = this.Tabs[index];
		switch(this.Layout) {
			case "Menu":
				me.insertAdjacentHTML("beforeend", 
					"<div class=\"LinkCtrl_TabHeaders\">" + tab.initHeader() + "</div>" +
					"<div class=\"LinkCtrl_TabContents\">" + tab.initContent() + "</div>"
				);
				break;
			case "Horizontal": //Append the html at the end of each container
				me.children[0].insertAdjacentHTML("beforeend", tab.initHeader());
				me.children[1].insertAdjacentHTML("beforeend", tab.initContent());
				break;
			case "Vertical": //Append the html at the end of each container, with a new line on the headers to get vertical piling
				me.children[0].insertAdjacentHTML("beforeend", tab.initHeader() + "<br>");
				me.children[1].insertAdjacentHTML("beforeend", tab.initContent());
				break;
			default: return;
		}
		me.style.display = "block"; //Make the tab visible again (in case it was hidden following deletion of the only tab left)
		this.bindEvents(index); //Don't bind the events multiple times! Only the new tab should have events binded
		return this;
	}
	deleteConfirm(index) { //Confirmation of tab deletion
		var ui = this; //Shortcut inside the function
		var id = "Form_DeleteTab";
		Form.open({
			ID: id,
			HTML: "<div style=\"text-align: center\"><p style=\"color: red;\">This will delete the tab and all its contents.</p><p>Are you sure you want to continue?</p></div>",
			Title: "Confirm deletion",
			Buttons: [
				{Label: "Ok", Click: function() {
					ui.deleteTab(index);
					ui.AfterDelete(index);
					Form.close(id);
				}},
				{Label: "Cancel", Click: function() {Form.close(id)} }
			],
			Size: 500,
		});
		return this;
	}
	deleteTab(index) { //Tab deletion
		var tabs = this.Tabs;
		var l = tabs.length;
		if(tabs[index] === undefined) {return this} //Stop there if the tab at this index does not exist
		if(!this.Multiple && tabs[index].Active) { //In case this was the active tabs and the tabControl is not set on multiple
			if(index == 0 && l > 1) {this.jumpTo(1)} //Go to the next one if this was the first and something follows
			if(index > 0) {this.jumpTo(index - 1)} //Otherwise, go to the previous one if possible
		}
		tabs[index].delete(); //Delete the HTML
		tabs.splice(index, 1); //Delete the object
		if(tabs.length == 0) { //If no tabs are left
			var me = GetId(this.ID);
			if(me !== null || me !== undefined) {me.style.display = "none"} //Hide the remaining HTML for the ControlTab, if it exists
		}
		return this;
	}
	rename(index, name) { //Rename tab index with new name
		this.Tabs[index].rename(name);
		return this;
	}
}