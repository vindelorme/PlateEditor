//***************************************************************************************************************
// STATSTABLE object - Object to represent tables with pre-configured statistical columns [Avg, SD, CV, N, Total]
//***************************************************************************************************************
class StatsTable {
	constructor(id, group, json) {
		this.ID = id;
		this.Group = group;
		let n = json.Data[0].Groups.length; //All incoming Data share the same number of column
		this.Length = n //ColCycle of the table, corresponds to lvl2 (Wrapping) Groups array size for the table
		this.SubGroups = []; //Represent the level 1 rows. Left empty so that the table is a pure column table (will get statistical rows)
		this.DataArray = [//Represent the level 1 data for the table
			{
				Groups: [{Name: "Plate Name", DataPoints: [ [] ]}],
				SubGroups: [],
			}
		]; 
		for(let i=0; i<n; i++) { //Loop over the ColCycle to populate the DataArray
			let g = {Groups: [], SubGroups: []}; //Initialize the object
			Coordinate.statObject(true).forEach(function(s) { //Populate the level 1 using statistical items (always include the CV)
				g.Groups.push({
					Name: s.Name,
					DataPoints: [ [] ], //Initialize empty DataPoints arrays, will be filled out on the fly later
				});
			}, this);
			this.DataArray.push(g);
		}
		if(json.Headers !== undefined) { //There are headers for the level 1 incoming data that should be transferred as level 2
			this.Wrap_Headers = [null].concat(json.Headers.Cols); //Transfer the array; add an empty header for the plate column
		}
		this.Wrap_Groups = [{Name: ""}].concat(json.Data[0].Groups); 
		return this;
	}
	//Static methods
	
	//Getter, Setter
	get Title() { //Getter for the title of the table
		if(this.Group !== undefined) {
			let F = Analyzer.getConfig("html");
			switch(this.Group.Type) {
				case "Conc": //FALL-THROUGH
					let name = Analyzer.header(this.Group, F);
					let value = Analyzer.valueHeader(this.Group, F).replaceAll("th", "span"); //Replace the th to make a span
					if(this.Group.Unit == "MOI") {return name + " " + value}
					else {return value + " " + name}
				case "Range":
					let title = Analyzer.valueHeader(this.Group, F); //This will give a th element
					return title.replaceAll("th", "span"); //Replace the th to make a span 
				default: return this.Group.Name;
			}
		}
		return "Plate Summary"; //Group is undefined (only one table)
	}
	get TitleExport() { //Return the formatted html title for export as text
		return GetId(this.ID).getElementsByClassName("DynTable_Title")[0].innerText;
	}
	//Methods
	html() { //Return the html to initialize this table
		let html = "";
		html += "<div id=\"" + this.ID + "\" class=\"DynTable_Wrap\">";
		html += "<fieldset class=\"DynTable_Container\">";
		html += "<legend class=\"DynTable_Title\">" + this.Title + "</legend>";
		html += Analyzer.exportJSON(this.buildJSON(), "html");
		html += "</fieldset>";
		html += "</div>";
		return html;
	}
	buildJSON() { //Produce the JSON for this stats table
		let json = {
			Data: this.DataArray,
			Wrapping: {
				Data: {
					Groups: this.Wrap_Groups,
					SubGroups: []
				}
			},
			StatRows: true,
			SyncScrolling: true,
			GenericRangeName: true,
		}
		if(this.Wrap_Headers !== undefined) {
			json.Wrapping.Headers = {Cols: this.Wrap_Headers};
		}
		return json;
	}
	addRow(data, plate, I) { //Add a row of data for the plate provided
		if(this.hasData(plate)) {return this} //This row of data already exists, nothing needed here
		this.DataArray.forEach(function(d, i) {
			if(i == 0) {d.Groups[0].DataPoints[0].push(plate)} //Plate name
			else { //Values
				let stat = {};
				if(I !== undefined && I.Stats !== undefined) {
					stat = I.Stats[i-1]; //Stats are pre-computed and provided
				}
				else { //Compute the stats from the incoming data
					stat = Coordinate.statValue(data.Groups[i-1].DataPoints[0]);
				}
				let o = Coordinate.statObject(true); //Stat object as an array, including the CV
				o.forEach(function(s, j) { //Add the datapoints
					d.Groups[j].DataPoints[0].push(stat[s.Name]);
				});
			}
		});
		return this;
	}
	hasData(p) { //Check if the data already exist in the table. Use the first column as 
		let found = false;
		let data = this.DataArray[0].Groups[0].DataPoints[0];
		let i = 0;
		let max = data.length;
		while(found === false && i < max) { //A while loop is more efficient because it stops when the match is found
			if(data[i] == p) {found = true}
			i++;
		}
		return found;
	}
}