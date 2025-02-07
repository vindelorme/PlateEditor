//*********************************************************************************************************
// MAPPER_PLATEWELL object - Function to process a file that contains a mappin for both plate and well data
//*********************************************************************************************************
class Mapper_PlateWell extends Mapper {
	constructor(mapping) {
		super();
		this.WellCol = mapping[Mapper.well().Name];
		this.PlateCol = mapping[Mapper.plate().Name];
		return this;
	}
	//Methods
	scan(o, I, output) { //Scan the file by searching plate/well data and execute the actions required
		let plate = Editor.Plate;
		if(plate === undefined) {return Promise.resolve({Error: "No plate defined, cannot validate the well data now"})} //Failure 
		let w = this.WellCol;
		let p = this.PlateCol;
		return new Promise(function(resolve) {
			o.Parser.stream(function(row, selected, parser) { //Stream the input
				let well = Well.parseIndex(row[w], plate);
				if(well !== undefined && row[p] !== undefined) { //Valid well found in a valid plate, do what is needed
					if(I.Log) { //Log the data
						if(output.PlatesID.includes(row[p]) == false) {output.PlatesID.push(row[p])}
					}
					if(I.MinMax) {Mapper.scanMinMax(o, row)} //Log the min/max attributes
					if(I.Preview) { //Prepare a preview
						Mapper.scanPreviewColumns(output, row, row[p] + ". " + row[w] + ".");
						if(output.LimitReached == true && I.Preview.Interrupt) {parser.abort()}
					}
					output.Items++; //Increment the item count
					if(I.Custom) {I.Custom(well, row[p], row, output, parser)}
				}
			}, function() { //Do this when done
				resolve(output);
			});
		});
	}
	find(o, I) { //Find the data when plate and well mapping are available
		let plate = Editor.Plate;
		if(plate === undefined) {return Promise.resolve("")} //Failure 
		let w = this.WellCol;
		let p = this.PlateCol;
		let out = I.Default; //Default fallback if the value is not found
		if(I.FindAll) {out = Array(plate.Rows * plate.Cols).fill(I.Default)}
		return new Promise(function(resolve) { //Return a promise that fulfills with the data needed
			o.Parser.stream(function(row, selected, parser) { //Do this for each row
				let here = Well.parseIndex(row[w], plate);
				if(here !== undefined && row[p] !== undefined) { //Valid well found in a valid plate, do what is needed
					if(row[p] == I.Plate) { //This is the right plate
						if(I.FindAll) {
							out[here.Index] = row[I.Column];
						}
						else {
							if(here.Index == I.Well) { //This is the correct location
								out = row[I.Column];
								parser.abort(); //Stop here since the data has been found
							}
						}
					}
				}
			}, function() { //Do this when done
				resolve(out);
			});
		});
	}
	match(o, I) { //Match the array of data against the file and return the matched elements
		let plate = Editor.Plate;
		if(plate === undefined) {return Promise.resolve("")} //Failure 
		let w = this.WellCol;
		let p = this.PlateCol;
		return new Promise(function(resolve) { //Return a promise that fulfills with the data needed
			o.Parser.stream(function(row, selected, parser) { //Do this for each row
				let here = Well.parseIndex(row[w], plate);
				if(here !== undefined && row[p] !== undefined) { //Valid well found in a valid plate, do what is needed
					I.Array.forEach(function(a) { //Scan the array for any match
						if(row[p] == a.Plate && here.Index == a.WellIndex) { //Match
							a.Resolved = row[I.Column]; //Update the object with the resolved name
						}
					});
				}
			}, function() { //Do this when done
				resolve(I.Array);
			});
		});
	}
}