//*****************************************************************************
// BLOC object - First layer used to organize reporting of data in the analyzer
//*****************************************************************************
class Bloc {
	constructor(I) {
		this.ID = I.ID;
		this.Name = I.Name; //Internal name
		this.File = I.File; //Name of the file associated to this bloc
		this.Sections = [];
		this.SectionsTab = new TabControl({ //Tab to manipulate the Section objects
			ID: I.ID,
			Multiple: true,
			Layout: "Horizontal",
			Tabs: [],
		});
		return this;
	}
	//Static methods

	//Methods
	init() { //Initialize the bloc on the page
		this.SectionsTab.init();
		return this;
	}
	getSection(name, I) { //Return the section object with the given name, for the bloc provided
		let found = false;
		let i = 0;
		let sections = this.Sections;
		let l = sections.length;
		while(!found && i<l) { //Loop to see if the section exists
			if(sections[i].Name == name) {found = true}
			else {i++}
		}
		if(found) { //Section already exists
			let section = this.Sections[i];
			if(I !== undefined && (I.Type == "Multiple" || I.Type == "StatsTable")) { //Special case for these tables
				if(I.Changed == false) {return section} //No changes means we can keep aggregating using the same section
				else {return this.resetSection(name, i, I)} // In this case, must recompute the section but the index remains
			}
			else {return section}
		}
		else {return this.newSection(name, i, I)} //Create the section
	}
	newSection(name, index, I) { //Create a new section for this bloc
		let section = this.initSection(name, index, I);
		this.Sections.push(section);
		this.SectionsTab.addTab({Label: name, SetActive: true, Content: {Type: "HTML", Value: section.HTML(name)} });
		section.activateControls(); //Activate the controls
		return section;
	}
	initSection(name, index, I) {
		let id = this.ID + "_" + index;
		let prop = {Name: name, Bloc: this, ID: id};
		if(I) {Object.assign(prop, I)} //"Concat" properties of I and param
		let section = new Section(prop);
		return section;
	}
	resetSection(name, index, I) { //Reset the contents of the section at index i
		let section = this.initSection(name, index, I); //Recompute the section at the same index
		this.Sections[index] = section; //Replace old section
		this.SectionsTab.Tabs[index].updateContent({Type: "HTML", Value: section.HTML(name)}) //Update the tab
		section.activateControls(); //Activate the controls
		return section; //Return the newly created section
	}
}