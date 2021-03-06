class ImageCropper {	
	
	
	constructor(canvas, width, height) {
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx = this.canvas.getContext('2d');
		this.mouse = {x:0, y:0, prev_x:0, prev_y:0, left_down:false, right_down:false};
		this.image = new Image();
		
		this.image_offset = {x:0, y:0};
		
		this.buffer_canvas = this.createBufferCanvas();
		this.buffer_ctx = this.buffer_canvas.getContext('2d');
		
		this.path = [];
		
		
		this.state;
		this.states = {IDLE:'idle', CROPPING:'cropping', PANNING:'panning'};
		this.setState(this.states.IDLE);
		
		
		addEventListener('mousedown', this.onMouseDown.bind(this));
		addEventListener('mouseup', this.onMouseUp.bind(this));
		addEventListener('mousemove', this.onMouseMove.bind(this));
		
		this.ctx.fillStyle = 'white';
		this.ctx.strokeStyle = 'white';
		
		this.ctx.lineWidth = 4
		
		this.selection_bounding_box = null;
	}
	
	setImage(img) {
			this.image.src = img;
			this.image.onload = function() {
					this.ctx.drawImage(this.image, 0, 0);
					this.image_offset = {x:0, y:0};
				}.bind(this);
	}
	

	
	update(e) {
		if (e.target !== this.canvas) return;
		switch(this.state) {
			case this.states.IDLE:
				this.idleState();
			break;
			
			case this.states.CROPPING:
				this.croppingState();
			break;
			
			case this.states.PANNING:
				this.panningState();
			break;
		}
		
		
	}
	
	getMidPoint() {
		let avg = {x:0, y:0};
		for (let i in this.path) {
			avg.x += this.path[i].x;
			avg.y += this.path[i].y;
		}
		avg.x /= this.path.length;
		avg.y /= this.path.length;
		return avg;
	}
	
	copySelectionToBuffer(path) {
		this.buffer_ctx.save();
		this.drawPath(path, this.buffer_ctx, false);
		this.buffer_ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.buffer_ctx.clip();	
		this.buffer_ctx.drawImage(this.image, this.image_offset.x, this.image_offset.y);
		this.buffer_ctx.restore();
	}
	
	idleState() {
		if (this.mouse.left_down && !this.mouse.right_down) {
			this.path = [];
			this.setState(this.states.CROPPING);
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.drawImage(this.image, this.image_offset.x, this.image_offset.y);
			
		}
		
		if (this.mouse.right_down && !this.mouse.left_down) {
			this.setState(this.states.PANNING);
		}
		
		if (!this.mouse.left_down && !this.mouse.right_down) {
			
		}
	}
	
	panningState() {
		if (!this.mouse.right_down) {
			this.setState(this.states.IDLE);
			return;
		}
		this.image_offset.x += this.mouse.x - this.mouse.prev_x;
		this.image_offset.y += this.mouse.y - this.mouse.prev_y;
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.drawImage(this.image, this.image_offset.x, this.image_offset.y);
		
	}

	
	croppingState() {
		if (!this.mouse.left_down) {
			this.drawPath(this.path, this.ctx, true);
			this.copySelectionToBuffer(this.path);
			this.setState(this.states.IDLE);
			this.setSelectionBoundingBox(this.path);
		}
		
		this.path.push({x:this.mouse.x, y:this.mouse.y});
		this.ctx.beginPath();
		this.ctx.moveTo(this.mouse.prev_x, this.mouse.prev_y);
		this.ctx.lineTo(this.mouse.x, this.mouse.y);
		this.ctx.stroke();
		
		
		
	}
	
	hitTestPointBox(mx, my, box) {
		return ( mx >= box.x1 && mx <= box.x2 && my > box.y1 && my < box.y2 );
	}
	
	setSelectionBoundingBox(path) {
		let leftmost = canvas.width;
		let rightmost = 0;
		let top = canvas.height;
		let bottom = 0;
		for (let i in path) {
			leftmost = path[i].x < leftmost ? path[i].x : leftmost;
			rightmost = path[i].x > rightmost ? path[i].x : rightmost;
			top = path[i].y < top ? path[i].y : top;
			bottom = path[i].y > bottom ? path[i].y : bottom;
		}
		this.selection_bounding_box = {x1:leftmost, y1:top, x2:rightmost, y2:bottom};
		let box = this.selection_bounding_box;
		//this.ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
	}
	
	drawPath(path, _ctx, fill=false) {
		_ctx.beginPath();
		_ctx.moveTo(path[0].x, path[0].y);
		for (let i = 1; i < path.length; i++) {
			_ctx.lineTo(path[i].x, path[i].y);
		}
		_ctx.closePath();
		if (fill) _ctx.stroke();
	}
	
	setState(state) {
		this.state = state;
		console.log(this.state);
	}
	
	createBufferCanvas() {
		let _canvas = document.createElement('canvas');
		_canvas.width = this.canvas.width;
		_canvas.height = this.canvas.height;
		return _canvas;
		
	}

	onMouseDown(e) {
		if (e.target !== this.canvas) return;
		
		if (e.button === 0) this.mouse.left_down = true;
		if (e.button === 2) this.mouse.right_down = true;
		this.update(e);
	
	}

	onMouseUp(e) {
		if (e.button === 0) this.mouse.left_down = false;
		if (e.button === 2) {
			this.mouse.right_down = false;
						
			this.drawPath(this.path, this.ctx, true);
			this.copySelectionToBuffer(this.path);
			this.setState(this.states.IDLE);
			this.setSelectionBoundingBox(this.path);
		}
			
			
		this.update(e);
	}

	onMouseMove(e) {
		this.mouse.prev_x = this.mouse.x;
		this.mouse.prev_y = this.mouse.y;
		this.mouse.x = e.clientX - this.canvas.getBoundingClientRect().left;
		this.mouse.y = e.clientY - this.canvas.getBoundingClientRect().top;
		
		if (this.state === this.states.IDLE && this.selection_bounding_box) {
			if (this.hitTestPointBox(this.mouse.x, this.mouse.y, this.selection_bounding_box)) {
				document.body.style.cursor = "move"; //"pointer";
			}else {
				document.body.style.cursor = "default";	
			}
		}
		
		this.update(e);
	}

}