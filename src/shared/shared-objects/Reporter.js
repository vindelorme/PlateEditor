//********************************************************************************
// REPORTER object - Allow construction of specific report pages for data analysis
//********************************************************************************
class Reporter {
	constructor() {return this}
	//Static Methods
	static htmlHeader(title) {
		let h = "<!DOCTYPE HTML>\n";
		h += "<html>\n";
		h += "<head>\n";
		h += "\t<meta http-equiv=\"content-type\" content=\"text/html; charset=UTF-8\">\n";
		h += "\t<title>" + title + "</title>\n";
		h += "\t<link href=\"dist/ui-styles.css\" rel=\"stylesheet\" type=\"text/css\">\n";
		h += "\t<link href=\"dist/analyzer-styles.css\" rel=\"stylesheet\" type=\"text/css\">\n";
		h += "\t<link href=\"dist/shared-styles.css\" rel=\"stylesheet\" type=\"text/css\">\n";
		h += "\t<script type=\"text/javascript\" src=\"dist/ui.min.js\"></script>\n";
		h += "\t<script type=\"text/javascript\" src=\"dist/shared.min.js\"></script>\n";
		h += "\t<script type=\"text/javascript\" src=\"dist/analyzer.min.js\"></script>\n";
		h += "\t<script type=\"text/javascript\" src=\"dependencies/jszip.min.js\"></script>\n";
		return h;
	}
	static header(I) { //Prepare the header for the html report page
		let title = (I.Title || "Report");
		let html = this.htmlHeader(I.Method);
		html +="\t<script type=\"text/javascript\">window.onload = function() {Analyzer.init({Method: \"" + I.Method + "\", Title: \"" + title + "\"})}</script>\n"; //Script to init the Analyzer on loading the page
		html += "</head>\n";
		html += "<body style=\"font-family: arial; font-size: 16px\">\n";
		html += "<div id=\"Header\">\n"; //Header
		html += "\t<p><b>" + title + "</b></p>\n";
		html += "</div>\n";
		html += "<div id=\"Main\">\n";  //Opening of the main report div
		return html;
	}
	static footer() { //Prepare the footer for the html report
		let f = "</div>\n"; //Closure of Main report div
		f += "<div id=\"Footer\">\n"; //Footer
		f += "\t<p>Generated&nbsp;<script>document.write(Date())</script>.</p>\n";
		f += "</div>\n";
		f += "</body>\n";
		f += "</html>\n";
		return f;
	}
	static openPage(html) { //Open a page with html as content
		let win = window.open(); //Show report
		win.document.write(html); //Write the html content
		win.document.close();
		win.focus(); //Focus on the newly opened page
	}
	static openReport(body, I) { //Open the report as a new HTML page
		let report = this.header(I) + body + this.footer(); //Assemble the report
		this.openPage(report);
	}
	static printable(html) { //Open a blank page containing only the html provided, that can be used for copy-pasting or printing operations
		let h = this.htmlHeader("Printable");
		h += "</head>\n";
		h += "<body style=\"font-family: arial; font-size: 16px\">\n";
		this.openPage(h + html + "\n</body></html>");
	}
	static combination(o, I) { //Compute the combinations of unique elements by checking concentrations and tags overlap
		let out = {};
		Object.values(o).forEach(function(array, k) { //The object contains different categories. Each will be treated separately and the results returned as arrays in their initial categories
			if(Array.isArray(array)) { //Values that are not arrays are ignored
				let key = Object.keys(o)[k]; //The key corresponding to the value
//************************************************
//Not sure at this point about the order, so doing
//like this makes it more flexible for the future
				let updated = array;
				if(I.Conc) {updated = this.combineConc(updated)}
				if(I.Tags) {updated = this.combineTags(updated)}
//************************************************
				out[key] = updated;
			}
		}, this);
		return out;
	}
	static combineConc(array) { //For the array of objects supplied, use the concentrations data to divide the original arrays into individual arrays of aggregated objects with their own tags
		let flatConcNames = [];
		let flatConcTags = [];
		array.forEach(function(a) { //Loop the array of objects provided. Each element is an object with a name, as well as Tags/Concs properties defined as arrays
			a.Conc.forEach(function(c, i) { //Loop the concentrations
				let name = a.Name;
				if(c.length > 0) {name += " " + c}
				let index = flatConcNames.indexOf(name);
				if(index == -1) {flatConcNames.push(name); flatConcTags.push([a.Tags[i]])} //Does not exist, create it
				else {flatConcTags[index].push(a.Tags[i])} //Update existing entry
			});
		});
		let output = [];
		flatConcNames.forEach(function(n, i) {
			output.push({Name: n, Tags: flatConcTags[i]});
		});
		return output;
	}
	static combineTags(array) { //For the array of objects supplied, use the tags data to divide the original arrays into individual arrays of aggregated objects with their own tags
		let allNames = [];
		let uniqueIndex = [];
		array.forEach(function(a) { //In the first pass, travel each area tags array and collect all names appearing for each index
			a.Tags.forEach(function(t) { //Go throught the tags
				let index = uniqueIndex.indexOf(t);
				if(index == -1) { //New entry found
					uniqueIndex.push(t);
					allNames.push([a.Name]);
				}
				else {allNames[index].push(a.Name)} //Update existing entry
			});
		});
		let output = [];
		let uniqueNames = [];
		allNames.forEach(function(n, i) { //In the second pass, travel the name array and accumulate unique names with their tags
			let name = n.sort().join(" / "); //Sort the name array so that we can compare always the same final name
			let index = uniqueNames.indexOf(name);
			if(index == -1) { //New entry found
				uniqueNames.push(name);
				output.push({Name: name, Tags: [uniqueIndex[i]]});
			}
			else {output[index].Tags.push(uniqueIndex[i])} //Update existing entry
		});
		return output;
	}
	static zFactor(controls/*, results*/) { //Compute z-score for the result file passed, using the controls provided
		window.zFactor = {Controls: this.combination(controls, {Conc: true, Tags: true})/*, Results: results*/}
		this.openReport("", {Title: "Control Report", /*FileName: result.Name,*/ Method: "zFactor"});
	}
	static aggregate(areas/*, results*/) { //Compute stats for the result file passed, using the areas provided
		areas.R.forEach(function(range) {
			areas.A = areas.A.concat(range.Values); //Concat all individual rangeIndex to the areas
		});
		window.Aggregate = {Combinations: this.combination({A: areas.A}, {Conc: true, Tags: true})/*, Results: results*/, Ranges: areas.R}
		this.openReport("", {Title: "Column Report", /*FileName: result.Name,*/ Method: "Aggregate"});
	}
	static grouped(areas, conc/*, results*/) { //Compute stats for the result file passed, using the areas provided and organizing data as two-entry tables
		window.Grouped = {Areas: areas.A, Conc: conc/*, Results: results*/, Ranges: areas.R, Definitions: areas.D}
		this.openReport("", {Title: "Grouped Report", /*FileName: result.Name,*/ Method: "Grouped"});
	}
}