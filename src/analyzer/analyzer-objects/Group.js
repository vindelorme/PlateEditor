//********************************************************************************************
// GROUP object - Class representing an array of datapoints, used to build graphs or 2D tables
//********************************************************************************************
class Group {
	constructor(I) {
		this.DataPoints = []; //Initialize DataPoints array
		this.Name = (I.Name || "");
		this.Value = I.Value;
		this.Tags = (I.Tags || []);
		this.RangeIndex = I.RangeIndex;
		this.OriginIndex = I.OriginIndex;
		this.Type = I.Type;
		this.Unit = I.Unit;
		return this;
	}
	//Static Methods
	static newTyped(o, type, I) { //Returns a new Group object as a copy of o with its type property set as needed
		let n = new Group(o); //A copy of o
		n.Type = type; //Set the desired type
		if(type == "Conc") {n.Unit = n.Name}
		if(type == "Range") {n.OriginIndex = I.OriginIndex}
		if(I && I.SetNameAsValue) {n.Name = (o.Value).toString()}
		return n;
	}
	static colHeaders(H, F) { //Return the output for the array of header objects passed
		let out = "";
		let ColumnIndex = 0; //Tracker of ColumnIndex array index, for row aggregation
		H.forEach(function(h, i) { //Append the headers
			let TabFactor = 0; //The sum of the column length for this header
			if(F.Format == "txt") { //Need to sum all the column length corresponding to the current header
				let j = 0;
				let stop = 1; //How many steps to make for this header
				if(h !== null && h !== undefined) {stop = h.Span}
				while(j < stop) { //Sum all the needed lengths
					switch(F.Aggregation) {
						case "Row": //Use the precalculated lengths
							//TabFactor += F.ColumnsLength[ColumnIndex + j];
							let l = F.ColumnsLength[ColumnIndex + j];
							if(l > 0) {TabFactor += l}
							else {TabFactor++} //At least one gap should anyway be added
							break; 
						case "Avg, SD, N": TabFactor += 3; break; //All columns have same size
						default: TabFactor++; break; //All other cases, just add one
					}
					j++;
				}
				ColumnIndex += j; //Set the starting index for next header
			}
			if(h !== null && h !== undefined) { //JSON parsing yields empty array elements as null
				let span = h.Span;
				switch(F.Format) {
					case "html": out += "<th colspan=\"" + span + "\">" + Analyzer.header(h, F) + "</th>"; break;
					case "txt":
						out += Analyzer.header(h, F);
						out += Analyzer.blankCell("txt").repeat(TabFactor);
						break;
				}
			}
			else { //An empty slot is required to keep the alignment
				switch(F.Format) {
					case "html": out += Analyzer.blankHeader("html"); break;
					case "txt": 
						if(TabFactor == 0) {out += Analyzer.blankCell("txt")} //A blank is needed here as well
						else {out += Analyzer.blankCell("txt").repeat(TabFactor)}
						break;
				}
			}
		});
		return out;
	}
	static colValueHeaders(o, F) { //Return the output for the array of value header available as columns
		let out = "";
		if(o.Groups.length > 0)	{
			o.Groups.forEach(function(g, j) {
				let columnSize = 1;
				if(F.Format == "txt") {
					switch(F.Aggregation) { //Two cases requires addition of additional spans
						case "Row": //Add as many gap as the max number of elements in the dataPoints arrays
							columnSize = F.ColumnsLength[j]; break;
						case "Avg, SD, N": columnSize = 3; break; //Need to accomodate all three columns
					}
				}
				out += Analyzer.valueHeader(g, F, columnSize);
			});
		}
		else {out += Analyzer.blankHeader(F.Format)} //This is to ensure that at least one column exists
		return out;
	}

}