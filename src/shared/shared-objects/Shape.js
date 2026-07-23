//***************************************************
// SHAPE object - For plotting of shapes using canvas
//***************************************************
class Shape {
	constructor(I) {}
	//Static methods
	static text(ctx, I) { //Draw text on the canvas {Txt, X, Y, Config}
		if(I === undefined || I.Txt === undefined || I.Txt.length == 0) {return}
		ctx.save();
		let C = I.Config;
		ctx.font = Config.fontCanvas(C); //Generate the font text from the config
		if(C.Color !== undefined) {ctx.fillStyle = C.Color}
		if(C.Alpha !== undefined) {ctx.globalAlpha = C.Alpha}
		if(C.Align !== undefined) {ctx.textAlign = C.Align}
		if(C.BaseLine !== undefined) {ctx.textBaseline = C.BaseLine}
		if(C.Angle !== undefined) {ctx.rotate(C.Angle)}
		ctx.fillText(I.Txt, I.X, I.Y);
		ctx.restore();
	}
	static strokeNfill(ctx, border, bg) { //Apply stroke and fill to the path on the canvas using the shape and border configs
		if(border.Use) { //Stroke the border
			ctx.globalAlpha = border.Alpha;
			ctx.lineWidth = border.Size;
			ctx.strokeStyle = border.Color;
			ctx.stroke();
		}
		if(bg.Use) { //Fill the shape
			ctx.globalAlpha = bg.Alpha;
			ctx.fillStyle = bg.Color;
			ctx.fill();
		}
	}
	static stroke(ctx, border) { //Apply stroke to the path on the canvas using the border config
		ctx.globalAlpha = border.Alpha;
		ctx.lineWidth = border.Size; //Only this is from the border config, because this shape cannot be open
		ctx.strokeStyle = border.Color;
		ctx.stroke(); //No fill
	}
	/*static draw(ctx, shape, x, y, size, border, bg) { //Draw a shape on the canvas at position x, y, using the border and background configs
		switch(shape) {
			case "cross": this.__Cross(ctx, x, y, size, border); break; // +
			case "multiply": this.__Multiply(ctx, x, y, size, border); break; // x
			case "star": this.__Star(ctx, x, y, size, border); break; // * (cross + multiply)
			case "square": this.__Square(ctx, x, y, size, border, bg); break;
			case "up-triangle": this.__TriangleUp(ctx, x, y, size, border, bg); break;
			case "down-triangle": this.__TriangleDown(ctx, x, y, size, border, bg); break;
			case "losange": this.__Losange(ctx, x, y, size, border, bg); break;
			case "circle": this.__Circle(ctx, x, y, size, border, bg); break;
			case "rectangle": this.Rectangle(ctx, x, y, size, border, bg); break;
			case "line": this.Line(ctx, x, y, size, border); break;
			default: return this;
		}
	}*/
	//************************************************************************************************
	//LOW LEVELS METHODS FOR THE DRAWING OF BASIC SHAPE ELEMENTS ON CANVAS
	//All methods take the canvas 2d context (ctx) as input and work in a closed styling environement,
	//by invoking save()/restore() methods on the ctx each time. 
	//All methods also accept config objects as parameter for the border and background
	//All methods used special characters (__) in their property names to allow for filtering
	//************************************************************************************************
	static __Cross(ctx, x, y, size, border) { //Draw a cross centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y - size);
		ctx.lineTo(x, y + size);
		ctx.moveTo(x - size, y);
		ctx.lineTo(x + size, y);
		ctx.closePath();
		this.stroke(ctx, border);
		ctx.restore();
	}
	static __Multiply(ctx, x, y, size, border) { //Draw a multiply centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x - size, y - size);
		ctx.lineTo(x + size, y + size);
		ctx.moveTo(x - size, y + size);
		ctx.lineTo(x + size, y - size);
		ctx.closePath();
		this.stroke(ctx, border);
		ctx.restore();
	}
	static __Star(ctx, x, y, size, border) { //Draw a star centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x - size, y - size);
		ctx.lineTo(x + size, y + size);
		ctx.moveTo(x - size, y + size);
		ctx.lineTo(x + size, y - size);
		ctx.moveTo(x, y - size);
		ctx.lineTo(x, y + size);
		ctx.moveTo(x - size, y);
		ctx.lineTo(x + size, y);
		ctx.closePath();
		this.stroke(ctx, border);
		ctx.restore();
	}
	static __Square(ctx, x, y, size, border, bg) { //Draw a square centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x - size, y - size);
		ctx.lineTo(x + size, y - size);
		ctx.lineTo(x + size, y + size);
		ctx.lineTo(x - size, y + size);
		ctx.closePath();
		this.strokeNfill(ctx, border, bg);
		ctx.restore();
	}
	static __TriangleUp(ctx, x, y, size, border, bg) { //Draw a triangle (head up) centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y - size);
		ctx.lineTo(x + size, y + size);
		ctx.lineTo(x - size, y + size);
		ctx.lineTo(x, y - size);
		ctx.closePath();
		this.strokeNfill(ctx, border, bg);
		ctx.restore();
	}
	static __TriangleDown(ctx, x, y, size, border, bg) { //Draw a triangle (head down) centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y + size);
		ctx.lineTo(x + size, y - size);
		ctx.lineTo(x - size, y - size);
		ctx.lineTo(x, y + size);
		ctx.closePath();
		this.strokeNfill(ctx, border, bg);
		ctx.restore();
	}
	static __Losange(ctx, x, y, size, border, bg) { //Draw a losange centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y - size);
		ctx.lineTo(x - size, y);
		ctx.lineTo(x, y + size);
		ctx.lineTo(x + size, y);
		ctx.lineTo(x, y - size);
		ctx.closePath();
		this.strokeNfill(ctx, border, bg);
		ctx.restore();
	}
	static __Circle(ctx, x, y, size, border, bg) { //Draw a circle centered on (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.arc(x, y, size, 0, 2 * Math.PI);
		ctx.closePath();
		this.strokeNfill(ctx, border, bg);
		ctx.restore();
	}
	//************************************************************************************************
	static Rectangle(ctx, x, y, size, border, bg) { //Draw a rectangle having its top-left corner at (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + size.Width, y);
		ctx.lineTo(x + size.Width, y + size.Height);
		ctx.lineTo(x, y + size.Height);
		ctx.closePath();
		this.strokeNfill(ctx, border, bg);
		ctx.restore();
	}
	static Bar(ctx, x, y, size, border, bg) { //Draw a bar (= a rectangle without bottom border) having its bottom-left corner at (x,y)
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x, y - size.Height);
		ctx.lineTo(x + size.Width, y - size.Height);
		ctx.lineTo(x + size.Width, y);
		this.strokeNfill(ctx, border, bg);
		ctx.restore();
	}
	static errorBar(ctx, x, y, SD, border) { //Draw error bars centered on (x, y) using SD values and applying the border config given
		let l = border.Length; //Horizontal length
		let w = border.Size; //Line thickness
		let SDx = SD.x;
		let SDy = SD.y;
		ctx.save();
		ctx.globalAlpha = border.Alpha;
		ctx.fillStyle = border.Color;
		if(isNaN(SDx) == false && SDx > 0) { //Horizontal SD
			ctx.fillRect(x - SDx, y - w / 2, 2 * SDx, w); //Shift 1/2 * width on Y for the horizontal bar to sit in the middle
			ctx.fillRect(x - SDx - w / 2, y - l, w, 2 * l); //Left bar
			ctx.fillRect(x + SDx - w / 2, y - l, w, 2 * l); //Right bar
		}
		if(isNaN(SDy) == false && SDy > 0) { //Vertical SD
			ctx.fillRect(x - w / 2, y - SDy, w, 2 * SDy); //Shift 1/2 * width on X for the vertical bar to sit in the middle
			ctx.fillRect(x - l, y - SDy - w / 2, 2 * l, w); //Upper bar
			ctx.fillRect(x - l, y + SDy - w / 2, 2 * l, w); //Lower bar
		}
		ctx.restore();
	}
	/*static curve(ctx, array, c) { //Draw a curve passing through all the datapoints in array using the config given
		ctx.save();
		ctx.setLineDash(c.dash);
		ctx.lineWidth = c.size;
		ctx.strokeStyle = c.color;
		ctx.globalAlpha = c.alpha;
		ctx.beginPath();
		array.forEach(function(p, i) {
			if(i == 0) {ctx.moveTo(p.X, p.Y)}
			else {ctx.lineTo(p.X, p.Y)}
		}); 
		ctx.stroke(); //ctx.closePath() must NOT BE USED here as we don't want an extra line from the first to last point
		ctx.restore();
	}
	*/
	
	//************************************************************************************************
	//OTHER METHODS USED IN FORM_SHAPE
	//************************************************************************************************
	static shapeList() { //List available shapes by filtering through the low level methods
		let list = Object.getOwnPropertyNames(Shape).filter(function(a) { //Filter the properties for basic shapes
			return a.startsWith("__");
		});
		return list.map(function(a) {return a.substring(2)}); //Return the list, removing the __ prefix
	}
	static previewCanvas(canvas, shape, size, I) { //Draw a preview of the designated shape into the passed canvas
		if(shape == "") {return}
		let ctx = canvas.getContext("2d");
		let r = Grapher.PixelRatio;
		ctx.setTransform(r, 0, 0, r, 0, 0);
		let s = size / 2;
		if(I && I.Clear) {ctx.clearRect(0, 0, size, size)} //Reset the canvas first
		Shape["__" + shape](ctx, s, s, s - 2, {Use: true, Size: 2}, {Use: false});
	}
}