//**************************************************************************
// RESULT object - Handling of data and parameters attached to a result file
//**************************************************************************
class Result {
	constructor(data) { //Build a result object from data sent by Import_Form
		this.Input = data.Input;
		this.Name = data.Name;
		this.Size = data.Parser.SelectedRows + " rows";
		this.Parser = data.Parser;
		this.Mapper = undefined;
		this.Mapping = undefined;
		this.ParamSelected = 0; //Number of parameter selected
		this.PlatesID = []; //Array containing the plates ID, in the order they were found in the file
		this.Parameters = [];
		data.Headers.forEach(function(h, i) { //Build the array of Parameter objects
			this.Parameters.push(new Parameter(h));
		}, this);
		this.Validated = false; //Whether the result file has been validated
		this.Info = "";
		Result.updateParameters(this); //Parameters available / selected info
		return this;
	}
	//Static Methods
	static selected(r, sel) { //Update the number of parameter selected field for the result given
		r.ParamSelected = sel;
		r.Info = r.Parameters.length + " available,<br>" + sel + " selected";
	}
	static updateParameters(r) { //Update parameters Selected/Numeric properties based on mapping, and give information on the number of parameters available/selected
		let sel = 0;
		if(r.Mapping) { //Use the mapping data if defined
			let get = r.Mapping[Mapper.import().Name]; //An array of booleans indicating if the parameter is selected or not
			let numeric = r.Mapping[Mapper.numeric().Name]; //An array of booleans as well
			r.Parameters.forEach(function(p, i) {
				if(get) {
					p.Selected = get[i]; //Update the selection based on mapping
					if(p.Selected) {sel++} //Log the number of selected parameters
				}
				if(numeric) {
					p.Numeric = numeric[i];
				}
			});
		}
		this.selected(r, sel);
	}
	static updateMapping(r) { //Update mapping configuration based on parameters Selected properties, and give information on the number of parameters available/selected
		let sel = 0;
		let m = r.Mapping[Mapper.import().Name]; //An array of booleans indicating if the parameter is selected or not
		r.Parameters.forEach(function(p, i) {
			m[i] = p.Selected; //Update the mapping based on selection 
			if(p.Selected) {sel++} //Log the number of selected parameters
		});
		this.selected(r, sel);
	}
	static getAsJPGControl(result, paramIndex) { //Returns an object suitable to create a button (using the LinkCtrl constructor) that will output the parameter with the desired index, for the result passed, as a jpg
		let p = result.Parameters[paramIndex];
		let plateIndex = Editor.ResultManager.PlateSelect.Selected;
		let action = function() { //The click action for the button
			let canvas = document.createElement("canvas"); //Create an empty canvas element
			canvas.height = p.Grid.height; //Define its size to match that of the Grid
			canvas.width = p.Grid.width;
			let ctx = canvas.getContext("2d");
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, canvas.width, canvas.height); //Apply a white background first, to prevent transparent pixels from turning black
			ctx.drawImage(p.Grid, 0, 0); //Draw the grid, drop the highlight
			let href = canvas.toDataURL('image/jpeg');
			Reporter.printable("<p><b>" + result.Name + " (Plate: " + plateIndex + ") - " + p.Name + "</b></p><img src=\"" + href + "\"></img>");
		}
		return {Label: "jpg", Title: "Click here to view this heatmap as a .jpg image file", Click: action};
	}
	static getAsHTMLControl(result, paramIndex) { //Returns an object suitable to create a button (using the LinkCtrl constructor) that will output the parameter with the desired index, for the result passed, as an html array
		let p = result.Parameters[paramIndex];
		let action = function() { //The click action for the button
			let id = "Form_GetAsHTML";
			let output = id + "_Output";
			let plateIndex = Editor.ResultManager.PlateSelect.Selected;
			Form.open({ //Open an empty form with waiting message
				ID: id,
				HTML: "<div style=\"max-height: 500px; overflow: auto\"><p><b>" + result.Name + " (Plate: " + plateIndex + ") - " + p.Name + "</b></p><div id=" + output + "><span class=\"Error\">Resolving values, please wait...</span></div></div>",
				Size: 700,
				Title: "Parameter as HTML",
				Buttons: [
					{Label: "Printable Version", Click: function() {
						Reporter.printable(GetId(output).parentElement.innerHTML);
					}, Title: "Display the table in a new window to allow easy printing or copy/pasting to other applications"},
					{Label: "Close", Icon: {Type: "Cancel", Space: true, Color: "Red"}, Click: function() {Form.close(id)} },
				],
			});
			result.getValues(plateIndex, paramIndex).then(function(data) { //Fetch the data, then build the html table
				if(p.Numeric) {data.map(function(v) {return Number(v)})} //Convert text into numbers
				let o = Parameter.getMinMax(p, data, Editor.ResultManager.extremumObject());
				let grad = Editor.ResultManager.gradColors();
				let r = Editor.Plate.Rows;
				let c = Editor.Plate.Cols;
				let html = "<table style=\"text-align: center\"><tr><th></th>";
				for(let j=0; j<c; j++) { //Headers, for each col
					html += "<th>" + (j + 1) + "</th>";
				}
				html += "</tr>";
				for(let i=0; i<r; i++) { //Travel all the rows
					html += "<tr><th>" + Well.alphabet(i) + "</th>";
					for(let j=0; j<c; j++) { //Travel all the cols
						let val = data[i * c + j];
						let bgColor = "white";
						if(val === undefined) {val = "<span class=\"Error\">&Oslash;</span>"}
						else {bgColor = CSSCOLORS.heatmap(val, o.Min, o.Max, grad)} //set bgColor as the heatmap color
						let color = CSSCOLORS.font(bgColor, "RGB_Unnamed"); //Adapt font (black/white) depending on the background
						html += "<td style=\"background-color:" + bgColor + "; color: " + color + "; padding: 0.2em; border: 1px solid black\">" + val + "</td>";
					}
					html += "</tr>";
				}
				html += "</table>";
				GetId(output).innerHTML = html; //Display the table
			});
		}
		return {Label: "html", Title: "Click here to view this heatmap as an html array", Click: action}
	}
	//Methods
	draw(plateIndex, GradColors, tab, I) { //Draw heatmap for this result and the plateIndex selected
		let plate = Editor.Plate;
		this.Parameters.forEach(function(p, i) { //For each parameters
			if(p.Selected) { //If this parameter is selected
				p.resize(plate); //Resize the canvases to match the plate
				p.grid(plate);
				this.getValues(plateIndex, i).then(function(output) { //Collect the values for this parameter, then build the heatmap
					if(p.Numeric) { //Process the array if this parameter has been selected as numerical
						output.map(function(v) {return Number(v)}); //Convert text into numbers
						let o = Parameter.getMinMax(p, output, I);
						output.forEach(function(v, i) { //Process the array
							p.heatmap(v, i, plate, GradColors, o.Min, o.Max);
						});
					}
					else { //For textual values, simply output as it is
						output.forEach(function(v, i) { //Process the array
							p.txt(v, i, plate);
						});
					}
					p.draw(this, i);
					tab.style.height = "unset"; //Release the height to let the container adjust to its new content
				}.bind(this));
			}
		}, this);
		return this;
	}
	getValues(plateIndex, paramIndex) { //Returns a promise that will fulfill with the values for the desired plate / param
		let args = {
			Plate: plateIndex, //Name of the plate where to look the data
			Column: paramIndex, //Index of the column containing the data to extract
			FindAll: true,
		}
		return this.Mapper.find(this, args);
	}
	getValue(param, well) { //A promise that resolve with the value of the parameter at the given well location
		let plateIndex = Editor.ResultManager.PlateSelect.Selected; //Plate selected for heatmap display
		let args = {
			Plate: plateIndex, //Name of the plate where to look the data
			Well: well.Index, //Index of the well where to find the data
			Default: "", //Default fallback if the element needed is outside the list
			Column: param, //Index of the column containing the data to extract
		}
		return this.Mapper.find(this, args); //Return a promise that will fulfill with the value of the item
	}
	//**************************************************************************
	//Works well for small files, need stream-write capabilities for bigger ones
	//**************************************************************************
	pushLayout(rowLimit) { //Push the result file with the layout data
		let aborted = false;
		let w = this.Mapping[Mapper.well().Name];
		let plate = Editor.Plate;
		let data = [this.Parser.Headers.concat(["Area", "Value", "Unit"])]; //Headers for the file
		return new Promise(function(resolve) {
			let ranges = Area.getRanges({HasDefinition: true}); //Get only the ranges that have definitions
			let promises = [];
			ranges.forEach(function(r) { //Loop the ranges to get the resolved names
				promises.push(Definition.getAsPlate(r.Definition));
			});
			Promise.all(promises).then(function(def) { //Wait for the resolution of all the names to continue with result streaming
				let resolved = {};
				ranges.forEach(function(r, i) {
					resolved[r.Name] = def[i].Definition;
				});
				this.Parser.stream(function(row, selected, parser) { //Stream the file to build the output
					let here = Well.parseIndex(row[w], plate); //Location of the well
					if(here !== undefined) { //If this well is within the plate boundary
						plate.Layers.forEach(function(l) { //Loop the layers
							let well = l.Wells[here.Index];
							row = row.concat(Well.layoutData(well, resolved)); //Push the layout data
						});
						data.push(row); //Push the fully completed row to the output
						if(data.length == rowLimit) { //Protection for big files, until we can do better...
							aborted = true;
							parser.abort();
						}
					}
				}.bind(this), function() { //Parsing Complete
					resolve({Aborted: aborted, Data: data});
				});
			}.bind(this));
			/*this.Parser.stream(function(row, selected, parser) { //Stream the file to build the output
				console.log("got row", row);
				let here = Well.parseIndex(row[w], plate); //Location of the well
				if(here !== undefined) { //If this well is within the plate boundary
					data.push( //Push a promise that will fulfill with the data for the entire row 
						new Promise(function(resolveRow) {
							let p = []; //Array of promises
							plate.Layers.forEach(function(l) { //Loop the layers
								let well = l.Wells[here.Index];
								p.push(Well.layoutData(well)); //Push a promise that will resolve with the layout data at this well and layer
							});
							console.log("pushed promises for well to all layers");
							Promise.all(p).then(function(layout) { //When the layout data are recovered for all layers, concat to the row and push to output data
								console.log("Got promises for well, resolving row");
								layout.forEach(function(l) {row = row.concat(l)});
								resolveRow(row);
							});
						}) //No separator here, as we are in a push()
					);
				}
				//***************************************************
				//Protection for big files, until we can do better...
				if(data.length == rowLimit) {
					aborted = true;
					parser.abort();
					console.log("Too many rows, Aborted");
				}
				//***************************************************
			}.bind(this), function() { //Parsing Complete
				console.log("Stream complete");
				Promise.all(data).then(function(out) { //Wait for all rows to complete then resolve
					resolve({Aborted: aborted, Data: out});
				}); 
			});*/
		}.bind(this));
	}
}