//**************************************************************************
// TABPANEL object - A tab object used and controlled by a TabControl object
//**************************************************************************
class TabPanel {
	constructor(I) {
		this.Key = I.Key; //Unique index for the. Note that this is NOT the index in the parent array
		this.Parent = I.Parent; //The parent TabControl object
		this.Label = (I.Label || ""); //Label displayed by the header
		this.Active = (I.Active || false); //Whether this panel is active
		this.Disabled = (I.Disabled || false); //Whether this panel is disabled
		this.Controls = (I.Controls || []); //Controls available for this panel. Possible values are ["Form", "Edit", "Move", "Delete"], in whatever order
		this.Content = I.Content; //Content to be displayed inside the tab while active. It should be provided as an object with Type and Value properties
		let root = this.Parent.ID;
		this.Anchors = {
			Header: root + "_TabHeader_" + this.Key,
			Content: root + "_TabContent_" + this.Key,
		}
		this.initContentInternal(); //Initialize the contents. This is in case DOM needs to be copied before being destroyed by autoInit of the parent
		return this;
	}
	//Methods
	classHeader() { //Return a string for the classes that should be applied to the header, given current panel properties
		let classes = "LinkCtrl LinkCtrl_RoundT";
		if(this.Active) {classes += " LinkCtrl_Active"} //Active class has priority over the rest
		else {
			if(this.Disabled) {classes += " LinkCtrl_Disabled"}
			else {classes += " LinkCtrl_Resting"}
		}
		return classes;
	}
	/*classControl() { //Return a string for the classes that should be applied to the control of this header, given current panel properties
		var classes = "LinkCtrl_Icon";
		if(this.Active) {classes += " LinkCtrl_IconActive"} //Active class has priority over the rest
		else {
			if(this.Disabled) {classes += " LinkCtrl_IconDisabled"}
			else {classes += " LinkCtrl_IconResting"}
		}
		return classes;
	}*/
	initHeader() { //Returns the html for this tab header
		let html = "<span ";
		html += "id=\"" + this.Anchors.Header + "\" ";
		html += "class=\"" + this.classHeader() + "\" ";
		html += "tabKey=\"" + this.Key + "\" style=\"font-size: 1em; white-space: pre\">" + this.Label;
		if(this.Controls.length > 0) {html += this.appendControls()} //Add the controls if they are desired
		html += "</span> "; //Single whitespace between each header (in case another one follows)
		return html;
	}
	appendControls() { //Prepare the html of the controls usable to edit this tab
		let html = "";
		this.Controls.forEach(function(c) {
			let o = {Type: c, Active: this.Active, Space: true, Attributes:[{Name: "tabKey", Value: this.Key}, {Name: "tabAction", Value: c}]};
			if(!this.Disabled) {
				switch(c) {
					case "Setting": o.Title = "Click here to see the settings for this tab"; break;
					case "Edit": o.Title = "Click here to edit the tab"; break;
					case "Move": o.Title = "Click here to move this tab at the desired position"; break;
					case "Delete": o.Title = "Click here to delete this tab"; break;
				}
			}
			html += LinkCtrl.icon(o);
		}, this);
		return html;
	}
	initContent() { //Return the html for the contents of this tab
		let html = "";
		let style = ""; //Hide content of inactive tabs
		if(!this.Parent.Stack) {style += "; float: left"}
		html += "<div id=\"" + this.Anchors.Content + "\" class=\"LinkCtrl_TabPanel\" style=\"display: block" + style + "\">";
		html += this.initContentInternal();
		html += "</div>";
		return html;
	}
	initContentInternal() {
		let c = this.Content;
		if(c === undefined) {return ""}
		switch(c.Type) {
			case "HTML": return c.Value; //The content is plain HTML
			case "DOM": //The content is written in the DOM, at the provided ID
				if(c.Value) { //If the ID exists
					let dom = GetId(c.Value); //Get the DOM element
					if(dom !== null && dom !== undefined) { //If this indeed exists
						let html = dom.innerHTML; //copy the content
						this.Content = {Type: "HTML", Value: html} //Update the tab object with its new content
						dom.remove(); //Bye bye
						return html; //Output the content
					}
				}
				return ""; //Nothing was found at the given location
			default: return ""; //Unknown Type requested
		}
	}
	updateState(I) { //Update the state of this tab, based on current properties. This fully updates the header, and the content will be made visible or hidden
		let header = GetId(this.Anchors.Header); //Update the state of the header
		if(!(header === null || header === undefined)) { //If the html exists
			header.className = this.classHeader(); //Update the class of the header
			if(this.Controls.length > 0) { //If some control exists, they also need to have their state updated. This includes inactivating the title for disabled panels, so the easiest is to prepare the html anew
				header.innerHTML = this.Label + "&nbsp;" + this.appendControls();
			}
			else {
				header.innerHTML = this.Label; //If the panel has changed name, this should also be reflected here
			}
		}
		if(I && I.HeaderOnly) {return}
		this.animate(I);
	}
	updateContent(C) { //Update the content of the Tab with the new one provided, both at the object and html level. This will remove any previous content!
		this.Content = C;
		let content = GetId(this.Anchors.Content);
		if(!(content === null || content === undefined)) { //If the html exists
			content.innerHTML = this.initContentInternal();
		}
	}
	set(as, I) { //Set the tab at the desired state(s). Multiple Keywords, space delimited, can be provided
		let keywords = as.split(" "); //Array of keywords
		keywords.forEach(function(k) { //Loop the keywords
			switch(k) {
				case "Active":
					this.Active = true;
					break;
				case "Resting":
					this.Active = false;
					break;
				case "Disabled":
					this.Disabled = true;
					break;
				case "Enabled":
					this.Disabled = false;
					break;
				default: break;
			}
		}, this);
		this.updateState(I);
		return this;
	}
	fold() { //Hide or reveal the content for this panel, updating the state of the header
		this.Active = !this.Active; //Reverse the state, then animate the change
		this.updateState();
	}
	delete() {
		let header = GetId(this.Anchors.Header);
		if(!(header === null || header === undefined)) {//Remove the html if it exists
			if(this.Parent.Layout == "Vertical") {header.nextElementSibling.remove()}
			header.remove()
		} 
		let content = GetId(this.Anchors.Content); 
		if(!(content === null || content === undefined)) {content.remove()} //Remove the html if it exists
	}
	rename(name) { //Update the name of the tab using the new text provided
		this.Label = name; //Update property
		this.updateState({HeaderOnly: true}); //Update display of the text only
	}
	animate(I) {
		let time = this.Parent.AnimDuration;
		if(I && I.NoAnimation) {time = 1} //Minimum duration to make it (almost) instant
		let content = GetId(this.Anchors.Content); //Animate the content based on its Active property
		if(!(content === null || content === undefined)) { //If the html exists
			this.Animate = true; //Prevent further interactions for this panel during the animation
			if(this.Active) { //Make the content visible
				content.style.display = "block";
				let anim = content.animate(this.getAnimTransform("open"), {duration: time, iterations: 1, fill: "forwards"});
				anim.onfinish = function() { //If the content of the tab has been changed programmatically, the height/width must be updated to accomodate the new contents
					let ResizeAnim = content.animate(this.getAnimTransform("resize"), {duration: 1, iterations: 1, fill: "forwards"});
					ResizeAnim.onfinish = function() { //Update properties for smooth opening next time
						this.Height = content.clientHeight + "px"; //log the current height and width
						this.Width = content.clientWidth + "px";
						if(this.Parent.AutoScroll) {
							content.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
						}
						this.Animate = false;
					}.bind(this);
				}.bind(this);
			}
			else { ////Make the content hidden
				this.Height = content.clientHeight + "px"; //log the current height and width
				this.Width = content.clientWidth + "px";
				let anim = content.animate(this.getAnimTransform("close"), {duration: time, iterations: 1, fill: "forwards"});
				anim.onfinish = function() {
					content.style.display = "none";
					this.Animate = false;
				}.bind(this);
			}
		}
	}
	getAnimTransform(state) { //Return the animation transform to use while animating this panel
		switch(state) {
			case "open":
				let from = {transform: "translateY(-" + this.Height + ")", height: 0, opacity: 0};
				let to = {transform: "translateY(0)", height: this.Height, opacity: 1};
				if(this.Parent.Layout == "Horizontal" && this.Parent.Multiple == true) { //Specific case
					from = {transform: "translateY(-" + this.Height + ")", transform: "translateX(-" + this.Width + ")", height: 0, width: 0, opacity: 0};
					to = {transform: "translateY(0)", transform: "translateX(0)", height: this.Height, width: this.Width, opacity: 1};
				}
				return [from, to];
			case "close": 
				if(this.Parent.Layout == "Horizontal" && this.Parent.Multiple == true) { //Specific case
					return [
						{transform: "translateY(0)", transform: "translateX(0)", height: this.Height, width: this.Width, opacity: 1},
						{transform: "translateY(-" + this.Height + ")", transform: "translateX(-" + this.Width + ")", height: 0, width: 0, opacity: 0}
					];
				}
				return [
					{transform: "translateY(0)", height: this.Height, opacity: 1},
					{transform: "translateY(-" + this.Height + ")", height: 0, opacity: 0}
				];
			case "resize":
				if(this.Parent.Layout == "Horizontal" && this.Parent.Multiple == true) { //Specific case
					return [{height: this.Height, width: this.Width}, {height: "auto", width: "auto"}];
				}
				else {
					return [{height: this.Height}, {height: "auto"}];
				}
			default: return [];
		}
	}
}