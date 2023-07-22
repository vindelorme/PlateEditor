//************************************************************************************************************************************
// REPORT_GROUPED object - A report object to display and navigate results from aggregated areas and concentrations, as 2-entry tables
//************************************************************************************************************************************
class Report_Grouped extends Report {
	constructor(o, I) {
		super(o, I);
		let source = window.opener.Grouped;
		this.RootID = "Form_AddData";
		this.AvailableID = this.RootID + "_Available";
		this.SelectedID = this.RootID + "_Selected";
		this.ColumnOnly = I.ColumnOnly;
		this.Areas = source.Areas.map(function(a, i) { //Slightly update the incoming objects with additional properties
			a.Available = true; //Mark all items as available
			a.Category = "Areas"; //Add some properties to facilitate interaction during the drag-and-drop operations
			a.OriginID = this.AvailableID + "_Areas";
			a.OriginIndex = i;
			a.Values = [{Name: a.Name, Value: a.Name, Tags: a.Tags}];
			return a;
		}, this); 
		this.Ranges = source.Ranges.map(function(r, i) {
			r.Available = true;
			r.Category = "Ranges";
			r.OriginID = this.AvailableID + "_Ranges";
			r.OriginIndex = i;
			return r;
		}, this);
		this.Concentrations = source.Conc.map(function(c, i) {
			c.Available = true;
			c.Category = "Concentrations";
			c.OriginID = this.AvailableID + "_Concentrations";
			c.OriginIndex = i;
			return c;
		}, this);
		this.Menu.addTabs([ //Prepare the menu
			{Label: "Data", SetActive: true,
				Content: {
					Type: "HTML",
					Value: "<div id=\"Report_Ready\"><span class=\"Warning\">Resolving definitions, please wait...</span></div>" +
						"<div id=\"Report_Alert\" class=\"Warning\"></div>" +
						"<fieldset id=\"AddRowCol\"><div id=\"Data_Options\"></div></fieldset>",
				}
			},
		]);
		this.UI.Selected = { //Object to hold the selected data
			init: function() {}, //dummy function to allow this object to pass the initialization step without error
			Rows: [[], []],
			Cols: [[], []],
		};
		if(this.ColumnOnly) { //Column Mode: use only the column aggregation
			this.UI.DataView = LinkCtrl.new("Select", {ID: "Data_Options", Default: 0, Label: "Aggregation", List: ["Column"], Preserve: true,
				Title: "Multiple values will be displayed arrayed in a single column"
			});
			let b = LinkCtrl.button({Label: "Compute all Plates", Title: "Click here to compute the statistical summaries for all plates", Click: function() {this.statsAllPlates()}.bind(this)});
			GetId(this.Anchors.PlateDoAll).append(b);
		}
		else { //Grouped cases, more flexible
			this.UI.DataView = LinkCtrl.new("Select", {ID: "Data_Options", Default: 0, Label: "Aggregation", List: ["Avg, SD, N", "Average", "Column", "Row"], Preserve: true, Change: this.update.bind(this),
				Title: "Indicates how multiple values are displayed in the grouped table: arrayed in a single column or in consecutive rows; show only the average; show the average, standard deviation and number of samples"
			});
		}
		let buttons = LinkCtrl.buttonBar([
			{Label: "Select Data", Title: "Click here to add rows and columns of data to the summary table", Click: function() {this.addData()}.bind(this)},
		]);
		GetId("AddRowCol").prepend(buttons);
		this.prepareDefinition();
		Report_Grouped.msg_welcome(); //Welcome message
		return this;
	}
	//Static Methods
	static info() {
		return "<p class=\"Note\">Click on the 'Select Data' button located in the 'Data' panel (left menu) to add rows and columns of data</p>";
	}
	static msg_welcome() { //Display the welcome message in the output
		GetId("Output").innerHTML = this.info();
	}
	static msg_pleaseWait() {
		GetId("Report_Alert").innerHTML = "<p class=\"Error\">Please Wait until the Range data are fully resolved!<p>";
	}
	static msg_noCol() {
		GetId("Report_Alert").innerHTML = "<p class=\"Error\">Please Select at least one column of data!<p>";
	}
	static msg_clear() {
		GetId("Report_Alert").innerHTML = "";
	}
	static dragStart(e, I) { //Start dragging the data
		e.dataTransfer.setData("text/plain", e.target.id);
		this.Moving = {Item: Analyzer.Report[I.Category][I.OriginIndex], Origin: I.OriginID} //Log the object corresponding to the item moved;
	}
	static dragOver(e) { //Drag over the dropZone
		e.preventDefault();
	}
	static dragEnter(e) { //Entering the drop zone
		e.preventDefault();
		let t = e.target;
		if(t.classList.contains("Droppable") == false) {t = t.parentElement} //If the drop targets an element within the dropzone, go back one level
		let active = document.getElementsByClassName("Droppable Droppable_Hover"); //When the drag is done too rapidly, the dragenter event may fire twice, and the leave fires later for the 1st element
		let l = active.length; //Here we check for elements already having the class
		if(l>0) { //If some elements already have the class, stripped them from it
			for(let i=0;i<l;i++) {active[i].className = "Droppable"}
		}
		t.className = "Droppable Droppable_Hover"; //Change the class
	}
	static dragLeave(e) { //Leaving the drop zone
		e.preventDefault();
		let t = e.target; //The element that we are leaving
		if(t.classList.contains("Droppable") == false) {t = t.parentElement} //If the leave targets an element within the dropzone, go back one level
		let r = e.relatedTarget; //For a dragleave event, this points to the element the pointing device entered to
		if(t.classList.contains("Droppable_Hover") == true && r.classList.contains("SmallTitle") == false && r.classList.contains("Selectable_Row") == false && r.classList.contains("Droppable_Hover") == false) { //Should trigger when leaving an active dropzone, without entering an element within a dropzone, or the same active dropzone itself
			t.className = "Droppable"; //Remove the class
		}
	}
	static drop(e, I) { //Drop on the dropZone
		e.preventDefault();
		if(this.Moving === undefined) {return} //Something wrong
		let source = GetId(e.dataTransfer.getData("text/plain"));
		source.remove(); //Remove the element from the menu
		this.Moving.Item.Available = false; //Log the object as unavailable
		this.Moving.Item.NewDrop = I; //Log the dropzone of this element
		this.Moving = undefined; //Release the log
		Analyzer.Report.updateSelectedData({Action: "Drop"}); //This will redraw the drop table based on the action performed
	}
	static dropDelete(e) { //Drop on the delete dropZone
		e.preventDefault();
		if(this.Moving === undefined) {return} //Something wrong
		this.Moving.Item.Available = true; //Make it available again
		this.Moving.Item.NewDrop = {Type: "Removed"}; //Release the drop location
		let source = GetId(e.dataTransfer.getData("text/plain"));
		GetId(this.Moving.Origin).appendChild(source); //Move source back to the main menu
		this.Moving = undefined; //Release the log
		Analyzer.Report.updateSelectedData({Action: "Drop"}); //This will redraw the drop table based on the action performed
	}
	//Getter, Setter
	get HasChanged() { //This getter check whether the data selected have changed compared to last time it was logged
		let change = true;
		let string = JSON.stringify(this.UI.Selected, ["Rows", "Cols", "Name"]); //Compare the object equality as a string. Keep only essential properties to make it easier
		if(this.Selection == string) {change = false} //Has not changed
		this.Selection = string;
		return change;
	}
	//Methods
	do() {
		if(this.Ready) { //Names were already resolved, proceed
			this.compute();
		}
		else { //First resolve the names
			this.resolveAllNames().then(function() { //Start by recovering all definitions names
				this.Ready = true;
				GetId("Report_Ready").remove();
			}.bind(this));
		}
		return this;
	}
	addData() { //Addition of rows/cols into the data tables
		let id = this.RootID;
		let selected = this.SelectedID;
		let available = this.AvailableID;
		let availableMenu = new TabControl({
			ID: this.AvailableID,
			Layout: "Menu",
			Tabs: [
				{Label: "Areas", Active: true, Content: {Type: "HTML", Value: this.available("Areas", available)} },
				{Label: "Ranges", Content: {Type: "HTML", Value: this.available("Ranges", available)} },
				{Label: "Concentrations", Content: {Type: "HTML", Value: this.available("Concentrations", available)} },
			]
		});
		let html = "";
		html += "<fieldset style=\"width:350px; overflow: auto; float: left\"><legend>Data available</legend><p class=\"Note\">Drag and drop the data from here to the table on the right panel</p><div id=\"" + available + "\"></div></fieldset>";
		html += "<fieldset style=\"margin-left: 400px;\"><legend>Selected</legend><div id=\"" + selected + "\"></div></fieldset>";
		Form.open({
			ID: this.RootID,
			Size: 900,
			Title: "Add Data",
			HTML: html,
			Buttons: [
				{Label: "Ok", Click: function() {
					this.updateSelectedData({Action: "Ok"});
					Form.close(id);
				}.bind(this)},
				{Label: "Cancel", Click: function() {
					this.updateSelectedData({Action: "Cancel"}); //Cancel flag
					Form.close(id);
				}.bind(this)}
			],
			onInit: function() {
				availableMenu.init();
				GetId(selected).innerHTML = this.selected();
			}.bind(this),
			onCancel: function() {
				this.updateSelectedData({Action: "Cancel"}); //Cancel flag
			}.bind(this),
		});
	}
	htmlForItem(item) { //Prepare an html string to represent the item passed, as a draggable element
		let html = "";
		let toDisplay = item.Name;
		if(item.Unit) {toDisplay = item.Unit + " (" + item.Values.length + " values)"}
		if(item.Type == "Range") {toDisplay += " (" + item.Values.length + " items)"}
		html += "<div id=\"" + item.OriginID + "_" + item.OriginIndex + "\" draggable=\"true\" ondragstart=\"Report_Grouped.dragStart(event, {Category: '" + item.Category + "', OriginID: '" + item.OriginID + "', OriginIndex: '" + item.OriginIndex + "'})\" class=\"Selectable_Row\"";
		html += ">" + toDisplay + "</div>";
		return html;
	}
	available(category, sourceID) { //Create an html list of the items available for the desired category
		let id = sourceID + "_" + category;
		let html = "<div id=\"" + id + "\" style=\"border-top: 1px solid silver\">";
		let source = this[category];
		source.forEach(function(s) {
			if(s.Available) {html += this.htmlForItem(s)}
		}, this);
		html += "</div>";
		return html;
	}
	selected(I) { //Create the html of the drop zone for draggable items populated with the previously logged selection (UI.Selected) or from the selection object passed
		let log = I; //Use the incoming object...
		if(I === undefined) {log = this.UI.Selected} //... Or the logged selection if not available
		let html = "<table>";
		html += "<tr> <td style=\"width: 1.1em\"></td> <td></td> <td style=\"text-align: center\"><div style=\width: 194px;\"><b>Columns</b></div>"; //First row start
		html += "<div class=\"Droppable\" ondrop=\"Report_Grouped.drop(event, {Type: 'Cols', Level: 2})\" ondragover=\"Report_Grouped.dragOver(event)\" ondragenter=\"Report_Grouped.dragEnter(event)\" ondragleave=\"Report_Grouped.dragLeave(event)\" style=\" "; //Level 2 Col drop
		if(log.Cols[0].length == 0) {html += " display: none;"} //Hide the level 2 if nothing present in level 1
		if(this.ColumnOnly) {html += " float: none;"} //Remove the float to keep the two levels on top of each others
		html += "\"><p class=\"SmallTitle\" style=\"color: darkred\">Level 2</p>"; 
		log.Cols[1].forEach(function(item) {html += this.htmlForItem(item)}, this); //Add the items that were logged at this location
		html += "</div>";
		html += "<div class=\"Droppable\" ondrop=\"Report_Grouped.drop(event, {Type: 'Cols', Level: 1})\" ondragover=\"Report_Grouped.dragOver(event)\" ondragenter=\"Report_Grouped.dragEnter(event)\" ondragleave=\"Report_Grouped.dragLeave(event)\""; //Level 1 Col drop
		html+= "style=\" \"><p class=\"SmallTitle\" style=\"color: blue\">Level 1</p>"; 
		log.Cols[0].forEach(function(item) {html += this.htmlForItem(item)}, this); //Add the items that were logged at this location
		html += "</div>";
		html += "</td> </tr>"; //End Second Row
		html += "<tr>"; //Start Second Row
		if(this.ColumnOnly) {html += "<td></td> <td>"} //Leave two blocks empty for column-only mode
		else {
			html += "<td style=\"writing-mode: sideways-lr; width: 1.1em;\"><b>Rows</b></div></td><td>"; //Row legend
			html += "<div class=\"Droppable\" ondrop=\"Report_Grouped.drop(event, {Type: 'Rows', Level: 2})\" ondragover=\"Report_Grouped.dragOver(event)\" ondragenter=\"Report_Grouped.dragEnter(event)\" ondragleave=\"Report_Grouped.dragLeave(event)\" style=\" "; //Level 2 Row drop
			if(log.Rows[0].length == 0) {html += " display: none"} //Hide the level 2 if nothing present in level 1
			html += "\"><p class=\"SmallTitle\" style=\"color: darkred\">Level 2</p>";
			log.Rows[1].forEach(function(item) {html += this.htmlForItem(item)}, this); //Add the items that were logged at this location
			html += "</div>";
			html += "<div class=\"Droppable\" ondrop=\"Report_Grouped.drop(event, {Type: 'Rows', Level: 1})\" ondragover=\"Report_Grouped.dragOver(event)\" ondragenter=\"Report_Grouped.dragEnter(event)\" ondragleave=\"Report_Grouped.dragLeave(event)\""; //Level 1 Row drop
			html += "style=\" \"><p class=\"SmallTitle\" style=\"color: blue\">Level 1</p>"; 
			log.Rows[0].forEach(function(item) {html += this.htmlForItem(item)}, this); //Add the items that were logged at this location
			html += "</div>";
		}
		html += "</td><td ondrop=\"Report_Grouped.dropDelete(event)\" ondragover=\"Report_Grouped.dragOver(event)\" style=\"text-align: center\">";
		html += "<div class=\"LinkCtrl_Icon LinkCtrl_IconBig\" style=\"background-position: -200px 0px; opacity: 20%\"></div>"; //Trash bin icon
		html += "<p class=\"Note\" >Drop here to remove</p></td> </tr>"; //Last cell //style=\"text-align: center\"
		html += "</table>";
		return html;
	}
	updateSelectedData(I) { //Update the UI.Selected object based on the Drop property of the Areas/Ranges/Concentrations object
		if(I === undefined) {return}
		let source = [this.Areas, this.Ranges, this.Concentrations]; //Need to process all three
		let selected = {Rows: [[], []], Cols: [[], []]}; //Initialize empty object for logging
		if(I.Action == "Cancel") { //In this case, ignore the changes: NewDrop properties are deleted and previous Drop don't change
			source.forEach(function(cat) { //For each category
				cat.forEach(function(item) { //For each item in a category
					item.NewDrop = undefined; //Ignore modifications made
					if(item.Drop !== undefined) {item.Available = false} //Update the status, should remain available only if it has no drop defined
					else {item.Available = true}
				});
			});
		}
		if(I.Action == "Ok") { //Ok scenario, valid the changes by switching the NewDrop as Drop and rebuild the UI.Selected object
			source.forEach(function(cat) { //For each category
				cat.forEach(function(item) { //For each item in a category
					if(item.NewDrop !== undefined) { //Items that were moved need update
						if(item.NewDrop.Type == "Removed") { //In this case, the drop should be destroyed
							item.Drop = undefined;
						}
						else { //Otherwise proceed normally
							item.Drop = item.NewDrop;
						}
						item.NewDrop = undefined; //Reset the change
					}
					if(item.Drop !== undefined) { //If a Drop location remains here, log it at the rignt location
						selected[item.Drop.Type][(item.Drop.Level-1)].push(item);
					}
				});
			});
			this.UI.Selected = selected; //Update the Selected object
			this.compute(); //Compute the tables
		}
		if(I.Action == "Drop") { //A new drop occured: prepare an updated selected object, clean it and use it to prepare the updated drop table
			source.forEach(function(cat) { //For each category
				cat.forEach(function(item) { //For each item in a category
					if(item.NewDrop !== undefined && item.NewDrop.Type != "Removed") { //Item was moved, but not to the trashbin, log it at its new location
						selected[item.NewDrop.Type][(item.NewDrop.Level-1)].push(item);
					}
					else { //For other items, use their Drop location if they are not labelled as removed
						if(item.Drop !== undefined && (item.NewDrop === undefined || item.NewDrop.Type != "Removed")) { //If a Drop location remains here, log it at the rignt location
							selected[item.Drop.Type][(item.Drop.Level-1)].push(item);
						}
					}
				});
			});
			selected = this.cleanSelected(selected); //Clean the selected object
			GetId(this.SelectedID).innerHTML = this.selected(selected); //Redraw the droptable
		}
		return this;
	}
	cleanSelected(I) { //Clean the selected object provided by removing any useless level 2
		[I.Rows, I.Cols].forEach(function(l) { //Process both the array of Rows and Cols
			if(l[0].length == 0) { //If the first level is empty, check that the second level is empty too, or move its content back to the first level
				if(l[1].length > 0) { //There are stuff here that need to be moved
					l[0] = l[1]; //Move them to level 1
					l[0].forEach(function(item) { //Update the Drop/NewDrop location to match
						if(item.NewDrop !== undefined) {item.NewDrop.Level = 1}
						if(item.Drop !== undefined) {item.Drop.Level = 1}
					}); 
					l[1] = []; //Free level 2
				}
			}
		});
		return I;
	}	
	resolveAllNames() { //Resolve the names for all the definitions available
		let promises = [];
		return new Promise(function(resolve) { //Return a promise that will resolve when the parsing is completed
			this.Ranges.forEach(function(r, i) { //For each definition, start the fetching process
				let d = r.Definition;
				if(d !== undefined) {
					promises.push(this.resolveNames(d, i));
				}
				else {promises.push(undefined)} //Push something to maintain index synchronization with Ranges and Definitions arrays
			}, this);
			Promise.all(promises).then(function(names) { //When all the fetching is done, update the object property with the resolved names
				this.ResolvedNames = names;
				resolve();
			}.bind(this));
		}.bind(this));
	}
	resolveNames(d, defIndex) { //Resolve the names for the definition passed
		let a = d.Area;
		let factor = a.MaxRange;
		let args = {
			Plate: this.UI["Definition_" + defIndex].Selected, //Name of the plate where to look the data
			Factor: factor, //This factor is necessary to find the data in case no well/plate mapping are available
			Default: "", //Default fallback if the element needed is outside the list
			AreaName: a.Name, //To complete generic items
			Column: d.Mapping[Mapper.definition().Name], //Index of the column containing the data to extract
			RangeIndexBase0: a.MaxRange, //Providing the maxRange ensures that the array is filled with generic items if there is not enough definitions available in the file
			FindAll: true,
		}
		return new Promise(function(resolve) {
			d.Mapper.find(d, args).then(function(array) {
				let mode = Mapper.modeWellPlate(d.Mapping);
				switch(mode) { //For mapping without well location, the array returned is the list of object available, can be returned as is. Otherwise, should convert the plate array to a flat array of item
					case "Plate": //FALL-THROUGH
					case "Direct": resolve(array); break;
					case "Well": //FALL-THROUGH
					case "PlateWell": 
						let items = [];
						this.Ranges[defIndex].Values.forEach(function(v) { //Look at the individual items for this range
							items.push(array[v.Tags[0]]); //Get the index of the first well tagged for this rangeItem, and log its definition. We enforce here that other wells for this RangeItem share the same definition, even if this is wrong
						});
						resolve(items);
					break;
				}
			}.bind(this));
		}.bind(this));
	}
	isReady(rows, cols) {
		if(cols[0].length == 0) {Report_Grouped.msg_noCol(); return false} //Missing column
		if(this.Ready != true) {Report_Grouped.msg_pleaseWait(); return false} //No ready
		Report_Grouped.msg_clear(); //No more message needed
		return true;
	}
	compute() { //Do the job
		let rows = this.UI.Selected.Rows;
		let cols = this.UI.Selected.Cols;
		if(this.isReady(rows, cols) == false) {return this};
		let plate = this.SelectedPlate;
		this.getValues(plate).then(function(data) {
			data.Params.forEach(function(p, i) {
				let section = Report.getBloc(this, Report.blocName(p)).getSection("Values", {Type: "Single"});
				let json = Analyzer.encodeJSON(rows, cols, data.Values[i]); //Get a JSON object as data
				section.Data = JSON.stringify(json); //Store it as a string
				if(this.ColumnOnly && this.Result.PlatesID.length > 1) { //If there are more than one plate in the result file, also create/update the Plate summary table (only for column reports)
				//json.StatRows = true; //Activate the statistical rows at the end of the table	
				let summary = Report.getBloc(this, Report.blocName(p)).getSection("Plate Summary", {Type: "StatsTable", Summary: true, JSON: json, Changed: this.HasChanged});
					summary.addRow(json, plate);
				}
			}, this);
			this.update(); //Update the sections
		}.bind(this));
		return this;
	}
	async statsAllPlates() { //Compute data for all plates, one after the other
		let rows = this.UI.Selected.Rows;
		let cols = this.UI.Selected.Cols;
		if(this.isReady(rows, cols) == false) {return this};
		this.Cancel = false;
		let plates = this.Result.PlatesID;
		Report.lock(this, plates.length); //Lock the report and start
		let plateCounter = Report.plateIterator(plates); //A generator to loop over the plates
		let current = plateCounter.next();
		let running = 0;
		while(current.done == false && this.Cancel == false) { //Do this until the plate counter is exhausted or the user cancel the action
			let currentPlate = current.value; //Current plate to analyze
			if(Report.hasData(this, currentPlate) == false) { //There is no need to parse if the plate has already been computed
				let data = await this.getValues(currentPlate);
				data.Params.forEach(function(p, i) {
					let section = Report.getBloc(this, Report.blocName(p)).getSection("Values", {Type: "Single"});
					let json = Analyzer.encodeJSON(rows, cols, data.Values[i]); //Get a JSON object as data
					section.Data = JSON.stringify(json); //Store it as a string
					let summary = Report.getBloc(this, Report.blocName(p)).getSection("Plate Summary", {Type: "StatsTable", Summary: true, JSON: json, Changed: false});
					summary.addRow(json, currentPlate);
				}, this);
				this.update(); //Update the sections
			}
			this.UI.Plate.setValue(running); //Ensures that the control is set at the same value as the last computed plate
			this.pairStatus(running); //Also adjust the pairing info
			current = plateCounter.next();
			running++;
			Report.plateCount(running + 1);
		}
		Report.unlock();
		return this;
	}
}