//*************************************************************************************************
// MAPPER_PLATE object - Function to process a file that contains a mapping only for the plate data
//*************************************************************************************************
class Mapper_Plate extends Mapper {
	constructor(mapping) {
		super();
		this.PlateCol = mapping[Mapper.plate().Name];
		return this;
	}
	//Methods
	scan(o, I, output) { //Scan the file by searching plate data and execute the actions required
		let p = this.PlateCol;
		return new Promise(function(resolve) {
			o.Parser.stream(function(row, selected, parser) { //Stream the input
				if(row[p] !== undefined) { //A valid entry is found
					if(I.Log) { //Log the data
						if(output.PlatesID.includes(row[p]) == false) {output.PlatesID.push(row[p])}
					}
					if(I.MinMax) {Mapper.scanMinMax(o, row)} //Log the min/max attributes
					if(I.Preview) { //Prepare a preview
						Mapper.scanPreviewColumns(output, row, row[p] + ".");
						if(output.LimitReached == true && I.Preview.Interrupt) {parser.abort()}
					}
					output.Items++; //Increment the item count
					if(I.Custom) {I.Custom(undefined, row[p], row, output, parser)} //No well information
				}
			}, function() { //Do this when done
				resolve(output);
			});
		});
	}
	find(o, I) { //Find the data when only plate mapping is available
		let p = this.PlateCol;
		let index = 0;
		let out = I.Default; //Default fallback if the value is not found
		if(I.FindAll) {out = []}
		return new Promise(function(resolve) { //Return a promise that fulfills with the data needed
			o.Parser.stream(function(row, selected, parser) { //Do this for each row
				if(row[p] !== undefined && row[p] == I.Plate) { //Valid entry found for the desired plate, do what is needed
					if(I.FindAll) {
						out.push(row[I.Column]);
					}
					else {
						if(index == I.RangeIndexBase0) { //This is the correct location
							out = row[I.Column];
							parser.abort(); //Stop here since the data has been found
						}
					}
					index++;
				}
			}, function() { //Do this when done
				out = Mapper.fillMissingElements(out, I, 0, index); //Fill missing elements if required
				resolve(out);
			});
		});
	}
}