//***********************************************************************************************
// MAPPER_WELL object - Function to process a file that contains a mapping only for the well data
//***********************************************************************************************
class Mapper_Well extends Mapper {
	constructor(mapping) {
		super();
		this.WellCol = mapping[Mapper.well().Name];
		return this;
	}
	//Methods
	scan(o, I, output) { //Scan the file by searching well data and execute the actions required
		let plate = Editor.Plate;
		if(plate === undefined) {return Promise.resolve({Error: "No plate defined, cannot validate the well data now"})} //Failure 
		output.PlatesID = Array(plate.Rows * plate.Cols).fill(0);
		let w = this.WellCol;
		return new Promise(function(resolve) {
			o.Parser.stream(function(row, selected, parser) { //Stream the input
				let well = Well.parseIndex(row[w], plate);
				if(well !== undefined) { //Valid well found, do what is needed
					//if(I.Log) {output.PlatesID[well.Index]++} //Log the data
					output.PlatesID[well.Index]++;
					if(I.MinMax) {Mapper.scanMinMax(o, row)} //Log the min/max attributes
					if(I.Preview) { //Prepare a preview
						Mapper.scanPreviewColumns(output, row, row[w] + ".");
						if(output.LimitReached == true && I.Preview.Interrupt) {parser.abort()}
					}
					output.Items++; //Increment the item count
					if(I.Custom) {I.Custom(well, output.PlatesID[well.Index], row, output, parser)}
				}
			}, function() { //Do this when done
				if(I.Log) {
					let plateNb = 0;
					output.PlatesID.forEach(function(n) {
						if(n > plateNb) {plateNb = n} //Search the max number of plates
					});
					let array = [];
					for(let i=0; i<plateNb; i++) {array.push(i+1)} //Build a default array with incrementing numbers
					output.PlatesID = array;
				}
				resolve(output);
			});
		});
	}
	find(o, I) { //Find the data when only well mapping is available
		let plate = Editor.Plate;
		if(plate === undefined) {return Promise.resolve("")} //Failure 
		let w = this.WellCol;
		I.Plate = Number(I.Plate) - 1; //We need to convert the generic plate name in a number. Plate numbering starts at 1
		let index = 0;
		let out = I.Default; //Default fallback if the value is not found
		if(I.FindAll) {
			out = Array(plate.Rows * plate.Cols).fill(I.Default);
			index = Array(plate.Rows * plate.Cols).fill(0); 
		}
		return new Promise(function(resolve) { //Return a promise that fulfills with the data needed
			o.Parser.stream(function(row, selected, parser) { //Do this for each row
				let here = Well.parseIndex(row[w], plate);
				if(here !== undefined) { //Valid entry found, do what is needed
					if(I.FindAll) { //Log all the wells
						if(index[here.Index] == I.Plate) { //This entry corresponds to the desired plate
							out[here.Index] = row[I.Column];
						} 
						index[here.Index]++;
					}
					else {
						if(here.Index == I.Well) { //This is the right well
							if(index == I.Plate) { //This is the right plate
								out = row[I.Column];
								parser.abort();
							}
							else {index++}
						}
					}
				}
			}, function() { //Do this when done
				resolve(out);
			});
		});
	}
}