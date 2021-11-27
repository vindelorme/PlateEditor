//**************************************************************************************************
// Object - To handle data pairing between results and definitions, at the single result plate level
//**************************************************************************************************
class Pair {
	constructor() {
		this.Table = []; //An array of objet containing the information required to recover the corresponding plates from the linked definitions
		return this;
	}
	//Static Methods
	static unpaired() { //Return an object indicating that the current Pair object is empty (result plate unpaired)
		let txt = "There are currently no definition plates paired to this result plate";
		let html = "<span style=\"font-size: 0.8em; font-style: italic\" title=\"" + txt + "\">Unpaired</span>&nbsp;";
		return {State: "unpaired", Txt: txt, Html: html}
	}
	static paired(p, n) { //Return an object indicating the current Pairs for the pair object provided
		let plural = " is";
		if(n > 1) {plural = "s are"}
		let txt = "Currently " + n + " definition plate" + plural + " paired to this result plate:\n";
		let broken = 0;
		p.Table.forEach(function(t, i) {
			if(i > 0) {txt += "\n"}
			txt += "- Range: " + t.RangeName + "; Plate: " + t.Name + " (#" + (t.Index + 1) + ")";
			if(t.Broken) {
				broken++;
				txt += " *Link Broken!*";
			}
		});
		let html = "<span class=\"";
		if(broken > 0) { //At least one definition is broken
			html += "Error\" style=\"font-size: 0.8em\" title=\"" + txt + "\">Pair broken (" + broken + "/" + n + ")</span>&nbsp;";
			return {State: "broken", Txt: txt, Html: html, Length: n}
		}
		else { //All is fine
			html += "Success\" style=\"font-size: 0.8em\" title=\"" + txt + "\">Paired (" + n + ")</span>&nbsp;";
			return {State: "paired", Txt: txt, Html: html, Length: n}
		}
	}
	static hasItem(pair, I) { //For the pair passed, checked if the item defined in the object is defined and return the index if yes
		return pair.Table.findIndex(function(t) {
			return(t.RangeName == I.RangeName);
		});
	}
	//Methods
	register(I) { //Register the item provided
		let previous = Pair.hasItem(this, I);
		if(previous > -1) { //This definition already has an item defined, update it
			let elt = this.Table[previous];
			elt.Index = I.DefPlateIndex;
			elt.Name = I.DefPlateName;
			elt.Broken = false;
		}
		else { //Nothing defined for this definition, define it
			this.Table.push({ //Push a new element for this definition in the table
				RangeName: I.RangeName,
				Index: I.DefPlateIndex,
				Name: I.DefPlateName,
				Broken: false,
			});
		}
		return this;
	}
	remove(I) { //Remove the elt matching the definition provided for this pair
		let index = Pair.hasItem(this, I);
		if(index > -1) { //If it exists...
			this.Table.splice(index, 1); //...Remove the element
		}
		return this;
	}
	state() { //Return the state of the Pair as an object containing overall status and text/html strings of the pair content
		let n = this.Table.length;
		if(n == 0) {return Pair.unpaired()}
		else {return Pair.paired(this, n)}
	}
	update(I) { //Check that all the definitions and plate listed in this object still exist and match the definition. Update when needed and report the current state
		let n = this.Table.length;
		if(n == 0) {return Pair.unpaired()}
		let validArray = []; //An array to push the definitions still existing
		this.Table.forEach(function(t, i) { //Loop the paired definitions
			let range = Editor.Tables.Areas.Array.find(function(a) {return a.Name == t.RangeName});
			if(range !== undefined) { //This range still exist
				let def = range.Definition;
				if(def !== undefined) { //If the definition still exists, try to salvage the plates
					if(def.PlateIndex.getValue() == t.Index && def.PlateIndex.Selected == t.Name) { //This is the expected plate
						t.Broken = false;
						validArray.push(t); //Push the valid pair
					}
					else { //This is not the expected plate
						if(def.PlateIndex.List[t.Index] == t.Name) { //The plate exist where expected in the definition, keep it and report as broken
							if(I === undefined || I.All == false) { //Broken state should not be triggered when updating all pairs following edition of the definitions
								t.Broken = true;
							}
							validArray.push(t); //Push the valid pair
						} 
					}
				} //All other cases means the definition has changed and we should delete the entry
			} //If the range doesn't exist, the validArray will be empty
		});
		this.Table = validArray; //Update the array
		n = validArray.length;
		if(n == 0) {return Pair.unpaired()} //Report the status
		else {return Pair.paired(this, n)}
	}
	setDefPlate() { //Set the value of the PlateSelect for all the paired definition to their paired values
		this.Table.forEach(function(t) {
			let range = Editor.Tables.Areas.Array.find(function(a) {return a.Name == t.RangeName});
			let def = range.Definition;
			if(def !== undefined) {def.PlateIndex.setValue(t.Index)} //If the definition exist, set the plate
			t.Broken = false;
		});
		return this;
	}
	getDefPlate(sourceArray) { //Return the paired values stored for each definition
		let O = []; //Output array
		sourceArray.forEach(function(r, i) { //For each range in the source array
			let pair = this.Table.find(function(t) {return r.Name == t.RangeName});
			if(pair !== undefined) {O.push({RangeIndex: i, DefPlateIndex: pair.Index})} //If the definition exist, add it to the output
		}, this);
		return O;
	}
	rename(oldName, newName) { //Rename the definition with oldName to newName
		this.Table.forEach(function(t) { //For each element in Table
			if(t.RangeName == oldName) {t.RangeName = newName} //Rename when needed
		});
		return this;
	}
	getPair(rangeName) { //Return the object data registered for this pair, for the range having the name passed 
		return this.Table.find(function(t) {return t.RangeName == rangeName});
	}
}