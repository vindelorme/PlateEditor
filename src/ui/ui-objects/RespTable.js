//***********************************************************
// RESPTABLE object - Responsive Tables object representation
//***********************************************************
class RespTable {
	constructor(I) {
		this.ID = I.ID; //ID of the html element containing the control
		this.Array = (I.Array || []); //The array of array/object in use to populate the table, and that will be controlled internally
		this.Multiple = (I.Multiple || false); //Whether multiple selection is allowed on this table or not. This will also enable unselection and possibly no selection at all
		this.Headers = I.Headers; //An array of headers for the columns
		this.Fields = I.Fields; //An array of fields, corresponding to attribute names to use from the objects within this Array. These will also be used as default headers if none were provided
		this.RowNumbers = I.RowNumbers; //Whether the table has a first column for row numbering. If true, this index will be added and maintained internally
		this.FullWidth = I.FullWidth; //Whether the table should occupy the full width of its parent container
		this.MaxHeight = (I.MaxHeight || 250); //Maximum height (in px) of the table bloc
		this.Delegate = I.Delegate; //An object used to delegate click events to a function (Format: {Function: function(event) {}, On: "DIV", Cancel: false}), Aplies on the node type provided. Cancel selection event if needed
		this.onSelect = I.onSelect; //What to do after item selection. The function will receive the selected items, the previously selected items, as well as their indices; as arrays (empty array if nothing is selected)
		this.onDelete = I.onDelete; // What to do on deletion. The function will receive the deleted item
		this.onUpdate = I.onUpdate; //What to do after the table html has been updated. The function will receive an object {Action: ""} indicating the action leading to the update
		this.Preserve = I.Preserve; //Keep previous content in the hosting ID or not
		this.NoControls = I.NoControls; //If true, the table should not show its control at the top
		this.Me = this.ID + "_RespTable"; //ID of the html table
		return this;
	}
	//Getter
	get Length() { //Return the current number of data rows
		return this.Array.length;
	}
	get SelectedIndices() { //Return an array containing the indices of the selected elements
		let indices = [];
		this.Array.forEach(function(r, i) {
			if(r.Selected) {indices.push(i)}
		});
		return indices;
	}
	get Selected() { //Return an array containing the objects (elements within Array) at the selected indices
		return this.Array.filter(function(a) {return a.Selected});
	}
	//Methods
	init() { //Initialize the table
		let container = GetId(this.ID);
		if(container === null || container === undefined) {return this} //Check
		let html = "<div";
		if(this.MaxHeight > 0) {html += " style=\"max-height: " + this.MaxHeight + "px; overflow: auto\""}
		html += "><table id=\"" + this.Me + "\" class=\"RespTable\"";
		if(this.FullWidth) {html += " style=\"width: 100%\""}
		html += ">";
		html += this.html(); //The html of the table
		html += "</table></div>";
		if(this.Preserve) {container.insertAdjacentHTML("beforeend", html)} //Append to prior contents
		else {container.innerHTML = html} //Erase previous contents
		this.bindEvents(); //Attach the selection event
		if(!this.NoControls) { //Show controls for the table
			let bar = LinkCtrl.buttonBar([ //To manipulate the inputs
				{Label: "", Title: "Remove all items", Icon: {Type: "Reset"}, Click: function() {this.confirmForm("RESET", this.empty.bind(this))}.bind(this)},
				{Label: "", Title: "Remove selected item", Icon: {Type: "Delete"}, Click: function() {this.confirmForm("DELETE", this.removeRows.bind(this), this.SelectedIndices)}.bind(this)},
				{Label: "", Title: "Move selected item up", Icon: {Type: "Up"}, Click: function() {this.up()}.bind(this)},
				{Label: "", Title: "Move selected item down", Icon: {Type: "Down"}, Click: function() {this.down()}.bind(this)},
				{Label: "", Title: "Move selected item to the top", Icon: {Type: "Top"}, Click: function() {this.top()}.bind(this)},
				{Label: "", Title: "Move selected item to the bottom", Icon: {Type: "Bottom"}, Click: function() {this.bottom()}.bind(this)},
			]);
			container.prepend(bar); //Buttons to control the input table
		}
		return this;
	}
	bindEvents() { //Attach events to the table
		GetId(this.Me).addEventListener("click", function(e) {
			let OldSelection = this.Selected; //Selected elements at the moment of the click
			let OldIndices = this.SelectedIndices;
			let target = e.target;
			if(this.Delegate) {
				if(target.nodeName == this.Delegate.On) {this.Delegate.Function(e)}
				if(this.Delegate.Cancel) {return} //Prevent downstream execution of row selection
			}
			if(target.nodeName == "TH") {return}
			if(target.nodeName == "TD") {var index = target.parentElement.rowIndex - 1}
			else {var index = target.parentElement.parentElement.rowIndex - 1} //It is assumed here that climbing back only one level is sufficient to reach the td
			if(this.Multiple) {this.Array[index].Selected = !this.Array[index].Selected}
			else {
				this.Array.forEach(function(r, i) {
					if(i == index) {r.Selected = true}
					else {r.Selected = false}
				});
			}
			this.update({Action: "Select"});
			if(this.onSelect) {this.onSelect(this.Selected, OldSelection, this.SelectedIndices, OldIndices)}
		}.bind(this));
	}
	html() { //Create the html of the table using the internal Array as data source
		let html = this.headers(); //Prepare the headers
		if(this.Array === undefined) {return html}
		this.Array.forEach(function(O, i) { //Loop the internal array to create the rows
			html += "<tr class=\"RespTable_Row"; //Each row will have a selectable behavior through this class
			if(O.Selected) { //If the option is provided, chech within the array and add the selected class as required
				html += " RespTable_Selected";
			}
			if(O.Status && O.Status == "Error") {html += " RespTable_Error"}
			html += "\">";
			if(this.RowNumbers) {html += "<td>" + (i + 1) + "</td>"}
			let row = this.extractData(O); //Extract data from the object
			row.forEach(function(cell) { //Add the content for each cell
				html += "<td>" + cell + "</td>";
			});
			html += "</tr>";
		}, this);
		return html;
	}
	headers() { //Prepare the headers for the array
		if(this.Headers) {var headers = this.Headers} //Headers were directly provided
		else {
			if(this.Fields) {var headers = this.Fields} //Headers are fields from object
			else {return ""} //No headers available, leave
		}
		var html = "<tr>"; //Start a header row
		if(this.RowNumbers) {html += "<th>#</th>"}
		headers.forEach(function(h) { //Add the provided headers
			html += "<th>" + h + "</th>";
		});
		html += "</tr>";
		return html;
	}
	extractData(O) { //Extract the desired data from the input object and return them as a readable array
		if(this.Fields) { //In this case, an object is expected, so lookup for the attribute name supplied and returns the value
			var out = [];
			var keys = Object.keys(O);
			var values = Object.values(O);
			this.Fields.forEach(function(f) {
				let index = keys.findIndex(function(k) {return(k == f)});
				let val = values[index];
				if(index > -1) {
					if(f == "Color" || f == "color") {out.push("<span style=\"background-color: " + val + "; border: 1px solid black\">&nbsp;&nbsp;&nbsp;&nbsp;</span>")} //Colors get special treatment
					else {
						if(typeof(val) == "boolean") { //Booleans are outputed with a symbol
							if(val) {out.push("<span style=\"color: darkgreen; font-weight: bold;\">&check;</span>")}
							else {out.push("<span style=\"color: tomato; font-weight: bold;\">&cross;</span>")}
						}
						else {out.push(val)}
					}
				}
				else {out.push("")} //Ensure correct ordering in case the field is not found
			});
			return out;
		}
		else {return O} //In this case, an array is expected so it can be returned as is
	}
	update(I) { //Update the html table
		let table = GetId(this.Me);
		if(table === null || table === undefined) {return this} //Check
		table.innerHTML = this.html(); //Replace html
		if(this.onUpdate) (this.onUpdate(I));
		return this;
	}
	addRow(O) { //Add a row to the table with a new cell per element in array
		this.Array.push(O); //Update internal array
		this.update({Action: "Add Row"}); //Update the table
		return O;
	}
	removeRows(rows) { //Remove the rows with indices given in the provided array rows
		let l = rows.length;
		if(l == 0) {return this} //No items
		let newArray = this.Array.filter(function(a, i) { //Filter the array for elements with indices not matching the ones provided
			let found = rows.includes(i); //Will return true if the index was found
			if(found) { //apply the onDelete function on the element
				if(this.onDelete) {this.onDelete(a)}
			}
			return !found; //Return false to filter out the element
		}, this);
		this.Array = newArray; //Update internal array
		this.update({Action: "Remove Row"}); //Update the table
		return this;
	}
	up() { //Move selected row up. Will do nothing if multiple rows are selected
		let l = this.SelectedIndices.length;
		if(l == 0 || l > 1) {return this}
		let s = this.SelectedIndices[0]; //Index of the row to move up
		if(s == 0) {return this} //There is nothing to do if this row is already at the top
		let temp = this.Array[s-1]; //Keep a copy of the element above
		this.Array[s-1] = this.Array[s]; //Replace the element above by new row
		this.Array[s] = temp; //Replace the element by row above
		this.update({Action: "Up"});
		return this;
	}
	down() { //Move selected row down. Will do nothing if multiple rows are selected
		let l = this.SelectedIndices.length;
		if(l == 0 || l > 1) {return this}
		let s = this.SelectedIndices[0]; //Index of the row to move down);
		if(s == (this.Length - 1)) {return this} //There is nothing to do if this row is already at the bottom
		let temp = this.Array[s+1]; //Keep a copy of the element above
		this.Array[s+1] = this.Array[s]; //Replace the element above by new row
		this.Array[s] = temp; //Replace the element by row above
		this.update({Action: "Down"});
		return this;
	}
	top() { //Move selected row to the top
		let l = this.SelectedIndices.length;
		if(l == 0 || l > 1) {return this}
		let s = this.SelectedIndices[0]; //Index of the row to move
		if(s == 0) {return this} //There is nothing to do if this row is already at the top
		let temp = this.Array.splice(s, 1);
		this.Array.unshift(temp[0]);
		this.update({Action: "Top"});
	}
	bottom() { //Move selected row to the bottom
		let l = this.SelectedIndices.length;
		if(l == 0 || l > 1) {return this}
		let s = this.SelectedIndices[0]; //Index of the row to move
		if(s == (this.Length - 1)) {return this} //There is nothing to do if this row is already at the bottom
		let temp = this.Array.splice(s, 1);
		this.Array.push(temp[0]);
		this.update({Action: "Bottom"});
	}
	empty() { //Empty the table
		if(this.onDelete) {
			this.Array.forEach(function(a) {this.onDelete(a)}, this);
		}
		this.Array = [];
		this.update({Action: "Empty"});
		return this;
	}
	setValue(v) { //Set the selection of the table to the given array of index
		this.Array.forEach(function(a, i) {
			var found = v.includes(i); //Will return true if the index was found
			if(found) {a.Selected = true}
			else {a.Selected = false}
		});
		this.update({Action: "Set Value"});
		return this;
	}
	selectAll() { //Select all the rows
		this.Array.forEach(function(a) {a.Selected = true});
		this.update({Action: "Set Value"}); //Note that the action is considered a set Value here
	}
	hideControls() { //Hide the control bar
		GetId(this.ID).firstChild.style.display = "none";
		return this;
	}
	showControls() { //Show the control bar
		GetId(this.ID).firstChild.style.display = "block";
		return this;
	}
	hasElement(field, value) { //Check if an element with its field matching value is present in the table
		var found = false;
		var a = this.Array;
		var l = a.length;
		var i = 0;
		while(!found && i < l) {
			var index = Object.keys(a[i]).findIndex(function(k) {return k == field});
			if(index > -1) {found = (Object.values(a[i])[index] == value)}
			i++;
		}
		return found;
	}
	confirmForm(action, next, arg) { //Open a form for confirmation of deletion action (RESET or DELETE). If approved, the function next will be called with arg as argument
		if (this.Length == 0) {return this}
		let id = this.ID + "_Form";
		let txt = "The selected row(s) will be deleted.";
		if(action == "RESET") {txt = "This will remove all rows from this table."}
		Form.open({
			ID: id,
			HTML: "<div style=\"text-align: center\"><p style=\"color: red;\">" + txt + "</p><p>Are you sure you want to continue?</p></div>",
			Title: "Confirm deletion",
			Buttons: [
				{
					Label: "Ok",
					Click: function() {
						next(arg);
						Form.close(id);
					}.bind(this),
				},
				{
					Label: "Cancel",
					Click: function() {Form.close(id)}
				}
			],
		});
		return this;
	}
}