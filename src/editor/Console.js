//******************************************************************
//CONSOLE Object - For feedback and status notifications to the user
//******************************************************************
class EditorConsole {
	constructor(id) {
		this.ID = id;
		this.MaxLog = 20; //Max number of messages to log
		this.CurrentLog = 0; //Current nb of logged messages
		return this;
	}
	static message(gravity, message) { //Return the message matching the gravity 
		//let html = "<span style=\"color:";
		let html = "";
		switch(gravity) {
			case "Error": html += LinkCtrl.icon({Type: "Cancel", Color: "Red"}) + "<span style=\"color: firebrick\">"; break; //<span class=\"ConsoleIcon\" style=\"background-position: 0px -144px; filter: sepia(100%) saturate(1500%)\"></span> ";
			case "Warning": html += LinkCtrl.icon({Type: "Warning", Color: "Yellow"}) + "<span style=\"color: sienna\">"; break; //<span class=\"ConsoleIcon\" style=\"background-position: -16px -144px; filter: sepia(100%) saturate(500%)\"></span> ";
			case "Success": html += LinkCtrl.icon({Type: "Ok", Color: "Green"}) + "<span style=\"color: darkgreen\">"; break; //<span class=\"ConsoleIcon\" style=\"background-position: -64px -144px; filter: sepia(100%) saturate(2000%) hue-rotate(100deg)\"></span> ";
			default: break;
		}
		html += message + "</span>";
		return html;
	}
	//Methods
	log(I) { //Log message I in the console
		let me = GetId(this.ID);
		let html = "";
		if(this.CurrentLog == 0) {me.innerHTML = ""}
		html += "<div>" + new Date().toLocaleTimeString() + ": " + EditorConsole.message(I.Gravity, I.Message) + "</div>";
		this.CurrentLog++;
		if(I.Reset) {me.innerHTML = html}
		else {me.insertAdjacentHTML("beforeend", html)}
		me.scrollTo({top: me.scrollHeight, behavior: "smooth"});
		if(I.Gravity != "Success") {window.scrollTo({top: 0, behavior: "smooth"})}
		if(this.CurrentLog > this.MaxLog) {me.children[0].remove()}
	}
	reset() { //Reset all the messages
		let me = GetId(this.ID);
		me.innerHTML = "";
	}
}