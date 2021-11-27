//******************************************************************************************************************
// MAPPER object - Allow mapping of columns to specific contents and searching of data within file using the mapping
//******************************************************************************************************************
class Mapper {
	constructor() {return this}
	//Static Methods
	static well(I) { //Required for results, not for definitions
		let bool = true;
		if(I && I.Required) {bool = false}
		return {Name: "Well ID", Optional: bool, Guess: function(h, first) {return h.search(/well/i) > -1}}
	}
	static plate() {return {Name: "Plate ID", Optional: true, Guess: function(h, first) {return (h.search(/barcode/i) > -1 || h.search(/plate/i) > -1)}}}
	static definition() {return {Name: "Definition"}} //Required
	static import() {return {Name: "Import", Multiple: true}} //Required
	static numeric() {
		return {Name: "Numeric", Multiple: true, Optional: true, Guess: function(h, first) {
			if(first.search !== undefined) {return first.search(/[a-z]/gi) == -1}
			else {return true}
		}}
	}
	static anchors(here) { //Return the text for the anchors requested
		let id = "Mapper";
		switch(here) {
			case "Table": return id + "_inputTable";
			case "Param": return id + "_Parameters";
			default: return id;
		}
	}
	static map(inputs, I) { //Allow mapping of columns for the passed array of inputs, with mapping configuration passed as object in option
//*****************************************************************************************
//	Validate: true/false, check for mandatory field and reject the mapping if not complete,
//	BackToImport: true/false, indicates whether it is possible to go back to the Form_Import on closure of this form
//	Done: function(), run after mapping is closed by the user
//	Parameters: [], array of objects with the following structure:
//		Name, Optional: true/false, Multiple: true/false,
//		Guess: function(h, f) [a function accepting the header h and first element f, that return true if the parameter should be selected],
//*****************************************************************************************
		if(inputs === undefined || inputs.length == 0) {console.warn("No inputs provided to the mapper"); return} //No inputs passed
		if(I === undefined || I.Parameters == undefined || I.Parameters.length == 0) {console.warn("Mandatory options not passed to the mapper"); return} //No parameters to map
		let inputTable = new RespTable({ //RespTable to navigate between the inputs
			ID: Mapper.anchors("Table"),
			Array: inputs,
			Fields: ["Name", "Size"],
			Preserve: true, RowNumbers: true, NoControls: true,
			onSelect: function(array) {
				if(array.length > 0) {Mapper.showMapping(array[0], inputTable, I)}
			},
		});
		let html = ""; //Prepare the html for the form
		html += "<div id=\"" + Mapper.anchors("Table") + "\" style=\"float:left; width:300px; overflow:auto;\"><p><b>Inputs available:</b></p></div>";
		html += "<div style=\"margin-left:320px\">";
			html += "<p><b>Parameter mapping:</b></p>";
			html += "<div id=\"" + Mapper.anchors("Param") + "\" style=\"max-height:500px; overflow:auto\"></div>"; 
		html += "</div>";
		let id = "Form_ParameterMapping";
		let buttons = [ //Buttons that will be applied to the form
			{Label: "Done", Icon: {Type: "Ok", Space: true, Color: "Green"}, Click: function() { //Mapping is completed
				if(I.Validate) {
					if(Mapper.validate(inputs, I) == false) {return}
				}
				if(I.Done) {I.Done()}
				if(I.BackToImport) { //In this case, need to close the Form_Import as well
					Form_Import.cancel(); //Reset and close the form without calling OnClose again
				}
				Form.close(id);
			}},
		];
		if(I.BackToImport) { //In this case, add a button to close this form, allowing to return to the Form_Import
			buttons.unshift({Label: "Back to parsing", Icon: {Type: "Back", Space: true}, Click: function() { //Add the button at the beginning of the array
				inputs.slice(0, I.Index); //Newly elements added must be rejected from the input list
				Form.close(id);
			}}); 
		}
		Form.open({
			ID: id,
			HTML: html,
			Title: "Parameter mapping",
			Size: 800,
			Buttons: buttons,
			onInit: function() { //Initialize the respTable on open
				inputTable.init();
				let sel = inputTable.Selected;
				if(sel.length == 0) {inputTable.setValue([0])} //Force selection of the first element if nothing selected
				Mapper.showMapping(inputTable.Selected[0], inputTable, I);
			},
		});
	}
//************************************************************************************************************
//Since this method will first run asynchronously to parse the first line of the file for guessing,
//we need to check that the input selected at the end is same as the one passed, before appending the preview.
//So it is better to also pass the inputTable here, instead of the selected result object alone
//************************************************************************************************************
	static showMapping(input, inputTable, I) { //Show the mapping table for the selected input
		if(input.FirstRow === undefined) { //Parse the first row so that mapping can be guessed based on the values found
			GetId(Mapper.anchors("Param")).innerHTML = "<p class=\"Error\">Processing file, please wait...</p>";
			input.Parser.stream(function(row, selected, parser) { //Extract only the first row
				input.FirstRow = row;
				parser.abort();
			}, function() { //When parsing is done, process the array
				Mapper.guess(input, I);
				if(input.Name == inputTable.Selected[0].Name) {Mapper.mappingArray(input, inputTable, I)} //Prevent display if something else is clicked in between
			});
		}
		else {Mapper.mappingArray(input, inputTable, I)} //First column already parsed, the method can run synchronously
	}
	static guess(input, I) { //For the input provided, compute a guess for the mapping using the functions provided by the user
		input.Parser.Headers.forEach(function(h, i) { //Loop the input headers
			I.Parameters.forEach(function(p, j) { //Loop the parameters to map
				if(p.Guess && p.Guess(h, input.FirstRow[i])) { //Try the provided guess function and assign the mapping is correct
					Mapper.assign(input, p, i);
				}
			});
		});
	}
	static mappingArray(input, inputTable, I) { //Build the array allowing mapping of parameters for the input
		let html = "<span class=\"FootNote\">Fields marked with * are mandatory</span>";
		html += "<table class=\"RespTable\"><thead><tr><th>#</th><th>Name</th>";
		I.Parameters.forEach(function(p) {
			html += "<th>" + p.Name;
			if(!p.Optional) {html += "<span class=\"Error\">*</span>"}
			if(p.Multiple) {html += "<br><span class=\"Hyperlink\">All</span>&nbsp;/&nbsp;<span class=\"Hyperlink\">None</span>"}
			html += "</th>";
		});
		html += "</tr></thead>";
		input.Parser.Headers.forEach(function(h, i) { //Loop the input headers to build table rows
			html += "<tr><td>" + (i + 1) + "</td><td>" + h + "</td>"; //#, Name
			I.Parameters.forEach(function(p, j) { //Loop the parameters to map
				html += "<td style=\"transform: scale(0.8)\" class=\"RespTable_Row";
				if(input.Mapping !== undefined && input.Mapping[p.Name] !== undefined) { //Reuse existing config if defined
					if(p.Multiple) { //In this case, mapping is an array with true/false
						if(input.Mapping[p.Name][i]) {html += " RespTable_Selected Mapped" + j}
					}
					else { //In this case, the mapping directly holds the value
						if(input.Mapping[p.Name] == i) {html += " RespTable_Selected Mapped" + j}
					}
				}
				html += "\"></td>";
			});
			html += "</tr>";
		});
		html += "</table>";
		let target = GetId(Mapper.anchors("Param"));
		target.innerHTML = html; //Append the html
		target.children[1].addEventListener("click", function(e) { //Bind events to the table
			let t = e.target;
			switch(t.nodeName) {
				case "TD": //Table cells are responsive
					let row = t.parentElement.rowIndex - 1; //The clicked row minus the table header
					let col = t.cellIndex; //Clicked column
					if(col > 1) { //The 2 first columns are # and name and can be ignored
						let param = I.Parameters[col - 2];
						if(param.Multiple) { //Multiple choices allowed
							if(t.className.includes("RespTable_Selected")) {t.className = "RespTable_Row"} //When selected, turn it off
							else {t.className = "RespTable_Row RespTable_Selected Mapped" + (col - 2)} //The opposite
						}
						else { //Only one choice
							if(t.className.includes("RespTable_Selected")) { //Strategy differs if optional or not
								if(param.Optional) {t.className = "RespTable_Row"} //When selected, turn it off
							}
							else { //Select this cell and unselect the others
								let previous = target.getElementsByClassName("Mapped" + (col - 2));
								if(previous && previous[0]) {previous[0].className = "RespTable_Row"}
								t.className = "RespTable_Row RespTable_Selected Mapped" + (col - 2);
							}
						}
						Mapper.assign(input, param, row);
						if(I.OnChange) {I.OnChange(input)}
					}
					inputTable.update();
				break;
				case "SPAN": //To select all or nothing at once
					let column = t.parentElement.cellIndex;
					let c = "RespTable_Row"; //The new class
					let bool = false;
					if(t.innerHTML == "All") { //Select all
						c = "RespTable_Row RespTable_Selected Mapped" + (column - 2);
						bool = true;
					} 
					input.Parser.Headers.forEach(function(h, i) {
						target.children[1].rows[i + 1].cells[column].className = c;
						Mapper.assign(input, I.Parameters[column - 2], i, {Select: bool});
					});
					if(I.OnChange) {I.OnChange(input)}
					inputTable.update();
				break;
			}
		});
	}
	static assign(input, parameter, index, I) { //For the input given, assign the parameter to the provided index (as the index in Header array)
		if(input.Mapping === undefined) {input.Mapping = {}} //Initialize a mapping object if needed
		let name = parameter.Name;
		if(parameter.Multiple) { //The strategy is different is they are multiple assignments or just one
			if(input.Mapping[name] === undefined) { //For multiple assignement, held an array of boolean to indicate selected or not. Initialize the array here if not done
				input.Mapping[name] = Array(input.Parser.Headers.length).fill(false);
			}
			if(I) { //To force a selection
				if(I.Select) {input.Mapping[name][index] = true}
				else {input.Mapping[name][index] = false}
			}
			else {input.Mapping[name][index] = !input.Mapping[name][index]} //Normal case, switch the value
		}
		else { //Only one mapping possible
			if(parameter.Optional && input.Mapping[name] == index) {input.Mapping[name] = -1} //This will neutralize the selection without initiating a guess when editing the mapping
			else {input.Mapping[name] = index}
		}
	}
	static validate(inputs, I) { //Validate that all mandatory assignments are done in the inputs
		let l = I.Parameters.length;
		let valid = true;
		let i = 0;
		while(valid && i < l) { //Loop the parameters
			let p = I.Parameters[i];
			if(p.Optional === undefined || p.Optional == false) { //Need to validate only the required parameters
				let n = inputs.length;
				let j = 0;
				while(valid && j < n) { //Loop over the inputs
					if(inputs[j].Mapping === undefined || inputs[j].Mapping[p.Name] === undefined) {valid = false} //Nothing defined, reject
					else { //Something is here, but it doesn't mean it's ok yet
						if(p.Multiple) { //For this specific case, need to ensure at least one is selected
							valid = inputs[j].Mapping[p.Name].includes(true); //Will be false if all values are false
						}
					}
					if(!valid) { //Stop as soon as a required parameter is not assigned
						alert("Parameter \"" + p.Name + "\" has not been assigned for input \"" + inputs[j].Name + "\".");
						return false;
					}
					j++;
				}
			}
			i++;
		}
		return true;
	}
	static modeWellPlate(m) { //For the mapping object provided, return the mode needed to find the items: [plate only, well only, plate & well, direct]
		let plateCol = m[Mapper.plate().Name];
		let wellCol = m[Mapper.well().Name];
		let wellDefined = false;
		let plateDefined = false;
		if(wellCol !== undefined && wellCol > -1) {wellDefined = true}
		if(plateCol !== undefined && plateCol > -1) {plateDefined = true}
		if(wellDefined && plateDefined) {return "PlateWell"} //Both are defined
		else { //At least one is not defined
			if(wellDefined) {return "Well"}
			if(plateDefined) {return "Plate"}
		}
		return "Direct";
	}
//*********************************************************************************************
//Justification for the definition of four independent mapper classes: the only alternative
//way is to check the mode desired (PlateWell, Plate, Well, Direct) within the stream function,
//then start the right subfunctions. But since this test needs to be performed for each line
//of the file, it seems more efficient to define separate functions and run then without this
//switch. It makes more lines of code, but the parsing runs faster, especially for big files.
//Since the 4 classes are written independently in separated files, this way of doing also
//does not reduce the code readability and maintenance.
//*********************************************************************************************
	static new(mapping) { //Return the mapper object that fits the mapping provided
		switch(Mapper.modeWellPlate(mapping)) {
			case "PlateWell": return new Mapper_PlateWell(mapping);
			case "Plate": return new Mapper_Plate(mapping);
			case "Well": return new Mapper_Well(mapping);
			case "Direct": return new Mapper_Direct(mapping);
		}
	}
//*********************************************************************************************
	static scan(o, I) { //Scan the file and execute some actions as described in the options passed: Preview(limit), Log, Min/Max. Returns a promise
		if(o === undefined) {return Promise.resolve({Error: "No file selected"})}
		if(I === undefined) {console.warn("Mapper.scan is missing parameters to run"); return Promise.resolve({Error: "Internal error, check console for details"})}
		let output = { //Output object
			Items: 0, //The number of valid items
			PlatesID: [], //To log the plate names
		}
		if(I.Preview) {
			output.Preview = ""; //To build a preview of the rows within the limit provided
			output.Column = o.Mapping[I.Preview.Column]; //The column(s) to use for the preview content
			output.Limit = (I.Preview.Limit || 50); //How many lines in the preview
			output.LimitReached = false; //Whether the max number of lines has been reached
		}
		return o.Mapper.scan(o, I, output);
	}
	static cleanValue(v) { //Clean the value recovered from the Mapper, to ensure smooth conversion to a number and correct handling of empty/crashing strings
		if(v === "" || v === "Infinity") {return undefined}
		else {return Number(v)}
	}
	static scanMinMax(o, row) { //Evaluate Min/Max and update the properties for the object passed
		o.Parameters.forEach(function(p, i) { //For each numerical parameter, update the global min/max values
			if(p.Numeric) {
				//let value = Number(row[i]);
				let value = Mapper.cleanValue(row[i]);
				if(value > p.GlobalMax) {p.GlobalMax = value}
				if(value < p.GlobalMin) {p.GlobalMin = value}
			}
		});
	}
	static scanPreviewColumns(output, row, start) { //Append row data to the preview
		if(output.Items < output.Limit) { //Limit not reached
			let column = output.Column;
			if(output.Items > 0) {output.Preview += "\n"}
			output.Preview += start;
			if(column !== undefined) { //Should add the column(s) to the preview
				if(column.length) { //In this case we have an array of booleans
					column.forEach(function(c, i) {
						if(c) {output.Preview += " " + row[i]}
					});
				}
				else {output.Preview += " " + row[column]} //Only one value
			}
		}
		else {output.LimitReached = true} //Limit reached
	}
	static fillMissingElements(out, I, start, index) { //Check that the definition has enough elements and complete with generic names if required
		let name = "";
		if(I.AreaName) {name = I.AreaName + " "}
		if(I.FindAll && out.length < I.RangeIndexBase0) { //This means the definition is missing elements
			while(index < I.RangeIndexBase0) { //Complete with generic names
				//out.push(I.Default + " #" + (start + index + 1));
				out.push(name + "#" + (start + index + 1));
				index++;
			}
		}
		return out;
	}
}