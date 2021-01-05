//**************************************************************************************
// PARAMETER object - Handling of data attached to parameters extracted from result file
//**************************************************************************************
class Parameter {
	constructor(name, unit) {
		this.ID = undefined; //ID for the heatmap element. Will be assigned before drawing
		this.Name = name //Parameter name, for html display
		this.Unit = (unit || ""); //Unit in which values of this parameter are expressed
		this.Selected = false; //Parameter is selected for output
		this.Numeric = undefined; //This parameter has numeric or textual values
		this.GlobalMin = +Infinity; //Minimum numerical value found for the entire file
		this.GlobalMax = -Infinity; //Maximum numerical value found for the entire file
		this.Grid = document.createElement("canvas");
		this.Highlight = document.createElement("canvas");
		[this.Grid, this.Highlight].forEach(function(c) { //Apply styling
			c.style.position = "absolute";
		});
		return this;
	}
	//Static methods
	static getMinMax(p, data, I) { //For the parameter object passed, return the values of min and max to use for a heatmap of values in data
		let min = p.GlobalMin; //Defines the min & max values to use
		let max = p.GlobalMax;
		if(I) {
			if(I.Local) { //Use min/max values for this plate
				min = data.reduce(function(min, cur) { //The minimum value for this plate
					if(isNaN(cur)) {return min}
					else {return Math.min(min, cur)}
				}, +Infinity);
				max = data.reduce(function(max, cur) { //The maximum value for this plate
					if(isNaN(cur)) {return max}
					else {return Math.max(max, cur)}
				}, -Infinity);
			}
			else { //Use the values provided by the user
				min = I.Min;
				max = I.Max;
			}
		}
		return {Min: min, Max: max}
	}
	//Methods
	resize(plate) { //Resize the canvases to match that of the plate
		[this.Grid, this.Highlight].forEach(function(c) { //Resize the elements
			c.width = plate.Grid.width;
			c.height = plate.Grid.height;
		});
		return this;
	}
	grid(plate) { //Redraw the grid with the dimensions from the plate
		let size = plate.WellSize;
		let space = size + plate.WellMargin;
		let ctx = this.Grid.getContext("2d");
		ctx.drawImage(plate.Grid, 0, 0); //Draw the grid from the plate
		ctx.lineWidth = 2;
		ctx.strokeStyle = "red"; //Draw a "x" in each well, that will remain visible if no data is present for this well
		let row = plate.Rows;
		let col = plate.Cols;
		for(let i=0;i<row;i++) { //Rows
			for(let j=0;j<col;j++) { //Columns
				let x = (j + 1) * space;
				let y = (i + 1 ) * space;
				ctx.beginPath();
				ctx.moveTo(x + size * 0.2, y + size * 0.2);
				ctx.lineTo(x + size * 0.8, y + size * 0.8);
				ctx.moveTo(x + size * 0.8, y + size * 0.2);
				ctx.lineTo(x + size * 0.2, y + size * 0.8);
				ctx.stroke();
			}
		}
		return this;
	}
	heatmap(value, index, plate, Gradcolors, min, max) { //Draw the provided value at the well location in the heatmap
		if(value === undefined || isNaN(value)) {return this}
		let ctx = this.Grid.getContext("2d");
		let size = plate.WellSize;
		let margin = plate.WellMargin;
		let space = size + margin;
		let row = Math.floor(index / plate.Cols);
		let col = index - (row * plate.Cols);
		ctx.fillStyle = CSSCOLORS.heatmap(value, min, max, Gradcolors);
		ctx.fillRect((col + 1) * space, (row + 1 ) * space, size, size);
		return this;
	}
	txt(value, index, plate) { //Draw the text content for textual parameters
		if(value === undefined) {return this}
		let ctx = this.Grid.getContext("2d");
		let size = plate.WellSize;
		let margin = plate.WellMargin;
		let space = size + margin;
		let row = Math.floor(index / plate.Cols);
		let col = index - (row * plate.Cols);
		let x = (col + 1) * space;
		let y = (row + 1 ) * space;
		ctx.fillStyle = "white";
		ctx.fillRect(x, y, size, size);
		ctx.fillStyle = "black";
		ctx.font = (Math.floor(margin / 2) * 2 + 3) + "px arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(value, x + size * 0.5, y + size * 0.5, size); //MaxWidth specified to avoid excessive overlap
		return this;
	}
	draw(result, p) { //Output the heatmap in the root element
		let target = GetId(this.ID);
		target.innerHTML = ""; //Remove previous content
		target.style.width = this.Grid.width + "px"; //Adjust container size
		target.style.height = this.Grid.height + "px";
		target.appendChild(this.Highlight);
		target.appendChild(this.Grid); //Append the canvas
		let plate = Editor.Plate;
		let timeOut = undefined;
		target.addEventListener("mousemove", function(e) { //Attach events to the div
			if(e.target.nodeName != "CANVAS") {return}
			let lay = Editor.ResultManager.LayerSelect.Selected - 1; //The layer to use to display information in the tooltip
			let w = plate.wellAtPointer(e, plate.Layers[lay]);
			let popup = GetId(Editor.Anchors.Popup.Root);
			popup.style.left = e.clientX + 10 + "px";
			popup.style.top = e.clientY - 40 + "px";
			if((plate.Highlighting && plate.Highlighting.Index != w.Index) || (plate.Highlighting === undefined)) { //A different well is being highlighted, or nothing is currently highlighted
				plate.highlight(e, w);
				if(timeOut) {
					clearTimeout(timeOut);
					plate.infoPopup(); //hide the popup
				}
//******************************************************************************
//When executing the plate.infoPopup function within the setTimeout method, 
//the "this" context inside infoPopup is changed to window and no longer points
//to the plate Object. So binding of the plate object is necessary to recover
//the expected this context within infoPopup.
				//timeOut = setTimeout(plate.infoPopup.bind(plate), 500, e, w, result.getValue(index, w)); //Show the popup after 500ms of mouse inactivity
				timeOut = setTimeout(plate.infoPopup.bind(plate), 500, e, w, {Result: result, Parameter: p}); //Show the popup after 500ms of mouse inactivity
//******************************************************************************
			}
		}.bind(this));
		target.addEventListener("mouseout", function(e) {
			plate.highlight();
			if(timeOut) {clearTimeout(timeOut)}
			plate.infoPopup(); //hide the popup
		}.bind(this));
		target.addEventListener("wheel", function(e) {
			plate.highlight();
			if(timeOut) {clearTimeout(timeOut)}
			plate.infoPopup(); //hide the popup
		}.bind(this));
		return this;
	}
	highlight(array) { //Draw the highlight image at the coordinates provided. Each element in array is an object specifying the image to draw and the coordinates x and y
		let hl = this.Highlight;
		let ctx = hl.getContext("2d");
		ctx.clearRect(0, 0, hl.width, hl.height); //Reset the drawing
		if(array.length > 0) {
			array.forEach(function(a) {
				ctx.drawImage(a.Image, a.x, a.y); //Apply the image
			});
		}
		return this;
	}
}