//********************************************************************************************************
// CUSTOMTABLE object - Object to represent an individual table in a section that can host several of them
//********************************************************************************************************
class CustomTable {
	constructor(id, json) {
		this.ID = id;
		this.Data = json; //For these tables, the json must be supplied directly. Hence the custom
		this.Title = json.Title;
		return this;
	}
	//Getter, Setter
	get TitleExport() { //Return the title for export as text
		if(this.Title === undefined) {return ""}
		return this.Title;
	}
	//Methods
	html() { //Return the html to initialize this table
		let html = "";
		html += "<div id=\"" + this.ID + "\" class=\"DynTable_Wrap\">";
		if(this.Title !== undefined) {
			html += "<fieldset class=\"DynTable_Container\">";
			html += "<legend class=\"DynTable_Title\">" + this.Title + "</legend>";
		}
		html += Analyzer.exportJSON(this.Data, "html");
		if(this.Title !== undefined) {html += "</fieldset>"}
		html += "</div>";
		return html;
	}
	buildJSON() { //For compatibility with StatsTable
		return this.Data;
	}
	addRow(data, plate) { //Add a row of data for the plate provided
		if(this.hasData(plate)) {return this} //This row of data already exists, nothing needed here
		this.Data.Data[0].Groups.forEach(function(g, i) {
			g.DataPoints[0].push(data.Data[0].Groups[i].DataPoints[0][0]); //It is assumed that data are supplied one by one
		});
		return this;
	}
	hasData(p) { //Check if the data already exist in the table. Use the first column as comparator
		let found = false;
		let data = this.Data.Data[0].Groups[0].DataPoints[0]; //First column is the comparator
		let i = 0;
		let max = data.length;
		while(found === false && i < max) { //A while loop is more efficient because it stops when the match is found
			if(data[i] == p) {found = true}
			i++;
		}
		return found;
	}
	resetSection(name, i, I) { //Erase the previous contents and redraw
		console.log("resetSection not implemented for CustomTable. SO GET YOUR FINGERS OUT OF YOUR ASS MOTHERFUCKER!!!");
	}
}