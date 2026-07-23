//**********************************************************************
// FORM_COLOR - Form displaying a list of colors for the user to choose
//**********************************************************************
function Form_Color(I) { //I.Caller should be a LinkCtrl Object, or an object with setValue() and getValue() methods defined
	this.Selected = "white";
	if(I && I.Caller) {this.Selected = I.Caller.getValue()}
	let txt = "";
	CSSCOLORS.list().forEach(function(c) { //Append all available colors
		txt += "<div class=\"ColorBlock\" style=\"float: left; background-color: " + c + "\" title=\"" + c + "\"></div>";
	});
	txt += "<div style=\"clear: both; padding-top: 10px; text-align: center\">Selected:&nbsp;";
	txt += "<span id=\"Form_ColorSelected\" class=\"ColorBlock\" style=\"background-color: " + this.Selected + "\" title=\"" + this.Selected + "\">&nbsp;&nbsp;&nbsp;&nbsp;</span>";
	txt += "</div>";
	let id = "Form_Color";
	Form.open({
		ID: id,
		HTML: txt,
		Title: "Color Picker",
		Buttons: [
			{
				Label: "Ok",
				Title: "Apply the selected color",
				Click: function() {
					if(I) {
						let color = this.Selected;
						if(I.Caller) {I.Caller.setValue(color)}
						if(I.after) {I.after(color)}
					}
					Form.close(id);
				}.bind(this),
			},
			{
				Label: "Cancel",
				Click: function() {Form.close(id)}
			}
		],
		onInit: function() {
			let span = GetId("Form_ColorSelected");
			let collection = document.getElementsByClassName("ColorBlock");
			let l = collection.length;
			for(let i=0;i<l;i++) {
				collection.item(i).addEventListener("click", function(e) {
					let c = e.target.style.backgroundColor;
					this.Selected = c;
					span.style.backgroundColor = c;
					span.title = c;
				}.bind(this));
			}
		}.bind(this),
	});
}