import { LogicGate } from "./gate.js"

const gateSelect = document.getElementById("gate");
const gateButton = document.getElementById("add-gate");

// Camera data
let scroll = {
	changeX: 0,
	changeY: 0,
	lastX: 0,
	lastY: 0,
	hasBeenDragged: false,
	dragging: false,
	x: 0,
	y: 0,
	zoom: 100
}

// Workspace interactions and objects data
let world = {
	textBoxes: {},
	draggedTextbox: -1,
	uniqueTexboxID: 0,
	focusedWired: -1,
	undoList: [],
	maxTickRate: 60,
}

// Records whether keys are currently pressed
document.addEventListener("keydown", e => {

	if (LogicGate.KEYBOARD[e.key.toUpperCase()]) return;
	LogicGate.KEYBOARD[e.key.toUpperCase()] = true;

	for (let item in LogicGate.GATES) {
		if (LogicGate.GATES[item].type == "keyboard") LogicGate.GATES[item].run();
	}
})

document.addEventListener("keyup", e => {
	LogicGate.KEYBOARD[e.key.toUpperCase()] = false;

	for (let item in LogicGate.GATES) {
		if (LogicGate.GATES[item].type == "keyboard") LogicGate.GATES[item].run();
	}
})

// Unused as of now - plan to add this back in a future update
let undoList = [];

// Load each objects sound effect
let websiteAudio = {
	cachedDrop: new Audio("./sounds/drop.wav"),
	cachedDrop2: new Audio("./sounds/drop2.wav"),
	cachedConnect: new Audio("./sounds/connect2.wav"),
	cachedConnect2: new Audio("./sounds/connect.wav"),
	drop: function() {
		let tempAudio = this.cachedDrop;

		tempAudio.currentTime = 0;
		tempAudio.volume = 1;
		tempAudio.play();
	},
	pickup: function() {
		let tempAudio = this.cachedDrop2;

		tempAudio.currentTime = 0;
		tempAudio.volume = 1;
		tempAudio.play();
	},
	addText: function() {
		let tempAudio = this.cachedDrop;

		tempAudio.currentTime = 0;
		tempAudio.play();
	},
	connectDrag: function() {
		let tempAudio = this.cachedConnect;

		tempAudio.currentTime = 1000;
		tempAudio.play();
	},
	switch: function() {
		let tempAudio = this.cachedConnect2;

		tempAudio.currentTime = 0;
		tempAudio.play();
	}
}

// Load in the canvas element
const canvas = document.getElementById("background-canvas");
const ctx = canvas.getContext("2d");

window.addEventListener("mousemove", e => {
	if (LogicGate.DRAGGED_GATE == null) return;

	updateGateLocation(LogicGate.DRAGGED_GATE, {
		x: -( e.pageX * (100 / scroll.zoom) ) + scroll.x + 30,
		y: -( e.pageY * (100 / scroll.zoom) ) + scroll.y + 30
	});

	drawWiresToScreen();
});

window.addEventListener("mouseup", e => {
	if (LogicGate.DRAGGED_GATE == null) return;

	checkToToggleInput(LogicGate.DRAGGED_GATE, e);
	LogicGate.DRAGGED_GATE = null;

	drawWiresToScreen();
});

window.addEventListener("touchmove", e => {
	if (LogicGate.DRAGGED_GATE == null) return;

	updateGateLocation(LogicGate.DRAGGED_GATE, {
		x: -( e.touches[0].pageX * (100 / scroll.zoom) ) + scroll.x,
		y: -( e.touches[0].pageY * (100 / scroll.zoom) ) + scroll.y
	});

	drawWiresToScreen();
});

window.addEventListener("touchend", e => {
	if (LogicGate.DRAGGED_GATE == null) return;

	checkToToggleInput(LogicGate.DRAGGED_GATE, e.changedTouches[0]);
	LogicGate.DRAGGED_GATE = null;

	drawWiresToScreen();
});

// Listen for when the "add node" button is clicked
gateButton.addEventListener("click", e => {
	addGate();
})

// Adds the specified logic gate tp the scene - setupData is for loading in gates with preset information
function addGate(setupData=null) {
	LogicGate.createGate(gateSelect.value, scroll, setupData);
	feather.replace();
}

function updateGateLocation(gateID, worldPosition) {

	let gateX = scroll.x - worldPosition.x;
	let gateY = scroll.y - worldPosition.y;

	let screenPosition = {
		"x": gateX,
		"y": gateY
	}

	LogicGate.GATES[gateID].setGatePosition(worldPosition, screenPosition);
}

function checkToToggleInput(draggedGateID, e) {
	let gateName = draggedGateID;
	LogicGate.GATES[gateName].gateHTMLElement.style.zIndex = "0";

	if (!LogicGate.MOUSE_MOVED_DURING_DRAG) {
		if (LogicGate.GATES[gateName].type == "input") {

			// Toggle the input
			LogicGate.GATES[gateName].run();
			
			// Set the input background colour
			LogicGate.GATES[gateName].gateHTMLElement.style.background = "rgb(130, 160, 250)";
			if (!LogicGate.GATES[gateName].output[0]) LogicGate.GATES[gateName].gateHTMLElement.style.background = "var(--whiteColour)";

			websiteAudio.switch();
		}
	}
	else {
		websiteAudio.drop();
	}
}

// Check if mouse is over a wire
window.addEventListener("mousemove", e => {
	checkForWireInteraction(e);
})

window.addEventListener("touchmove", e => {
	checkForWireInteraction(e.changedTouches[0]);
})

function checkForWireInteraction(e) {
	world.focusedWired = -1;
	
	for (const item in LogicGate.GATES) {
		for (let i = 0; i < LogicGate.GATES[item].forwardConnections.length; i++) {
			if (isPointOnWire(LogicGate.GATES[item].forwardConnections[i], item, { "x": e.pageX, "y": e.pageY })) {
				world.focusedWired = [LogicGate.GATES[item].forwardConnections[i], i, item];
			}
		}
	}
}

window.addEventListener("mousedown", e => {
	if (world.focusedWired == -1) return;

	if (e.button != 1) return;

	// Delete wire
	LogicGate.GATES[world.focusedWired[2]].removeConnectionByID(world.focusedWired[1]);
	checkForWireInteraction(e);
})

window.addEventListener("touchstart", e => {
	if (world.focusedWired == -1) return;

	// Delete wire
	LogicGate.GATES[world.focusedWired[2]].removeConnectionByID(world.focusedWired[1]);
	checkForWireInteraction(e.touches[0]);
})

function isPointOnWire(connection, gateKey, point) {

	let inputID = connection.inputID;
	let gateID = connection.gateID;
	let outputID = connection.outputID;

	let outputLeft = LogicGate.GATES[gateKey].outputElements[outputID].style.left
	let outputTop = LogicGate.GATES[gateKey].outputElements[outputID].style.top

	let startPos = {
		x: Number(outputLeft.substring(0, outputLeft.length - 2)),
		y: Number(outputTop.substring(0, outputTop.length - 2))
	}

	let inputLeft = LogicGate.GATES[gateID].inputElements[inputID].style.left
	let inputTop = LogicGate.GATES[gateID].inputElements[inputID].style.top

	let endPos = {
		x: Number(inputLeft.substring(0, inputLeft.length - 2)),
		y: Number(inputTop.substring(0, inputTop.length - 2))
	}

	const distanceThreshold = 10 * (scroll.zoom / 100);

	const x1 = startPos.x;
	const y1 = startPos.y;

	const x2 = endPos.x;
	const y2 = endPos.y;

	const px = point.x;
	const py = point.y;

	// Calculate the square of the the line length
	const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;

	// If the line length is zero (i.e., start and end points are the same), compare with the distance to that single point
	if (lineLengthSquared === 0) {
	  const distToStart = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
	  return distToStart <= distanceThreshold;
	}

	let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;

	// Clamp t to the range [0, 1] to ensure the projection lies within the line segment
	t = Math.max(0, Math.min(1, t));

	// Find the projection point on the line segment
	const projectionX = x1 + t * (x2 - x1);
	const projectionY = y1 + t * (y2 - y1);

	// Calculate the distance from point `P` to the projection
	const distanceToLine = Math.sqrt((px - projectionX) ** 2 + (py - projectionY) ** 2);

	// Check if the distance is less than or equal to the threshold
	return distanceToLine <= distanceThreshold;
}

// Canvas and wires

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", e => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	drawWiresToScreen();
})

let lineWidth = 4;
let strokeColour = '#82A0FA';
let activeColour = "#dd4859";
let wirePower = 10;

let backingColour = "#FFFFFF";

function drawWiresToScreen() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawGridToBackground();

	for (const gateKey in LogicGate.GATES) {

		for (let i = 0; i < LogicGate.GATES[gateKey].forwardConnections.length; i++) {

			let connection = LogicGate.GATES[gateKey].forwardConnections[i];
			let inputID = connection.inputID;
			let gateID = connection.gateID;
			let outputID = connection.outputID;

			let outputLeft = LogicGate.GATES[gateKey].outputElements[outputID].style.left
			let outputTop = LogicGate.GATES[gateKey].outputElements[outputID].style.top

			let startPos = {
				x: Number(outputLeft.substring(0, outputLeft.length - 2)),
				y: Number(outputTop.substring(0, outputTop.length - 2))
			}

			let inputLeft = LogicGate.GATES[gateID].inputElements[inputID].style.left
			let inputTop = LogicGate.GATES[gateID].inputElements[inputID].style.top

			let endPos = {
				x: Number(inputLeft.substring(0, inputLeft.length - 2)),
				y: Number(inputTop.substring(0, inputTop.length - 2))
			}

			// Check if wire is focused
			let isFocused = false;
			if (world.focusedWired[0] == LogicGate.GATES[gateKey].forwardConnections[i]) isFocused = true;

			drawWire(startPos, endPos, LogicGate.GATES[gateKey].output[outputID], isFocused);

		}
	}
}

function drawMouseDragWire(e, gateName, selectedOutput) {

	let outputLeft = LogicGate.GATES[gateName].outputElements[selectedOutput].style.left
	let outputTop = LogicGate.GATES[gateName].outputElements[selectedOutput].style.top

	let startPos = {
		x: Number(outputLeft.substring(0, outputLeft.length - 2)),
		y: Number(outputTop.substring(0, outputTop.length - 2))
	}
	
	let endPos = {
		x: e.pageX - 5,
		y: e.pageY - 5
	}

	drawWire(startPos, endPos, false);
}

function drawWire(obj1, obj2, isActive, isFocused=false) {
		
	ctx.lineCap = 'round';
	ctx.lineWidth = lineWidth * (scroll.zoom / 100);
	ctx.strokeStyle = strokeColour;

	if (isActive) ctx.strokeStyle = activeColour;
	if (isFocused) ctx.strokeStyle = "#13ff13";

	ctx.beginPath();
  	ctx.moveTo(obj1.x, obj1.y);
	ctx.lineTo(obj2.x, obj2.y);
  	ctx.stroke();
}

function drawGridToBackground() {

	let squareColour = "#FFFFFF07";

	squareColour = "#FFFFFF07";
	if (mode == "light") squareColour = "#00000011";

	ctx.lineCap = 'round';
	ctx.lineWidth = 2;
	ctx.strokeStyle = squareColour;

	let squareSize = 25 * (scroll.zoom / 100);

	ctx.beginPath();
	
	for (let x = (scroll.x * (scroll.zoom / 100) % squareSize); x < canvas.width; x += squareSize) {

		for (let z = (scroll.y * (scroll.zoom / 100) % squareSize); z < canvas.height; z += squareSize) {			
  			ctx.moveTo(0, z);
			ctx.lineTo(canvas.width, z);
		}
		
  		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
	}

	ctx.stroke();

	//if (scroll.x > squareSize || scroll.x < -squareSize) scroll.x = 0;
	//if (scroll.y > squareSize || scroll.y < -squareSize) scroll.y = 0;
}

// Connection wire animation
window.addEventListener("mousemove", e => {
	drawWiresToScreen();

	if (LogicGate.MOUSE_WIRE_CONNECTION != null) {
		drawMouseDragWire(e, LogicGate.MOUSE_WIRE_CONNECTION[0], LogicGate.MOUSE_WIRE_CONNECTION[1]);

		document.body.style.cursor = "grabbing";
		canvas.style.cursor = "grabbing";
	}
	else {
		document.body.style.cursor = "default";
		canvas.style.cursor = "default";
	}
})

window.addEventListener("touchmove", e => {
	drawWiresToScreen();

	if (LogicGate.MOUSE_WIRE_CONNECTION != null) drawMouseDragWire(e.touches[0], LogicGate.MOUSE_WIRE_CONNECTION[0], LogicGate.MOUSE_WIRE_CONNECTION[1]);
})

window.addEventListener("mouseup", e => {
	LogicGate.MOUSE_WIRE_CONNECTION = null;
	drawWiresToScreen();
})

// WEBSITE COLOUR SCHEME ==================

let mode = "light";
updateMode();

document.getElementById("mode-toggle").addEventListener("click", e => {
	updateMode();
})

function updateMode() {
	if (mode == "dark") {
		mode = "light";

		document.body.style.setProperty("--whiteColour", "rgb(250, 250, 250)");
		document.body.style.setProperty("--lightGreyColour", "rgb(240, 240, 240)");
		document.body.style.setProperty("--blackColour", "rgb(13, 13, 13)");
		document.body.style.setProperty("--imageFilter", "0%");
		document.body.style.setProperty("--buttonColour", "rgba(0, 0, 0, 0.4)");

		document.getElementById("mode-toggle").innerHTML = '<i data-feather="sun"></i>';

		backingColour = "#FFFFFF";
	}
	else {
		mode = "dark";

		document.body.style.setProperty("--whiteColour", "rgb(20, 20, 25)");
		document.body.style.setProperty("--lightGreyColour", "rgb(15, 15, 20)");
		document.body.style.setProperty("--blackColour", "rgb(255, 255, 255)");
		document.body.style.setProperty("--imageFilter", "100%");
		document.body.style.setProperty("--buttonColour", "rgba(255, 255, 255, 0.1)");

		document.getElementById("mode-toggle").innerHTML = '<i data-feather="moon"></i>';

		backingColour = "#1b1b1b";
	}

	feather.replace();

	drawWiresToScreen();
}

// TEXT BOX CONTROLS ===============

window.addEventListener("contextmenu", e => {
	e.preventDefault();
})

canvas.addEventListener("mousedown", e => {
	addTextBox(e.button, e);
})

canvas.addEventListener("touchend", e => {
	if (!scroll.hasBeenDragged) {
		if (confirm("Would you like to create a text box?")) {
			addTextBox(2, e.changedTouches[0]);
		}
	}
	else {
		scroll.hasBeenDragged = false;
	}
})

function addTextBox(buttonEntered, e, textboxText="Click to edit") {
	if (LogicGate.DRAGGED_GATE == null && buttonEntered == 2) {

		// Add textbox
		let textBox = document.createElement("div");
		textBox.classList.add("textBox");

		// Create the drag panel
		let textBoxDrag = document.createElement("span");
		textBoxDrag.innerHTML = '<i data-feather="move"></i>';
		textBoxDrag.id = world.uniqueTexboxID + "text";

		// Create the input text
		let textBoxHolder = document.createElement("h2");
		textBoxHolder.innerText = textboxText;
		textBoxHolder.contentEditable = true;
		textBoxHolder.id = world.uniqueTexboxID + "textbox";

		textBoxHolder.addEventListener("input", e => {
			let targetTextbox = e.target.id.substring(0, e.target.id.length - 7);
			world.textBoxes["texbox" + targetTextbox].text = e.target.innerText;
		})

		// Create the delete button
		let texBoxDelete = document.createElement("button");
		texBoxDelete.innerHTML = '<i data-feather="trash-2"></i>'
		texBoxDelete.id = world.uniqueTexboxID + "textDelete";

		// Delete listener
		texBoxDelete.addEventListener("click", e => {
			if (world.draggedTextbox != -1) return;

			let tempTexboxId = Number(e.target.id.substring(0, e.target.id.length - 10));

			document.getElementById("logic-gate-holder").removeChild( world.textBoxes["texbox" + tempTexboxId.toString()].element );
			delete world.textBoxes["texbox" + tempTexboxId.toString()];

			websiteAudio.delete();
		})
		
		// Position textbox in world
		textBox.style.left = e.pageX + "px";
		textBox.style.top = e.pageY + "px";

		if (e["global"]) {
			textBox.style.left = (scroll.x - e.pageX) + "px";
			textBox.style.top = (scroll.y - e.pageY) + "px";
		}

		textBox.appendChild(textBoxDrag);
		textBox.appendChild(textBoxHolder);
		textBox.appendChild(texBoxDelete);
		
		document.getElementById("logic-gate-holder").appendChild(textBox);

		feather.replace()
		
		// Play text added sound
		websiteAudio.addText();

		let textBoxObject = {
			element: textBox,
			text: textBoxHolder.innerText,
			x: -e.pageX + scroll.x + 15,
			y: -e.pageY + scroll.y + 15
		}

		if (e["global"]) {
			textBoxObject.x = e.pageX;
			textBoxObject.y = e.pageY;
		}

		// Store the texbox in the world object
		world.textBoxes["texbox" + world.uniqueTexboxID.toString()] = textBoxObject;
		world.uniqueTexboxID += 1
		
		// Computer drag controls
		textBoxDrag.addEventListener("mousedown", e => {
			world.draggedTextbox = Number(e.target.id.substring(0, e.target.id.length - 4))
			websiteAudio.pickup();
		})

		window.addEventListener("mousemove", e => {
			if (world.draggedTextbox == -1) return;

			let newXPos = -e.pageX + scroll.x + 15;
			let newYPos = -e.pageY + scroll.y + 15;

			let textItem = world.textBoxes["texbox" + world.draggedTextbox.toString()]
			textItem.element.style.left = (scroll.x - newXPos) + "px";
			textItem.element.style.top = (scroll.y - newYPos) + "px";

			world.textBoxes["texbox" + world.draggedTextbox.toString()].x = newXPos;
			world.textBoxes["texbox" + world.draggedTextbox.toString()].y = newYPos;
		})

		window.addEventListener("mouseup", e => {		
			if (world.draggedTextbox == -1) return;
			websiteAudio.drop();
			world.draggedTextbox = -1;
		})

		// Mobile drag controls
		textBoxDrag.addEventListener("touchstart", e => {
			world.draggedTextbox = Number(e.target.id.substring(0, e.touches[0].target.id.length - 4));
			websiteAudio.pickup();
		})

		window.addEventListener("touchmove", e => {
			if (world.draggedTextbox == -1) return;

			let newXPos = -e.changedTouches[0].pageX + scroll.x + 10;
			let newYPos = -e.changedTouches[0].pageY + scroll.y + 10;

			let textItem = world.textBoxes["texbox" + world.draggedTextbox.toString()]
			textItem.element.style.left = (scroll.x - newXPos) + "px";
			textItem.element.style.top = (scroll.y - newYPos) + "px";

			world.textBoxes["texbox" + world.draggedTextbox.toString()].x = newXPos;
			world.textBoxes["texbox" + world.draggedTextbox.toString()].y = newYPos;
		})

		window.addEventListener("touchend", e => {
			if (world.draggedTextbox == -1) return;
			websiteAudio.drop();
			world.draggedTextbox = -1;
		})
	}
}

// Undo when ctrl+z is pressed
/*window.addEventListener("keydown", e => {
	if (e.key.toUpperCase() == "Z" && e.ctrlKey) {

		e.preventDefault();

		// Undo last action
	}
})*/

// Move the camera when user drags

canvas.addEventListener("mousedown", e => {
	scroll.lastX = e.pageX;
	scroll.lastY = e.pageY;

	scroll.dragging = true;
})

canvas.addEventListener("mousemove", e => {
	if (!scroll.dragging) return;
	moveEditorByDragging(e);
	canvas.style.cursor = "grabbing";
})

window.addEventListener("mouseup", e => {
	scroll.dragging = false;
	canvas.style.cursor = "default";
})

canvas.addEventListener("touchstart", e => {
	scroll.lastX = e.touches[0].pageX;
	scroll.lastY = e.touches[0].pageY;
})

canvas.addEventListener("touchmove", e => {
	moveEditorByDragging(e.touches[0]);
})

function moveEditorByDragging(e) {
	scroll.changeX = e.pageX - scroll.lastX;
	scroll.changeY = e.pageY - scroll.lastY;

	scroll.lastX = e.pageX;
	scroll.lastY = e.pageY;

	// Random constant to stop slow movement
	scroll.x += scroll.changeX * 1.006 * (100 / scroll.zoom);
	scroll.y += scroll.changeY * 1.006 * (100 / scroll.zoom);

	updateScreenPosition();
}

function updateScreenPosition() {

	// Update the position of all the logic gates
	for (const gateKey in LogicGate.GATES) {
		let item = LogicGate.GATES[gateKey];

		updateGateLocation(gateKey, {
			x: item.x,
			y: item.y
		});
	}

	// Update the position of all the textboxes
	for (const textboxKey in world.textBoxes) {
		let item = world.textBoxes[textboxKey];

		let newXLocation = scroll.x - item.x;
		let newYLocation = scroll.y - item.y;

		item.element.style.left = newXLocation + "px";	
		item.element.style.top = newYLocation + "px";
	}

	scroll.hasBeenDragged = true;

	drawWiresToScreen();
}

// Update zoom controls
document.getElementById("zoom-in").addEventListener("click", e => {
	changeWorldZoom(scroll.zoom + 10);
})

document.getElementById("zoom-out").addEventListener("click", e => {
	changeWorldZoom(scroll.zoom - 10);
})

document.getElementById("zoomText").addEventListener("input", e => {
	changeWorldZoom(Number(document.getElementById("zoomText").value));
})

document.addEventListener("scroll", e => {
	changeWorldZoom(e.scroll);
})

function changeWorldZoom(newZoom) {

	scroll.zoom = Math.max(10, newZoom);
	document.getElementById("zoomText").value = scroll.zoom;

	document.getElementById("logic-gate-holder").style.transform = "scale(" + (scroll.zoom / 100) + ")";
}

// Update center controls
document.getElementById("center-screen").addEventListener("click", e => {
	
	let averageX = 0;
	let averageY = 0;
	let total = 0;

	for (const itemKey in LogicGate.GATES) {
		averageX += LogicGate.GATES[itemKey].x;
		averageY += LogicGate.GATES[itemKey].y;
		total += 1;
	}

	if (total <= 0) {
		scroll.x = 0;
		scroll.y = 0;
		return;
	}

	averageX = averageX / total;
	averageY = averageY / total;

	scroll.x = averageX + (window.innerWidth / 2);
	scroll.y = averageY + (window.innerHeight / 2);

	updateScreenPosition();
})

// Before unload ask user

window.addEventListener("beforeunload", e => {
	e.returnValue = true;
});

// Update clocks
function updateAllClocks() {

	for (let item in LogicGate.GATES) {

		if (LogicGate.GATES[item].type == "oscillator") {
			//websiteAudio.switch();

			LogicGate.GATES[item].run()
			
			//LogicGate.GATES[item].gateHTMLElement.style.background = "rgba(227,140,225,1)";
			//if (!LogicGate.GATES[item].output[0]) LogicGate.GATES[item].gateHTMLElement.style.background = "var(--whiteColour)";
		}
		
	}

	drawWiresToScreen();
}

let clockInterval = setInterval(updateAllClocks, 1000 / world.maxTickRate);

// Load gates

let urlParams = new URLSearchParams(window.location.search);
let gateCode = urlParams.get('code');
let textBoxCode = urlParams.get('textBox');

// Create a save file

document.getElementById("save-drogic").addEventListener("click", e => {
	
	let filteredGates = {}

	for (const itemKey in LogicGate.GATES) {
		let filteredGateObj = {
			type: LogicGate.GATES[itemKey].type,
			id: LogicGate.GATES[itemKey].gateId,
			connections: LogicGate.GATES[itemKey].forwardConnections,
			backConnections: LogicGate.GATES[itemKey].backConnections,
			maxInputs: LogicGate.GATES[itemKey].maxInputs,
			maxOutputs: LogicGate.GATES[itemKey].maxOutputs,
			inputs: LogicGate.GATES[itemKey].inputs,
			inputTaken: LogicGate.GATES[itemKey].inputTaken,
			output: LogicGate.GATES[itemKey].output,
			outputTaken: LogicGate.GATES[itemKey].outputTaken,
			toggleOn: LogicGate.GATES[itemKey].toggleOn,
			inputOn: LogicGate.GATES[itemKey].inputOn,
			ramMemory: LogicGate.GATES[itemKey].memory,
			x: LogicGate.GATES[itemKey].x,
			y: LogicGate.GATES[itemKey].y
		}

		filteredGates[itemKey] = filteredGateObj
	}

	// Create the save object
	let saveObject = {
		textBoxes: world.textBoxes,
		uniqueTexboxID: world.uniqueTexboxID,
		gates: filteredGates,
		uniqueGateId: LogicGate.GATE_ID,
		undoList: []
	}
	
	let megaJSONSaveObject = JSON.stringify(saveObject);
	download(megaJSONSaveObject, "drogicSaveData", "txt");
})

// Function to download data to a file
function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else {
		// Others
        let a = document.createElement("a");
        let url = URL.createObjectURL(file);

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

// Load a save file

document.getElementById("loadFileInput").addEventListener("change", e => {
	if (!confirm("Loading this file will clear your current workspace, are you sure you want to continue?")) return;

	let loadedFile = document.getElementById("loadFileInput").files[0];

	if (loadedFile) {
		let reader = new FileReader();
		reader.readAsText(loadedFile, "UTF-8");

		reader.onload = function (evt) {
			loadSaveData(evt.target.result);
		}

		reader.onerror = function (evt) {
			alert("Error reading file");
		}
	}
})

function loadSaveData(savedJSON) {

	let tempWorld = JSON.parse(savedJSON);

	// Remove all gates and texboxes
	for (const itemKey in world.textBoxes) {
		document.body.removeChild( world.textBoxes[itemKey].element );
	}

	for (const itemKey in LogicGate.GATES) {
		document.getElementById("logic-gate-holder").removeChild( LogicGate.GATES[itemKey].gateHTMLElement.parentElement );
	}

	// Clear world
	world = {
		textBoxes: {},
		draggedTextbox: -1,
		uniqueTexboxID: 0,
		focusedWired: -1,
		undoList: [],
		maxTickRate: 60,
	}

	for (const itemKey in tempWorld.textBoxes) {
		addTextBox(2, { pageX: tempWorld.textBoxes[itemKey].x, pageY: tempWorld.textBoxes[itemKey].y, global: true }, tempWorld.textBoxes[itemKey].text);
	}

	for (const itemKey in tempWorld.gates) {
		addGate(tempWorld.gates[itemKey]);
	}

	// Load world
	world.draggedTextbox = -1;
	world.uniqueTexboxID = tempWorld.uniqueTexboxID;
	LogicGate.DRAGGED_GATE = null;
	LogicGate.GATE_ID = tempWorld.uniqueGateId;
	LogicGate.MOUSE_WIRE_CONNECTION = null;
	world.focusedWired = -1;
	world.undoList = tempWorld.undoList;

	// Pulse gates
	for (const itemKey in LogicGate.GATES) {
		LogicGate.GATES[itemKey].run(true);
	}

}
