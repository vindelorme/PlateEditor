//**********************************************************************
// FORM_SHAPE - Form displaying a list of shapes for the user to choose
//**********************************************************************
function Form_Shape(I) { //I.Caller should be a LinkCtrl Object, or an object with setValue() and getValue() methods defined
	this.Selected = "";
	let S = 20; //Size of the box representing the shape
	if(I) {
		if(I.Size) {S = I.Size} 
		if(I.Caller) {this.Selected = I.Caller.getValue()}
	}
	let txt = "<div style=\"display: flex; width: 80%; margin: auto;\">";
	let R = Grapher.PixelRatio;
	Shape.shapeList().forEach(function(c) { //Create a block with canvas for each available shape;
		txt += "<div class=\"ShapeBlock\" style=\"float: left;\" title=\"" + c + "\">";
		txt += "<canvas id=\"" + c + "\" width=\"" + (S * R) + "\" height=\"" + (S * R) + "\" style=\"width: " + S + "px; height: " + S + "px; vertical-align: center\"></canvas>";
		txt += "</div>";
	});
	txt += "</div><div style=\"clear: both; padding-top: 10px; text-align: center\">Selected:&nbsp;";
	txt += "<span>";
	txt += "<canvas id=\"Form_ShapeSelected\" width=\"" + (S * R) + "\" height=\"" + (S * R) + "\" style=\"width: " + S + "px; height: " + S + "px; vertical-align: center\"></canvas>";
	txt += "</span>";
	txt += "</div>";
	let id = "Form_Shape";
	Form.open({
		ID: id,
		HTML: txt,
		Title: "Shape selector",
		Buttons: [
			{
				Label: "Ok",
				Title: "Apply the selected Shape",
				Click: function() {
					if(I) {
						let shape = this.Selected;
						if(I.Caller) {I.Caller.setValue(shape)}
						if(I.after) {I.after(shape)}
					}
					Form.close(id);
				}.bind(this),
			},
			{
				Label: "Cancel",
				Click: function() {Form.close(id)}
			}
		],
		onInit: function() { //Draw the shapes and activate the click behavior
			let out = GetId("Form_ShapeSelected");
			Shape.previewCanvas(out, this.Selected, S);
			let collection = document.getElementsByClassName("ShapeBlock");
			let l = collection.length;
			for(let i=0;i<l;i++) {
				let div = collection.item(i);
				let canvas = div.children[0];
				Shape.previewCanvas(canvas, div.title, S);
				div.addEventListener("click", function(e) {
					let c = e.target.id;
					this.Selected = c;
					Shape.previewCanvas(out, this.Selected, S, {Clear: true}); //Clear previous drawing to avoid overlap
				}.bind(this));
			}
		}.bind(this),
	});
}