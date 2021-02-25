//**************************************************************************************************
// MAPPER_DIRECT object - Function to process a file that contains no mapping for plate or well data
//**************************************************************************************************
class Mapper_Direct extends Mapper {
	constructor(mapping) {
		super();
		return this;
	}
	//Methods
	scan(o, I, output) { //Scan the file and take the element as they come
		return new Promise(function(resolve) {
			o.Parser.stream(function(row, selected, parser) { //Stream the input
				if(I.MinMax) {Mapper.scanMinMax(o, row)} //Log the min/max attributes
				if(I.Preview) { //Prepare a preview
					Mapper.scanPreviewColumns(output, row, (output.Items + 1) + ".");
					if(output.LimitReached == true && I.Preview.Interrupt) {parser.abort()}
				}
				output.Items++; //Increment the item count
				if(I.Custom) {I.Custom(undefined, undefined, row, output, parser)} //No well or plate information
			}, function(lines) { //Do this when done
				if(I.Log) {output.PlatesID = undefined} //In this case, the determination of the plate number is not possible
				resolve(output);
			});
		});
	}
	find(o, I) { //Find the data when no mapping is available
		let plateIndex = Number(I.Plate); //We need to convert the generic plate name in a number
		let out = I.Default;
		let start = (plateIndex - 1) * I.Factor;
		let stop = plateIndex * I.Factor;
		let index = 0;
		if(I.FindAll) {out = []}
		return new Promise(function(resolve) {
			o.Parser.stream(function(row, selected, parser) { //Stream the input
				if(selected == stop) {parser.abort()} //Outside the plate dimensions
				else {
					if(selected >= start) { //We are now exploring the definitions for the requested plate
						if(I.FindAll) {out.push(row[I.Column])}
						else {
							if(index == I.RangeIndexBase0) { //The correct element has been found
								out = row[I.Column];
								parser.abort();
							}
						}
						index++;
					}
				}
			}, function(lines) { //Do this when done
				out = Mapper.fillMissingElements(out, I, start, index); //Fill missing elements if required
				resolve(out);
			});
		});
	}
}