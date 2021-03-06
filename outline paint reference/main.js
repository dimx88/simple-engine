let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let palette_canvas = document.getElementById('palette');
let brush_canvas = document.getElementById('brush');


let global = {inline_color:'#ffffff', outline_color:'#000000', brush_inner_radius:7.5, brush_outer_radius:0, alpha:1, round_brush:true, background_color: canvas.style.backgroundColor};

let mouse = new Mouse();

let palette = new Palette(palette_canvas, global);


let history = [];
let max_history_steps = 30;
let snapshot_frequency = 50;
let snapshot_timer = 0;


let initial_line_width = global.brush_inner_radius * 2;
let outline_width = global.brush_outer_radius * 2;

let inline_color = global.inline_color;
let outline_color = global.outline_color;

let brushDisplay = new BrushDisplay(brush_canvas, global);


let layers = [new Layer(canvas), new Layer(canvas)];
current_layer = layers[0];

let line_start = {x:null, y:null};

let smudge_mode = false;
let line_mode = false;

let reference = new ReferenceModule();

initialize();
render();





function initialize() {
	for (let i in layers) {
		layers[i].ctx.lineWidth = initial_line_width;
		layers[i].ctx.lineCap = 'round';
		layers[i].ctx.lineJoin = 'round';
		layers[i].ctx.strokeStyle = inline_color;
		layers[i].ctx.fillStyle = inline_color;
	}
	
	history.push(takeSnapshot());
	// ctx.save();
	// layers[0].ctx.fillStyle = global.background_color;
	// layers[0].ctx.fillRect(0, 0, layers[0].canvas.width, layers[0].canvas.height);
	// ctx.restore();

}





let smudge_size = global.brush_inner_radius;
let image_data;
function smudge() {

	image_data = layers[0].ctx.getImageData(mouse.x - smudge_size/2, mouse.y - smudge_size/2, smudge_size, smudge_size);
	
	
	
	let avarage = getAvarageColorFromImageData(image_data);
	
	// layers[0].ctx.clearRect(50, 50, 50, 50);
	// layers[0].ctx.fillStyle = avarage.color;
	// layers[0].ctx.globalAlpha = avarage.alpha;
	//layers[0].ctx.putImageData(image_data, 100, 100); // future ideas

	
	let _ctx = layers[0].ctx;
	_ctx.save();
	//_ctx.lineWidth = smudge_size;
	_ctx.globalAlpha = avarage.alpha*0.1;
	_ctx.strokeStyle = avarage.color;
	_ctx.beginPath();
	_ctx.moveTo(mouse.prev_x, mouse.prev_y);
	_ctx.lineTo(mouse.x, mouse.y);
	_ctx.stroke();
	
	_ctx.restore();
	
	
	
	
	render();
	
	//ctx.strokeRect(mouse.x-smudge_size/2, mouse.y-smudge_size/2, smudge_size, smudge_size);  // .hacky. show smudge area
}

function getAvarageColorFromImageData(image_data) {
	let data = image_data.data;
	let R, G, B, A;
	R = G = B = A = 0;
	let iterations = 0;
	
	
	for (let i = 0; i < image_data.data.length-4; i += 4) {	
		R += data[i];
		G += data[i+1];
		B += data[i+2];
		A += data[i+3];
		iterations++;
	}	
	R /= iterations;
	G /= iterations;
	B /= iterations;
	A /= iterations;
	A /= 255;
	let rgb = 'rgb(' + R + ',' + G + ',' + B + ')';
	
	return {color:rgb, alpha:A};
  }
//--------------------- Events -----------------------------

function onInlineWidthSliderChange() {;
	let _width = parseInt(document.getElementById('inline_slider').value);
	//smudge_size = _width;
	setLineWidthTo(_width);

}

function onOutlineWidthSliderChange() {;
	outline_width = parseInt(document.getElementById('outline_slider').value);
	global.brush_outer_radius = outline_width/2;
	brushDisplay.updateDisplay();
}

function onAlphaSliderChange() {;
	value = parseInt(document.getElementById('alpha_slider').value) / 100;
	global.alpha = value;
	brushDisplay.updateDisplay();
}

function changeBrushType() {
	global.round_brush = !global.round_brush;
	brushDisplay.updateDisplay();
}

this.onmousemove = function(e) {
	
	if (mouse.left_down && !mouse.right_down) {
		if (line_mode) {
			drawLine();
			record();
		} else {
		drawLineSegment(layers[0].ctx);
		record();
		}
	}

	
	if (mouse.left_down || mouse.right_down)
		render();
}

this.onmousedown = function(e) {
	if (e.target === canvas || e.target === palette_canvas) e.preventDefault();
	if (e.target === brush) changeBrushType();
	if (e.target === palette_canvas && e.button === 0) {
			let _color = palette.getColorAtCursor();
			setColor(_color);
	}else if (e.target === palette_canvas && e.button === 1) {
			let _color = palette.getColorAtCursor();
			outline_color = global.outline_color = _color;
			brushDisplay.updateDisplay();
	}
	if (e.target === canvas) {
		if (e.button === 0 && !mouse.right_down && !line_mode) {
			drawLineSegment(layers[0].ctx);
			history.push(takeSnapshot());
		} else if (e.button === 0 && !mouse.right_down && line_mode) {
			line_start.x = mouse.x;
			line_start.y = mouse.y;
			drawLine();
			line_mode = true;
			history.push(takeSnapshot());
		} else if (e.button === 2 && !mouse.left_down) {
			setColor(sampleColor());
		} else if (e.button === 1) {
			
		}
	}

	if (e.target != canvas) {
		mouse.left_down = false;
	}
	render();
}

function toggleLineMode() {
	line_mode = !line_mode;

}
function drawLine() {
	/*	//Draw Inner Line						segment draw for reference
	_ctx.save();
	_
	_ctx.beginPath();
	_ctx.moveTo(mouse.prev_x, mouse.prev_y);
	_ctx.lineTo(mouse.x, mouse.y);
	_ctx.stroke();
	
	_ctx.restore();
	*/
	if (!line_start.x) return;
	
	buffer_ctx = layers[1].ctx;
	buffer_canvas = layers[1].canvas;
	
	buffer_ctx.save();
	buffer_ctx.lineCap = 'square';
	buffer_ctx.lineJoin = 'bevel';
	
	buffer_ctx.globalAlpha = global.alpha;
	buffer_ctx.clearRect(0, 0, buffer_canvas.width, buffer_canvas.height);
	buffer_ctx.beginPath();
	buffer_ctx.moveTo(line_start.x, line_start.y);
	buffer_ctx.lineTo(mouse.x, mouse.y);
	buffer_ctx.stroke();

	buffer_ctx.restore();
}

function sampleColor() {
	   let _data = ctx.getImageData(mouse.x, mouse.y, 1, 1).data;
	   let r = _data[0];
	   let g = _data[1];
	   let b = _data[2];
	   if (r + g + b === 0) return null;
		return 'rgb(' + r + ',' + g + ',' + b + ')';
	
}

this.onmouseup = function(e) {
	if (e.button === 2) {
		//flattenImage();
	}
	if (line_mode && e.button === 0) {
		line_start = {x:null, y:null};
		flattenImage();
	}
	if (smudge_mode && !mouse.left_down && !mouse.right_down) {		//smudge mode just released
		smudge_mode = false;
	}
	
	render();

}

this.oncontextmenu = function(e) {
	e.preventDefault();
}

this.onmousewheel = function(e) {
	setLineWidth(e.deltaY > 0 ? -2 : 2);
	//smudge_size = global.brush_inner_radius;
}

this.onkeydown = function(e) {

	render();
}

this.onkeyup = function(e) {
		
		if (e.code === "KeyZ") undo();
}

//--------------------------------------


function setLineWidth(diff) {
	for (let i in layers) {
		layers[i].ctx.lineWidth += diff;
	}
	global.brush_inner_radius = layers[0].ctx.lineWidth/2;
	brushDisplay.updateDisplay();
}

function setLineWidthTo(val) {
	for (let i in layers) {
		layers[i].ctx.lineWidth = val;
	}
	global.brush_inner_radius = val/2;
	brushDisplay.updateDisplay();
}


function setColor(color) {
	for (let i in layers) {
		layers[i].ctx.strokeStyle = color;
		layers[i].ctx.fillStyle = color;
	}
	global.inline_color = color;
	brushDisplay.updateDisplay();
}


function createCanvas(id, width, height, bool_border = true) {
		let _canvas = document.createElement('canvas');
		_canvas.id = id;
		_canvas.width = width;
		_canvas.height = height;
		if (bool_border) { _canvas.style.border = '1px solid black'; }
		//document.body.appendChild(_canvas);
		return _canvas;
}
//
function lerp(start, end, amt) {
	return start + (end-start) * amt;
}

function Line(p1, p2) {
	const diagonal = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
	let points = [];
	let inv_diagonal = 1/diagonal;
	for (let i = 0; i <= diagonal; i++) {
		const x = Math.round( lerp(p1.x, p2.x, i*inv_diagonal) );
		const y = Math.round( lerp(p1.y, p2.y, i*inv_diagonal) );
		points.push({x:x, y:y});
	}
	return points;
}

function drawLineSegment(_ctx) {

	if (global.round_brush)
		drawLineSegmentRound(_ctx);
	else
		drawLineSegmentSquare(_ctx);
}
function drawLineSegmentSquare(_ctx) {
	_ctx.save();
	_ctx.globalAlpha = global.alpha;
	
	let size = _ctx.lineWidth;
	
	const points = new Line({x:mouse.prev_x, y:mouse.prev_y}, {x:mouse.x, y:mouse.y});
	for (let i in points) {
		_ctx.fillRect(points[i].x-size/2, points[i].y-size/2, size, size); 
	}
	
	_ctx.restore();
}
//
function drawLineSegmentRound(_ctx) {
	//Draw Inner Line
	_ctx.save();
	_ctx.globalAlpha = global.alpha;
	_ctx.beginPath();
	_ctx.moveTo(mouse.prev_x, mouse.prev_y);
	_ctx.lineTo(mouse.x, mouse.y);
	_ctx.stroke();
	
	_ctx.restore();
	
	//const draw_outline = true;
	
	if (global.brush_outer_radius < 1) return;
	
	//Draw outline
	_ctx.save();
	_ctx.globalAlpha = global.alpha;	
	_ctx.globalCompositeOperation ='destination-over';
	_ctx.beginPath;
	_ctx.lineWidth += outline_width;
	_ctx.strokeStyle = outline_color;
		
	_ctx.moveTo(mouse.prev_x, mouse.prev_y);
	_ctx.lineTo(mouse.x, mouse.y);
	_ctx.stroke();
		
	_ctx.restore();
	
	

}

function flattenImage() {
	layers[0].ctx.drawImage(layers[1].canvas, 0, 0);
	layers[1].ctx.clearRect(0, 0, layers[1].canvas.width, layers[1].canvas.height);
}


function showDebug() {
	return;
	ctx.font = '14px Arial';
	let offset_from_top = 20;
	let vertical_spacing = 20;
	let messages = 	[
					];

	for (let i in messages) {
		ctx.fillText(messages[i], 10, vertical_spacing * i + offset_from_top);
	}
}

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	
	for (let i in layers) 
		ctx.drawImage(layers[i].canvas, 0, 0);
	
	renderFrame();
	
}

function record() { 
	//return;	//currently not working

	if (++snapshot_timer % snapshot_frequency != 0) return;

	if (history.length >= max_history_steps) {	//trim snapshots above allowed max
		history.splice(0, 1)	//delete oldest snapshot to make room for a new one
	}
	
	history.push(takeSnapshot());
	
}

function takeSnapshot() {
	//console.log('snapshot');
	return layers[0].ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function undo() {
	if (history.length <= 0) return;
	 
	flattenImage();
	layers[0].ctx.putImageData(history.pop(), 0, 0);
	render();
	//console.log('undo');
	
}

function loadReference(e) {
	var output = document.getElementById('reference');
    let fl = URL.createObjectURL(event.target.files[0]);
	output.style.backgroundImage = 'url(' + fl + ')';
	referenceModule.resetImage();
}






function renderFrame() {
	const diameter = 20;
	ctx.fillStyle = '#dddddd';
	ctx.fillRect(0, 0, canvas.width, diameter);
	ctx.fillRect(canvas.width - diameter, 0, canvas.width - diameter, canvas.height);
	ctx.fillRect(0, canvas.height - diameter, canvas.width, canvas.height);
	ctx.fillRect(0, 0, diameter, canvas.height);
}

function mergeImageWithBackground() {
	
	let buffer_canvas = createCanvas('buffer', canvas.width, canvas.height);
	let buffer_ctx = buffer_canvas.getContext('2d');
	buffer_ctx.fillStyle = canvas.style.backgroundColor;
	buffer_ctx.fillRect(0, 0, buffer_canvas.width, buffer_canvas.height);
	let img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
	buffer_ctx.drawImage(canvas, 0, 0);
	return buffer_canvas;
	
	
}

function download()  {

	var element = document.createElement('a');
	//element.setAttribute('href', canvas.toDataURL('image/png'));
 
	let img = mergeImageWithBackground();
  
	element.setAttribute('href', img.toDataURL('image/png'));
	element.setAttribute('download', 'drawing.png');
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);

}

