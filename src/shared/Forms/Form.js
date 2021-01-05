//*********************************************************************************
// FORM object - Object representing a form that will pop-up to request user inputs
//*********************************************************************************
class Form {
	constructor() {}
	//Static Methods
	static open(I) { //Open the form with the provided options: ID, Title, Size, Buttons, HTML, OnInit
		if(I === undefined) {console.error("No options provided to Form.open(). Aborted"); return} //Check for options
		let id = I.ID;
		if(id === undefined || id === "") {console.error("No id provided to Form.open(). Aborted"); return} //Check for id
		if(this.Dialogs) { //Property already defined, add the mask only if no dialog opened
			if(this.Dialogs == 0) {this.addMask()}
			this.Dialogs++;
		}
		else { //First use, create the static property and add the mask
			this.Dialogs = 1;
			this.addMask();
		}
		if(this.Dialogs > 1) { //Remove the mask and append a new one to allow only the last form to be active
			document.getElementsByClassName("Form_Mask")[0].remove();
			this.addMask(); //Calling this method ensures the mask is after the previous form and will have the move event attached
		}
		this.initForm(I); //Create the form
	}
	static close(id) { //Close the form with the provided id
		if(id === undefined || id === "") {console.error("No options provided to Form.close(). Aborted"); return} //Check for id
		let f = GetId(id);
		if(f) {f.remove()} //Remove the form if it exists
		this.closeMask(); //Remove the mask
		if(this.Dialogs) { 
			this.Dialogs--;
			if(this.Dialogs > 0) {this.addMask({Location: "beforebegin"})} //If there are remaining forms, add the mask before the last form
		}
	}
	static replaceButtons(id, buttons) { //Replace the buttons of the form with the provided id, using the new buttons provided in input (array of button objects)
		let f = GetId(id);
		if(f === null) {console.warn("Form '" + id + "' not accessible for buttons replacement"); return this}
		if(buttons === undefined) {buttons = []}
		let footer = f.getElementsByClassName("Form_Footer");
		footer[0].replaceWith(this.footer({Buttons: buttons}));
	}
	//These methods are for internal use and should not be called directly
	static addMask(I) { //Create a mask in the document to create the background and give modal effect
		let mask = document.createElement("div");
		mask.className = "Form_Mask";
		if(I && I.Location) {document.body.lastChild.insertAdjacentElement(I.Location, mask)} //Location provided
		else {document.body.append(mask)} //Default
		mask.addEventListener("mousemove", function(e) {this.move(e)}.bind(this)); //Move event taken over by the mask, in case the movement from the header are too fast
	}
	static closeMask() { //Remove the mask to free the page
		let mask = document.getElementsByClassName("Form_Mask")[0];
		if(mask) {mask.remove()}
	}
	static initForm(I) { //Create the div that will host the form
		let f = document.createElement("div");
		f.className = "Form_Wrapper";
		f.id = I.ID;
		let size = (I.Size || 400);
		f.style.width = size + "px";
		f.style.left = ((window.innerWidth - size) / 2) + window.pageXOffset + (15 * (this.Dialogs - 1)) + "px"; //Position the form at the center of the page, with an offset in case of multiple forms
		f.style.top = (window.innerHeight / 4) + window.pageYOffset + (15 * (this.Dialogs - 1)) + "px"; //Position the form close to the top, with an offset in case of multiple forms
		f.innerHTML = this.header(size, I) + this.body(I);
		f.append(this.footer(I)); //Footer is created as a node and added
		document.body.append(f); //Add the element to the page
		if(I.onInit) {I.onInit()} //User function to run on opening the dialog
		f.getElementsByClassName("Form_Closure")[0].addEventListener("click", function() { //Add a closure event on the red cross button in the right corner
			if(I.onCancel) {I.onCancel()}
			Form.close(f.id);
		});
		f.getElementsByClassName("Form_Header")[0].addEventListener("mousemove", function(e) {this.move(e, f)}.bind(this)); //Move event on the header
		f.addEventListener("mousemove", function(e) {this.move(e)}.bind(this)); //Move event on the form div to take over mouse movements too fast and "spilling over"
	}
	static header(size, I) { //Header of the form. Receives the options as well as the desired width for the form
		let html = "<div class=\"Form_Header\">";
		if(I.Title) { //Title of the dialog
			let w = size - 50; //Leave some space for the closure
			html += "<div class=\"Form_Title\" style=\"width: " + w + "px\">" + I.Title + "</div>";
		}
		html += "<div class=\"Form_Closure\" title=\"Close\">&times;</div>";
		html += "</div>";
		return html;
	}
	static body(I) { //Form body
		let html = "<div class=\"Form_Body\">";
		if(I.HTML) {html += I.HTML}
		html += "</div>";
		return html;
	}
	static footer(I) { //Footer section with buttons. Created as a node because buttons have functions attached to them
		let footer = document.createElement("div");
		footer.className = "Form_Footer";
		if(I.Buttons) {
			I.Buttons.forEach(function(b, i) {
				if(i > 0) {footer.insertAdjacentHTML("beforeend", "&nbsp;")} //To space the buttons evenly
				footer.append(LinkCtrl.button(b));
			});
		}
		return footer;
	}
	static move(e, f) { //Move the form f following mouse position in event e
		if(e.buttons == 1) {
			let m = this.Moving;
			if(m) {
				let f = this.Moving.Form;
				f.style.top = (m.Top - (m.StartY - e.clientY)) + "px";
				f.style.left = (m.Left - (m.StartX - e.clientX)) + "px";
			}
			else {
				if(f) {
					this.Moving = {StartX: e.clientX, StartY: e.clientY, Top: f.offsetTop, Left: f.offsetLeft, Form: f}
				}
			}
		}
		else {this.Moving = undefined}
	}
}