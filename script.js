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
	focusedWired: null,
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

	const draggedGate = LogicGate.getGateFromId(LogicGate.DRAGGED_GATE);

	const newLocation = {
		x: -( e.pageX * (100 / scroll.zoom) ) + scroll.x + 30,
		y: -( e.pageY * (100 / scroll.zoom) ) + scroll.y + 30
	}

	updateGateLocation(draggedGate, newLocation);
	drawWiresToScreen();
});

window.addEventListener("mouseup", e => {
	if (LogicGate.DRAGGED_GATE == null) return;

	const draggedGate = LogicGate.getGateFromId(LogicGate.DRAGGED_GATE);

	checkToToggleInput(draggedGate);
	LogicGate.DRAGGED_GATE = null;

	drawWiresToScreen();
});

window.addEventListener("touchmove", e => {
	if (LogicGate.DRAGGED_GATE == null) return;

	const draggedGate = LogicGate.getGateFromId(LogicGate.DRAGGED_GATE);

	const newLocation = {
		x: -( e.touches[0].pageX * (100 / scroll.zoom) ) + scroll.x,
		y: -( e.touches[0].pageY * (100 / scroll.zoom) ) + scroll.y
	}

	updateGateLocation(draggedGate, newLocation);
	drawWiresToScreen();
});

window.addEventListener("touchend", e => {
	if (LogicGate.DRAGGED_GATE == null) return;

	const draggedGate = LogicGate.getGateFromId(LogicGate.DRAGGED_GATE);

	checkToToggleInput(draggedGate);
	LogicGate.DRAGGED_GATE = null;

	drawWiresToScreen();
});

// Listen for when the "add node" button is clicked
gateButton.addEventListener("click", e => {
	addGate();
})

// Adds the specified logic gate tp the scene - setupData is for loading in gates with preset information
function addGate(setupData=null) {
	let gateType = (setupData != null) ? setupData.type : gateSelect.value;
	LogicGate.createGate(gateType, scroll, setupData);
	// Update the UI icons
	feather.replace();
}

function updateGateLocation(gate, worldPosition) {
	const screenPosition = {
		x: scroll.x - worldPosition.x,
		y: scroll.y - worldPosition.y
	};

	gate.setGatePosition(worldPosition, screenPosition);
}

function checkToToggleInput(gate) {
	gate.gateHTMLElement.style.zIndex = "0";

	if (!LogicGate.MOUSE_MOVED_DURING_DRAG) {
		if (gate.type == "input") {

			// Toggle the input
			gate.run();
			
			// Set the input background colour
			gate.gateHTMLElement.style.background = "rgb(130, 160, 250)";
			if (!gate.output[0]) gate.gateHTMLElement.style.background = "var(--whiteColour)";

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

window.addEventListener("mousedown", e => {
	if (world.focusedWired == null) return;
	if (e.button != 1) return;

	// Delete wire
	world.focusedWired.gate.removeConnectionByID(world.focusedWired.gateInputId);
	checkForWireInteraction(e);
})

window.addEventListener("touchstart", e => {
	if (world.focusedWired == null) return;

	// Delete wire
	world.focusedWired.gate.removeConnectionByID(world.focusedWired.gateInputId);
	checkForWireInteraction(e.touches[0]);
})

function checkForWireInteraction(e) {
	let mousePos = { x: e.pageX, y: e.pageY };
	
	world.focusedWired = null;
	
	for (const gateId in LogicGate.GATES) {
		const currentGate = LogicGate.getGateFromId(gateId);
		
		for (let i = 0; i < currentGate.forwardConnections.length; i++) {
			if (isPointOnWire(currentGate.forwardConnections[i], currentGate, mousePos)) {
				// Get the gate's connected gate
				const connectionGate = LogicGate.getGateFromId(currentGate.forwardConnections[i].gateId);

				world.focusedWired = {
					gate: currentGate,
					gateId: currentGate.gateId,
					connectionGate: connectionGate,
					connectionGateId: connectionGate.gateId,
					gateInputId: i
				}
			}
		}
	}
}

function isPointOnWire(connection, gate, point) {
	let outputLeft = gate.outputElements[connection.outputId].style.left;
	let outputTop = gate.outputElements[connection.outputId].style.top;

	let start = {
		x: Number(outputLeft.substring(0, outputLeft.length - 2)),
		y: Number(outputTop.substring(0, outputTop.length - 2))
	}

	let inputLeft = LogicGate.getGateFromId(connection.gateId).inputElements[connection.inputId].style.left;
	let inputTop = LogicGate.getGateFromId(connection.gateId).inputElements[connection.inputId].style.top;

	let end = {
		x: Number(inputLeft.substring(0, inputLeft.length - 2)),
		y: Number(inputTop.substring(0, inputTop.length - 2))
	}

	const distanceThreshold = 10 * (scroll.zoom / 100);

	// Calculate the square of the the line length
	const lineLengthSqur = (end.x - start.x)**2 + (end.y - start.y)**2;

	// If the line length is zero (i.e., start and end points are the same), compare with the distance to that single point
	if (lineLengthSqur === 0) {
		const distToStart = Math.sqrt((point.x - start.x)**2 + (point.y - start.y)**2);
		return distToStart <= distanceThreshold;
	}

	let t = ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / lineLengthSqur;

	// Clamp t to the range [0, 1] - prevents t from extending past the end of the line
	t = Math.max(0, Math.min(1, t));

	// Find the projection point on the line segment
	const projection ={
		"x": start.x + t * (end.x - start.x),
		"y": start.y + t * (end.y - start.y)
	};

	// Calculate the distance from point `P` to the projection
	const pointToLineDist = Math.sqrt((point.x - projection.x)**2 + (point.y - projection.y)**2);

	// Check if the distance is less than or equal to the threshold
	return pointToLineDist <= distanceThreshold;
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
		const gate = LogicGate.getGateFromId(gateKey);

		for (let i = 0; i < gate.forwardConnections.length; i++) {
			const connection = gate.forwardConnections[i];

			let outputLeft = gate.outputElements[connection.outputId].style.left;
			let outputTop = gate.outputElements[connection.outputId].style.top;

			let startPos = {
				x: Number(outputLeft.substring(0, outputLeft.length - 2)),
				y: Number(outputTop.substring(0, outputTop.length - 2))
			}

			let inputLeft = LogicGate.getGateFromId(connection.gateId).inputElements[connection.inputId].style.left;
			let inputTop = LogicGate.getGateFromId(connection.gateId).inputElements[connection.inputId].style.top;

			let endPos = {
				x: Number(inputLeft.substring(0, inputLeft.length - 2)),
				y: Number(inputTop.substring(0, inputTop.length - 2))
			}

			// Check if wire is focused
			let isFocused = false;

			if (world.focusedWired != null) {
				if (world.focusedWired.gateId == gate.gateId) {
					if (world.focusedWired.connectionGateId == connection.gateId) isFocused = true;
				}
			}

			drawWire(startPos, endPos, gate.output[connection.outputId], isFocused);
		}
	}
}

function drawMouseDragWire(e, gateName, selectedOutput) {
	let outputLeft = LogicGate.getGateFromId(gateName).outputElements[selectedOutput].style.left
	let outputTop = LogicGate.getGateFromId(gateName).outputElements[selectedOutput].style.top

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
		drawMouseDragWire(e, LogicGate.MOUSE_WIRE_CONNECTION.gateId, LogicGate.MOUSE_WIRE_CONNECTION.outputId);

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

	if (LogicGate.MOUSE_WIRE_CONNECTION != null) {
		drawMouseDragWire(e.touches[0], LogicGate.MOUSE_WIRE_CONNECTION.gateId, LogicGate.MOUSE_WIRE_CONNECTION.outputId);
	}
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
		textBox.style.left = e.pageX + "point.x";
		textBox.style.top = e.pageY + "point.x";

		if (e["global"]) {
			textBox.style.left = (scroll.x - e.pageX) + "point.x";
			textBox.style.top = (scroll.y - e.pageY) + "point.x";
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
			textItem.element.style.left = (scroll.x - newXPos) + "point.x";
			textItem.element.style.top = (scroll.y - newYPos) + "point.x";

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
			textItem.element.style.left = (scroll.x - newXPos) + "point.x";
			textItem.element.style.top = (scroll.y - newYPos) + "point.x";

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
	for (const gateId in LogicGate.GATES) {
		const gate = LogicGate.getGateFromId(gateId);

		updateGateLocation(gate, {
			x: gate.x,
			y: gate.y
		});
	}

	// Update the position of all the textboxes
	for (const textboxKey in world.textBoxes) {
		let item = world.textBoxes[textboxKey];

		let newXLocation = scroll.x - item.x;
		let newYLocation = scroll.y - item.y;

		item.element.style.left = newXLocation + "point.x";	
		item.element.style.top = newYLocation + "point.x";
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

	for (const gateKey in LogicGate.GATES) {
		averageX += LogicGate.getGateFromId(gateKey).x;
		averageY += LogicGate.getGateFromId(gateKey).y;
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
	for (let gateKey in LogicGate.GATES) {
		const gate = LogicGate.getGateFromId(gateKey);
		if (gate.type == "oscillator") gate.run()	
	}

	drawWiresToScreen();
}

const clockInterval = setInterval(updateAllClocks, 1000 / world.maxTickRate);

// Load gates

//const urlParams = new URLSearchParams(window.location.search);
//const gateCode = urlParams.get('code');
//const textBoxCode = urlParams.get('textBox');

// Create a save file

document.getElementById("save-drogic").addEventListener("click", e => {
	
	let filteredGates = {}

	for (const itemKey in LogicGate.GATES) {
		const gate = LogicGate.getGateFromId(itemKey);

		let filteredGateObj = {
			type: gate.type,
			id: gate.gateId,
			connections: gate.forwardConnections,
			backConnections: gate.backConnections,
			maxInputs: gate.maxInputs,
			maxOutputs: gate.maxOutputs,
			inputs: gate.inputs,
			inputTaken: gate.inputTaken,
			output: gate.output,
			outputTaken: gate.outputTaken,
			toggleOn: gate.toggleOn,
			inputOn: gate.inputOn,
			ramMemory: gate.memory,
			x: gate.x,
			y: gate.y
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
		document.getElementById("logic-gate-holder").removeChild( LogicGate.getGateFromId(itemKey).gateHTMLElement.parentElement );
	}

	// Clear world
	world = {
		textBoxes: {},
		draggedTextbox: -1,
		uniqueTexboxID: 0,
		focusedWired: null,
		undoList: [],
		maxTickRate: 60,
	}

	// Clear the GATES object
    LogicGate.GATES = {};

	for (const itemKey in tempWorld.textBoxes) {
		addTextBox(2, { pageX: tempWorld.textBoxes[itemKey].x, pageY: tempWorld.textBoxes[itemKey].y, global: true }, tempWorld.textBoxes[itemKey].text);
	}

	for (const itemKey in tempWorld.gates) {
		addGate(tempWorld.gates[itemKey]);
	}

	// Load world
	world.draggedTextbox = -1;
	world.uniqueTexboxID = tempWorld.uniqueTexboxID;
	world.focusedWired = null;
	world.undoList = tempWorld.undoList;

	LogicGate.MOUSE_MOVED_DURING_DRAG = false;
	LogicGate.DRAGGED_TEXTBOX = null;
	LogicGate.DRAGGED_GATE = null;
	LogicGate.GATE_ID = tempWorld.uniqueGateId;
	LogicGate.MOUSE_WIRE_CONNECTION = null;

	// Pulse gates
	for (const itemKey in LogicGate.GATES) LogicGate.getGateFromId(itemKey).run(true);
}
